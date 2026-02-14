package kafka

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/go-playground/validator/v10"
	"github.com/segmentio/kafka-go"
	"github.com/wintkhantlin/url2short-analytics/internal/config"
	"github.com/wintkhantlin/url2short-analytics/internal/db"
	"github.com/wintkhantlin/url2short-analytics/internal/geoip"
	"github.com/wintkhantlin/url2short-analytics/internal/models"
	"github.com/wintkhantlin/url2short-analytics/internal/parser"
)

func StartConsumer(ctx context.Context, conn clickhouse.Conn, validate *validator.Validate, cfg *config.Config) {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers: cfg.KafkaBrokers,
		Topic:   cfg.KafkaTopic,
		GroupID: cfg.KafkaGroupID,
	})

	defer reader.Close()

	slog.Info("Starting to read analytics events", "topic", cfg.KafkaTopic, "group", cfg.KafkaGroupID)

	// Batch processing configuration
	const batchSize = 5000
	const batchTimeout = 2 * time.Second

	batch := make([]models.AnalyticsEvent, 0, batchSize)
	ticker := time.NewTicker(batchTimeout)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			slog.Info("Shutting down Kafka consumer...")
			if len(batch) > 0 {
				if err := db.InsertBatch(context.Background(), conn, batch); err != nil {
					slog.Error("Error inserting final batch into ClickHouse", "error", err)
				}
			}
			return
		case <-ticker.C:
			if len(batch) > 0 {
				if err := db.InsertBatch(ctx, conn, batch); err != nil {
					slog.Error("Error inserting batch into ClickHouse", "error", err)
				} else {
					slog.Info("Successfully inserted batch", "size", len(batch))
				}
				batch = batch[:0]
			}
		default:
			// Non-blocking read with short timeout to allow ticker to fire
			readCtx, cancel := context.WithTimeout(ctx, 100*time.Millisecond)
			msg, err := reader.ReadMessage(readCtx)
			cancel()

			if err != nil {
				if err != context.DeadlineExceeded && !errors.Is(err, context.DeadlineExceeded) {
					slog.Error("Error reading message", "error", err)
				}
				continue
			}

			var event models.AnalyticsEvent
			if err := json.Unmarshal(msg.Value, &event); err != nil {
				slog.Error("Error unmarshaling event", "error", err)
				continue
			}

			// 1. Parse User-Agent if present
			if event.UserAgent != "" {
				info := parser.ParseUserAgent(event.UserAgent)
				event.Browser = info.Browser
				event.OS = info.OS
				event.Device = info.Device
			}

			// 2. Parse IP if present (using shared GeoIP)
			if event.IP != "" {
				event.Country, event.State = geoip.GetLocation(event.IP)
			}

			// Fill defaults
			if event.Browser == "" {
				event.Browser = "unknown"
			}
			if event.OS == "" {
				event.OS = "unknown"
			}
			if event.Device == "" {
				event.Device = "unknown"
			}
			if event.Country == "" {
				event.Country = "unknown"
			}
			if event.State == "" {
				event.State = "unknown"
			}

			if err := validate.Struct(event); err != nil {
				slog.Error("Validation failed for event", "error", err)
				continue
			}

			event.Transform()
			batch = append(batch, event)

			if len(batch) >= batchSize {
				if err := db.InsertBatch(ctx, conn, batch); err != nil {
					slog.Error("Error inserting batch into ClickHouse", "error", err)
				} else {
					slog.Info("Successfully inserted batch", "size", len(batch))
				}
				batch = batch[:0]
			}
		}
	}
}
