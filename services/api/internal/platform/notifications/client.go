package notifications

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	BaseURL string
	Tenant  string
	Token   string
	HTTP    *http.Client
}

type Intent struct {
	Recipient string         `json:"recipient"`
	Template  string         `json:"template"`
	Sender    string         `json:"sender"`
	Class     string         `json:"class"`
	Category  string         `json:"category,omitempty"`
	Variables map[string]any `json:"variables,omitempty"`
}

type Delivery struct {
	ID     string `json:"id"`
	Status string `json:"status"`
	Reason string `json:"reason,omitempty"`
}

func New(baseURL, tenant, token string) *Client {
	return &Client{BaseURL: strings.TrimRight(strings.TrimSpace(baseURL), "/"), Tenant: strings.TrimSpace(tenant), Token: strings.TrimSpace(token), HTTP: &http.Client{Timeout: 5 * time.Second}}
}

func (c *Client) Configured() bool { return c != nil && c.BaseURL != "" && c.Tenant != "" }

func (c *Client) SendIntent(ctx context.Context, intent Intent, idempotencyKey string) (Delivery, error) {
	if !c.Configured() { return Delivery{}, fmt.Errorf("SS-18 endpoint and tenant are required") }
	if strings.TrimSpace(intent.Recipient) == "" || strings.TrimSpace(intent.Template) == "" { return Delivery{}, fmt.Errorf("recipient and template are required") }
	body, err := json.Marshal(intent); if err != nil { return Delivery{}, err }
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+"/api/v1/intents", bytes.NewReader(body)); if err != nil { return Delivery{}, err }
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Tenant-Id", c.Tenant)
	if idempotencyKey != "" { req.Header.Set("Idempotency-Key", idempotencyKey) }
	if c.Token != "" { req.Header.Set("Authorization", "Bearer "+c.Token) }
	resp, err := c.HTTP.Do(req); if err != nil { return Delivery{}, err }; defer resp.Body.Close()
	if resp.StatusCode != http.StatusAccepted && resp.StatusCode != http.StatusOK { return Delivery{}, fmt.Errorf("SS-18 intent returned %s", resp.Status) }
	var out Delivery
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil { return Delivery{}, err }
	return out, nil
}
