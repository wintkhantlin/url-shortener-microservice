import json
import os
import numpy as np
import joblib
import tldextract
from urllib.parse import urlparse
from aiokafka import Consumer, Producer, KafkaError
from pathlib import Path
import re
import math
import requests

def extract_features_live(url):
    url = str(url).strip()
    features = []
    
    try:
        parsed = urlparse(url)
        ext = tldextract.extract(url)
        domain = f"{ext.domain}.{ext.suffix}"
        
        # Lexical
        features.append(len(url)) # LengthOfURL
        features.append(len(domain)) # DomainLength
        features.append(1 if re.match(r'^\d{1,3}(\.\d{1,3}){3}$', ext.domain) else 0) # IsDomainIP
        features.append(len(ext.suffix)) # TLDLength
        features.append(len(ext.subdomain.split('.')) if ext.subdomain else 0) # NoOfSubDomain
        features.append(1 if parsed.scheme == 'https' else 0) # HasHTTPS
        
        # Counts
        features.append(sum(c.isalpha() for c in url) / len(url) if len(url) > 0 else 0) # LetterRatio
        features.append(sum(c.isdigit() for c in url) / len(url) if len(url) > 0 else 0) # DigitRatio
        features.append((len(url) - sum(c.isalnum() for c in url)) / len(url) if len(url) > 0 else 0) # SpecialCharRatio
        
        # Content-based
        try:
            # Short timeout for worker
            resp = requests.get(url, timeout=3, verify=False)
            content = resp.text.lower()
            
            features.append(0) # IsUnreachable
            features.append(1 if '<title>' in content else 0) # HasTitle
            features.append(1 if 'favicon' in content else 0) # HasFavicon
            features.append(1 if 'type="password"' in content else 0) # HasPasswordField
            features.append(1 if 'type="submit"' in content else 0) # HasSubmitButton
            features.append(1 if '<iframe' in content else 0) # HasIFrame
            features.append(len(content.splitlines())) # LineCount
            
        except:
            # Defaults if unreachable
            features.append(1) # IsUnreachable
            features.append(0) # HasTitle
            features.append(0) # HasFavicon
            features.append(0) # HasPasswordField
            features.append(0) # HasSubmitButton
            features.append(0) # HasIFrame
            features.append(0) # LineCount
            
    except Exception as e:
        print(f"Error extracting features: {e}")
        # Return zeros matching feature count (16 features)
        return np.zeros((1, 16), dtype=np.float32)
        
    return np.array([features], dtype=np.float32)

# Load Model
SCRIPT_DIR = Path(__file__).resolve().parent
MODEL_FILE = SCRIPT_DIR / "model" / "artifacts" / "live_rf_model.joblib"

# Fallback or check
if not MODEL_FILE.exists():
    print(f"Warning: {MODEL_FILE} not found. Ensure training has run.")
    clf = None
else:
    print(f"Loading Live RF Model from {MODEL_FILE}...")
    clf = joblib.load(MODEL_FILE)
    print("Model loaded successfully.")

# --- Kafka Configuration ---
KAFKA_BROKERS = os.getenv("KAFKA_BROKERS", "broker:9092")
INPUT_TOPIC = os.getenv("KAFKA_INPUT_TOPIC", "url-created")
OUTPUT_TOPIC = os.getenv("KAFKA_OUTPUT_TOPIC", "url-checked")
GROUP_ID = os.getenv("KAFKA_GROUP_ID", "url-guard-worker")

consumer_conf = {
    'bootstrap.servers': KAFKA_BROKERS,
    'group.id': GROUP_ID,
    'auto.offset.reset': 'earliest'
}

producer_conf = {
    'bootstrap.servers': KAFKA_BROKERS
}

consumer = Consumer(consumer_conf)
producer = Producer(producer_conf)

consumer.subscribe([INPUT_TOPIC])

def delivery_report(err, msg):
    if err is not None:
        print(f"Message delivery failed: {err}")

print(f"Starting URL Guard worker (Live Model). Listening on {INPUT_TOPIC}...")

try:
    while True:
        msg = consumer.poll(1.0)

        if msg is None:
            continue
        if msg.error():
            if msg.error().code() == KafkaError._PARTITION_EOF:
                continue
            else:
                print(msg.error())
                break

        try:
            data = json.loads(msg.value().decode('utf-8'))
            url = data.get('url')
            code = data.get('code')

            if not url:
                print("Received message without URL")
                continue

            print(f"Processing URL: {url}")
            
            if clf:
                # Preprocess
                features = extract_features_live(url)
                
                # Inference
                prediction = clf.predict(features)[0]
                probs = clf.predict_proba(features)[0]
                
                # Label: 1 = Phishing, 0 = Legitimate
                
                # Probability of class 1 (Phishing)
                phishing_prob = probs[1] if len(probs) > 1 else (1.0 if prediction == 1 else 0.0)
                
                is_safe = (prediction == 0) # 0 is legitimate
                
                result = {
                    'code': code,
                    'url': url,
                    'is_safe': bool(is_safe),
                    'score': float(phishing_prob),
                    'model_version': 'v3-live-rf'
                }
                
                print(f"Result for {code}: {'Safe' if is_safe else 'Unsafe'} (Score: {phishing_prob:.4f})")
            else:
                print("Model not loaded. Skipping inference.")
                result = {
                    'code': code,
                    'url': url,
                    'is_safe': True, # Fail open?
                    'score': 0.0,
                    'error': 'Model not loaded'
                }

            producer.produce(OUTPUT_TOPIC, json.dumps(result).encode('utf-8'), callback=delivery_report)
            producer.poll(0)

        except Exception as e:
            print(f"Error processing message: {e}")

except KeyboardInterrupt:
    pass
finally:
    print("Closing consumer...")
    consumer.close()
    producer.flush()
