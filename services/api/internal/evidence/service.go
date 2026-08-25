package evidence

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net/url"
	"path"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

var (
	ErrNeedNotFound     = errors.New("need not found")
	ErrEvidenceNotFound = errors.New("evidence not found")
	ErrInvalidMedia     = errors.New("invalid evidence media")
	ErrObjectMismatch   = errors.New("uploaded object does not match evidence declaration")
	ErrInvalidReview    = errors.New("invalid evidence review")
)

const maxEvidenceBytes int64 = 50 * 1024 * 1024

type Config struct {
	DatabaseURL string
	Endpoint    string
	AccessKey   string
	SecretKey   string
	Bucket      string
	Region      string
	Secure      bool
}

type Service struct {
	db      *pgxpool.Pool
	objects *minio.Client
	bucket  string
}

type InitiatedUpload struct {
	EvidenceID string            `json:"evidenceId"`
	UploadURL  string            `json:"uploadUrl"`
	Method     string            `json:"method"`
	Headers    map[string]string `json:"headers"`
	ExpiresAt  time.Time         `json:"expiresAt"`
}

type Record struct {
	ID          string     `json:"id"`
	NeedID      string     `json:"needId"`
	ContentType string     `json:"contentType"`
	SizeBytes   int64      `json:"sizeBytes"`
	SHA256Hex   string     `json:"sha256Hex,omitempty"`
	Status      string     `json:"status"`
	CreatedAt   time.Time  `json:"createdAt"`
	AvailableAt *time.Time `json:"availableAt,omitempty"`
}

func New(ctx context.Context, cfg Config) (*Service, error) {
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil { return nil, err }
	if err := pool.Ping(ctx); err != nil { pool.Close(); return nil, err }
	client, err := minio.New(cfg.Endpoint, &minio.Options{Creds:credentials.NewStaticV4(cfg.AccessKey,cfg.SecretKey,""),Secure:cfg.Secure,Region:cfg.Region})
	if err != nil { pool.Close(); return nil, err }
	return &Service{db:pool,objects:client,bucket:cfg.Bucket}, nil
}

func (s *Service) Close() { if s != nil && s.db != nil { s.db.Close() } }

func (s *Service) Initiate(ctx context.Context, needID, uploaderID, contentType string, sizeBytes int64, sha256Hex string) (InitiatedUpload, error) {
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	if !allowedContentType(contentType) || sizeBytes <= 0 || sizeBytes > maxEvidenceBytes { return InitiatedUpload{}, ErrInvalidMedia }
	var exists bool
	if err := s.db.QueryRow(ctx,"SELECT EXISTS(SELECT 1 FROM needs WHERE id=$1)",needID).Scan(&exists); err != nil { return InitiatedUpload{}, err }
	if !exists { return InitiatedUpload{}, ErrNeedNotFound }

	id := newID(); objectKey := path.Join("needs",needID,"evidence",id+extensionFor(contentType))
	_, err := s.db.Exec(ctx,`INSERT INTO need_evidence(id,need_id,uploader_id,object_key,content_type,size_bytes,sha256_hex) VALUES($1,$2,$3,$4,$5,$6,NULLIF($7,''))`,id,needID,uploaderID,objectKey,contentType,sizeBytes,strings.ToLower(strings.TrimSpace(sha256Hex)))
	if err != nil { return InitiatedUpload{}, err }

	expiry := 10*time.Minute
	u, err := s.objects.PresignedPutObject(ctx,s.bucket,objectKey,expiry)
	if err != nil { _,_ = s.db.Exec(ctx,"DELETE FROM need_evidence WHERE id=$1 AND status='pending_upload'",id); return InitiatedUpload{}, err }
	return InitiatedUpload{EvidenceID:id,UploadURL:u.String(),Method:"PUT",Headers:map[string]string{"Content-Type":contentType},ExpiresAt:time.Now().UTC().Add(expiry)},nil
}

// Complete verifies the uploaded object's declared size but deliberately does not
// make user-supplied evidence public. It enters pending_review until an authorized
// evidence reviewer approves, quarantines, or rejects it.
func (s *Service) Complete(ctx context.Context, needID, evidenceID, uploaderID string) (Record,error) {
	var objectKey, contentType, owner string; var sizeBytes int64; var sha string
	err:=s.db.QueryRow(ctx,`SELECT object_key,content_type,size_bytes,COALESCE(sha256_hex,''),uploader_id FROM need_evidence WHERE id=$1 AND need_id=$2`,evidenceID,needID).Scan(&objectKey,&contentType,&sizeBytes,&sha,&owner)
	if errors.Is(err,pgx.ErrNoRows){return Record{},ErrEvidenceNotFound};if err!=nil{return Record{},err};if owner!=uploaderID{return Record{},ErrEvidenceNotFound}
	info,err:=s.objects.StatObject(ctx,s.bucket,objectKey,minio.StatObjectOptions{});if err!=nil{return Record{},err};if info.Size!=sizeBytes{return Record{},ErrObjectMismatch}
	var rec Record
	err=s.db.QueryRow(ctx,`UPDATE need_evidence SET status='pending_review',available_at=NULL WHERE id=$1 AND status='pending_upload' RETURNING id,need_id,content_type,size_bytes,COALESCE(sha256_hex,''),status,created_at,available_at`,evidenceID).Scan(&rec.ID,&rec.NeedID,&rec.ContentType,&rec.SizeBytes,&rec.SHA256Hex,&rec.Status,&rec.CreatedAt,&rec.AvailableAt)
	if errors.Is(err,pgx.ErrNoRows){return Record{},ErrEvidenceNotFound};return rec,err
}

func (s *Service) Review(ctx context.Context, evidenceID, decision string)(Record,error){
	decision=strings.TrimSpace(strings.ToLower(decision));if decision!="available"&&decision!="quarantined"&&decision!="rejected"{return Record{},ErrInvalidReview}
	var rec Record
	err:=s.db.QueryRow(ctx,`UPDATE need_evidence SET status=$2,available_at=CASE WHEN $2='available' THEN now() ELSE NULL END WHERE id=$1 AND status='pending_review' RETURNING id,need_id,content_type,size_bytes,COALESCE(sha256_hex,''),status,created_at,available_at`,evidenceID,decision).Scan(&rec.ID,&rec.NeedID,&rec.ContentType,&rec.SizeBytes,&rec.SHA256Hex,&rec.Status,&rec.CreatedAt,&rec.AvailableAt)
	if errors.Is(err,pgx.ErrNoRows){return Record{},ErrEvidenceNotFound};return rec,err
}

func (s *Service) AccessURL(ctx context.Context, needID, evidenceID string)(string,error){
	var objectKey string
	err:=s.db.QueryRow(ctx,"SELECT object_key FROM need_evidence WHERE id=$1 AND need_id=$2 AND status='available'",evidenceID,needID).Scan(&objectKey)
	if errors.Is(err,pgx.ErrNoRows){return "",ErrEvidenceNotFound};if err!=nil{return "",err}
	u,err:=s.objects.PresignedGetObject(ctx,s.bucket,objectKey,5*time.Minute,url.Values{});if err!=nil{return "",err};return u.String(),nil
}

func allowedContentType(v string) bool { switch v { case "image/jpeg","image/png","image/webp","video/mp4","video/quicktime": return true; default:return false } }
func extensionFor(v string)string{switch v{case"image/jpeg":return".jpg";case"image/png":return".png";case"image/webp":return".webp";case"video/mp4":return".mp4";case"video/quicktime":return".mov"};return""}
func newID()string{var b[16]byte;if _,err:=rand.Read(b[:]);err!=nil{panic(fmt.Sprintf("random id: %v",err))};return hex.EncodeToString(b[:])}
