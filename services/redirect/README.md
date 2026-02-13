# Redirect Service

This is the speed demon of the system. The **Redirect Service** has one job: get users to their destination as fast as physically possible.

## How it works

1.  **Request comes in:** A user visits a short link (e.g., `/r/abc`).
2.  **Cache Check:** We check **Redis** immediately. 99% of the time, the answer is here.
3.  **Database Fallback:** If it is not in Redis, we check the **Postgres Replica** (so we don't slow down the main writer database).
4.  **The Handoff:**
    *   **User:** Gets a `302 Redirect` to the long URL.
    *   **Analytics:** We asynchronously fire a "Click Event" to **Kafka**. We don't wait for this to finish before redirecting the user—speed is key!

## Tech Stack

*   **Runtime:** [Bun](https://bun.sh)
*   **Framework:** [Hono](https://hono.dev)
*   **Cache:** Redis
*   **Messaging:** Kafka (Producer)

## Running Locally

1.  **Install dependencies:**
    ```bash
    bun install
    ```

2.  **Start the server:**
    ```bash
    bun run index.ts
    ```

Note: This service needs a running Redis and Kafka instance to function fully.
