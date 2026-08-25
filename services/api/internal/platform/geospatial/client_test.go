package geospatial

import(
 "context"
 "net/http"
 "net/http/httptest"
 "testing"
)

func TestNearbyUsesTenantScopedSS44Contract(t *testing.T){
 srv:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  if r.URL.Path!="/api/v1/nearby"{t.Fatalf("path=%s",r.URL.Path)}
  if r.Header.Get("X-Tenant-Id")!="community-acme"{t.Fatalf("tenant=%q",r.Header.Get("X-Tenant-Id"))}
  if r.URL.Query().Get("radius_km")!="5.000"{t.Fatalf("radius=%s",r.URL.Query().Get("radius_km"))}
  w.Header().Set("Content-Type","application/json");_,_=w.Write([]byte(`{"hits":[{"id":"need-1","name":"Water point","lat":6.52,"lng":3.37,"distance_km":1.2}]}`))
 }));defer srv.Close()
 c:=New(srv.URL,"community-acme");hits,err:=c.Nearby(context.Background(),6.5,3.3,5);if err!=nil{t.Fatal(err)};if len(hits)!=1||hits[0].ID!="need-1"{t.Fatalf("hits=%+v",hits)}
}
