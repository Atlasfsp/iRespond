package authz

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type Decision struct {
	Allow bool `json:"allow"`
	Reason string `json:"reason"`
	DecisionID string `json:"decision_id"`
}

type Client struct{BaseURL,Tenant string;HTTP *http.Client}
func New(baseURL,tenant string)*Client{return &Client{BaseURL:strings.TrimRight(baseURL,"/"),Tenant:tenant,HTTP:&http.Client{Timeout:3*time.Second}}}

func(c *Client)Check(ctx context.Context,subject,action,resource,class string)(Decision,error){
	if c.BaseURL==""||c.Tenant==""{return Decision{},fmt.Errorf("authz endpoint and tenant are required")}
	body,err:=json.Marshal(map[string]string{"Subject":subject,"Action":action,"Resource":resource,"Class":class});if err!=nil{return Decision{},err}
	req,err:=http.NewRequestWithContext(ctx,http.MethodPost,c.BaseURL+"/api/v1/check",bytes.NewReader(body));if err!=nil{return Decision{},err};req.Header.Set("Content-Type","application/json");req.Header.Set("X-Tenant-Id",c.Tenant);req.Header.Set("Idempotency-Key",requestKey(subject,action,resource))
	resp,err:=c.HTTP.Do(req);if err!=nil{return Decision{},err};defer resp.Body.Close();if resp.StatusCode!=http.StatusOK{return Decision{},fmt.Errorf("SS-13 check returned %s",resp.Status)}
	var decision Decision;if err=json.NewDecoder(resp.Body).Decode(&decision);err!=nil{return Decision{},err};return decision,nil
}

func requestKey(subject,action,resource string)string{return "irespond-authz-"+safe(subject)+"-"+safe(action)+"-"+safe(resource)}
func safe(v string)string{v=strings.ToLower(strings.TrimSpace(v));r:=strings.NewReplacer("/","_",":","_"," ","_",".","_");return r.Replace(v)}
