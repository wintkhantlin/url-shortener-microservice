package models

import (
	"net/url"
	"strings"
	"time"
)

type AnalyticsEvent struct {
	Code      string `json:"code" validate:"required" ch:"code"`
	IP        string `json:"ip" validate:"omitempty"`
	UserAgent string `json:"userAgent" validate:"omitempty"`
	Referer   string `json:"referer" validate:"omitempty" ch:"referer"`
	Browser   string `json:"browser" validate:"required" ch:"browser"`
	OS        string `json:"os" validate:"required" ch:"os"`
	Device    string `json:"device" validate:"required" ch:"device_type"`
	Country   string `json:"country" validate:"required" ch:"country"`
	State     string `json:"state" validate:"required" ch:"state"`
}

func normalizeString(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "unknown"
	}
	return strings.ToLower(value)
}

func normalizeDevice(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return "desktop"
	}

	switch value {
	case "phone", "mobile", "iphone", "android", "ipad", "tablet":
		return "mobile"
	case "computer", "desktop", "pc", "mac", "windows", "linux", "chromebook":
		return "desktop"
	case "other", "unknown":
		return "desktop"
	default:
		if strings.Contains(value, "mobile") || strings.Contains(value, "iphone") || strings.Contains(value, "android") || strings.Contains(value, "ipad") || strings.Contains(value, "tablet") || strings.Contains(value, "phone") {
			return "mobile"
		}
		return "desktop"
	}
}

func normalizeReferer(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}

	lower := strings.ToLower(value)
	switch lower {
	case "null", "-", "(null)", "about:blank":
		return ""
	}

	// Ensure we can parse hostnames consistently.
	if strings.HasPrefix(value, "//") {
		value = "https:" + value
	} else if !strings.Contains(value, "://") {
		value = "https://" + value
	}

	parsed, err := url.Parse(value)
	if err != nil {
		return ""
	}

	host := strings.ToLower(parsed.Hostname())
	if host == "" {
		return ""
	}

	// Store only scheme+host to keep referers stable and small.
	return "https://" + host + "/"
}

func (e *AnalyticsEvent) Transform() {
	e.Code = strings.TrimSpace(e.Code)
	e.IP = strings.TrimSpace(e.IP)
	e.UserAgent = strings.TrimSpace(e.UserAgent)

	e.Browser = normalizeString(e.Browser)
	e.OS = normalizeString(e.OS)
	e.Device = normalizeDevice(e.Device)
	e.Country = normalizeString(e.Country)
	e.State = normalizeString(e.State)
	e.Referer = normalizeReferer(e.Referer)
}

type TimelineEntry struct {
	Time  time.Time `json:"time" ch:"time"`
	Count uint64    `json:"count" ch:"count"`
}

type DimensionSummary struct {
	Name  string `json:"name" ch:"name"`
	Count uint64 `json:"count" ch:"count"`
}

type AnalyticsResponse struct {
	TotalClicks uint64             `json:"total_clicks"`
	Timeline    []TimelineEntry    `json:"timeline"`
	Browsers    []DimensionSummary `json:"browsers"`
	OS          []DimensionSummary `json:"os"`
	Devices     []DimensionSummary `json:"devices"`
	Countries   []DimensionSummary `json:"countries"`
	Referrers   []DimensionSummary `json:"referrers"`
}
