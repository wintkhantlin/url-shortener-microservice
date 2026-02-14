package api

import (
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/gin-gonic/gin"
	"github.com/wintkhantlin/url2short-analytics/internal/config"
	"github.com/wintkhantlin/url2short-analytics/internal/db"
)

func Start(conn clickhouse.Conn, cfg *config.Config) {
	r := gin.Default()

	r.SetTrustedProxies(nil)

	r.GET("/:code", func(c *gin.Context) {
		code := c.Param("code")
		if code == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "code is required"})
			return
		}

		userID := c.GetHeader("X-User-Id")
		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		// Verify ownership via Management Service
		req, err := http.NewRequestWithContext(c.Request.Context(), "GET", fmt.Sprintf("%s/aliases/%s", cfg.ManagementURL, code), nil)
		if err != nil {
			slog.Error("Failed to create verification request", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			return
		}
		req.Header.Set("X-User-Id", userID)

		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			slog.Error("Failed to call management service", "error", err)
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Verification service unavailable"})
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			if resp.StatusCode == http.StatusNotFound {
				c.JSON(http.StatusNotFound, gin.H{"error": "Alias not found or access denied"})
				return
			}
			slog.Warn("Management service returned error", "status", resp.StatusCode)
			c.JSON(resp.StatusCode, gin.H{"error": "Verification failed"})
			return
		}

		analyticsResp, err := db.GetAnalytics(c.Request.Context(), conn, code)
		if err != nil {
			slog.Error("Failed to get analytics", "error", err, "code", code)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get analytics"})
			return
		}

		c.JSON(http.StatusOK, analyticsResp)
	})

	slog.Info("Analytics API (Gin) listening", "port", cfg.APIPort)
	if err := r.Run(fmt.Sprintf(":%s", cfg.APIPort)); err != nil {
		slog.Error("Failed to start API server", "error", err)
	}
}
