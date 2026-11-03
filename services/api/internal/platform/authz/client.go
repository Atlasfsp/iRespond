package authz

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Decision struct {
	Allow      bool   `json:"allow"`
	Reason     string `json:"reason"`
	DecisionID string `json:"decision_id"`
}

type Client struct {
	BaseURL, Tenant string
	HTTP            *http.Client
}

func New(baseURL, tenant string) *Client {
	return &Client{BaseURL: strings.TrimRight(baseURL, "/"), Tenant: tenant, HTTP: &http.Client{Timeout: 3 * time.Second}}
}

// Check implements the canonical SS-13 /api/v1/check contract. Invalid/missing
// receipts, redirects and partial responses can never confer authority.
func (c *Client) Check(ctx context.Context, subject, action, resource, class string) (Decision, error) {
	if strings.TrimSpace(c.Tenant) == "" || strings.TrimSpace(subject) == "" || strings.TrimSpace(action) == "" || strings.TrimSpace(resource) == "" {
		return Decision{}, fmt.Errorf("authz tenant, subject, action and resource are required")
	}
	base, err := url.Parse(c.BaseURL)
	if err != nil || (base.Scheme != "http" && base.Scheme != "https") || base.Host == "" || base.User != nil || base.RawQuery != "" || base.Fragment != "" {
		return Decision{}, fmt.Errorf("invalid authorization service URL")
	}
	body, err := json.Marshal(map[string]string{"Subject": subject, "Action": action, "Resource": resource, "Class": class})
	if err != nil {
		return Decision{}, err
	}
	endpoint := base.ResolveReference(&url.URL{Path: "/api/v1/check"})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint.String(), bytes.NewReader(body))
	if err != nil {
		return Decision{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Tenant-Id", c.Tenant)
	// Policy reads must be fresh after revocation. Never reuse a stable cached allow
	// under a mutation-style idempotency key, including across case-sensitive IDs.
	var nonce [16]byte
	if _, err := rand.Read(nonce[:]); err != nil {
		return Decision{}, err
	}
	req.Header.Set("Idempotency-Key", "irespond-authz-"+hex.EncodeToString(nonce[:]))
	client := http.Client{Timeout: 3 * time.Second}
	if c.HTTP != nil {
		client = *c.HTTP
	}
	if client.Timeout <= 0 {
		client.Timeout = 3 * time.Second
	}
	client.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	resp, err := client.Do(req)
	if err != nil {
		return Decision{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return Decision{}, fmt.Errorf("SS-13 check returned %s", resp.Status)
	}
	const maxDecisionBytes = 32 << 10
	data, err := io.ReadAll(io.LimitReader(resp.Body, maxDecisionBytes+1))
	if err != nil || len(data) > maxDecisionBytes {
		return Decision{}, fmt.Errorf("invalid authorization response size")
	}
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	var decision Decision
	if err := decoder.Decode(&decision); err != nil {
		return Decision{}, fmt.Errorf("invalid authorization response")
	}
	var extra any
	if err := decoder.Decode(&extra); err != io.EOF {
		return Decision{}, fmt.Errorf("authorization response must contain one decision")
	}
	if strings.TrimSpace(decision.DecisionID) == "" {
		return Decision{}, fmt.Errorf("authorization decision receipt is required")
	}
	return decision, nil
}
