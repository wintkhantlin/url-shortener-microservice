package geoip

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pb "github.com/wintkhantlin/url2short-ip2geo/gen"
)

var (
	client pb.Ip2GeoServiceClient
	conn   *grpc.ClientConn
	once   sync.Once
)

// Init initializes the GeoIP gRPC client.
func Init(addr string) error {
	var err error
	once.Do(func() {
		slog.Info("Connecting to IP2Geo service", "addr", addr)

		// Create a connection to the server
		conn, err = grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
		if err != nil {
			slog.Error("Failed to connect to IP2Geo service", "error", err, "addr", addr)
			return
		}

		client = pb.NewIp2GeoServiceClient(conn)
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

	if client == nil {
		return "unknown", "unknown"
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	resp, err := client.Lookup(ctx, &pb.IpRequest{Ip: ip})
	if err != nil {
		// Log error but don't fail the request, just return unknown
		slog.Debug("Failed to lookup IP", "ip", ip, "error", err)
		return "unknown", "unknown"
	}

	return resp.Country, resp.State
}

// Close closes the gRPC connection.
func Close() {
	if conn != nil {
		conn.Close()
	}
}
