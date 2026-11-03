package evidence

import (
	"bytes"
	"net/http"
)

// A container-signature check, not a malware scan or authenticity decision.
func matchesMediaHeader(declared string, prefix []byte) bool {
	switch declared {
	case "image/jpeg", "image/png", "image/webp":
		return http.DetectContentType(prefix) == declared
	case "video/mp4", "video/quicktime":
		if len(prefix) < 12 || !bytes.Equal(prefix[4:8], []byte("ftyp")) {
			return false
		}
		brand := string(prefix[8:12])
		if declared == "video/quicktime" {
			return brand == "qt  "
		}
		return brand == "isom" || brand == "iso2" || brand == "mp41" || brand == "mp42" || brand == "avc1" || brand == "M4V "
	}
	return false
}
