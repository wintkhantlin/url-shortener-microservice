import asyncio
import json
import logging
import os
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer

# Import PhishingDetector from shared module
try:
    from security.model import PhishingDetector
except ImportError:
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parent.parent.parent))
    from security.model import PhishingDetector

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize detector
detector = PhishingDetector()

# Configuration
KAFKA_BROKERS = os.getenv("KAFKA_BROKERS", "127.0.0.1:9094")
INPUT_TOPIC = os.getenv("KAFKA_INPUT_TOPIC", "alias.created")
OUTPUT_TOPIC = os.getenv("KAFKA_OUTPUT_TOPIC", "alias.checked")
GROUP_ID = os.getenv("KAFKA_GROUP_ID", "alias-created-listener")
CONCURRENCY_LIMIT = int(os.getenv("CONCURRENCY_LIMIT", 20))

async def process_message(msg, producer, loop, semaphore):
    """
    Process a single Kafka message with concurrency control.
    """
    async with semaphore:
        try:
            # logger.debug("Processing message offset=%s", msg.offset)
            payload = msg.value if isinstance(msg.value, dict) else {}
            url = payload.get("target") or payload.get("url") or payload.get("original_url")
            code = payload.get("code")
            
            if not url:
                logger.warning("Event missing URL-like field: %s", payload)
                return

            # Perform check
            score = 0.0
            is_safe = True
            
            if detector.model is not None:
                try:
                    # Run prediction in executor to avoid blocking event loop
                    score = await loop.run_in_executor(None, detector.get_phishing_score, url)
                    is_safe = score < 0.5
                except Exception as e:
                    logger.error(f"Error processing URL {url}: {e}")
            
            logger.info(
                "Check: code=%s safe=%s score=%.4f url=%s",
                code, is_safe, score, url
            )
            
            # Produce result
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
    
    # Wait for Kafka to be ready (simple retry loop could be added here in production)
    try:
        await consumer.start()
        await producer.start()
    except Exception as e:
        logger.error(f"Failed to connect to Kafka at {KAFKA_BROKERS}: {e}")
        return
    
    loop = asyncio.get_running_loop()
    semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)
    
    tasks = set()
    
    try:
        logger.info(f"Worker started. Listening on '{INPUT_TOPIC}' with concurrency={CONCURRENCY_LIMIT}...")
        async for msg in consumer:
            # Create a task for each message
            task = asyncio.create_task(process_message(msg, producer, loop, semaphore))
            tasks.add(task)
            
            # Clean up finished tasks
            task.add_done_callback(tasks.discard)
            
            # Optional: Backpressure if too many pending tasks
            if len(tasks) > CONCURRENCY_LIMIT * 2:
                await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
                
    except Exception as e:
        logger.error(f"Error in consumer loop: {e}")
    finally:
        # Wait for remaining tasks
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
            
        await consumer.stop()
        await producer.stop()

if __name__ == '__main__':
    asyncio.run(listen_alias_created())
