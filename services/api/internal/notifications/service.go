package notifications

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct{ db *pgxpool.Pool }

type Item struct {
	ID string `json:"id"`
	Category string `json:"category"`
	Title string `json:"title"`
	Body string `json:"body"`
	ResourceType string `json:"resourceType,omitempty"`
	ResourceID string `json:"resourceId,omitempty"`
	ReadAt *time.Time `json:"readAt,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

type Preferences struct {
	InApp bool `json:"inApp"`
	Push bool `json:"push"`
	SMS bool `json:"sms"`
	Email bool `json:"email"`
	UpdatedAt time.Time `json:"updatedAt"`
}

var ErrNotFound=errors.New("notification not found")

func New(ctx context.Context,databaseURL string)(*Service,error){p,err:=pgxpool.New(ctx,databaseURL);if err!=nil{return nil,err};if err=p.Ping(ctx);err!=nil{p.Close();return nil,err};return &Service{db:p},nil}
func(s *Service)Close(){if s!=nil&&s.db!=nil{s.db.Close()}}

func(s *Service)List(ctx context.Context,userID string)([]Item,error){rows,err:=s.db.Query(ctx,`SELECT id,category,title,body,COALESCE(resource_type,''),COALESCE(resource_id,''),read_at,created_at FROM user_notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,userID);if err!=nil{return nil,err};defer rows.Close();out:=make([]Item,0);for rows.Next(){var n Item;if err:=rows.Scan(&n.ID,&n.Category,&n.Title,&n.Body,&n.ResourceType,&n.ResourceID,&n.ReadAt,&n.CreatedAt);err!=nil{return nil,err};out=append(out,n)};return out,rows.Err()}
func(s *Service)MarkRead(ctx context.Context,userID,id string)(Item,error){var n Item;err:=s.db.QueryRow(ctx,`UPDATE user_notifications SET read_at=COALESCE(read_at,now()) WHERE id=$1 AND user_id=$2 RETURNING id,category,title,body,COALESCE(resource_type,''),COALESCE(resource_id,''),read_at,created_at`,id,userID).Scan(&n.ID,&n.Category,&n.Title,&n.Body,&n.ResourceType,&n.ResourceID,&n.ReadAt,&n.CreatedAt);if errors.Is(err,pgx.ErrNoRows){return Item{},ErrNotFound};return n,err}
func(s *Service)Preferences(ctx context.Context,userID string)(Preferences,error){var p Preferences;err:=s.db.QueryRow(ctx,`INSERT INTO notification_preferences(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE SET user_id=EXCLUDED.user_id RETURNING in_app,push,sms,email,updated_at`,userID).Scan(&p.InApp,&p.Push,&p.SMS,&p.Email,&p.UpdatedAt);return p,err}
func(s *Service)SetPreferences(ctx context.Context,userID string,p Preferences)(Preferences,error){var out Preferences;err:=s.db.QueryRow(ctx,`INSERT INTO notification_preferences(user_id,in_app,push,sms,email,updated_at) VALUES($1,$2,$3,$4,$5,now()) ON CONFLICT(user_id) DO UPDATE SET in_app=EXCLUDED.in_app,push=EXCLUDED.push,sms=EXCLUDED.sms,email=EXCLUDED.email,updated_at=now() RETURNING in_app,push,sms,email,updated_at`,userID,p.InApp,p.Push,p.SMS,p.Email).Scan(&out.InApp,&out.Push,&out.SMS,&out.Email,&out.UpdatedAt);return out,err}
func(s *Service)Create(ctx context.Context,userID,category,title,body,resourceType,resourceID string)(Item,error){var n Item;id:=newID();err:=s.db.QueryRow(ctx,`INSERT INTO user_notifications(id,user_id,category,title,body,resource_type,resource_id) VALUES($1,$2,$3,$4,$5,NULLIF($6,''),NULLIF($7,'')) RETURNING id,category,title,body,COALESCE(resource_type,''),COALESCE(resource_id,''),read_at,created_at`,id,userID,category,title,body,resourceType,resourceID).Scan(&n.ID,&n.Category,&n.Title,&n.Body,&n.ResourceType,&n.ResourceID,&n.ReadAt,&n.CreatedAt);return n,err}
func newID()string{var b[12]byte;_,_=rand.Read(b[:]);return hex.EncodeToString(b[:])}
