package geospatial

import (
	"context"
	"encoding/json"
	"fmt"
)

type domainEnvelope struct {
	ID string `json:"id"`
	EventType string `json:"eventType"`
	Payload json.RawMessage `json:"payload"`
}

type reportedNeed struct {
	ID string `json:"id"`
	Title string `json:"title"`
	Latitude float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

func IndexDomainEvent(ctx context.Context, client *Client, body []byte) error {
	var envelope domainEnvelope
	if err:=json.Unmarshal(body,&envelope);err!=nil{return fmt.Errorf("decode domain envelope: %w",err)}
	if envelope.EventType!="need.reported"{return nil}
	var need reportedNeed
	if err:=json.Unmarshal(envelope.Payload,&need);err!=nil{return fmt.Errorf("decode need.reported payload: %w",err)}
	if need.ID==""||need.Title==""{return fmt.Errorf("need.reported payload lacks id or title")}
	return client.PutPlace(ctx,Place{ID:need.ID,Name:need.Title,Latitude:need.Latitude,Longitude:need.Longitude},envelope.ID)
}
