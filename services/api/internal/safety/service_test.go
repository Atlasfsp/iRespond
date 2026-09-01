package safety

import "testing"

func TestGenericPlatformSafetySubjectIsSupported(t *testing.T) {
	if !subjects["platform"] {
		t.Fatal("platform safety reports must be supported by the domain contract")
	}
}
