package auth

import "strings"

// ValidTenantID matches the canonical Shared Services tenancy contract at
// 47ec7174f905dbc9e04f9ede4f5775e978540949. This validates syntax only, never membership.
func ValidTenantID(tenant string) bool {
	segments := strings.Split(tenant, "/")
	if len(segments) > 8 {
		return false
	}
	for _, segment := range segments {
		if len(segment) == 0 || len(segment) > 63 {
			return false
		}
		for i, r := range segment {
			if !(r >= 'a' && r <= 'z' || r >= '0' && r <= '9' || r == '-' && i > 0 && i < len(segment)-1) {
				return false
			}
		}
	}
	return true
}
