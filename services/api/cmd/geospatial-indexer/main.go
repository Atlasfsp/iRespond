package main

import(
 "context"
 "log"
 "os"
 "os/signal"
 "strings"
 "syscall"
 "time"

 geospatial "github.com/Atlasfsp/iRespond/services/api/internal/platform/geospatial"
 "github.com/nats-io/nats.go"
)

func main(){
 natsURL:=strings.TrimSpace(os.Getenv("NATS_URL"));stream:=strings.TrimSpace(os.Getenv("NATS_STREAM"));geoURL:=strings.TrimSpace(os.Getenv("GEOSPATIAL_URL"));tenant:=strings.TrimSpace(os.Getenv("SHARED_SERVICES_TENANT_ID"))
 if natsURL==""||stream==""||geoURL==""||tenant==""{log.Fatal("NATS_URL, NATS_STREAM, GEOSPATIAL_URL and SHARED_SERVICES_TENANT_ID are required")}
 ctx,cancel:=signal.NotifyContext(context.Background(),os.Interrupt,syscall.SIGTERM);defer cancel()
 nc,err:=nats.Connect(natsURL,nats.Name("irespond-geospatial-indexer"));if err!=nil{log.Fatal(err)};defer nc.Close();js,err:=nc.JetStream();if err!=nil{log.Fatal(err)}
 sub,err:=js.PullSubscribe("irespond.events.need.reported","irespond-geospatial",nats.BindStream(stream),nats.ManualAck());if err!=nil{log.Fatal(err)}
 client:=geospatial.New(geoURL,tenant)
 for ctx.Err()==nil{
  msgs,err:=sub.Fetch(20,nats.MaxWait(2*time.Second));if err!=nil&&err!=nats.ErrTimeout{log.Printf("fetch: %v",err);time.Sleep(time.Second);continue}
  for _,msg:=range msgs{
   itemCtx,cancelItem:=context.WithTimeout(ctx,5*time.Second);err:=geospatial.IndexDomainEvent(itemCtx,client,msg.Data);cancelItem()
   if err!=nil{log.Printf("index event: %v",err);_ = msg.Nak();continue};if err:=msg.Ack();err!=nil{log.Printf("ack: %v",err)}
  }
 }
}
