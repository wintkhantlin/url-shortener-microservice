# URL2Short - Scalable URL Shortener & Analytics

A high-performance URL shortener system built with a microservices architecture, featuring real-time analytics and event-driven data processing.

## 🚀 Services Overview

| Service | Language/Stack | Port | Description |
| :--- | :--- | :--- | :--- |
| **Management** | TypeScript / Hono | 8001 | API for creating and managing shortened URLs. |
| **Redirect** | TypeScript / Hono | 3001 | High-speed redirection service with Redis cache and Postgres replica fallback. |
| **Analytics** | Go / Gin | 8080 | Consumes Kafka events and serves aggregated analytics from ClickHouse. |
| **Malicious Link Verification** *(planned)* | Python | TBD | Verifies target URLs against threat intel before alias creation/update. |
| **Kafka** | Message Broker | 9092/9094 | Event streaming platform for decoupled analytics processing. |
| **ClickHouse** | OLAP Database | 8123/9000 | Columnar database optimized for real-time analytical queries. |
| **Redis** | Cache | 6379 | Fast lookup for URL redirections and management data. |

## 🛠 Features

- **Decoupled Architecture**: Redirection and analytics are separated via Kafka to ensure zero latency impact on users.
- **Real-time Summaries**: Analytics service provides hourly timelines and dimension breakdowns (Browser, OS, Country).
- **Validation**: Strict schema validation using Yup (TS) and go-playground/validator (Go).
- **E2E Testing**: Automated end-to-end testing for the analytics pipeline.

## 🏗 Getting Started

### Prerequisites
- Docker & Docker Compose
- Bun (for TS services)
- Go 1.22+ (for Analytics service)

### Deployment
1. Start the infrastructure:
   ```bash
   docker-compose up -d
   ```
2. Run migrations for ClickHouse:
   ```bash
   # SQL file located at: migrations/clickhouse/20250213_01.sql
   ```
3. Access the Analytics API:
   ```bash
   curl "http://localhost:8080/analytics?code=YOUR_CODE"
   ```

## 📊 Analytics Schema
The analytics data is stored in ClickHouse using the `MergeTree` engine for high-performance insertions and queries.

| Column | Type | Description |
| :--- | :--- | :--- |
| `code` | String | The unique short URL identifier. |
| `browser` | String | User's browser (e.g., chrome, firefox). |
| `os` | String | Operating system (e.g., macos, windows). |
| `device_type` | String | Device category (desktop, mobile). |
| `country` | String | ISO country code. |
| `created_at` | DateTime | Timestamp of the event. |
