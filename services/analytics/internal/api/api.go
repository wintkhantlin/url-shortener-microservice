package api

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/gin-gonic/gin"
	"github.com/wintkhantlin/url2short-analytics/internal/config"
	"github.com/wintkhantlin/url2short-analytics/internal/db"
)

func Start(conn clickhouse.Conn, cfg *config.Config) {
	r := gin.Default()

	r.GET("/:code", func(c *gin.Context) {
		code := c.Param("code")
		if code == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "code is required"})
			return
		}

		resp, err := db.GetAnalytics(c.Request.Context(), conn, code)
		if err != nil {
			slog.Error("Failed to get analytics", "error", err, "code", code)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get analytics"})
			return
		}

		c.JSON(http.StatusOK, resp)
	})

	slog.Info("Analytics API (Gin) listening", "port", cfg.APIPort)
	if err := r.Run(fmt.Sprintf(":%s", cfg.APIPort)); err != nil {
		slog.Error("Failed to start API server", "error", err)
	}
}
