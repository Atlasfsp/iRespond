package evidence

import (
	"encoding/binary"
	"testing"
)

func TestMediaHeaderCannotBeClaimedFromHTML(t *testing.T) {
	for _, mime := range []string{"image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"} {
		if matchesMediaHeader(mime, []byte("<html><script>unsafe</script></html>")) {
			t.Fatal(mime)
		}
	}
	if !matchesMediaHeader("image/jpeg", []byte{255, 216, 255, 224}) {
		t.Fatal("JPEG rejected")
	}
	mp4 := make([]byte, 24)
	binary.BigEndian.PutUint32(mp4, 24)
	copy(mp4[4:], "ftypisom")
	if !matchesMediaHeader("video/mp4", mp4) || matchesMediaHeader("video/quicktime", mp4) {
		t.Fatal("container type mismatch")
	}
}
