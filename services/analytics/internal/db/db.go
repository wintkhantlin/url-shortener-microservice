package db

import (
	"context"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/wintkhantlin/url2short-analytics/internal/config"
	"github.com/wintkhantlin/url2short-analytics/internal/models"
)

func Connect(cfg *config.Config) (clickhouse.Conn, error) {
	conn, err := clickhouse.Open(&clickhouse.Options{
		Addr: []string{cfg.ClickHouseAddr},
		Auth: clickhouse.Auth{
			Database: cfg.ClickHouseDB,
			Username: cfg.ClickHouseUser,
			Password: cfg.ClickHousePassword,
		},
		Settings: clickhouse.Settings{
			"max_execution_time": 60,
		},
		DialTimeout: 5 * time.Second,
	})
	if err != nil {
		return nil, err
	}

	if err := conn.Ping(context.Background()); err != nil {
		return nil, err
	}

	return conn, nil
}

func Insert(ctx context.Context, conn clickhouse.Conn, event models.AnalyticsEvent) error {
	return conn.Exec(ctx, `
		INSERT INTO analytics (code, browser, os, device_type, country, state, referer)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, event.Code, event.Browser, event.OS, event.Device, event.Country, event.State, event.Referer)
}

func InsertBatch(ctx context.Context, conn clickhouse.Conn, events []models.AnalyticsEvent) error {
	batch, err := conn.PrepareBatch(ctx, "INSERT INTO analytics (code, browser, os, device_type, country, state, referer)")
	if err != nil {
		return err
	}
	
	for _, event := range events {
		err := batch.Append(
			event.Code,
			event.Browser,
			event.OS,
			event.Device,
			event.Country,
			event.State,
			event.Referer,
		)
		if err != nil {
			return err
		}
	}
	
	return batch.Send()
}

func GetAnalytics(ctx context.Context, conn clickhouse.Conn, code string, start, end time.Time, interval string) (*models.AnalyticsResponse, error) {
	var resp models.AnalyticsResponse

	// Helper to get time function based on interval
	var timeFunc string
	switch interval {
	case "minute":
		timeFunc = "toStartOfMinute"
	case "hour":
		timeFunc = "toStartOfHour"
	case "day":
		timeFunc = "toStartOfDay"
	case "week":
		timeFunc = "toStartOfWeek"
	case "month":
		timeFunc = "toStartOfMonth"
	case "year":
		timeFunc = "toStartOfYear"
	default:
		timeFunc = "toStartOfHour"
	}

	// 1. Total Clicks (within range)
	err := conn.QueryRow(ctx, "SELECT count() FROM analytics WHERE code = ? AND created_at BETWEEN ? AND ?", code, start, end).Scan(&resp.TotalClicks)
	if err != nil {
		return nil, err
	}

	// 2. Timeline
	query := `
		SELECT ` + timeFunc + `(created_at) as time, count() as count 
		FROM analytics 
		WHERE code = ? AND created_at BETWEEN ? AND ?
		GROUP BY time ORDER BY time
	`
	err = conn.Select(ctx, &resp.Timeline, query, code, start, end)
	if err != nil {
		return nil, err
	}

	// 3. Browsers
	err = conn.Select(ctx, &resp.Browsers, `
		SELECT browser as name, count() as count 
		FROM analytics WHERE code = ? AND created_at BETWEEN ? AND ? GROUP BY name ORDER BY count DESC LIMIT 10
	`, code, start, end)
	if err != nil {
		return nil, err
	}

	// 4. OS
	err = conn.Select(ctx, &resp.OS, `
		SELECT os as name, count() as count 
		FROM analytics WHERE code = ? AND created_at BETWEEN ? AND ? GROUP BY name ORDER BY count DESC LIMIT 10
	`, code, start, end)
	if err != nil {
		return nil, err
	}

	// 5. Devices
	err = conn.Select(ctx, &resp.Devices, `
		SELECT device_type as name, count() as count 
		FROM analytics WHERE code = ? AND created_at BETWEEN ? AND ? GROUP BY name ORDER BY count DESC LIMIT 10
	`, code, start, end)
	if err != nil {
		return nil, err
	}

	// 6. Countries
	err = conn.Select(ctx, &resp.Countries, `
		SELECT country as name, count() as count 
		FROM analytics WHERE code = ? AND created_at BETWEEN ? AND ? GROUP BY name ORDER BY count DESC LIMIT 10
	`, code, start, end)
	if err != nil {
		return nil, err
	}

	// 7. Referrers
	err = conn.Select(ctx, &resp.Referrers, `
		SELECT domain(referer) as name, count() as count 
		FROM analytics WHERE code = ? AND referer != '' AND created_at BETWEEN ? AND ? GROUP BY name ORDER BY count DESC LIMIT 10
	`, code, start, end)
	if err != nil {
		return nil, err
	}

	return &resp, nil
}
