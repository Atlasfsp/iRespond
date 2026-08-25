package geospatial

import(
 "context"
 "fmt"
 "net/http"
 "net/http/httptest"
 "testing"
)

func TestIndexDomainEventProjectsNeedIntoSS44(t *testing.T){
 called:=false
 srv:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){called=true;if r.Header.Get("Idempotency-Key")!="evt-1"{t.Fatalf("idempotency=%q",r.Header.Get("Idempotency-Key"))};w.WriteHeader(http.StatusCreated)}));defer srv.Close()
 body:=[]byte(`{"id":"evt-1","eventType":"need.reported","payload":{"id":"need-1","title":"Repair water point","latitude":6.52,"longitude":3.37}}`)
 if err:=IndexDomainEvent(context.Background(),New(srv.URL,"tenant-1"),body);err!=nil{t.Fatal(err)};if !called{t.Fatal("SS-44 was not called")}
}

func TestIndexDomainEventIgnoresUnrelatedEvent(t *testing.T){
 c:=New("http://invalid.example","tenant-1")
 if err:=IndexDomainEvent(context.Background(),c,[]byte(`{"id":"evt-2","eventType":"project.created","payload":{}}`));err!=nil{t.Fatal(err)}
}

func TestIndexDomainEventRejectsMalformedNeed(t *testing.T){
 err:=IndexDomainEvent(context.Background(),New("http://invalid.example","tenant-1"),[]byte(`{"id":"evt-3","eventType":"need.reported","payload":{}}`));if err==nil{t.Fatal("expected error")};_ = fmt.Sprint(err)
}
