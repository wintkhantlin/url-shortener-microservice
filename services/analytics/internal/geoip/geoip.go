package geoip

import (
	"log/slog"
	"net"
	"path/filepath"
	"sync"

	"github.com/oschwald/geoip2-golang"
)

var (
	db   *geoip2.Reader
	once sync.Once
)

// Init initializes the GeoIP database.
func Init(dbPath string) error {
	var err error
	once.Do(func() {
		if dbPath == "" {
			// Default path if not provided
			dbPath = "GeoLite2-City.mmdb"
		}
		
		absPath, _ := filepath.Abs(dbPath)
		slog.Info("Loading GeoIP database", "path", absPath)
		
		db, err = geoip2.Open(dbPath)
		if err != nil {
			slog.Error("Failed to open GeoIP database", "error", err, "path", dbPath)
		}
	})
	return err
}

// GetLocation returns the country and state for a given IP address.
// Returns "unknown", "unknown" if the IP is invalid or lookup fails.
// Returns "internal", "internal" for localhost/internal IPs.
func GetLocation(ip string) (string, string) {
	if ip == "127.0.0.1" || ip == "localhost" || ip == "" {
		return "internal", "internal"
	}

	if db == nil {
		// If DB failed to load, return unknown
		return "unknown", "unknown"
	}

	parsedIP := net.ParseIP(ip)
	if parsedIP == nil {
		return "unknown", "unknown"
	}

	record, err := db.City(parsedIP)
	if err != nil {
		return "unknown", "unknown"
	}

	country := record.Country.Names["en"]
	if country == "" {
		country = "unknown"
	}

	state := "unknown"
	if len(record.Subdivisions) > 0 {
		state = record.Subdivisions[0].Names["en"]
	}

	return country, state
}

// Close closes the GeoIP database.
func Close() {
	if db != nil {
		db.Close()
	}
}
