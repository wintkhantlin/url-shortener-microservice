package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"

	kafkago "github.com/segmentio/kafka-go"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/go-playground/validator/v10"
	"github.com/wintkhantlin/url2short-analytics/internal/api"
	"github.com/wintkhantlin/url2short-analytics/internal/config"
	"github.com/wintkhantlin/url2short-analytics/internal/db"
	"github.com/wintkhantlin/url2short-analytics/internal/kafka"
	"github.com/wintkhantlin/url2short-analytics/internal/models"
)

func TestAnalyticsE2E(t *testing.T) {
	cfg := config.Load()
	cfg.APIPort = "8081" // Use a different port for tests

	// 1. Connect to ClickHouse
	conn, err := db.Connect(cfg)
	require.NoError(t, err)

	validate := validator.New()

	// 2. Start API in background
	go api.Start(conn, cfg)

	// 3. Start Kafka Consumer in background
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go kafka.StartConsumer(ctx, conn, validate, cfg)

	// Wait a bit for API to start
	time.Sleep(2 * time.Second)

	// 2. Clear existing data for test code
	testCode := fmt.Sprintf("E2E-%d", time.Now().UnixNano())
	// No need to delete if we use unique code


	// 3. Send a message to Kafka
	writer := &kafkago.Writer{
		Addr:                   kafkago.TCP("localhost:9094"),
		Topic:                  "analytics-event",
		Balancer:               &kafkago.LeastBytes{},
		AllowAutoTopicCreation: true,
	}
	defer writer.Close()

	event := models.AnalyticsEvent{
		Code:      testCode,
		IP:        "8.8.8.8",
		UserAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	}
	payload, err := json.Marshal(event)
	require.NoError(t, err)

	err = writer.WriteMessages(context.Background(), kafkago.Message{
		Value: payload,
	})
	require.NoError(t, err)

	// 4. Wait for processing (polling ClickHouse)
	require.Eventually(t, func() bool {
		summary, err := db.GetAnalytics(context.Background(), conn, testCode)
		return err == nil && summary.TotalClicks > 0
	}, 15*time.Second, 500*time.Millisecond)

	// 5. Verify data via API (Gin)
	resp, err := http.Get("http://127.0.0.1:8081/analytics/" + testCode)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var apiSummary models.AnalyticsResponse
	err = json.NewDecoder(resp.Body).Decode(&apiSummary)
	require.NoError(t, err)

	assert.Equal(t, uint64(1), apiSummary.TotalClicks)
	require.NotEmpty(t, apiSummary.Browsers)
	assert.Equal(t, "chrome", apiSummary.Browsers[0].Name)
	assert.Equal(t, uint64(1), apiSummary.Browsers[0].Count)
}
