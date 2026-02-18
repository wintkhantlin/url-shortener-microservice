# System Architecture

This document describes the high-level architecture and data flow of the `url2short` project.

```mermaid
graph TD
    %% Clients
    User[User / Browser]

    %% Gateway & Auth
    subgraph "Gateway & Auth"
        Oathkeeper[Ory Oathkeeper<br/>(Port 4455)]
        Kratos[Ory Kratos<br/>(Port 4433)]
    end

    %% Services
    subgraph "Core Services"
        Management[Management Service<br/>(Port 8001)]
        Redirect[Redirect Service<br/>(Port 3001)]
        ManagementWorker[Management Worker]
    end

    subgraph "Security"
        Security[Security Service]
        PhishingModel[Phishing Model]
    end

    subgraph "Analytics Pipeline"
        Analytics[Analytics Service<br/>(Port 8080)]
        IP2Geo[IP2Geo Service<br/>(gRPC 50051)]
        UserAgent[UserAgent Service<br/>(gRPC 50052)]
    end

    %% Frontend
    WebUI[Web UI]

    %% Infrastructure
    subgraph "Infrastructure"
        Postgres[(Postgres Primary)]
        PostgresReplica[(Postgres Replica)]
        Redis[(Redis Cache)]
        ClickHouse[(ClickHouse OLAP)]
        Kafka{Kafka Broker}
    end

    %% Flows

    %% 1. Frontend & Auth
    User -->|HTTPS| Oathkeeper
    Oathkeeper -->|/auth/*| Kratos
    Oathkeeper -->|/*| WebUI

    %% 2. Management (Create Alias)
    Oathkeeper -->|/api/management/*| Management
    Management -->|R/W| Postgres
    Management -.->|Produce: alias.created| Kafka

    %% 3. Security Check Flow
    Kafka -.->|Consume: alias.created| Security
    Security --> PhishingModel
    Security -.->|Produce: alias.checked| Kafka
    Kafka -.->|Consume: alias.checked| ManagementWorker
    ManagementWorker -->|Update: should_warn| Postgres

    %% 4. Redirect Flow
    User -->|http://short.url| Redirect
    Redirect -->|Read| Redis
    Redirect -->|Read| PostgresReplica
    Redirect -.->|Produce: alias.visited| Kafka
    Postgres -.->|Replication| PostgresReplica

    %% 5. Analytics Flow
    Kafka -.->|Consume: alias.visited| Analytics
    Analytics -->|gRPC: Get Geo| IP2Geo
    Analytics -->|gRPC: Parse UA| UserAgent
    Analytics -->|Insert| ClickHouse

    %% Styling
    classDef service fill:#f9f,stroke:#333,stroke-width:2px;
    classDef db fill:#dfd,stroke:#333,stroke-width:2px;
    classDef infra fill:#ddf,stroke:#333,stroke-width:2px;
    classDef gateway fill:#fdb,stroke:#333,stroke-width:2px;

    class Management,Redirect,ManagementWorker,Security,Analytics,IP2Geo,UserAgent,WebUI service;
    class Postgres,PostgresReplica,Redis,ClickHouse db;
    class Kafka infra;
    class Oathkeeper,Kratos gateway;
```

## Service Description

| Service | Port | Description |
| :--- | :--- | :--- |
| **Web UI** | - | Frontend application (React/Vite). |
| **Oathkeeper** | 4455 | API Gateway and Identity Proxy. Routes traffic to internal services. |
| **Kratos** | 4433 | Identity Management (Login, Registration, etc.). |
| **Management** | 8001 | Backend for managing aliases (CRUD). Emits `alias.created`. |
| **Redirect** | 3001 | Handles short URL redirection. High performance, uses Redis & Read Replica. Emits `alias.visited`. |
| **Security** | - | Worker service that checks URLs for phishing. Consumes `alias.created`, produces `alias.checked`. |
| **Analytics** | 8080 | Consumes `alias.visited`, enriches data (Geo, UA), stores in ClickHouse. |
| **IP2Geo** | 50051 | gRPC service to resolve IP addresses to locations. |
| **UserAgent** | 50052 | gRPC service to parse User Agent strings. |

## Data Flow Highlights

### Alias Creation & Security Check
1. User creates alias via Web UI -> Management API.
2. Management API saves to Postgres and emits `alias.created`.
3. Security Service consumes `alias.created`, runs phishing check.
4. Security Service emits `alias.checked`.
5. Management Worker consumes `alias.checked` and updates the alias `should_warn` flag in Postgres.

### Redirection & Analytics
1. User visits short link -> Redirect Service.
2. Redirect Service checks Redis/Postgres for target URL.
3. Redirect Service emits `alias.visited`.
4. Analytics Service consumes `alias.visited`.
5. Analytics Service calls IP2Geo and UserAgent services for enrichment.
6. Enriched data is stored in ClickHouse for reporting.
