package parser

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pb "github.com/wintkhantlin/url2short-useragent/gen"
)

var (
	client pb.UserAgentServiceClient
	conn   *grpc.ClientConn
	once   sync.Once
)

// Init initializes the UserAgent gRPC client.
func Init(addr string) error {
	var err error
	once.Do(func() {
		slog.Info("Connecting to UserAgent service", "addr", addr)

		// Create a connection to the server
		conn, err = grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
		if err != nil {
			slog.Error("Failed to connect to UserAgent service", "error", err, "addr", addr)
			return
		}

		client = pb.NewUserAgentServiceClient(conn)
	})
	return err
}

type UserAgentInfo struct {
	Browser string
	OS      string
	Device  string
}

// ParseUserAgent parses the user agent string and returns browser, OS, and device information.
func ParseUserAgent(userAgent string) UserAgentInfo {
	if userAgent == "" {
		return UserAgentInfo{
			Browser: "unknown",
			OS:      "unknown",
			Device:  "unknown",
		}
	}

	if client == nil {
		return UserAgentInfo{
			Browser: "unknown",
			OS:      "unknown",
			Device:  "unknown",
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	resp, err := client.Parse(ctx, &pb.UserAgentRequest{UserAgent: userAgent})
	if err != nil {
		slog.Debug("Failed to parse user agent", "user_agent", userAgent, "error", err)
		return UserAgentInfo{
			Browser: "unknown",
			OS:      "unknown",
			Device:  "unknown",
		}
	}

	return UserAgentInfo{
		Browser: resp.Browser,
		OS:      resp.Os,
		Device:  resp.Device,
	}
}

// Close closes the gRPC connection.
func Close() {
	if conn != nil {
		conn.Close()
	}
}
