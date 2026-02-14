package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/go-playground/validator/v10"
	"github.com/wintkhantlin/url2short-analytics/internal/api"
	"github.com/wintkhantlin/url2short-analytics/internal/config"
	"github.com/wintkhantlin/url2short-analytics/internal/db"
	"github.com/wintkhantlin/url2short-analytics/internal/geoip"
	"github.com/wintkhantlin/url2short-analytics/internal/kafka"
)

func main() {
	cfg := config.Load()
	validate := validator.New()

	// 1. Initialize GeoIP
	// Using a standard location in the container
	if err := geoip.Init("/app/GeoLite2-City.mmdb"); err != nil {
		slog.Warn("GeoIP initialization failed (continuing without it)", "error", err)
	}
	defer geoip.Close()

	// 2. Connect to ClickHouse
	var conn clickhouse.Conn
	var err error
	
	// Retry connection loop
	for i := 0; i < 30; i++ {
		conn, err = db.Connect(cfg)
		if err == nil {
			break
		}
		slog.Info("Waiting for ClickHouse...", "attempt", i+1, "error", err)
		time.Sleep(2 * time.Second)
	}
	
	if err != nil {
		slog.Error("Failed to connect to ClickHouse after retries", "error", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// 3. Expose API (Gin)
	go api.Start(conn, cfg)

	// 4. Kafka Consumer
	kafka.StartConsumer(ctx, conn, validate, cfg)
}
