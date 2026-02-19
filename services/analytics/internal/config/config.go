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
		ClickHouseAddr:     mustGetEnv("CLICKHOUSE_ADDR"),
		ClickHouseUser:     getEnv("CLICKHOUSE_USER", "default"),
		ClickHousePassword: getEnv("CLICKHOUSE_PASSWORD", "default"),
		ClickHouseDB:       getEnv("CLICKHOUSE_DB", "analytics_db"),
		KafkaBrokers:       strings.Split(mustGetEnv("KAFKA_BROKERS"), ","),
		KafkaTopic:         getEnv("KAFKA_TOPIC", "analytics-event"),
		KafkaGroupID:       getEnv("KAFKA_GROUP_ID", "analytics-group"),
		APIPort:            getEnv("API_PORT", "8080"),
		ManagementURL:      mustGetEnv("MANAGEMENT_URL"),
		IP2GeoAddr:         mustGetEnv("IP2GEO_ADDR"),
		UserAgentAddr:      mustGetEnv("USER_AGENT_ADDR"),
	}
}

func mustGetEnv(key string) string {
	value, ok := os.LookupEnv(key)
	if !ok {
		panic("environment variable " + key + " is not set")
	}
	return value
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
