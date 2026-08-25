package projects

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

var (
	ErrContributionNeedNotFound = errors.New("contribution need not found")
	ErrInvalidContributionKind  = errors.New("invalid contribution kind")
)

type ContributionOffer struct {
	ID                 string    `json:"id"`
	ProjectID          string    `json:"projectId"`
	ContributionNeedID string    `json:"contributionNeedId"`
	ContributorID      string    `json:"contributorId"`
	Kind               string    `json:"kind"`
	Note               string    `json:"note"`
	AvailabilityNote   string    `json:"availabilityNote"`
	Status             string    `json:"status"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

func (m *Manager) AddContributionNeed(ctx context.Context,id,projectID,kind,description,quantityNote string)(ContributionNeed,error){
	kind=strings.ToLower(strings.TrimSpace(kind));description=strings.TrimSpace(description)
	if !validContributionKind(kind){return ContributionNeed{},ErrInvalidContributionKind};if description==""{return ContributionNeed{},fmt.Errorf("description is required")}
	var exists bool;if err:=m.pool.QueryRow(ctx,`SELECT EXISTS(SELECT 1 FROM action_projects WHERE id=$1 AND status<>'cancelled')`,projectID).Scan(&exists);err!=nil{return ContributionNeed{},err};if !exists{return ContributionNeed{},ErrProjectNotFound}
	var c ContributionNeed
	err:=m.pool.QueryRow(ctx,`INSERT INTO contribution_needs(id,project_id,kind,description,quantity_note,status) VALUES($1,$2,$3,$4,$5,'open') RETURNING id,project_id,kind,description,quantity_note,status`,id,projectID,kind,description,strings.TrimSpace(quantityNote)).Scan(&c.ID,&c.ProjectID,&c.Kind,&c.Description,&c.QuantityNote,&c.Status)
	return c,err
}

func (m *Manager) OfferContribution(ctx context.Context,id,projectID,needID,contributorID,note,availability string)(ContributionOffer,error){
	tx,err:=m.pool.Begin(ctx);if err!=nil{return ContributionOffer{},err};defer tx.Rollback(ctx)
	var kind,status string
	err=tx.QueryRow(ctx,`SELECT kind,status FROM contribution_needs WHERE id=$1 AND project_id=$2 FOR UPDATE`,needID,projectID).Scan(&kind,&status)
	if errors.Is(err,pgx.ErrNoRows){return ContributionOffer{},ErrContributionNeedNotFound};if err!=nil{return ContributionOffer{},err};if status!="open"&&status!="partially_filled"{return ContributionOffer{},fmt.Errorf("contribution need is not accepting offers")}
	var o ContributionOffer
	err=tx.QueryRow(ctx,`INSERT INTO contribution_offers(id,project_id,contribution_need_id,contributor_id,kind,note,availability_note,status) VALUES($1,$2,$3,$4,$5,$6,$7,'offered') RETURNING id,project_id,contribution_need_id,contributor_id,kind,note,availability_note,status,created_at,updated_at`,id,projectID,needID,contributorID,kind,strings.TrimSpace(note),strings.TrimSpace(availability)).Scan(&o.ID,&o.ProjectID,&o.ContributionNeedID,&o.ContributorID,&o.Kind,&o.Note,&o.AvailabilityNote,&o.Status,&o.CreatedAt,&o.UpdatedAt);if err!=nil{return ContributionOffer{},err}
	_,err=tx.Exec(ctx,`INSERT INTO outbox_events(id,aggregate_type,aggregate_id,event_type,payload) VALUES($1::text,'action_project',$2::text,'contribution.offered',jsonb_build_object('projectId',$2::text,'contributionNeedId',$3::text,'offerId',$4::text,'contributorId',$5::text,'kind',$6::text))`,id+"-event",projectID,needID,id,contributorID,kind);if err!=nil{return ContributionOffer{},err}
	if err:=tx.Commit(ctx);err!=nil{return ContributionOffer{},err};return o,nil
}

func validContributionKind(v string)bool{switch v{case"money","time","skill","materials","equipment","transport","knowledge","access","influence","care","approval","space","leadership":return true};return false}
