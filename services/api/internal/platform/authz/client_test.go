package authz

import(
 "context"
 "encoding/json"
 "net/http"
 "net/http/httptest"
 "testing"
)

func TestCheckUsesSS13TenantDecisionContract(t *testing.T){
 srv:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  if r.Method!=http.MethodPost||r.URL.Path!="/api/v1/check"{t.Fatalf("%s %s",r.Method,r.URL.Path)}
  if r.Header.Get("X-Tenant-Id")!="tenant-1"{t.Fatalf("tenant=%q",r.Header.Get("X-Tenant-Id"))}
  if r.Header.Get("Idempotency-Key")==""{t.Fatal("missing idempotency key")}
  var in map[string]string;if err:=json.NewDecoder(r.Body).Decode(&in);err!=nil{t.Fatal(err)};if in["Subject"]!="user-1"||in["Action"]!="project.transition"||in["Resource"]!="project:p-1"{t.Fatalf("body=%v",in)}
  w.Header().Set("Content-Type","application/json");_,_=w.Write([]byte(`{"allow":true,"reason":"project manager","decision_id":"dec-1"}`))
 }));defer srv.Close()
 decision,err:=New(srv.URL,"tenant-1").Check(context.Background(),"user-1","project.transition","project:p-1","community_action");if err!=nil{t.Fatal(err)};if !decision.Allow||decision.DecisionID!="dec-1"{t.Fatalf("decision=%+v",decision)}
}

func TestCheckFailsClosedOnUnavailablePolicyService(t *testing.T){
 c:=New("http://127.0.0.1:1","tenant-1");c.HTTP.Timeout=1
 if _,err:=c.Check(context.Background(),"user","action","resource","");err==nil{t.Fatal("expected policy service error")}
}
