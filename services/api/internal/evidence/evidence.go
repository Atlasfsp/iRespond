package evidence

import (
  "context"
  "errors"
  "fmt"
  "net/url"
  "path/filepath"
  "strings"
  "time"

  "github.com/jackc/pgx/v5/pgxpool"
  "github.com/minio/minio-go/v7"
  "github.com/minio/minio-go/v7/pkg/credentials"
)

var ErrNotFound = errors.New("evidence not found")

type Item struct {
  ID string `json:"id"`
  NeedID string `json:"needId"`
  UploaderID string `json:"uploaderId"`
  ObjectKey string `json:"objectKey"`
  ContentType string `json:"contentType"`
  SizeBytes int64 `json:"sizeBytes"`
  Status string `json:"status"`
  CreatedAt time.Time `json:"createdAt"`
  AvailableAt *time.Time `json:"availableAt,omitempty"`
}

type UploadGrant struct {
  Evidence Item `json:"evidence"`
  UploadURL string `json:"uploadUrl"`
  ExpiresAt time.Time `json:"expiresAt"`
}

type Manager struct { pool *pgxpool.Pool; client *minio.Client; bucket string }

type Config struct { DatabaseURL, Endpoint, AccessKey, SecretKey, Bucket, Region string; Secure bool }

func New(ctx context.Context, cfg Config) (*Manager,error) {
  if strings.TrimSpace(cfg.DatabaseURL)=="" || strings.TrimSpace(cfg.Endpoint)=="" || strings.TrimSpace(cfg.Bucket)=="" { return nil, fmt.Errorf("evidence database/object storage is not configured") }
  pool,err:=pgxpool.New(ctx,cfg.DatabaseURL); if err!=nil{return nil,err}
  client,err:=minio.New(cfg.Endpoint,&minio.Options{Creds:credentials.NewStaticV4(cfg.AccessKey,cfg.SecretKey,""),Secure:cfg.Secure,Region:cfg.Region}); if err!=nil{pool.Close();return nil,err}
  return &Manager{pool:pool,client:client,bucket:cfg.Bucket},nil
}
func (m *Manager) Close(){if m!=nil&&m.pool!=nil{m.pool.Close()}}

func (m *Manager) Begin(ctx context.Context,id,needID,uploaderID,contentType,filename string,size int64)(UploadGrant,error){
  if size<=0||size>50*1024*1024{return UploadGrant{},fmt.Errorf("evidence size must be between 1 byte and 50 MiB")}
  if contentType!="image/jpeg"&&contentType!="image/png"&&contentType!="video/mp4"{return UploadGrant{},fmt.Errorf("unsupported evidence content type")}
  ext:=strings.ToLower(filepath.Ext(filename)); if ext==""{if contentType=="image/jpeg"{ext=".jpg"}else if contentType=="image/png"{ext=".png"}else{ext=".mp4"}}
  key:="needs/"+needID+"/evidence/"+id+ext
  item:=Item{ID:id,NeedID:needID,UploaderID:uploaderID,ObjectKey:key,ContentType:contentType,SizeBytes:size,Status:"pending_upload",CreatedAt:time.Now().UTC()}
  _,err:=m.pool.Exec(ctx,`INSERT INTO need_evidence(id,need_id,uploader_id,object_key,content_type,size_bytes,status) VALUES($1,$2,$3,$4,$5,$6,'pending_upload')`,id,needID,uploaderID,key,contentType,size);if err!=nil{return UploadGrant{},err}
  expiry:=15*time.Minute
  signed,err:=m.client.PresignedPutObject(ctx,m.bucket,key,expiry);if err!=nil{return UploadGrant{},err}
  return UploadGrant{Evidence:item,UploadURL:signed.String(),ExpiresAt:time.Now().UTC().Add(expiry)},nil
}

func (m *Manager) Complete(ctx context.Context,id,uploaderID string)(Item,error){
  var i Item
  err:=m.pool.QueryRow(ctx,`UPDATE need_evidence SET status='available',available_at=now() WHERE id=$1 AND uploader_id=$2 AND status='pending_upload' RETURNING id,need_id,uploader_id,object_key,content_type,size_bytes,status,created_at,available_at`,id,uploaderID).Scan(&i.ID,&i.NeedID,&i.UploaderID,&i.ObjectKey,&i.ContentType,&i.SizeBytes,&i.Status,&i.CreatedAt,&i.AvailableAt)
  if err!=nil{return Item{},ErrNotFound};return i,nil
}
func (m *Manager) List(ctx context.Context,needID string)([]Item,error){
  rows,err:=m.pool.Query(ctx,`SELECT id,need_id,uploader_id,object_key,content_type,size_bytes,status,created_at,available_at FROM need_evidence WHERE need_id=$1 AND status='available' ORDER BY created_at`,needID);if err!=nil{return nil,err};defer rows.Close()
  out:=[]Item{};for rows.Next(){var i Item;if err:=rows.Scan(&i.ID,&i.NeedID,&i.UploaderID,&i.ObjectKey,&i.ContentType,&i.SizeBytes,&i.Status,&i.CreatedAt,&i.AvailableAt);err!=nil{return nil,err};out=append(out,i)};return out,rows.Err()
}
func (m *Manager) ReadURL(ctx context.Context,item Item)(string,error){u,err:=m.client.PresignedGetObject(ctx,m.bucket,item.ObjectKey,10*time.Minute,url.Values{});if err!=nil{return "",err};return u.String(),nil}
