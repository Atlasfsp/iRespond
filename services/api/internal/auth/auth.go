package auth

import (
	"context"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"
)

var (
	ErrMissingToken = errors.New("missing bearer token")
	ErrInvalidToken = errors.New("invalid bearer token")
	ErrForbidden    = errors.New("forbidden")
)

type Principal struct {
	Subject string
	Roles   map[string]struct{}
}

func (p Principal) HasRole(role string) bool {
	_, ok := p.Roles[role]
	return ok
}

type Verifier interface {
	Verify(context.Context, string) (Principal, error)
}

type JWTVerifier struct {
	Issuer   string
	Audience string
	JWKSURL  string
	Client   *http.Client

	mu        sync.RWMutex
	keys      map[string]*rsa.PublicKey
	keysUntil time.Time
}

type tokenHeader struct {
	Alg string `json:"alg"`
	Kid string `json:"kid"`
}

type claims struct {
	Sub   string      `json:"sub"`
	Iss   string      `json:"iss"`
	Aud   any         `json:"aud"`
	Exp   int64       `json:"exp"`
	Nbf   int64       `json:"nbf"`
	Roles []string    `json:"roles"`
	Scope string      `json:"scope"`
	Groups []string   `json:"groups"`
}

type jwks struct {
	Keys []struct {
		Kty string `json:"kty"`
		Kid string `json:"kid"`
		Use string `json:"use"`
		Alg string `json:"alg"`
		N   string `json:"n"`
		E   string `json:"e"`
		X5C []string `json:"x5c"`
	} `json:"keys"`
}

func (v *JWTVerifier) Verify(ctx context.Context, token string) (Principal, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 { return Principal{}, ErrInvalidToken }

	var h tokenHeader
	if err := decodeJSON(parts[0], &h); err != nil || h.Alg != "RS256" || h.Kid == "" { return Principal{}, ErrInvalidToken }
	var c claims
	if err := decodeJSON(parts[1], &c); err != nil { return Principal{}, ErrInvalidToken }

	now := time.Now().Unix()
	if c.Sub == "" || c.Iss != strings.TrimRight(v.Issuer, "/") || c.Exp <= now || (c.Nbf != 0 && c.Nbf > now) || !audienceContains(c.Aud, v.Audience) {
		return Principal{}, ErrInvalidToken
	}
	key, err := v.key(ctx, h.Kid)
	if err != nil { return Principal{}, ErrInvalidToken }
	digest := sha256.Sum256([]byte(parts[0] + "." + parts[1]))
	sig, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil || rsa.VerifyPKCS1v15(key, cryptoHashSHA256, digest[:], sig) != nil { return Principal{}, ErrInvalidToken }

	roles := map[string]struct{}{}
	for _, role := range c.Roles { if role = strings.TrimSpace(role); role != "" { roles[role] = struct{}{} } }
	for _, group := range c.Groups { if group = strings.TrimSpace(group); group != "" { roles[group] = struct{}{} } }
	for _, scope := range strings.Fields(c.Scope) { roles["scope:"+scope] = struct{}{} }
	return Principal{Subject:c.Sub, Roles:roles}, nil
}

// cryptoHashSHA256 is crypto.SHA256 without importing callers into crypto internals.
const cryptoHashSHA256 = 5

func (v *JWTVerifier) key(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	v.mu.RLock(); key := v.keys[kid]; fresh := time.Now().Before(v.keysUntil); v.mu.RUnlock()
	if key != nil && fresh { return key, nil }
	if err := v.refresh(ctx); err != nil { return nil, err }
	v.mu.RLock(); defer v.mu.RUnlock()
	key = v.keys[kid]
	if key == nil { return nil, fmt.Errorf("kid not found") }
	return key, nil
}

func (v *JWTVerifier) refresh(ctx context.Context) error {
	client := v.Client
	if client == nil { client = &http.Client{Timeout:5*time.Second} }
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.JWKSURL, nil); if err != nil { return err }
	resp, err := client.Do(req); if err != nil { return err }
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK { return fmt.Errorf("jwks status %d", resp.StatusCode) }
	var set jwks
	if err := json.NewDecoder(resp.Body).Decode(&set); err != nil { return err }
	keys := map[string]*rsa.PublicKey{}
	for _, item := range set.Keys {
		if item.Kty != "RSA" || item.Kid == "" { continue }
		if len(item.X5C) > 0 {
			der, err := base64.StdEncoding.DecodeString(item.X5C[0]); if err == nil {
				if cert, err := x509.ParseCertificate(der); err == nil { if pub, ok := cert.PublicKey.(*rsa.PublicKey); ok { keys[item.Kid] = pub; continue } }
			}
		}
		n, errN := base64.RawURLEncoding.DecodeString(item.N); e, errE := base64.RawURLEncoding.DecodeString(item.E)
		if errN != nil || errE != nil || len(n)==0 || len(e)==0 { continue }
		exp:=0; for _, b:=range e { exp = exp<<8 + int(b) }
		if exp > 0 { keys[item.Kid] = &rsa.PublicKey{N:new(big.Int).SetBytes(n),E:exp} }
	}
	if len(keys)==0 { return fmt.Errorf("jwks contains no usable RSA keys") }
	v.mu.Lock(); v.keys=keys; v.keysUntil=time.Now().Add(5*time.Minute); v.mu.Unlock()
	return nil
}

func BearerToken(r *http.Request) (string, error) {
	header := strings.TrimSpace(r.Header.Get("Authorization"))
	if !strings.HasPrefix(strings.ToLower(header), "bearer ") { return "", ErrMissingToken }
	token := strings.TrimSpace(header[len("Bearer "):]); if token=="" { return "", ErrMissingToken }
	return token, nil
}

func decodeJSON(segment string, out any) error {
	b, err := base64.RawURLEncoding.DecodeString(segment); if err != nil { return err }
	return json.Unmarshal(b, out)
}

func audienceContains(value any, expected string) bool {
	switch v := value.(type) {
	case string: return v == expected
	case []any: for _, item := range v { if s, ok := item.(string); ok && s == expected { return true } }
	}
	return false
}
