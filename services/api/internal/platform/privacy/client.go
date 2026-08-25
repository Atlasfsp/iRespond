package privacy

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Client struct{ BaseURL,Tenant,Token string; HTTP *http.Client }
type ConsentRequest struct{ Subject string `json:"subject"`; Purpose string `json:"purpose"`; Scope string `json:"scope"`; Basis string `json:"basis"`; Proof string `json:"proof"`; Grant bool `json:"grant"` }
type DSAR struct{ ID string `json:"id"`; Subject string `json:"subject"`; Kind string `json:"kind"`; State string `json:"state"`; CreatedAt time.Time `json:"created_at,omitempty"` }

func New(baseURL,tenant,token string)*Client{return &Client{BaseURL:strings.TrimRight(strings.TrimSpace(baseURL),"/"),Tenant:strings.TrimSpace(tenant),Token:strings.TrimSpace(token),HTTP:&http.Client{Timeout:5*time.Second}}}
func(c *Client)Configured()bool{return c!=nil&&c.BaseURL!=""&&c.Tenant!=""}
func(c *Client)do(ctx context.Context,method,path,key string,body any,out any)error{if !c.Configured(){return fmt.Errorf("SS-24 endpoint and tenant are required")};var payload *bytes.Reader;if body!=nil{b,err:=json.Marshal(body);if err!=nil{return err};payload=bytes.NewReader(b)}else{payload=bytes.NewReader(nil)};req,err:=http.NewRequestWithContext(ctx,method,c.BaseURL+path,payload);if err!=nil{return err};req.Header.Set("X-Tenant-Id",c.Tenant);if body!=nil{req.Header.Set("Content-Type","application/json")};if key!=""{req.Header.Set("Idempotency-Key",key)};if c.Token!=""{req.Header.Set("Authorization","Bearer "+c.Token)};resp,err:=c.HTTP.Do(req);if err!=nil{return err};defer resp.Body.Close();if resp.StatusCode<200||resp.StatusCode>=300{return fmt.Errorf("SS-24 returned %s",resp.Status)};if out!=nil{return json.NewDecoder(resp.Body).Decode(out)};return nil}
func(c *Client)CanProcess(ctx context.Context,subject,purpose string)(bool,error){q:=url.Values{};q.Set("subject",subject);q.Set("purpose",purpose);var out struct{Allowed bool `json:"allowed"`};err:=c.do(ctx,http.MethodGet,"/api/v1/can-process?"+q.Encode(),"",nil,&out);return out.Allowed,err}
func(c *Client)SetConsent(ctx context.Context,in ConsentRequest,key string)error{return c.do(ctx,http.MethodPost,"/api/v1/consent",key,in,nil)}
func(c *Client)OpenDSAR(ctx context.Context,subject,kind,key string)(DSAR,error){var out DSAR;err:=c.do(ctx,http.MethodPost,"/api/v1/dsar",key,map[string]string{"Subject":subject,"Kind":kind},&out);return out,err}
func(c *Client)GetDSAR(ctx context.Context,id string)(map[string]any,error){var out map[string]any;err:=c.do(ctx,http.MethodGet,"/api/v1/dsar/"+url.PathEscape(id),"",nil,&out);return out,err}
