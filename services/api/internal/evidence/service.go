package evidence

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/jackc/pgx/v5/pgconn"
	"io"
	"path"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNeedNotFound     = errors.New("need not found")
	ErrEvidenceNotFound = errors.New("evidence not found")
	ErrEvidenceLimit    = errors.New("maximum 4 photos and 1 video per reporter per need")
	ErrUploadConflict   = errors.New("attachment ID is already bound to another upload intent")
	ErrInvalidMedia     = errors.New("invalid evidence media")
	ErrObjectMismatch   = errors.New("uploaded object does not match evidence declaration")
	ErrInvalidReview    = errors.New("invalid evidence review")
)

const maxEvidenceBytes int64 = 25 * 1024 * 1024

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
	objects *s3.Client
	presign *s3.PresignClient
	bucket  string
}

type InitiatedUpload struct {
	Completed  bool              `json:"completed,omitempty"`
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
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}

	region := strings.TrimSpace(cfg.Region)
	if region == "" {
		region = "us-east-1"
	}
	endpoint := strings.TrimSpace(cfg.Endpoint)
	if !strings.HasPrefix(endpoint, "http://") && !strings.HasPrefix(endpoint, "https://") {
		scheme := "http"
		if cfg.Secure {
			scheme = "https"
		}
		endpoint = scheme + "://" + endpoint
	}
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion(region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.AccessKey, cfg.SecretKey, "")),
	)
	if err != nil {
		pool.Close()
		return nil, err
	}
	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(endpoint)
		o.UsePathStyle = true
	})
	return &Service{db: pool, objects: client, presign: s3.NewPresignClient(client), bucket: cfg.Bucket}, nil
}

func (s *Service) Close() {
	if s != nil && s.db != nil {
		s.db.Close()
	}
}

// EnsureBucket is intended for local/integration bootstrap. Production bucket
// lifecycle remains owned by the shared RustFS/SS-02 storage plane.
func (s *Service) EnsureBucket(ctx context.Context) error {
	_, err := s.objects.HeadBucket(ctx, &s3.HeadBucketInput{Bucket: aws.String(s.bucket)})
	if err == nil {
		return nil
	}
	_, err = s.objects.CreateBucket(ctx, &s3.CreateBucketInput{Bucket: aws.String(s.bucket)})
	return err
}

func (s *Service) Initiate(ctx context.Context, needID, uploaderID, contentType string, sizeBytes int64, sha256Hex string) (InitiatedUpload, error) {
	return s.InitiateWithCapture(ctx, needID, uploaderID, contentType, sizeBytes, sha256Hex, nil)
}
func (s *Service) InitiateWithCapture(ctx context.Context, needID, uploaderID, contentType string, sizeBytes int64, sha256Hex string, capture *CaptureContext, clientIDs ...string) (InitiatedUpload, error) {
	var last error
	for attempt := 0; attempt < 5; attempt++ {
		result, err := s.initiateOnce(ctx, needID, uploaderID, contentType, sizeBytes, sha256Hex, capture, clientIDs...)
		var pgerr *pgconn.PgError
		if !errors.As(err, &pgerr) || (pgerr.Code != "40001" && pgerr.Code != "40P01" && !(pgerr.Code == "23505" && pgerr.ConstraintName == "need_evidence_upload_intent")) {
			return result, err
		}
		last = err
		timer := time.NewTimer(time.Duration(attempt+1) * 20 * time.Millisecond)
		select {
		case <-ctx.Done():
			timer.Stop()
			return InitiatedUpload{}, ctx.Err()
		case <-timer.C:
		}
	}
	return InitiatedUpload{}, last
}
func (s *Service) initiateOnce(ctx context.Context, needID, uploaderID, contentType string, sizeBytes int64, sha256Hex string, capture *CaptureContext, clientIDs ...string) (InitiatedUpload, error) {
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	sha256Hex = strings.ToLower(strings.TrimSpace(sha256Hex))
	key := ""
	if len(clientIDs) > 0 {
		key = strings.TrimSpace(clientIDs[0])
	}
	video := strings.HasPrefix(contentType, "video/")
	if (key != "" && sha256Hex == "") || len(key) > 128 || !allowedContentType(contentType) || sizeBytes <= 0 || sizeBytes > maxEvidenceBytes || (!video && sizeBytes > 10*1024*1024) || !validOptionalSHA256(sha256Hex) {
		return InitiatedUpload{}, ErrInvalidMedia
	}
	if err := ValidateCapture(capture, contentType, sizeBytes); err != nil {
		return InitiatedUpload{}, err
	}
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.Serializable})
	if err != nil {
		return InitiatedUpload{}, err
	}
	defer tx.Rollback(ctx)
	var lockedID string
	if err = tx.QueryRow(ctx, `SELECT id FROM needs WHERE id=$1 FOR UPDATE`, needID).Scan(&lockedID); errors.Is(err, pgx.ErrNoRows) {
		return InitiatedUpload{}, ErrNeedNotFound
	} else if err != nil {
		return InitiatedUpload{}, err
	}
	id, objectKey, status := "", "", ""
	if key != "" {
		var storedType, storedSHA string
		var storedSize int64
		var storedContext []byte
		err = tx.QueryRow(ctx, `SELECT id,object_key,content_type,size_bytes,COALESCE(sha256_hex,''),status,capture_context FROM need_evidence WHERE need_id=$1 AND uploader_id=$2 AND client_attachment_id=$3`, needID, uploaderID, key).Scan(&id, &objectKey, &storedType, &storedSize, &storedSHA, &status, &storedContext)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return InitiatedUpload{}, err
		}
		if err == nil {
			var original *CaptureContext
			if len(storedContext) > 0 {
				if e := json.Unmarshal(storedContext, &original); e != nil {
					return InitiatedUpload{}, e
				}
			}
			if storedType != contentType || storedSize != sizeBytes || (sha256Hex != "" && storedSHA != sha256Hex) || !bytes.Equal(captureJSON(original), captureJSON(capture)) || status == "deleted" {
				return InitiatedUpload{}, ErrUploadConflict
			}
		}
	}
	if id == "" {
		var photos, videos int
		if err = tx.QueryRow(ctx, `SELECT count(*) FILTER (WHERE content_type NOT LIKE 'video/%'),count(*) FILTER (WHERE content_type LIKE 'video/%') FROM need_evidence WHERE need_id=$1 AND uploader_id=$2 AND status<>'deleted'`, needID, uploaderID).Scan(&photos, &videos); err != nil {
			return InitiatedUpload{}, err
		}
		if (video && videos >= 1) || (!video && photos >= 4) {
			return InitiatedUpload{}, ErrEvidenceLimit
		}
		id = newID()
		objectKey = path.Join("needs", needID, "evidence", id+extensionFor(contentType))
		if _, err = tx.Exec(ctx, `INSERT INTO need_evidence(id,need_id,uploader_id,object_key,content_type,size_bytes,sha256_hex,capture_context,client_attachment_id) VALUES($1,$2,$3,$4,$5,$6,NULLIF($7,''),$8,NULLIF($9,''))`, id, needID, uploaderID, objectKey, contentType, sizeBytes, sha256Hex, captureJSON(capture), key); err != nil {
			return InitiatedUpload{}, err
		}
	}
	if err = tx.Commit(ctx); err != nil {
		return InitiatedUpload{}, err
	}
	expiry := 10 * time.Minute
	p, err := s.presign.PresignPutObject(ctx, &s3.PutObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(objectKey), ContentType: aws.String(contentType), ContentLength: aws.Int64(sizeBytes), IfNoneMatch: aws.String("*")}, func(o *s3.PresignOptions) { o.Expires = expiry })
	// Preserve a pending intent if signing fails; its stable client ID can retry safely.
	if err != nil {
		return InitiatedUpload{}, err
	}
	return InitiatedUpload{EvidenceID: id, UploadURL: p.URL, Method: "PUT", Headers: map[string]string{"Content-Type": contentType, "If-None-Match": "*"}, ExpiresAt: time.Now().UTC().Add(expiry), Completed: status != "" && status != "pending_upload"}, nil
}

// Complete binds the evidence record to the bytes actually stored in RustFS/S3.
// It verifies size, derives SHA-256, rejects a conflicting client declaration,
// and only then moves the record into moderation.
func (s *Service) Complete(ctx context.Context, needID, evidenceID, uploaderID string) (Record, error) {
	var objectKey, owner, declaredSHA, declaredType string
	var sizeBytes int64
	err := s.db.QueryRow(ctx, `SELECT object_key,size_bytes,COALESCE(sha256_hex,''),uploader_id,content_type FROM need_evidence WHERE id=$1 AND need_id=$2`, evidenceID, needID).Scan(&objectKey, &sizeBytes, &declaredSHA, &owner, &declaredType)
	if errors.Is(err, pgx.ErrNoRows) {
		return Record{}, ErrEvidenceNotFound
	}
	if err != nil {
		return Record{}, err
	}
	if owner != uploaderID {
		return Record{}, ErrEvidenceNotFound
	}

	info, err := s.objects.HeadObject(ctx, &s3.HeadObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(objectKey)})
	if err != nil {
		return Record{}, err
	}
	if aws.ToInt64(info.ContentLength) != sizeBytes {
		return Record{}, ErrObjectMismatch
	}

	obj, err := s.objects.GetObject(ctx, &s3.GetObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(objectKey)})
	if err != nil {
		return Record{}, err
	}
	defer obj.Body.Close()
	h := sha256.New()
	prefix := make([]byte, 512)
	n, readErr := io.ReadFull(obj.Body, prefix)
	if readErr != nil && readErr != io.EOF && readErr != io.ErrUnexpectedEOF {
		return Record{}, readErr
	}
	prefix = prefix[:n]
	if !matchesMediaHeader(declaredType, prefix) {
		return Record{}, ErrObjectMismatch
	}
	actualSize, err := io.Copy(h, io.LimitReader(io.MultiReader(bytes.NewReader(prefix), obj.Body), sizeBytes+1))
	if err != nil {
		return Record{}, err
	}
	if actualSize != sizeBytes {
		return Record{}, ErrObjectMismatch
	}
	actualSHA := hex.EncodeToString(h.Sum(nil))
	if declaredSHA != "" && !strings.EqualFold(declaredSHA, actualSHA) {
		return Record{}, ErrObjectMismatch
	}

	var rec Record
	err = s.db.QueryRow(ctx, `UPDATE need_evidence SET sha256_hex=$2,status='pending_review',available_at=NULL WHERE id=$1 AND status='pending_upload' RETURNING id,need_id,content_type,size_bytes,sha256_hex,status,created_at,available_at`, evidenceID, actualSHA).Scan(&rec.ID, &rec.NeedID, &rec.ContentType, &rec.SizeBytes, &rec.SHA256Hex, &rec.Status, &rec.CreatedAt, &rec.AvailableAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Record{}, ErrEvidenceNotFound
	}
	return rec, err
}

func (s *Service) AccessURL(ctx context.Context, needID, evidenceID string, scope ...Reviewer) (string, error) {
	if len(scope) != 1 || !validReviewAuthority(scope[0]) {
		return "", ErrReviewForbidden
	}
	var objectKey string
	err := s.db.QueryRow(ctx, "SELECT object_key FROM need_evidence WHERE id=$1 AND need_id=$2 AND status='available'", evidenceID, needID).Scan(&objectKey)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrEvidenceNotFound
	}
	if err != nil {
		return "", err
	}
	p, err := s.presign.PresignGetObject(ctx, &s3.GetObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(objectKey)}, func(o *s3.PresignOptions) { o.Expires = 5 * time.Minute })
	if err != nil {
		return "", err
	}
	return p.URL, nil
}

func validOptionalSHA256(v string) bool {
	if v == "" {
		return true
	}
	if len(v) != sha256.Size*2 {
		return false
	}
	_, err := hex.DecodeString(v)
	return err == nil
}

func allowedContentType(v string) bool {
	switch v {
	case "image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime":
		return true
	default:
		return false
	}
}

func extensionFor(v string) string {
	switch v {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	case "video/mp4":
		return ".mp4"
	case "video/quicktime":
		return ".mov"
	}
	return ""
}

func newID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic(fmt.Sprintf("random id: %v", err))
	}
	return hex.EncodeToString(b[:])
}
