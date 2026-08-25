package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/Atlasfsp/iRespond/services/api/internal/events"
)

func main(){
	db:=strings.TrimSpace(os.Getenv("DATABASE_URL")); natsURL:=strings.TrimSpace(os.Getenv("NATS_URL")); if db==""||natsURL==""{log.Fatal("DATABASE_URL and NATS_URL are required")}
	prefix:=strings.TrimSpace(os.Getenv("NATS_SUBJECT_PREFIX")); if prefix==""{prefix="irespond.events"}
	interval:=time.Second; if raw:=os.Getenv("OUTBOX_POLL_INTERVAL_MS");raw!=""{if ms,err:=strconv.Atoi(raw);err==nil&&ms>=100{interval=time.Duration(ms)*time.Millisecond}}
	ctx,cancel:=signal.NotifyContext(context.Background(),os.Interrupt,syscall.SIGTERM);defer cancel()
	publisher,nc,err:=events.NewNATSPublisher(natsURL);if err!=nil{log.Fatal(err)};defer nc.Close()
	outbox,err:=events.NewOutbox(ctx,db,prefix,publisher);if err!=nil{log.Fatal(err)};defer outbox.Close()
	ticker:=time.NewTicker(interval);defer ticker.Stop()
	for{count,err:=outbox.Flush(ctx,100);if err!=nil{log.Printf("outbox flush failed: %v",err)}else if count>0{log.Printf("published %d outbox events",count)};select{case<-ctx.Done():return;case<-ticker.C:}}
}
