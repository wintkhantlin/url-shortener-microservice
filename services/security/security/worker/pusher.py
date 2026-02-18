import asyncio
import json
from aiokafka import AIOKafkaProducer
import os

KAFKA_BROKERS = os.getenv("KAFKA_BROKERS", "127.0.0.1:9094")
INPUT_TOPIC = os.getenv("KAFKA_INPUT_TOPIC", "alias.created")

async def send_test_message():
    producer = AIOKafkaProducer(
        bootstrap_servers=KAFKA_BROKERS
    )
    
    await producer.start()
    try:
        payload = {
            "code": "1234",
            "url": "https://wintkhantlin.vercel.app"
        }
        # send expects bytes, so json-encode
        await producer.send_and_wait(INPUT_TOPIC, json.dumps(payload).encode("utf-8"))
        print("Message sent!")
    finally:
        await producer.stop()

asyncio.run(send_test_message())
