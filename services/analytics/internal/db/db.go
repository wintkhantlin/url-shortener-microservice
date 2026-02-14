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

func GetAnalytics(ctx context.Context, conn clickhouse.Conn, code string) (*models.AnalyticsResponse, error) {
	var resp models.AnalyticsResponse

	// 1. Total Clicks
	err := conn.QueryRow(ctx, "SELECT count() FROM analytics WHERE code = ?", code).Scan(&resp.TotalClicks)
	if err != nil {
		return nil, err
	}

	// 2. Timeline (Last 24 hours by hour)
	err = conn.Select(ctx, &resp.Timeline, `
		SELECT toStartOfHour(created_at) as time, count() as count 
		FROM analytics 
		WHERE code = ? AND created_at > now() - INTERVAL 24 HOUR
		GROUP BY time ORDER BY time
	`, code)
	if err != nil {
		return nil, err
	}

	// 3. Browsers
	err = conn.Select(ctx, &resp.Browsers, `
		SELECT browser as name, count() as count 
		FROM analytics WHERE code = ? GROUP BY name ORDER BY count DESC
	`, code)
	if err != nil {
		return nil, err
	}

	// 4. OS
	err = conn.Select(ctx, &resp.OS, `
		SELECT os as name, count() as count 
		FROM analytics WHERE code = ? GROUP BY name ORDER BY count DESC
	`, code)
	if err != nil {
		return nil, err
	}

	// 5. Devices
	err = conn.Select(ctx, &resp.Devices, `
		SELECT device_type as name, count() as count 
		FROM analytics WHERE code = ? GROUP BY name ORDER BY count DESC
	`, code)
	if err != nil {
		return nil, err
	}

	// 6. Countries
	err = conn.Select(ctx, &resp.Countries, `
		SELECT country as name, count() as count 
		FROM analytics WHERE code = ? GROUP BY name ORDER BY count DESC
	`, code)
	if err != nil {
		return nil, err
	}

	// 7. Referrers
	err = conn.Select(ctx, &resp.Referrers, `
		SELECT domain(referer) as name, count() as count 
		FROM analytics WHERE code = ? AND referer != '' GROUP BY name ORDER BY count DESC
	`, code)
	if err != nil {
		return nil, err
	}

	return &resp, nil
}
