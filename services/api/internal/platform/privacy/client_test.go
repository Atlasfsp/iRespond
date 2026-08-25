package privacy

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestConsentAndDSARUseGovernedHeaders(t *testing.T){calls:=0;server:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){calls++;if r.Header.Get("X-Tenant-Id")!="irespond"{t.Fatalf("tenant=%q",r.Header.Get("X-Tenant-Id"))};if r.Header.Get("Authorization")!="Bearer svc"{t.Fatalf("auth=%q",r.Header.Get("Authorization"))};if r.Method==http.MethodPost&&r.Header.Get("Idempotency-Key")==""{t.Fatal("missing idempotency key")};w.Header().Set("Content-Type","application/json");switch r.URL.Path{case "/api/v1/consent":_,_=w.Write([]byte(`{"subject":"u1","purposes":["community.personalization"]}`));case "/api/v1/can-process":_,_=w.Write([]byte(`{"allowed":true}`));case "/api/v1/dsar":w.WriteHeader(http.StatusCreated);_,_=w.Write([]byte(`{"id":"d1","subject":"u1","kind":"access","state":"received"}`));default:t.Fatalf("path=%s",r.URL.Path)}}));defer server.Close();c:=New(server.URL,"irespond","svc");if err:=c.SetConsent(context.Background(),ConsentRequest{Subject:"u1",Purpose:"community.personalization",Grant:true},"c1");err!=nil{t.Fatal(err)};ok,err:=c.CanProcess(context.Background(),"u1","community.personalization");if err!=nil||!ok{t.Fatalf("can-process=%v err=%v",ok,err)};d,err:=c.OpenDSAR(context.Background(),"u1","access","d1");if err!=nil{t.Fatal(err)};if d.ID!="d1"{t.Fatalf("unexpected dsar: %#v",d)};if calls!=3{t.Fatalf("calls=%d",calls)}}
func TestPrivacyClientFailsClosedWhenUnconfigured(t *testing.T){c:=New("","","");if _,err:=c.CanProcess(context.Background(),"u","p");err==nil{t.Fatal("expected configuration error")}}
