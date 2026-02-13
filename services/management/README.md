# Management Service

This is the brain of the operation. The **Management Service** handles the "business logic" of creating and managing your short URLs.

## What does it do?

*   **Creates Short Links:** Takes your long URL and assigns it a short code (alias).
*   **Manages Data:** Stores everything safely in a **PostgreSQL** database.
*   **Keeps Things Fast:** When you create or update a link, it updates the **Redis** cache so the Redirect Service knows about it instantly.
*   **API First:** It provides a clean REST API that the frontend (or any other client) can talk to.

## Tech Stack

*   **Runtime:** [Bun](https://bun.sh) (super fast JavaScript runtime)
*   **Framework:** [Hono](https://hono.dev) (lightweight web framework)
*   **Database:** PostgreSQL
*   **Validation:** Yup

## Running Locally

If you want to run just this service for development:

1.  **Install dependencies:**
    ```bash
    bun install
    ```

2.  **Start the server:**
    ```bash
    bun run index.ts
    ```

Make sure your database is running and the environment variables are set!
