import asyncio
import json
import logging
import os
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer

try:
    from security.model import PhishingDetector
except ImportError:
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parent.parent.parent))
    from security.model import PhishingDetector

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

detector = PhishingDetector()

KAFKA_BROKERS = os.getenv("KAFKA_BROKERS", "127.0.0.1:9094")
INPUT_TOPIC = os.getenv("KAFKA_INPUT_TOPIC", "alias.created")
OUTPUT_TOPIC = os.getenv("KAFKA_OUTPUT_TOPIC", "alias.checked")
GROUP_ID = os.getenv("KAFKA_GROUP_ID", "alias-created-listener")
CONCURRENCY_LIMIT = int(os.getenv("CONCURRENCY_LIMIT", 20))

async def process_message(msg, producer, loop, semaphore):
    async with semaphore:
        try:
            payload = msg.value if isinstance(msg.value, dict) else {}
            url = payload.get("target") or payload.get("url") or payload.get("original_url")
            code = payload.get("code")
            
            if not url:
                logger.warning("Event missing URL-like field: %s", payload)
                return

            score = 0.0
            is_safe = True
            
            if detector.model is not None:
                try:
                    score = await loop.run_in_executor(None, detector.get_phishing_score, url)
                    is_safe = score < 0.5
                except Exception as e:
                    logger.error(f"Error processing URL {url}: {e}")
            
            logger.info(
                "Check: code=%s safe=%s score=%.4f url=%s",
                code, is_safe, score, url
            )
            
            result = {
                "code": code,
                "url": url,
                "is_safe": is_safe,
                "score": score,
                "status": "checked"
            }
            
            if producer:
                await producer.send_and_wait(OUTPUT_TOPIC, json.dumps(result).encode('utf-8'))
                
        except Exception as e:
            logger.error(f"Error in process_message: {e}")

async def listen_alias_created():
    consumer = AIOKafkaConsumer(
        INPUT_TOPIC,
        bootstrap_servers=KAFKA_BROKERS,
        group_id=GROUP_ID,
        value_deserializer=lambda m: json.loads(m.decode('utf-8')),
        enable_auto_commit=True
    )
    
    producer = AIOKafkaProducer(
        bootstrap_servers=KAFKA_BROKERS
    )
    
    retries = 0
    max_retries = 30
    while retries < max_retries:
        try:
            logger.info(f"Connecting to Kafka at {KAFKA_BROKERS} (attempt {retries+1}/{max_retries})...")
            await consumer.start()
            await producer.start()
            logger.info("Successfully connected to Kafka")
            break
        except Exception as e:
            logger.warning(f"Failed to connect to Kafka: {e}. Retrying in 5 seconds...")
            retries += 1
            await asyncio.sleep(5)
            
            if retries >= max_retries:
                logger.error(f"Failed to connect to Kafka at {KAFKA_BROKERS} after {max_retries} attempts: {e}")
                return
    
    loop = asyncio.get_running_loop()
    semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)
    
    try:
        async for msg in consumer:
            asyncio.create_task(process_message(msg, producer, loop, semaphore))
    finally:
        await consumer.stop()
        await producer.stop()

if __name__ == "__main__":
    asyncio.run(listen_alias_created())
