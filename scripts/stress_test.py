import os
import asyncio
import aiohttp
from faker import Faker

URL = os.getenv("TARGET_URL", "http://localhost:3001/pkqR08")
CONCURRENCY = int(os.getenv("CONCURRENCY", 200))
REQUESTS = int(os.getenv("REQUESTS", 10000))

fake = Faker()

async def hit(session, i):
    ip = fake.ipv4_public()
    headers = {
        "User-Agent": fake.user_agent(),
        "Referer": fake.url(),
        "Accept-Language": fake.locale(),
        "X-Forwarded-For": ip,
        "X-Real-IP": ip,
        "CF-Connecting-IP": ip,
        "Cookie": f"sid={fake.uuid4()}; _ga={fake.uuid4()}; _gid={fake.uuid4()}"
    }
    try:
        async with session.get(URL, headers=headers, allow_redirects=False, timeout=10) as r:
            print(i, r.status, ip)
    except:
        print(i, "ERR")

async def worker(sem, session, i):
    async with sem:
        await hit(session, i)

async def main():
    sem = asyncio.Semaphore(CONCURRENCY)
    async with aiohttp.ClientSession() as session:
        tasks = [worker(sem, session, i) for i in range(REQUESTS)]
        await asyncio.gather(*tasks)

asyncio.run(main())
