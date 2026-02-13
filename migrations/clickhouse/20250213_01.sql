CREATE TABLE IF NOT EXISTS analytics (
    code String,
    browser LowCardinality(String),
    os LowCardinality(String),
    device_type LowCardinality(String),
    country LowCardinality(String),
    state LowCardinality(String),
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (code, created_at);
