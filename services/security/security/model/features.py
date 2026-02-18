import re
import numpy as np
import requests
import tldextract
from urllib.parse import urlparse

# --- Feature Extraction ---
# Must match the 16 features used in training (live_rf_model.joblib)

def extract_features(url):
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
            features.append(1) # IsUnreachable
            features.append(0) # HasTitle
            features.append(0) # HasFavicon
            features.append(0) # HasPasswordField
            features.append(0) # HasSubmitButton
            features.append(0) # HasIFrame
            features.append(0) # LineCount
            
    except Exception as e:
        print(f"Error extracting features: {e}")
        return np.zeros((1, 16), dtype=np.float32)
        
    return np.array([features], dtype=np.float32)
