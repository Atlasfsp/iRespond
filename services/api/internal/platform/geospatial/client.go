package geospatial

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type Hit struct {
	ID string `json:"id"`
	Name string `json:"name"`
	Latitude float64 `json:"lat"`
	Longitude float64 `json:"lng"`
	DistanceKm float64 `json:"distance_km"`
}

type Client struct { BaseURL string; Tenant string; HTTP *http.Client }

func New(baseURL,tenant string)*Client{return &Client{BaseURL:strings.TrimRight(baseURL,"/"),Tenant:tenant,HTTP:&http.Client{Timeout:5*time.Second}}}

func(c *Client)Nearby(ctx context.Context,lat,lng,radiusKm float64)([]Hit,error){
	if c.BaseURL==""||c.Tenant==""{return nil,fmt.Errorf("geospatial endpoint and tenant are required")}
	u,err:=url.Parse(c.BaseURL+"/api/v1/nearby");if err!=nil{return nil,err};q:=u.Query();q.Set("lat",strconv.FormatFloat(lat,'f',6,64));q.Set("lng",strconv.FormatFloat(lng,'f',6,64));q.Set("radius_km",strconv.FormatFloat(radiusKm,'f',3,64));u.RawQuery=q.Encode()
	req,err:=http.NewRequestWithContext(ctx,http.MethodGet,u.String(),nil);if err!=nil{return nil,err};req.Header.Set("X-Tenant-Id",c.Tenant)
	resp,err:=c.HTTP.Do(req);if err!=nil{return nil,err};defer resp.Body.Close();if resp.StatusCode!=http.StatusOK{return nil,fmt.Errorf("SS-44 nearby returned %s",resp.Status)}
	var envelope struct{Hits []Hit `json:"hits"`};if err=json.NewDecoder(resp.Body).Decode(&envelope);err!=nil{return nil,err};return envelope.Hits,nil
}
