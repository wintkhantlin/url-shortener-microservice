package parser

import (
	"github.com/ua-parser/uap-go/uaparser"
)

var parser *uaparser.Parser

func init() {
	parser = uaparser.NewFromSaved()
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

	client := parser.Parse(userAgent)
	
	info := UserAgentInfo{
		Browser: client.UserAgent.Family,
		OS:      client.Os.Family,
		Device:  client.Device.Family,
	}

	if info.Browser == "" { info.Browser = "unknown" }
	if info.OS == "" { info.OS = "unknown" }
	if info.Device == "" { info.Device = "unknown" }

	return info
}
