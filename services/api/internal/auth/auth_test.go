package auth

import (
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Atlasfsp/iRespond/services/api/internal/needs"
)

func TestJWTVerifierAndPolicy(t *testing.T) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil { t.Fatal(err) }
	kid := "test-key"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		e := big.NewInt(int64(key.PublicKey.E)).Bytes()
		_ = json.NewEncoder(w).Encode(map[string]any{"keys": []map[string]any{{
			"kty":"RSA", "kid":kid, "alg":"RS256", "use":"sig",
			"n":base64.RawURLEncoding.EncodeToString(key.PublicKey.N.Bytes()),
			"e":base64.RawURLEncoding.EncodeToString(e),
		}}})
	}))
	defer server.Close()

	verifier := &JWTVerifier{Issuer:"https://identity.example",Audience:"irespond-api",JWKSURL:server.URL}
	token := signedToken(t,key,kid,map[string]any{
		"sub":"person-123", "iss":"https://identity.example", "aud":"irespond-api",
		"exp":time.Now().Add(time.Hour).Unix(), "roles":[]string{"community_verifier"},
	})
	principal, err := verifier.Verify(context.Background(), token)
	if err != nil { t.Fatalf("verify token: %v", err) }
	if principal.Subject != "person-123" || !principal.HasRole("community_verifier") { t.Fatalf("unexpected principal: %#v", principal) }
	if !CanTransition(principal, needs.VerificationRequested) { t.Fatal("authenticated principal should request verification") }
	if !CanTransition(principal, needs.CommunityConfirmed) { t.Fatal("community verifier should confirm community verification") }
	if CanTransition(principal, needs.GovernmentConfirmed) { t.Fatal("community verifier must not perform government confirmation") }
	if CanTransition(principal, needs.Rejected) { t.Fatal("community verifier must not reject needs") }
}

func TestJWTVerifierRejectsWrongAudience(t *testing.T) {
	key, _ := rsa.GenerateKey(rand.Reader, 2048)
	kid := "test-key"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		e := big.NewInt(int64(key.PublicKey.E)).Bytes()
		_ = json.NewEncoder(w).Encode(map[string]any{"keys": []map[string]any{{"kty":"RSA","kid":kid,"n":base64.RawURLEncoding.EncodeToString(key.PublicKey.N.Bytes()),"e":base64.RawURLEncoding.EncodeToString(e)}}})
	}))
	defer server.Close()
	verifier := &JWTVerifier{Issuer:"https://identity.example",Audience:"irespond-api",JWKSURL:server.URL}
	token := signedToken(t,key,kid,map[string]any{"sub":"person-123","iss":"https://identity.example","aud":"other-api","exp":time.Now().Add(time.Hour).Unix()})
	if _, err := verifier.Verify(context.Background(), token); err == nil { t.Fatal("expected wrong audience to fail") }
}

func signedToken(t *testing.T, key *rsa.PrivateKey, kid string, claims map[string]any) string {
	t.Helper()
	header, _ := json.Marshal(map[string]string{"alg":"RS256","typ":"JWT","kid":kid})
	payload, _ := json.Marshal(claims)
	encodedHeader := base64.RawURLEncoding.EncodeToString(header)
	encodedPayload := base64.RawURLEncoding.EncodeToString(payload)
	input := encodedHeader + "." + encodedPayload
	digest := sha256.Sum256([]byte(input))
	sig, err := rsa.SignPKCS1v15(rand.Reader,key,crypto.SHA256,digest[:])
	if err != nil { t.Fatal(err) }
	return input + "." + base64.RawURLEncoding.EncodeToString(sig)
}
