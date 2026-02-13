package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/go-playground/validator/v10"
	"github.com/segmentio/kafka-go"
	"github.com/ua-parser/uap-go/uaparser"
	"github.com/wintkhantlin/url2short-analytics/internal/db"
	"github.com/wintkhantlin/url2short-analytics/internal/models"
)

var uaParser *uaparser.Parser

func init() {
	uaParser = uaparser.NewFromSaved()
}

type IPLocation struct {
	Status  string `json:"status"`
	Country string `json:"country"`
	Region  string `json:"regionName"`
}

func getLocation(ip string) (string, string) {
	if ip == "127.0.0.1" || ip == "localhost" || ip == "" {
		return "internal", "internal"
	}

	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get(fmt.Sprintf("http://ip-api.com/json/%s", ip))
	if err != nil {
		return "unknown", "unknown"
	}
	defer resp.Body.Close()

	var loc IPLocation
	if err := json.NewDecoder(resp.Body).Decode(&loc); err != nil {
		return "unknown", "unknown"
	}

	if loc.Status != "success" {
		return "unknown", "unknown"
	}

	return loc.Country, loc.Region
}

func StartConsumer(conn clickhouse.Conn, validate *validator.Validate) {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers: []string{"localhost:9094"},
		Topic:   "analytics-event",
		GroupID: "analytics-group",
	})

	defer reader.Close()

	fmt.Println("Starting to read analytics events and insert into ClickHouse...")
	for {
		msg, err := reader.ReadMessage(context.Background())
		if err != nil {
			fmt.Printf("Error reading message: %v\n", err)
			continue
		}

		var event models.AnalyticsEvent
		if err := json.Unmarshal(msg.Value, &event); err != nil {
			fmt.Printf("Error unmarshaling event: %v\n", err)
			continue
		}

		// 1. Parse User-Agent if present
		if event.UserAgent != "" {
			client := uaParser.Parse(event.UserAgent)
			event.Browser = client.UserAgent.Family
			event.OS = client.Os.Family
			event.Device = client.Device.Family
		}

		// 2. Parse IP if present
		if event.IP != "" {
			event.Country, event.State = getLocation(event.IP)
		}

		// Fill defaults for missing dimensions if parsing failed or was skipped
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
			fmt.Printf("Validation failed for event: %v\n", err)
			continue
		}

		// Transform fields to lowercase except code
		event.Transform()

		if err := db.Insert(context.Background(), conn, event); err != nil {
			fmt.Printf("Error inserting into ClickHouse: %v\n", err)
			continue
		}

		fmt.Printf("Successfully inserted event for code: %s (transformed)\n", event.Code)
	}
}
