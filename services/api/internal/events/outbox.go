package events

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nats-io/nats.go"
)

type Event struct {
	ID string
	AggregateType string
	AggregateID string
	EventType string
	Payload json.RawMessage
	OccurredAt time.Time
}

type Publisher interface { Publish(ctx context.Context, subject string, event Event) error }

type Outbox struct { pool *pgxpool.Pool; publisher Publisher; subjectPrefix string }

func NewOutbox(ctx context.Context, databaseURL, subjectPrefix string, publisher Publisher) (*Outbox,error) {
	pool,err:=pgxpool.New(ctx,databaseURL);if err!=nil{return nil,err};if err=pool.Ping(ctx);err!=nil{pool.Close();return nil,err}
	if strings.TrimSpace(subjectPrefix)==""{subjectPrefix="irespond.events"}
	return &Outbox{pool:pool,publisher:publisher,subjectPrefix:strings.TrimSuffix(subjectPrefix,".")},nil
}
func (o *Outbox) Close(){o.pool.Close()}

func (o *Outbox) Flush(ctx context.Context, limit int)(int,error){
	if limit<=0||limit>500{limit=100}
	rows,err:=o.pool.Query(ctx,`SELECT id,aggregate_type,aggregate_id,event_type,payload,occurred_at FROM outbox_events WHERE published_at IS NULL ORDER BY occurred_at,id LIMIT $1`,limit);if err!=nil{return 0,err}
	defer rows.Close();batch:=make([]Event,0,limit)
	for rows.Next(){var e Event;if err:=rows.Scan(&e.ID,&e.AggregateType,&e.AggregateID,&e.EventType,&e.Payload,&e.OccurredAt);err!=nil{return 0,err};batch=append(batch,e)}
	if err:=rows.Err();err!=nil{return 0,err}
	published:=0
	for _,e:=range batch{
		subject:=fmt.Sprintf("%s.%s",o.subjectPrefix,normalizeSubject(e.EventType))
		if err:=o.publisher.Publish(ctx,subject,e);err!=nil{return published,err}
		command,err:=o.pool.Exec(ctx,`UPDATE outbox_events SET published_at=now() WHERE id=$1 AND published_at IS NULL`,e.ID);if err!=nil{return published,err};if command.RowsAffected()==1{published++}
	}
	return published,nil
}

func normalizeSubject(v string)string{v=strings.ToLower(strings.TrimSpace(v));r:=strings.NewReplacer("/","."," ","_",":",".");return r.Replace(v)}

type NATSPublisher struct{ js nats.JetStreamContext }
func NewNATSPublisher(url string)(*NATSPublisher,*nats.Conn,error){nc,err:=nats.Connect(url,nats.Name("irespond-outbox-publisher"));if err!=nil{return nil,nil,err};js,err:=nc.JetStream();if err!=nil{nc.Close();return nil,nil,err};return &NATSPublisher{js:js},nc,nil}
func (p *NATSPublisher) Publish(ctx context.Context,subject string,event Event)error{
	body,err:=json.Marshal(map[string]any{"id":event.ID,"aggregateType":event.AggregateType,"aggregateId":event.AggregateID,"eventType":event.EventType,"payload":event.Payload,"occurredAt":event.OccurredAt});if err!=nil{return err}
	msg:=nats.NewMsg(subject);msg.Data=body;msg.Header.Set("Nats-Msg-Id",event.ID);_,err=p.js.PublishMsg(msg,nats.Context(ctx));return err
}
