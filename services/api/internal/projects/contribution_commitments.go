package projects

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

var (
	ErrContributionOfferNotFound = errors.New("contribution offer not found")
	ErrInvalidContributionDecision = errors.New("invalid contribution decision")
)

func (m *Manager) ListProjectOffers(ctx context.Context, projectID string) ([]ContributionOffer,error) {
	rows,err:=m.pool.Query(ctx,`SELECT id,project_id,contribution_need_id,contributor_id,kind,note,availability_note,status,created_at,updated_at FROM contribution_offers WHERE project_id=$1 ORDER BY created_at DESC`,projectID);if err!=nil{return nil,err};defer rows.Close()
	out:=[]ContributionOffer{};for rows.Next(){var o ContributionOffer;if err:=rows.Scan(&o.ID,&o.ProjectID,&o.ContributionNeedID,&o.ContributorID,&o.Kind,&o.Note,&o.AvailabilityNote,&o.Status,&o.CreatedAt,&o.UpdatedAt);err!=nil{return nil,err};out=append(out,o)};return out,rows.Err()
}

func (m *Manager) ListContributorOffers(ctx context.Context, contributorID string) ([]ContributionOffer,error) {
	rows,err:=m.pool.Query(ctx,`SELECT id,project_id,contribution_need_id,contributor_id,kind,note,availability_note,status,created_at,updated_at FROM contribution_offers WHERE contributor_id=$1 ORDER BY created_at DESC`,contributorID);if err!=nil{return nil,err};defer rows.Close()
	out:=[]ContributionOffer{};for rows.Next(){var o ContributionOffer;if err:=rows.Scan(&o.ID,&o.ProjectID,&o.ContributionNeedID,&o.ContributorID,&o.Kind,&o.Note,&o.AvailabilityNote,&o.Status,&o.CreatedAt,&o.UpdatedAt);err!=nil{return nil,err};out=append(out,o)};return out,rows.Err()
}

func (m *Manager) DecideContributionOffer(ctx context.Context,projectID,offerID,decision,actorID string,closeNeed bool)(ContributionOffer,error){
	decision=strings.ToLower(strings.TrimSpace(decision));if decision!="accepted"&&decision!="declined"{return ContributionOffer{},ErrInvalidContributionDecision}
	tx,err:=m.pool.Begin(ctx);if err!=nil{return ContributionOffer{},err};defer tx.Rollback(ctx)
	var o ContributionOffer
	err=tx.QueryRow(ctx,`SELECT id,project_id,contribution_need_id,contributor_id,kind,note,availability_note,status,created_at,updated_at FROM contribution_offers WHERE id=$1 AND project_id=$2 FOR UPDATE`,offerID,projectID).Scan(&o.ID,&o.ProjectID,&o.ContributionNeedID,&o.ContributorID,&o.Kind,&o.Note,&o.AvailabilityNote,&o.Status,&o.CreatedAt,&o.UpdatedAt)
	if errors.Is(err,pgx.ErrNoRows){return ContributionOffer{},ErrContributionOfferNotFound};if err!=nil{return ContributionOffer{},err};if o.Status!="offered"{return ContributionOffer{},fmt.Errorf("only offered contributions may be accepted or declined")}
	err=tx.QueryRow(ctx,`UPDATE contribution_offers SET status=$3,updated_at=now() WHERE id=$1 AND project_id=$2 RETURNING id,project_id,contribution_need_id,contributor_id,kind,note,availability_note,status,created_at,updated_at`,offerID,projectID,decision).Scan(&o.ID,&o.ProjectID,&o.ContributionNeedID,&o.ContributorID,&o.Kind,&o.Note,&o.AvailabilityNote,&o.Status,&o.CreatedAt,&o.UpdatedAt);if err!=nil{return ContributionOffer{},err}
	if decision=="accepted"{needStatus:="partially_filled";if closeNeed{needStatus="filled"};if _,err=tx.Exec(ctx,`UPDATE contribution_needs SET status=$2 WHERE id=$1 AND status IN ('open','partially_filled')`,o.ContributionNeedID,needStatus);err!=nil{return ContributionOffer{},err}}
	event:="contribution."+decision
	if _,err=tx.Exec(ctx,`INSERT INTO outbox_events(id,aggregate_type,aggregate_id,event_type,payload) VALUES($1::text,'action_project',$2::text,$3::text,jsonb_build_object('projectId',$2::text,'offerId',$4::text,'contributionNeedId',$5::text,'contributorId',$6::text,'actorId',$7::text))`,offerID+"-"+decision,projectID,event,offerID,o.ContributionNeedID,o.ContributorID,actorID);err!=nil{return ContributionOffer{},err}
	if err:=tx.Commit(ctx);err!=nil{return ContributionOffer{},err};return o,nil
}

func (m *Manager) WithdrawContributionOffer(ctx context.Context,offerID,contributorID string)(ContributionOffer,error){
	var o ContributionOffer
	err:=m.pool.QueryRow(ctx,`UPDATE contribution_offers SET status='withdrawn',updated_at=now() WHERE id=$1 AND contributor_id=$2 AND status='offered' RETURNING id,project_id,contribution_need_id,contributor_id,kind,note,availability_note,status,created_at,updated_at`,offerID,contributorID).Scan(&o.ID,&o.ProjectID,&o.ContributionNeedID,&o.ContributorID,&o.Kind,&o.Note,&o.AvailabilityNote,&o.Status,&o.CreatedAt,&o.UpdatedAt)
	if errors.Is(err,pgx.ErrNoRows){return ContributionOffer{},ErrContributionOfferNotFound};return o,err
}

func (m *Manager) FulfillContributionOffer(ctx context.Context,projectID,offerID,actorID string)(ContributionOffer,error){
	tx,err:=m.pool.Begin(ctx);if err!=nil{return ContributionOffer{},err};defer tx.Rollback(ctx);var o ContributionOffer
	err=tx.QueryRow(ctx,`UPDATE contribution_offers SET status='fulfilled',updated_at=now() WHERE id=$1 AND project_id=$2 AND status='accepted' RETURNING id,project_id,contribution_need_id,contributor_id,kind,note,availability_note,status,created_at,updated_at`,offerID,projectID).Scan(&o.ID,&o.ProjectID,&o.ContributionNeedID,&o.ContributorID,&o.Kind,&o.Note,&o.AvailabilityNote,&o.Status,&o.CreatedAt,&o.UpdatedAt)
	if errors.Is(err,pgx.ErrNoRows){return ContributionOffer{},ErrContributionOfferNotFound};if err!=nil{return ContributionOffer{},err}
	if _,err=tx.Exec(ctx,`INSERT INTO outbox_events(id,aggregate_type,aggregate_id,event_type,payload) VALUES($1::text,'action_project',$2::text,'contribution.fulfilled',jsonb_build_object('projectId',$2::text,'offerId',$3::text,'contributionNeedId',$4::text,'contributorId',$5::text,'actorId',$6::text))`,offerID+"-fulfilled",projectID,offerID,o.ContributionNeedID,o.ContributorID,actorID);err!=nil{return ContributionOffer{},err};if err:=tx.Commit(ctx);err!=nil{return ContributionOffer{},err};return o,nil
}
