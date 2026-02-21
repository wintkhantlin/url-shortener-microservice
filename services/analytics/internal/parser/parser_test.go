package parser

import (
	"context"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"google.golang.org/grpc"

	pb "github.com/wintkhantlin/url2short-useragent/gen"
)

type fakeUserAgentClient struct{}

func (fakeUserAgentClient) Parse(ctx context.Context, in *pb.UserAgentRequest, opts ...grpc.CallOption) (*pb.UserAgentResponse, error) {
	ua := in.GetUserAgent()

	switch {
	case strings.Contains(ua, "Chrome/120.0.0.0") && strings.Contains(ua, "Mac OS X"):
		return &pb.UserAgentResponse{Browser: "Chrome", Os: "Mac OS X", Device: "Mac"}, nil
	case strings.Contains(ua, "Firefox/119.0") && strings.Contains(ua, "Windows NT 10.0"):
		return &pb.UserAgentResponse{Browser: "Firefox", Os: "Windows", Device: "Other"}, nil
	case strings.Contains(ua, "iPhone") && strings.Contains(ua, "Mobile/") && strings.Contains(ua, "Safari/"):
		return &pb.UserAgentResponse{Browser: "Mobile Safari", Os: "iOS", Device: "iPhone"}, nil
	default:
		return &pb.UserAgentResponse{Browser: "unknown", Os: "unknown", Device: "unknown"}, nil
	}
}

func TestParseUserAgent(t *testing.T) {
	prev := client
	client = fakeUserAgentClient{}
	t.Cleanup(func() { client = prev })

	tests := []struct {
		name      string
		userAgent string
		expected  UserAgentInfo
	}{
		{
			name:      "Chrome on macOS",
			userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			expected: UserAgentInfo{
				Browser: "Chrome",
				OS:      "Mac OS X",
				Device:  "Mac",
			},
		},
		{
			name:      "Firefox on Windows",
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
			expected: UserAgentInfo{
				Browser: "Firefox",
				OS:      "Windows",
				Device:  "Other",
			},
		},
		{
			name:      "iPhone Safari",
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
			expected: UserAgentInfo{
				Browser: "Mobile Safari",
				OS:      "iOS",
				Device:  "iPhone",
			},
		},
		{
			name:      "Empty User Agent",
			userAgent: "",
			expected: UserAgentInfo{
				Browser: "unknown",
				OS:      "unknown",
				Device:  "unknown",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ParseUserAgent(tt.userAgent)
			assert.Equal(t, tt.expected, got)
		})
	}
}
