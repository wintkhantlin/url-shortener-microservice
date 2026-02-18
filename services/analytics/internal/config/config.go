package config

import (
	"os"
	"strings"
)

type Config struct {
	ClickHouseAddr     string
	ClickHouseUser     string
	ClickHousePassword string
	ClickHouseDB       string
	KafkaBrokers       []string
	KafkaTopic         string
	KafkaGroupID       string
	APIPort            string
	ManagementURL      string
	IP2GeoAddr         string
	UserAgentAddr      string
}

func Load() *Config {
	return &Config{
		ClickHouseAddr:     getEnv("CLICKHOUSE_ADDR", "clickhouse:9000"),
		ClickHouseUser:     getEnv("CLICKHOUSE_USER", "default"),
		ClickHousePassword: getEnv("CLICKHOUSE_PASSWORD", "default"),
		ClickHouseDB:       getEnv("CLICKHOUSE_DB", "analytics_db"),
		KafkaBrokers:       strings.Split(getEnv("KAFKA_BROKERS", "broker:9092"), ","),
		KafkaTopic:         getEnv("KAFKA_TOPIC", "analytics-event"),
		KafkaGroupID:       getEnv("KAFKA_GROUP_ID", "analytics-group"),
		APIPort:            getEnv("API_PORT", "8080"),
		ManagementURL:      getEnv("MANAGEMENT_URL", "http://management:8001"),
		IP2GeoAddr:         getEnv("IP2GEO_ADDR", "ip2geo:50051"),
		UserAgentAddr:      getEnv("USER_AGENT_ADDR", "useragent:50052"),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
