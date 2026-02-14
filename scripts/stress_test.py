import asyncio
import aiohttp
import random
import uuid

URL = "http://localhost:3001/hiFF1u"
CONCURRENCY = 200
REQUESTS = 10000

UAS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) Firefox/123.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X)",
    "Mozilla/5.0 (Android 14; Pixel 8 Pro)"
]

REFS = [
    "https://google.com/search?q=url+shortener",
    "https://facebook.com/groups/dev",
    "https://twitter.com/user/status/1",
    "https://reddit.com/r/programming",
    "https://linkedin.com/feed",
    "https://t.co/xyz"
]

LANGS = ["en-US,en;q=0.9", "en-GB,en;q=0.8", "my-MM,my;q=0.9", "fr-FR,fr;q=0.7"]

def rand_ip():
    return ".".join(str(random.randint(1,254)) for _ in range(4))

async def hit(session, i):
    ip = rand_ip()
    headers = {
        "User-Agent": random.choice(UAS),
        "Referer": random.choice(REFS),
        "Accept-Language": random.choice(LANGS),
        "X-Forwarded-For": ip,
        "X-Real-IP": ip,
        "CF-Connecting-IP": ip,
        "Cookie": f"sid={uuid.uuid4()}; _ga={uuid.uuid4()}; _gid={uuid.uuid4()}"
    }
    try:
        async with session.get(URL, headers=headers, allow_redirects=False, timeout=10) as r:
            print(i, r.status, ip)
    except Exception as e:
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
