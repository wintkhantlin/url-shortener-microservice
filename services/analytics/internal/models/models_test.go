package models

import "testing"

func TestAnalyticsEventTransform_NormalizesDeviceTwoBuckets(t *testing.T) {
	tests := []struct {
		name   string
		device string
		want   string
	}{
		{name: "iPhone -> mobile", device: "iPhone", want: "mobile"},
		{name: "Mobile -> mobile", device: "mobile", want: "mobile"},
		{name: "iPad -> mobile", device: "iPad", want: "mobile"},
		{name: "Mac -> desktop", device: "Mac", want: "desktop"},
		{name: "Windows -> desktop", device: "Windows", want: "desktop"},
		{name: "Unknown -> desktop", device: "unknown", want: "desktop"},
		{name: "Other -> desktop", device: "Other", want: "desktop"},
		{name: "Empty -> desktop", device: "", want: "desktop"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := AnalyticsEvent{
				Code:    "abc",
				Browser: "Chrome",
				OS:      "Windows",
				Device:  tt.device,
				Country: "US",
				State:   "CA",
			}

			event.Transform()
			if event.Device != tt.want {
				t.Fatalf("device=%q want=%q", event.Device, tt.want)
			}
		})
	}
}

func TestAnalyticsEventTransform_CleansReferer(t *testing.T) {
	tests := []struct {
		name    string
		referer string
		want    string
	}{
		{name: "Empty stays empty", referer: "", want: ""},
		{name: "Null becomes empty", referer: "null", want: ""},
		{name: "About blank becomes empty", referer: "about:blank", want: ""},
		{name: "URL becomes scheme+host", referer: "https://Example.COM/path?q=1", want: "https://example.com/"},
		{name: "Host becomes scheme+host", referer: "example.com/some/path", want: "https://example.com/"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := AnalyticsEvent{
				Code:    "abc",
				Browser: "Chrome",
				OS:      "Windows",
				Device:  "Mac",
				Country: "US",
				State:   "CA",
				Referer: tt.referer,
			}

			event.Transform()
			if event.Referer != tt.want {
				t.Fatalf("referer=%q want=%q", event.Referer, tt.want)
			}
		})
	}
}
