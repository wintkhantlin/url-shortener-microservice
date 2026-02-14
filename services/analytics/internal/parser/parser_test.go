package parser

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseUserAgent(t *testing.T) {
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
