package models

import (
	"strings"
	"time"
)

type AnalyticsEvent struct {
	Code      string `json:"code" validate:"required" ch:"code"`
	IP        string `json:"ip" validate:"omitempty"`        // Not stored in CH
	UserAgent string `json:"userAgent" validate:"omitempty"` // Not stored in CH
	Browser   string `json:"browser" validate:"required" ch:"browser"`
	OS        string `json:"os" validate:"required" ch:"os"`
	Device    string `json:"device" validate:"required" ch:"device_type"`
	Country   string `json:"country" validate:"required" ch:"country"`
	State     string `json:"state" validate:"required" ch:"state"`
}

func (e *AnalyticsEvent) Transform() {
	e.Browser = strings.ToLower(e.Browser)
	e.OS = strings.ToLower(e.OS)
	e.Device = strings.ToLower(e.Device)
	e.Country = strings.ToLower(e.Country)
	e.State = strings.ToLower(e.State)
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
}
