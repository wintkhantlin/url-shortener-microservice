import asyncio
import aiohttp
import argparse
import time
from faker import Faker

fake = Faker()

async def hit(session, url):
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
    start = time.perf_counter()
    try:
        async with session.get(url, headers=headers, timeout=10, allow_redirects=False) as r:
            return r.status, (time.perf_counter() - start) * 1000
    except:
        return "ERR", 0

async def worker(sem, session, url, results):
    async with sem:
        results.append(await hit(session, url))

async def run_url(url, concurrency, requests):
    sem = asyncio.Semaphore(concurrency)
    results = []
    start = time.time()

    async with aiohttp.ClientSession() as session:
        tasks = [worker(sem, session, url, results) for _ in range(requests)]
        await asyncio.gather(*tasks)

    duration = time.time() - start
    ok = sum(1 for s, _ in results if s in (200, 301, 302))
    err = requests - ok
    lat = [l for s, l in results if s == 200]
    avg = sum(lat) / len(lat) if lat else 0
    p95 = sorted(lat)[int(len(lat)*0.95)] if lat else 0
    rps = requests / duration

    return {
        "url": url,
        "rps": rps,
        "ok": ok,
        "err": err,
        "avg": avg,
        "p95": p95,
        "dur": duration
    }

async def main(urls, concurrency, requests):
    results = await asyncio.gather(*[
        run_url(u, concurrency, requests) for u in urls
    ])

    print("\nURL | Req/s | OK | ERR | Avg(ms) | P95(ms) | Time(s)")
    print("-" * 90)
    for r in results:
        print(f"{r['url']} | {r['rps']:.2f} | {r['ok']} | {r['err']} | {r['avg']:.2f} | {r['p95']:.2f} | {r['dur']:.2f}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", action="append", required=True)
    parser.add_argument("--concurrency", type=int, default=200)
    parser.add_argument("--requests", type=int, default=10000)
    args = parser.parse_args()

    asyncio.run(main(args.url, args.concurrency, args.requests))
