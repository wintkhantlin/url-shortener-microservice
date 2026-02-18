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

func Init(dbPath string) error {
	var err error
	once.Do(func() {
		absPath, _ := filepath.Abs(dbPath)
		slog.Info("Loading GeoIP database", "path", absPath)

		db, err = geoip2.Open(dbPath)
		if err != nil {
			slog.Error("Failed to open GeoIP database", "error", err, "path", dbPath)
		}
	})
	return err
}

func Lookup(ipStr string) (country, state string) {
	ip := net.ParseIP(ipStr)
	record, err := db.City(ip)
	if err != nil || record == nil {
		return "unknown", "unknown"
	}

	country = record.Country.Names["en"]

	if len(record.Subdivisions) > 0 {
		state = record.Subdivisions[0].Names["en"]
	} else {
		state = "unknown"
	}

	return country, state
}

func Close() {
	if db != nil {
		db.Close()
	}
}
