package challenges

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"
)

func testActor(sub, tenant string, roles ...string) Actor {
	rm := make(map[string]struct{}, len(roles))
	for _, r := range roles {
		rm[r] = struct{}{}
	}
	return Actor{Subject: sub, ActorType: "human", TenantID: tenant, Roles: rm}
}

func TestChallengesFullLifecycleAndNegativeMatrix(t *testing.T) {
	ctx := context.Background()
	svc := NewMemoryService()

	org1 := testActor("org-alice", "tenant-gauteng", "programme_owner")
	org2 := testActor("org-bob", "tenant-gauteng", "institution_admin")
	foreignOrg := testActor("org-mallory", "tenant-other", "programme_owner")
	reviewer := testActor("rev-carol", "tenant-gauteng", "institution_verifier")
	applicant := testActor("student-thabo", "", "citizen")
	teammate := testActor("student-lerato", "", "citizen")
	judge1 := testActor("judge-naledi", "tenant-gauteng", "challenge_judge")
	judge2 := testActor("judge-sipho", "tenant-gauteng", "challenge_judge")
	judge3 := testActor("judge-zanele", "tenant-gauteng", "challenge_judge")
	aiActor := Actor{Subject: "aico-bot", ActorType: "ai_employee", TenantID: "tenant-gauteng", Roles: map[string]struct{}{"programme_owner": {}, "challenge_judge": {}}}

	// 1. AI/Service actor rejected from human-only programme creation
	if _, err := svc.CreateChallenge(ctx, aiActor, CreateChallengeInput{Title: "AI Challenge"}, "idem-ai"); !errors.Is(err, ErrHumanActorRequired) {
		t.Fatalf("expected ErrHumanActorRequired for AI actor, got %v", err)
	}
	if err := svc.ProposeWithAICO(ctx, org1); !errors.Is(err, ErrAICOFeatureDisabled) {
		t.Fatalf("expected ErrAICOFeatureDisabled by default, got %v", err)
	}

	// 2. Rubric weights not summing to 10,000 bps rejected
	badRound := Round{
		Sequence: 1,
		Title:    "Bad Rubric Round",
		Kind:     "proposal",
		OpensAt:  time.Now().Add(-time.Hour),
		ClosesAt: time.Now().Add(time.Hour),
		Criteria: []RubricCriterion{
			{ID: "c1", Code: "c1", Title: "C1", WeightBasisPoints: 5000, MaximumScore: 100},
			{ID: "c2", Code: "c2", Title: "C2", WeightBasisPoints: 4000, MaximumScore: 100},
		},
	}
	if _, err := svc.CreateChallenge(ctx, org1, CreateChallengeInput{Title: "Bad Rubric", Rounds: []Round{badRound}}, "idem-bad"); !errors.Is(err, ErrRubricWeightMismatch) {
		t.Fatalf("expected ErrRubricWeightMismatch, got %v", err)
	}

	// 3. Create valid draft programme + verify idempotency replay & conflict
	prog, err := svc.CreateChallenge(ctx, org1, CreateChallengeInput{
		Title:            "Gauteng Community Water & Climate Challenge",
		Slug:             "gauteng-water-climate-2027",
		Description:      "School and community teams tackling local water resilience.",
		Mission:          "Identify local water needs and deliver verified solutions.",
		JurisdictionCode: "ZA-GP",
		CurrencyCode:     "ZAR",
	}, "idem-create-1")
	if err != nil {
		t.Fatalf("CreateChallenge failed: %v", err)
	}
	if prog.Status != "draft" || prog.CurrentRulesVersion != 0 || prog.FundingStatus != "unconfirmed" {
		t.Fatalf("unexpected initial programme state: %+v", prog)
	}
	// Idempotent replay with same key & payload returns identical programme
	replayProg, err := svc.CreateChallenge(ctx, org1, CreateChallengeInput{
		Title:            "Gauteng Community Water & Climate Challenge",
		Slug:             "gauteng-water-climate-2027",
		Description:      "School and community teams tackling local water resilience.",
		Mission:          "Identify local water needs and deliver verified solutions.",
		JurisdictionCode: "ZA-GP",
		CurrencyCode:     "ZAR",
	}, "idem-create-1")
	if err != nil || replayProg.ID != prog.ID {
		t.Fatalf("expected idempotent replay to return same programme, got %v", err)
	}
	// Different payload with same idempotency key returns ErrIdempotencyConflict
	if _, err := svc.CreateChallenge(ctx, org1, CreateChallengeInput{Title: "Changed Title"}, "idem-create-1"); !errors.Is(err, ErrIdempotencyConflict) {
		t.Fatalf("expected ErrIdempotencyConflict on changed payload, got %v", err)
	}

	// 4. Cross-tenant isolation: foreign tenant cannot read or approve draft programme
	if _, err := svc.GetChallenge(ctx, foreignOrg, prog.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected foreign tenant GetChallenge on draft to return ErrNotFound, got %v", err)
	}
	if _, err := svc.ApproveRules(ctx, foreignOrg, prog.ID, prog.RulesSHA256, "approve", "idem-foreign"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected foreign tenant ApproveRules to return ErrNotFound, got %v", err)
	}

	// 5. Dual human rule approval required before publish
	if _, err := svc.PublishChallenge(ctx, org1, prog.ID, "idem-pub-early"); !errors.Is(err, ErrInsufficientRuleApprovals) {
		t.Fatalf("expected ErrInsufficientRuleApprovals with 0 approvals, got %v", err)
	}
	if _, err := svc.ApproveRules(ctx, org1, prog.ID, prog.RulesSHA256, "approve", "idem-app-1"); err != nil {
		t.Fatalf("first ApproveRules failed: %v", err)
	}
	// Same human cannot approve twice
	if _, err := svc.ApproveRules(ctx, org1, prog.ID, prog.RulesSHA256, "approve", "idem-app-1b"); !errors.Is(err, ErrDuplicateApproval) {
		t.Fatalf("expected ErrDuplicateApproval for same human, got %v", err)
	}
	if _, err := svc.PublishChallenge(ctx, org1, prog.ID, "idem-pub-one"); !errors.Is(err, ErrInsufficientRuleApprovals) {
		t.Fatalf("expected ErrInsufficientRuleApprovals with 1 approval, got %v", err)
	}
	// Second distinct human approves
	if _, err := svc.ApproveRules(ctx, org2, prog.ID, prog.RulesSHA256, "approve", "idem-app-2"); err != nil {
		t.Fatalf("second ApproveRules failed: %v", err)
	}
	prog, err = svc.PublishChallenge(ctx, org1, prog.ID, "idem-pub-ok")
	if err != nil {
		t.Fatalf("PublishChallenge failed: %v", err)
	}
	if prog.CurrentRulesVersion != 1 || prog.Status != "registration_open" {
		t.Fatalf("expected published rules v1 and registration_open, got v=%d status=%s", prog.CurrentRulesVersion, prog.Status)
	}

	// 6. Applicant applies; guardian consent required before eligibility or submission
	entry, err := svc.Apply(ctx, applicant, prog.ID, ApplyInput{
		TrackID:                 prog.Tracks[0].ID,
		TeamDisplayName:         "Soweto Water Stewards",
		ParticipationMode:       "team",
		AgreedRulesVersion:      1,
		RequiresGuardianConsent: true,
	}, "idem-apply-1")
	if err != nil {
		t.Fatalf("Apply failed: %v", err)
	}
	if entry.GuardianConsentStatus != "required" || entry.Status != "screening" {
		t.Fatalf("expected guardian consent required & screening status, got %+v", entry)
	}

	// Submitting before guardian consent is blocked
	roundID := prog.Rounds[0].ID
	if _, err := svc.SubmitRoundEntry(ctx, applicant, prog.ID, entry.ID, SubmissionInput{
		RoundID:          roundID,
		ProblemStatement: "Leaking municipal standpipes",
		SolutionProposal: "Acoustic leak sensors + community Plumber brigade",
	}, "idem-sub-blocked"); !errors.Is(err, ErrGuardianConsentRequired) {
		t.Fatalf("expected ErrGuardianConsentRequired before consent verification, got %v", err)
	}

	// Record verified SS-24 guardian consent receipt
	entry, err = svc.RecordGuardianConsent(ctx, reviewer, prog.ID, entry.ID, GuardianConsentInput{
		ParticipantActorID:    applicant.Subject,
		GuardianSubjectRef:    "guardian-private-ref-001",
		SS24ConsentReceiptRef: "ss24-receipt-998877",
		PurposeCode:           "challenge_participation",
		Status:                "verified",
	})
	if err != nil || entry.GuardianConsentStatus != "verified" {
		t.Fatalf("RecordGuardianConsent failed: %v, status=%s", err, entry.GuardianConsentStatus)
	}

	// Invite and accept team member
	entry, err = svc.ManageTeamMember(ctx, applicant, prog.ID, entry.ID, TeamMemberInput{
		Action:  "invite",
		ActorID: teammate.Subject,
		Role:    "member",
	})
	if err != nil || len(entry.TeamMembers) != 2 {
		t.Fatalf("invite team member failed: %v", err)
	}
	entry, err = svc.ManageTeamMember(ctx, teammate, prog.ID, entry.ID, TeamMemberInput{
		Action: "accept",
	})
	if err != nil || entry.TeamMembers[1].InvitationState != "accepted" {
		t.Fatalf("accept team member failed: %v", err)
	}

	// 7. Eligibility review: applicant self-review forbidden, independent reviewer succeeds
	selfReviewer := testActor(applicant.Subject, "tenant-gauteng", "institution_verifier")
	if _, err := svc.DecideEligibility(ctx, selfReviewer, prog.ID, entry.ID, EligibilityDecisionInput{Decision: "eligible"}); !errors.Is(err, ErrSelfReviewForbidden) {
		t.Fatalf("expected ErrSelfReviewForbidden on self eligibility review, got %v", err)
	}
	entry, err = svc.DecideEligibility(ctx, reviewer, prog.ID, entry.ID, EligibilityDecisionInput{
		Decision:  "eligible",
		RuleCode:  "za_gp_school_team_v1",
		Rationale: "Verified school enrolment and guardian consent receipt.",
	})
	if err != nil || entry.EligibilityStatus != "eligible" {
		t.Fatalf("DecideEligibility failed: %v", err)
	}

	// 8. Concurrent final submissions with same idempotency key serialize safely
	var wg sync.WaitGroup
	subResults := make([]Submission, 2)
	subErrs := make([]error, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			subResults[idx], subErrs[idx] = svc.SubmitRoundEntry(ctx, applicant, prog.ID, entry.ID, SubmissionInput{
				RoundID:          roundID,
				ProblemStatement: "Standpipe water loss in Ward 14",
				SolutionProposal: "Pressure regulation valves and school maintenance log",
				PublicAbstract:   "Ward 14 school water conservation project.",
				EvidenceAssetRef: "ss42://evidence/ward14-baseline.jpg",
			}, "idem-sub-race")
		}(i)
	}
	wg.Wait()
	if subErrs[0] != nil || subErrs[1] != nil || subResults[0].ID != subResults[1].ID {
		t.Fatalf("expected concurrent idempotent submissions to return same submission: errs=%v, ids=%s vs %s", subErrs, subResults[0].ID, subResults[1].ID)
	}
	sub := subResults[0]

	// 9. Judge assignment, COI declaration, recusal, self-clearance rejection, and scorecard sealing
	if _, err := svc.AssignJudge(ctx, org1, prog.ID, AssignJudgeInput{SubmissionID: sub.ID, JudgeActorID: applicant.Subject}); !errors.Is(err, ErrSelfReviewForbidden) {
		t.Fatalf("expected ErrSelfReviewForbidden when assigning applicant as judge, got %v", err)
	}
	asg1, err := svc.AssignJudge(ctx, org1, prog.ID, AssignJudgeInput{SubmissionID: sub.ID, JudgeActorID: judge1.Subject})
	if err != nil {
		t.Fatalf("AssignJudge 1 failed: %v", err)
	}
	asg2, err := svc.AssignJudge(ctx, org1, prog.ID, AssignJudgeInput{SubmissionID: sub.ID, JudgeActorID: judge2.Subject})
	if err != nil {
		t.Fatalf("AssignJudge 2 failed: %v", err)
	}
	asg3, err := svc.AssignJudge(ctx, org1, prog.ID, AssignJudgeInput{SubmissionID: sub.ID, JudgeActorID: judge3.Subject})
	if err != nil {
		t.Fatalf("AssignJudge 3 failed: %v", err)
	}

	// Scoring before COI declaration is blocked
	criteria := prog.Rounds[0].Criteria
	makeLines := func(score float64) []ScoreLine {
		lines := make([]ScoreLine, len(criteria))
		for i, c := range criteria {
			lines[i] = ScoreLine{CriterionID: c.ID, Score: score, Rationale: "Detailed evidence-backed evaluation."}
		}
		return lines
	}
	if _, err := svc.SubmitScorecard(ctx, judge1, prog.ID, asg1.ID, ScorecardInput{Lines: makeLines(80)}, "idem-sc-early"); !errors.Is(err, ErrJudgeConflictBlocked) {
		t.Fatalf("expected ErrJudgeConflictBlocked before COI declaration, got %v", err)
	}

	// Judge 3 declares a conflict and attempts to self-clear -> rejected
	if _, err := svc.DeclareOrResolveConflict(ctx, judge3, prog.ID, asg3.ID, ConflictInput{Action: "declare", Status: "conflict_declared", ReasonCode: "former_mentor"}); err != nil {
		t.Fatalf("DeclareConflict failed: %v", err)
	}
	judge3WithOrgRole := testActor(judge3.Subject, "tenant-gauteng", "challenge_judge", "programme_owner")
	if _, err := svc.DeclareOrResolveConflict(ctx, judge3WithOrgRole, prog.ID, asg3.ID, ConflictInput{Action: "resolve", Status: "cleared"}); !errors.Is(err, ErrSelfConflictClearance) {
		t.Fatalf("expected ErrSelfConflictClearance when judge attempts to clear own conflict, got %v", err)
	}

	// Judge 1 & Judge 2 declare no conflict and seal scorecards (client spoofing totalBasisPoints=10000 is ignored)
	_, _ = svc.DeclareOrResolveConflict(ctx, judge1, prog.ID, asg1.ID, ConflictInput{Action: "declare", Status: "no_conflict_declared"})
	_, _ = svc.DeclareOrResolveConflict(ctx, judge2, prog.ID, asg2.ID, ConflictInput{Action: "declare", Status: "no_conflict_declared"})

	sc1, err := svc.SubmitScorecard(ctx, judge1, prog.ID, asg1.ID, ScorecardInput{
		Lines:                makeLines(80), // 80% of 10,000 bps = 8,000 bps
		UntrustedClientTotal: 10000,
	}, "idem-sc-1")
	if err != nil || sc1.TotalBasisPoints != 8000 {
		t.Fatalf("expected server-computed 8000 bps ignoring client 10000, got %d (err=%v)", sc1.TotalBasisPoints, err)
	}
	sc2, err := svc.SubmitScorecard(ctx, judge2, prog.ID, asg2.ID, ScorecardInput{
		Lines: makeLines(90), // 90% of 10,000 bps = 9,000 bps
	}, "idem-sc-2")
	if err != nil || sc2.TotalBasisPoints != 9000 {
		t.Fatalf("expected 9000 bps for judge 2, got %d (err=%v)", sc2.TotalBasisPoints, err)
	}

	// 10. Appeals hold blocks publication of round decisions until independently resolved
	appeal, err := svc.FileOrResolveAppeal(ctx, applicant, prog.ID, AppealInput{
		Action:      "file",
		EntryID:     entry.ID,
		RoundID:     roundID,
		SubjectType: "scoring",
		Reason:      "Requesting verification that baseline sensor log was included.",
	})
	if err != nil {
		t.Fatalf("FileAppeal failed: %v", err)
	}
	if _, err := svc.RecordOrPublishDecision(ctx, org1, prog.ID, roundID, RoundDecisionInput{
		EntryID:  entry.ID,
		Decision: "winner",
		Action:   "publish",
		Rank:     1,
	}, "idem-dec-blocked"); !errors.Is(err, ErrAppealHoldActive) {
		t.Fatalf("expected ErrAppealHoldActive while appeal is open, got %v", err)
	}
	// Appellant cannot self-resolve appeal
	applicantAsReviewer := testActor(applicant.Subject, "tenant-gauteng", "institution_verifier")
	if _, err := svc.FileOrResolveAppeal(ctx, applicantAsReviewer, prog.ID, AppealInput{
		Action:   "resolve",
		AppealID: appeal.ID,
		Status:   "upheld",
		Reason:   "Self resolving",
	}); !errors.Is(err, ErrSelfReviewForbidden) {
		t.Fatalf("expected ErrSelfReviewForbidden on self appeal resolution, got %v", err)
	}
	// Independent reviewer resolves appeal
	if _, err := svc.FileOrResolveAppeal(ctx, reviewer, prog.ID, AppealInput{
		Action:   "resolve",
		AppealID: appeal.ID,
		Status:   "denied",
		Reason:   "Confirmed sensor log was evaluated by both judges.",
	}); err != nil {
		t.Fatalf("ResolveAppeal failed: %v", err)
	}

	// Now decision publication succeeds with deterministic median (8000, 9000 -> 8500 bps)
	decision, err := svc.RecordOrPublishDecision(ctx, org1, prog.ID, roundID, RoundDecisionInput{
		EntryID:  entry.ID,
		Decision: "winner",
		Action:   "publish",
		Rank:     1,
	}, "idem-dec-pub")
	if err != nil || decision.ScoreBasisPoints != 8500 || decision.State != "published" {
		t.Fatalf("expected published decision with 8500 bps, got %+v (err=%v)", decision, err)
	}

	// 11. Sponsor commitment, Award approval, and Prize fulfilment truth (reject fake paid=true)
	sponsor, err := svc.RecordSponsorCommitment(ctx, org1, prog.ID, SponsorInput{
		SponsorDisplayName:    "Gauteng Civic Water Fund",
		CommitmentKind:        "cash",
		CommitmentCurrency:    "ZAR",
		CommitmentAmountMinor: 500000,
		Status:                "pledged",
	})
	if err != nil || sponsor.Status != "pledged" {
		t.Fatalf("RecordSponsorCommitment failed: %v", err)
	}
	award, err := svc.CreateOrPublishAward(ctx, org1, prog.ID, AwardInput{
		Action:     "approve",
		EntryID:    entry.ID,
		DecisionID: decision.ID,
		PrizeID:    prog.Prizes[0].ID,
	})
	if err != nil || award.FulfillmentStatus != "pending" {
		t.Fatalf("CreateOrPublishAward failed: %v", err)
	}

	// Browser/client attempting to pass paid=true or confirm cash_provider without PayCore proof is rejected
	if _, err := svc.RecordPrizeFulfillment(ctx, org1, prog.ID, award.ID, PrizeFulfillmentInput{
		FulfillmentKind:     "cash_provider",
		Status:              "confirmed_delivered",
		UntrustedClientPaid: true,
	}); !errors.Is(err, ErrUnverifiedCashFulfillment) {
		t.Fatalf("expected ErrUnverifiedCashFulfillment when client sends paid=true, got %v", err)
	}
	if _, err := svc.RecordPrizeFulfillment(ctx, org1, prog.ID, award.ID, PrizeFulfillmentInput{
		FulfillmentKind:   "cash_provider",
		Status:            "confirmed_delivered",
		ProviderReference: "paycore-unsigned",
	}); !errors.Is(err, ErrUnverifiedCashFulfillment) {
		t.Fatalf("expected ErrUnverifiedCashFulfillment without PayCore signature verification, got %v", err)
	}

	// Verified in-kind / project grant delivery with evidence reference succeeds
	fulfillment, err := svc.RecordPrizeFulfillment(ctx, org1, prog.ID, award.ID, PrizeFulfillmentInput{
		FulfillmentKind:     "in_kind_delivery",
		Status:              "confirmed_delivered",
		DeliveryEvidenceRef: "ss42://evidence/grant-equipment-handover-receipt.pdf",
	})
	if err != nil || fulfillment.Status != "confirmed_delivered" {
		t.Fatalf("RecordPrizeFulfillment with verified evidence failed: %v", err)
	}

	// 12. Link to governed Action Project
	link, err := svc.LinkProject(ctx, org1, prog.ID, entry.ID, ProjectLinkInput{
		ActionProjectID: "prj_ward14_water",
		Relationship:    "challenge_delivery",
	})
	if err != nil || link.ActionProjectID != "prj_ward14_water" {
		t.Fatalf("LinkProject failed: %v", err)
	}

	// 13. Guardian consent revocation recalls public result disclosure
	if _, err := svc.RecordGuardianConsent(ctx, applicant, prog.ID, entry.ID, GuardianConsentInput{
		ParticipantActorID: applicant.Subject,
		Status:             "revoked",
	}); err != nil {
		t.Fatalf("revoke consent failed: %v", err)
	}
	publicView, err := svc.GetChallenge(ctx, Actor{}, prog.ID)
	if err != nil {
		t.Fatalf("public GetChallenge failed: %v", err)
	}
	if len(publicView.PublishedResults) != 0 {
		t.Fatalf("expected revoked guardian consent to redact entry from public results, got %d results", len(publicView.PublishedResults))
	}
}
