# Running URL2Short

This guide covers how to run the URL2Short system using Docker Compose for a complete environment, as well as how to run individual services locally for development.

## Prerequisites

*   **Docker** and **Docker Compose** (recommended for running the full stack)
*   **Bun** (latest) - for Management, Redirect, and Web UI services
*   **Go** (1.25+) - for Analytics, IP2Geo, and User-Agent services
*   **Python** (3.14+) & **uv** - for Security service

## Quick Start (Docker)

The easiest way to run the entire system is via Docker Compose. This starts all microservices, databases (Postgres, ClickHouse, Redis), and the API Gateway.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/wintkhantlin/url-shortener-microservice.git
    cd url-shortener-microservice
    ```

2.  **Start the services:**
    ```bash
    docker-compose up -d
    ```
    *Note: The first run may take a few minutes to build all images and download dependencies.*

3.  **Verify Status:**
    Check if all containers are up:
    ```bash
    docker-compose ps
    ```

4.  **Access the Application:**
    *   **Web UI:** [http://localhost:3000](http://localhost:3000)
    *   **API Gateway:** [http://localhost:4455](http://localhost:4455)
    *   **Redirect Service:** [http://localhost:3001](http://localhost:3001)

## Architecture & Ports

| Service | Docker Port | Description |
| :--- | :--- | :--- |
| **Web UI** | `3000` | Frontend Dashboard (React/Vite) |
| **Oathkeeper** | `4455` | API Gateway (Entry point for API calls) |
| **Kratos** | `4433` | Public Auth API (Login/Register) |
| **Management API** | `8001` | Internal API for link management |
| **Redirect Service** | `3001` | Handles short link redirection |
| **Analytics Service** | `8080` | Internal Analytics API |
| **Postgres (Primary)**| `5433` | Management Database |
| **Postgres (Replica)**| `5434` | Read Replica |
| **Redis** | `6379` | Caching layer |
| **ClickHouse** | `8123` | Analytics Database (HTTP) |
| **Kafka** | `9092` | Event Streaming |

## Database Migrations

### Postgres (Management)
The `management` service is configured to run migrations automatically, but you can run them manually if needed:
```bash
cd services/management
bun run db:migrate
```

### ClickHouse (Analytics)
ClickHouse migrations are located in `migrations/clickhouse`. They are automatically applied on container startup via the `/docker-entrypoint-initdb.d` volume mount.

### Kratos (Identity)
The `kratos-migrate` container runs automatically on startup to apply the latest identity schemas.

## Local Development

To run services individually on your host machine (outside Docker), ensure you have the required language runtimes installed.

### 1. Web UI (React/Bun)
```bash
cd web-ui
bun install
bun dev
```
*Access at `http://localhost:3000`*

### 2. Management Service (Bun)
```bash
cd services/management
# Ensure Postgres and Kafka are running (via Docker)
bun install
bun dev
```

### 3. Analytics Service (Go)
```bash
cd services/analytics
# Ensure ClickHouse and Kafka are running
go mod download
go run main.go
```

### 4. Redirect Service (Bun)
```bash
cd services/redirect
# Ensure Redis, Postgres, and Kafka are running
bun install
bun dev
```

### 5. Security Service (Python)
```bash
cd services/security
# Ensure Kafka is running
uv sync
uv run python -m security.worker.worker
```

## Configuration

Most services use environment variables for configuration.
*   **Docker:** Variables are defined in `docker-compose.yml`.
*   **Local:** Copy `.env.example` to `.env` in each service directory and adjust values if running outside Docker.

### Key Environment Variables

*   `DATABASE_URL` / `DSN`: Database connection strings.
*   `KAFKA_BROKERS`: Kafka connection (e.g., `localhost:9092` locally, `broker:9092` in Docker).
*   `REDIS_URL`: Redis connection.
*   `CLICKHOUSE_ADDR`: ClickHouse address.

## Troubleshooting

*   **Ports in use:** Ensure ports 3000, 5433, 6379, 8123, etc., are free.
*   **Kafka Connection:** If services fail to connect to Kafka, ensure the `broker` container is healthy. It may take a moment to start.
*   **Database connection errors:** Wait for `kratos-migrate` and `management-db` to fully initialize before services depend on them.
