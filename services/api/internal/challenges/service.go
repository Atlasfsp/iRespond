package challenges

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"
)

var (
	ErrNotFound                    = errors.New("challenge resource not found")
	ErrForbidden                   = errors.New("forbidden")
	ErrHumanActorRequired          = errors.New("verified human actor required")
	ErrInvalidInput                = errors.New("invalid challenge input")
	ErrInvalidState                = errors.New("invalid challenge state transition")
	ErrDuplicateApproval           = errors.New("distinct human approver required for second rule approval")
	ErrInsufficientRuleApprovals   = errors.New("two distinct human rule approvals are required before publishing")
	ErrRubricWeightMismatch        = errors.New("rubric criterion weights must sum to exactly 10000 basis points")
	ErrSelfReviewForbidden         = errors.New("independent human reviewer required; self-review is forbidden")
	ErrSelfConflictClearance       = errors.New("judge cannot clear their own conflict of interest")
	ErrJudgeConflictBlocked        = errors.New("judge conflict of interest must be declared and cleared before scoring")
	ErrSubmissionDeadlinePassed    = errors.New("round submission deadline has passed")
	ErrAppealHoldActive            = errors.New("cannot publish round results while an appeal hold is active")
	ErrInsufficientScorecardQuorum = errors.New("insufficient sealed judge scorecards for round quorum")
	ErrUnverifiedCashFulfillment   = errors.New("cash prize fulfillment requires verified PayCore reference and provider confirmation")
	ErrGuardianConsentRequired     = errors.New("verified guardian consent receipt is required before active participation")
	ErrTeamCapacityExceeded        = errors.New("track maximum team member limit reached")
	ErrIdempotencyConflict         = errors.New("idempotency key reused with different request payload")
	ErrAICOFeatureDisabled         = errors.New("AICO challenge assistant is disabled by policy")
)

type Actor struct {
	Subject   string
	ActorType string
	TenantID  string
	Roles     map[string]struct{}
}

func (a Actor) IsHuman() bool {
	return strings.TrimSpace(a.Subject) != "" && (a.ActorType == "" || a.ActorType == "human")
}

func (a Actor) HasRole(roles ...string) bool {
	for _, r := range roles {
		if _, ok := a.Roles[r]; ok {
			return true
		}
	}
	return false
}

type RubricCriterion struct {
	ID                string  `json:"id"`
	RoundID           string  `json:"roundId"`
	RubricVersion     int     `json:"rubricVersion"`
	Sequence          int     `json:"sequence"`
	Code              string  `json:"code"`
	Title             string  `json:"title"`
	Description       string  `json:"description"`
	WeightBasisPoints int     `json:"weightBasisPoints"`
	MaximumScore      float64 `json:"maximumScore"`
}

type Track struct {
	ID                      string `json:"id"`
	ProgramID               string `json:"programId"`
	Title                   string `json:"title"`
	Description             string `json:"description"`
	LevelCode               string `json:"levelCode"`
	ParticipationMode       string `json:"participationMode"`
	MinimumTeamMembers      int    `json:"minimumTeamMembers"`
	MaximumTeamMembers      int    `json:"maximumTeamMembers"`
	RequiresGuardianConsent bool   `json:"requiresGuardianConsent"`
}

type Round struct {
	ID               string            `json:"id"`
	ProgramID        string            `json:"programId"`
	Sequence         int               `json:"sequence"`
	Title            string            `json:"title"`
	Kind             string            `json:"kind"`
	Status           string            `json:"status"`
	OpensAt          time.Time         `json:"opensAt"`
	ClosesAt         time.Time         `json:"closesAt"`
	RequiredJudges   int               `json:"requiredJudges"`
	ScoringAlgorithm string            `json:"scoringAlgorithm"`
	RubricVersion    int               `json:"rubricVersion"`
	Criteria         []RubricCriterion `json:"criteria"`
}

type RuleApproval struct {
	ID              string    `json:"id"`
	ProgramID       string    `json:"programId"`
	RulesSHA256     string    `json:"rulesSha256"`
	ApproverActorID string    `json:"approverActorId"`
	Decision        string    `json:"decision"`
	CreatedAt       time.Time `json:"createdAt"`
}

type ProgramVersion struct {
	ProgramID             string    `json:"programId"`
	RulesVersion          int       `json:"rulesVersion"`
	ContentSHA256         string    `json:"contentSha256"`
	ApprovedByActorID     string    `json:"approvedByActorId"`
	SecondApproverActorID string    `json:"secondApproverActorId"`
	PublishedAt           time.Time `json:"publishedAt"`
}

type TeamMember struct {
	EntryID               string     `json:"entryId"`
	ActorID               string     `json:"actorId"`
	MemberRole            string     `json:"memberRole"`
	InvitationState       string     `json:"invitationState"`
	GuardianConsentStatus string     `json:"guardianConsentStatus"`
	JoinedAt              *time.Time `json:"joinedAt,omitempty"`
}

type GuardianConsent struct {
	ID                     string     `json:"id"`
	ProgramID              string     `json:"programId"`
	EntryID                string     `json:"entryId"`
	ParticipantActorID     string     `json:"participantActorId"`
	GuardianSubjectRef     string     `json:"-"`
	SS24ConsentReceiptRef  string     `json:"ss24ConsentReceiptRef"`
	PurposeCode            string     `json:"purposeCode"`
	RulesVersion           int        `json:"rulesVersion"`
	Status                 string     `json:"status"`
	VerifiedByActorID      string     `json:"verifiedByActorId,omitempty"`
	VerifiedAt             *time.Time `json:"verifiedAt,omitempty"`
	RevokedAt              *time.Time `json:"revokedAt,omitempty"`
}

type EligibilityDecision struct {
	ID              string    `json:"id"`
	ProgramID       string    `json:"programId"`
	EntryID         string    `json:"entryId"`
	Decision        string    `json:"decision"`
	RuleCode        string    `json:"ruleCode"`
	ReviewerActorID string    `json:"reviewerActorId"`
	CreatedAt       time.Time `json:"createdAt"`
}

type Entry struct {
	ID                    string       `json:"id"`
	TenantID              string       `json:"tenantId"`
	ProgramID             string       `json:"programId"`
	TrackID               string       `json:"trackId"`
	LeadActorID           string       `json:"leadActorId"`
	EntryCode             string       `json:"entryCode"`
	TeamDisplayName       string       `json:"teamDisplayName"`
	ParticipationMode     string       `json:"participationMode"`
	Status                string       `json:"status"`
	EligibilityStatus     string       `json:"eligibilityStatus"`
	GuardianConsentStatus string       `json:"guardianConsentStatus"`
	AgreedRulesVersion    int          `json:"agreedRulesVersion"`
	LinkedProjectID       string       `json:"linkedProjectId,omitempty"`
	TeamMembers           []TeamMember `json:"teamMembers"`
	AppliedAt             time.Time    `json:"appliedAt"`
	UpdatedAt             time.Time    `json:"updatedAt"`
}

type Submission struct {
	ID                 string    `json:"id"`
	ProgramID          string    `json:"programId"`
	EntryID            string    `json:"entryId"`
	RoundID            string    `json:"roundId"`
	Revision           int       `json:"revision"`
	Status             string    `json:"status"`
	ProblemStatement   string    `json:"problemStatement"`
	SolutionProposal   string    `json:"solutionProposal"`
	PublicAbstract     string    `json:"publicAbstract"`
	EvidenceAssetRef   string    `json:"evidenceAssetRef,omitempty"`
	SubmittedByActorID string    `json:"submittedByActorId"`
	SubmittedAt        time.Time `json:"submittedAt"`
	SubmissionSHA256   string    `json:"submissionSha256"`
}

type JudgeAssignment struct {
	ID                 string     `json:"id"`
	ProgramID          string     `json:"programId"`
	SubmissionID       string     `json:"submissionId"`
	EntryID            string     `json:"entryId"`
	RoundID            string     `json:"roundId"`
	JudgeActorID       string     `json:"judgeActorId"`
	AssignmentStatus   string     `json:"assignmentStatus"`
	ConflictStatus     string     `json:"conflictStatus"`
	ConflictReasonCode string     `json:"conflictReasonCode,omitempty"`
	ConflictReportedBy string     `json:"-"`
	ConflictResolvedBy string     `json:"conflictResolvedBy,omitempty"`
	AssignedByActorID  string     `json:"assignedByActorId"`
	AssignedAt         time.Time  `json:"assignedAt"`
	CompletedAt        *time.Time `json:"completedAt,omitempty"`
}

type ScoreLine struct {
	CriterionID string  `json:"criterionId"`
	Score       float64 `json:"score"`
	Rationale   string  `json:"rationale"`
}

type Scorecard struct {
	ID                    string      `json:"id"`
	ProgramID             string      `json:"programId"`
	AssignmentID          string      `json:"assignmentId"`
	SubmissionID          string      `json:"submissionId"`
	EntryID               string      `json:"entryId"`
	RoundID               string      `json:"roundId"`
	JudgeActorID          string      `json:"judgeActorId"`
	RubricVersion         int         `json:"rubricVersion"`
	Revision              int         `json:"revision"`
	SupersedesScorecardID string      `json:"supersedesScorecardId,omitempty"`
	Status                string      `json:"status"`
	TotalBasisPoints      int         `json:"totalBasisPoints"`
	Lines                 []ScoreLine `json:"lines,omitempty"`
	SealedAt              time.Time   `json:"sealedAt"`
}

type Decision struct {
	ID                 string     `json:"id"`
	ProgramID          string     `json:"programId"`
	RoundID            string     `json:"roundId"`
	EntryID            string     `json:"entryId"`
	TeamDisplayName    string     `json:"teamDisplayName,omitempty"`
	Decision           string     `json:"decision"`
	State              string     `json:"state"`
	Rank               int        `json:"rank"`
	ScoreBasisPoints   int        `json:"scoreBasisPoints"`
	SourceScorecardIDs []string   `json:"sourceScorecardIds"`
	CreatedByActorID   string     `json:"createdByActorId"`
	ApprovedByActorID  string     `json:"approvedByActorId,omitempty"`
	PublishedByActorID string     `json:"publishedByActorId,omitempty"`
	PublishedAt        *time.Time `json:"publishedAt,omitempty"`
}

type Appeal struct {
	ID               string     `json:"id"`
	ProgramID        string     `json:"programId"`
	EntryID          string     `json:"entryId"`
	RoundID          string     `json:"roundId,omitempty"`
	SubjectType      string     `json:"subjectType"`
	SubjectID        string     `json:"subjectId"`
	AppellantActorID string     `json:"appellantActorId"`
	Reason           string     `json:"reason"`
	Status           string     `json:"status"`
	ReviewerActorID  string     `json:"reviewerActorId,omitempty"`
	ResolutionNote   string     `json:"resolutionNote,omitempty"`
	SubmittedAt      time.Time  `json:"submittedAt"`
	ResolvedAt       *time.Time `json:"resolvedAt,omitempty"`
}

type SponsorCommitment struct {
	ID                    string    `json:"id"`
	ProgramID             string    `json:"programId"`
	SponsorDisplayName    string    `json:"sponsorDisplayName"`
	OrganisationRef       string    `json:"organisationRef,omitempty"`
	CommitmentKind        string    `json:"commitmentKind"`
	CommitmentCurrency    string    `json:"commitmentCurrency,omitempty"`
	CommitmentAmountMinor int64     `json:"commitmentAmountMinor,omitempty"`
	CommitmentDescription string    `json:"commitmentDescription,omitempty"`
	Status                string    `json:"status"`
	SS22PaymentReference  string    `json:"ss22PaymentReference,omitempty"`
	TruthNotice           string    `json:"truthNotice"`
	CreatedAt             time.Time `json:"createdAt"`
}

type Prize struct {
	ID                string `json:"id"`
	ProgramID         string `json:"programId"`
	Title             string `json:"title"`
	PrizeKind         string `json:"prizeKind"`
	CurrencyCode      string `json:"currencyCode,omitempty"`
	AmountMinor       int64  `json:"amountMinor,omitempty"`
	InKindDescription string `json:"inKindDescription,omitempty"`
	Status            string `json:"status"`
	FundingStatus     string `json:"fundingStatus"`
}

type Award struct {
	ID                 string     `json:"id"`
	ProgramID          string     `json:"programId"`
	EntryID            string     `json:"entryId"`
	DecisionID         string     `json:"decisionId,omitempty"`
	PrizeID            string     `json:"prizeId"`
	PrizeTitle         string     `json:"prizeTitle"`
	PrizeKind          string     `json:"prizeKind"`
	Status             string     `json:"status"`
	FulfillmentStatus  string     `json:"fulfillmentStatus"`
	TruthStateLabel    string     `json:"truthStateLabel"`
	NominatedByActorID string     `json:"nominatedByActorId"`
	ApprovedByActorID  string     `json:"approvedByActorId,omitempty"`
	PublishedByActorID string     `json:"publishedByActorId,omitempty"`
	ApprovedAt         *time.Time `json:"approvedAt,omitempty"`
	PublishedAt        *time.Time `json:"publishedAt,omitempty"`
}

type PrizeFulfillment struct {
	ID                  string     `json:"id"`
	ProgramID           string     `json:"programId"`
	AwardID             string     `json:"awardId"`
	FulfillmentKind     string     `json:"fulfillmentKind"`
	Status              string     `json:"status"`
	ProviderReference   string     `json:"providerReference,omitempty"`
	DeliveryEvidenceRef string     `json:"deliveryEvidenceRef,omitempty"`
	VerifiedByActorID   string     `json:"verifiedByActorId,omitempty"`
	ProviderConfirmedAt *time.Time `json:"providerConfirmedAt,omitempty"`
	DeliveredAt         *time.Time `json:"deliveredAt,omitempty"`
	TruthNotice         string     `json:"truthNotice"`
}

type ProjectLink struct {
	ID              string    `json:"id"`
	ProgramID       string    `json:"programId"`
	EntryID         string    `json:"entryId"`
	ActionProjectID string    `json:"actionProjectId"`
	LinkedByActorID string    `json:"linkedByActorId"`
	Relationship    string    `json:"relationship"`
	LinkedAt        time.Time `json:"linkedAt"`
}

type AuditEvent struct {
	ID               string    `json:"id"`
	TenantID         string    `json:"tenantId"`
	ProgramID        string    `json:"programId"`
	AggregateType    string    `json:"aggregateType"`
	AggregateID      string    `json:"aggregateId"`
	ActorSubject     string    `json:"actorSubject"`
	ActorType        string    `json:"actorType"`
	Action           string    `json:"action"`
	EventType        string    `json:"eventType"`
	PolicyReceiptRef string    `json:"policyReceiptRef,omitempty"`
	OccurredAt       time.Time `json:"occurredAt"`
}

type Permissions struct {
	CanManageProgramme   bool `json:"canManageProgramme"`
	CanApproveRules      bool `json:"canApproveRules"`
	CanReviewEligibility bool `json:"canReviewEligibility"`
	CanAssignJudges      bool `json:"canAssignJudges"`
	CanJudge             bool `json:"canJudge"`
	CanReviewConflicts   bool `json:"canReviewConflicts"`
	CanReviewAppeals     bool `json:"canReviewAppeals"`
	CanManageSponsors    bool `json:"canManageSponsors"`
	CanManageAwards      bool `json:"canManageAwards"`
}

type Programme struct {
	ID                   string              `json:"id"`
	TenantID             string              `json:"tenantId"`
	Slug                 string              `json:"slug"`
	Title                string              `json:"title"`
	Description          string              `json:"description"`
	Mission              string              `json:"mission"`
	OwnerActorID         string              `json:"ownerActorId"`
	JurisdictionCode     string              `json:"jurisdictionCode"`
	Locale               string              `json:"locale"`
	Timezone             string              `json:"timezone"`
	CurrencyCode         string              `json:"currencyCode,omitempty"`
	Visibility           string              `json:"visibility"`
	Status               string              `json:"status"`
	CurrentRulesVersion  int                 `json:"currentRulesVersion"`
	RulesSHA256          string              `json:"rulesSha256"`
	RuleApprovalCount    int                 `json:"ruleApprovalCount"`
	FundingStatus        string              `json:"fundingStatus"`
	SponsorStatus        string              `json:"sponsorStatus"`
	GuardianConsentRule  string              `json:"guardianConsentRule"`
	PublicResultPolicy   string              `json:"publicResultPolicy"`
	RegistrationOpensAt  *time.Time          `json:"registrationOpensAt,omitempty"`
	RegistrationClosesAt *time.Time          `json:"registrationClosesAt,omitempty"`
	StartsAt             *time.Time          `json:"startsAt,omitempty"`
	EndsAt               *time.Time          `json:"endsAt,omitempty"`
	Version              int64               `json:"version"`
	CreatedAt            time.Time           `json:"createdAt"`
	UpdatedAt            time.Time           `json:"updatedAt"`
	Tracks               []Track             `json:"tracks"`
	Rounds               []Round             `json:"rounds"`
	Prizes               []Prize             `json:"prizes"`
	Sponsors             []SponsorCommitment `json:"sponsors,omitempty"`
	PublishedResults     []Decision          `json:"publishedResults,omitempty"`
	Awards               []Award             `json:"awards,omitempty"`
	Appeals              []Appeal            `json:"appeals,omitempty"`
	Entries              []Entry             `json:"entries,omitempty"`
	Submissions          []Submission        `json:"submissions,omitempty"`
	AuditEvents          []AuditEvent        `json:"auditEvents,omitempty"`
	Permissions          *Permissions        `json:"permissions,omitempty"`
}

type CreateChallengeInput struct {
	Slug                 string     `json:"slug"`
	Title                string     `json:"title"`
	Description          string     `json:"description"`
	Mission              string     `json:"mission"`
	JurisdictionCode     string     `json:"jurisdictionCode"`
	Locale               string     `json:"locale"`
	Timezone             string     `json:"timezone"`
	CurrencyCode         string     `json:"currencyCode"`
	Visibility           string     `json:"visibility"`
	RegistrationOpensAt  *time.Time `json:"registrationOpensAt"`
	RegistrationClosesAt *time.Time `json:"registrationClosesAt"`
	StartsAt             *time.Time `json:"startsAt"`
	EndsAt               *time.Time `json:"endsAt"`
	Tracks               []Track    `json:"tracks"`
	Rounds               []Round    `json:"rounds"`
	Prizes               []Prize    `json:"prizes"`
}

type ApplyInput struct {
	TrackID                 string `json:"trackId"`
	TeamDisplayName         string `json:"teamDisplayName"`
	ParticipationMode       string `json:"participationMode"`
	AgreedRulesVersion      int    `json:"agreedRulesVersion"`
	RequiresGuardianConsent bool   `json:"requiresGuardianConsent"`
}

type TeamMemberInput struct {
	Action  string `json:"action"` // invite, accept, decline
	ActorID string `json:"actorId"`
	Role    string `json:"role"`
}

type GuardianConsentInput struct {
	ParticipantActorID    string `json:"participantActorId"`
	GuardianSubjectRef    string `json:"guardianSubjectRef"`
	SS24ConsentReceiptRef string `json:"ss24ConsentReceiptRef"`
	PurposeCode           string `json:"purposeCode"`
	Status                string `json:"status"` // verified, revoked
}

type EligibilityDecisionInput struct {
	Decision  string `json:"decision"` // eligible, ineligible, needs_information
	RuleCode  string `json:"ruleCode"`
	Rationale string `json:"rationale"`
}

type SubmissionInput struct {
	RoundID          string `json:"roundId"`
	ProblemStatement string `json:"problemStatement"`
	SolutionProposal string `json:"solutionProposal"`
	PublicAbstract   string `json:"publicAbstract"`
	EvidenceAssetRef string `json:"evidenceAssetRef"`
	SubmissionSHA256 string `json:"submissionSha256"`
}

type AssignJudgeInput struct {
	SubmissionID string `json:"submissionId"`
	JudgeActorID string `json:"judgeActorId"`
}

type ConflictInput struct {
	Action     string `json:"action"` // declare, resolve
	Status     string `json:"status"` // no_conflict_declared, conflict_declared, cleared, recused
	ReasonCode string `json:"reasonCode"`
	Rationale  string `json:"rationale"`
}

type ScorecardInput struct {
	Lines                 []ScoreLine `json:"lines"`
	PrivateOverallComment string      `json:"privateOverallComment"`
	SupersedesScorecardID string      `json:"supersedesScorecardId"`
	UntrustedClientTotal  int         `json:"totalBasisPoints"`
}

type RoundDecisionInput struct {
	EntryID  string `json:"entryId"`
	Decision string `json:"decision"` // qualified, not_qualified, finalist, winner, runner_up, no_award
	Action   string `json:"action"`   // approve, publish
	Rank     int    `json:"rank"`
	Reason   string `json:"reason"`
}

type AppealInput struct {
	Action      string `json:"action"` // file, resolve
	AppealID    string `json:"appealId"`
	EntryID     string `json:"entryId"`
	RoundID     string `json:"roundId"`
	SubjectType string `json:"subjectType"`
	SubjectID   string `json:"subjectId"`
	Reason      string `json:"reason"`
	Status      string `json:"status"` // upheld, denied, remanded
}

type SponsorInput struct {
	SponsorDisplayName    string `json:"sponsorDisplayName"`
	OrganisationRef       string `json:"organisationRef"`
	CommitmentKind        string `json:"commitmentKind"`
	CommitmentCurrency    string `json:"commitmentCurrency"`
	CommitmentAmountMinor int64  `json:"commitmentAmountMinor"`
	CommitmentDescription string `json:"commitmentDescription"`
	Status                string `json:"status"` // interest, pledged, provider_confirmed
	SS22PaymentReference  string `json:"ss22PaymentReference"`
}

type AwardInput struct {
	Action     string `json:"action"` // nominate, approve, publish
	AwardID    string `json:"awardId"`
	EntryID    string `json:"entryId"`
	DecisionID string `json:"decisionId"`
	PrizeID    string `json:"prizeId"`
}

type PrizeFulfillmentInput struct {
	FulfillmentKind          string `json:"fulfillmentKind"` // cash_provider, in_kind_delivery, mentorship, scholarship, experience
	Status                   string `json:"status"`          // pending, provider_initiated, confirmed_delivered
	ProviderReference        string `json:"providerReference"`
	PayCoreSignatureVerified bool   `json:"-"`
	DeliveryEvidenceRef      string `json:"deliveryEvidenceRef"`
	UntrustedClientPaid      bool   `json:"paid"`
}

type ProjectLinkInput struct {
	ActionProjectID string `json:"actionProjectId"`
	Relationship    string `json:"relationship"`
}

type idempotencyRecord struct {
	payloadHash string
	response    any
}

type Service struct {
	mu           sync.RWMutex
	now          func() time.Time
	aicoEnabled  bool
	programs     map[string]*Programme
	approvals    map[string][]RuleApproval
	versions     map[string][]ProgramVersion
	entries      map[string]*Entry
	consents     map[string][]GuardianConsent
	eligibility  map[string][]EligibilityDecision
	submissions  map[string]*Submission
	assignments  map[string]*JudgeAssignment
	scorecards   map[string]*Scorecard
	decisions    map[string]*Decision
	appeals      map[string]*Appeal
	sponsors     map[string][]SponsorCommitment
	awards       map[string]*Award
	fulfillments map[string][]PrizeFulfillment
	projectLinks map[string][]ProjectLink
	auditEvents  map[string][]AuditEvent
	idempotency  map[string]idempotencyRecord
}

func NewMemoryService() *Service {
	return &Service{
		now:          func() time.Time { return time.Now().UTC() },
		aicoEnabled:  false,
		programs:     make(map[string]*Programme),
		approvals:    make(map[string][]RuleApproval),
		versions:     make(map[string][]ProgramVersion),
		entries:      make(map[string]*Entry),
		consents:     make(map[string][]GuardianConsent),
		eligibility:  make(map[string][]EligibilityDecision),
		submissions:  make(map[string]*Submission),
		assignments:  make(map[string]*JudgeAssignment),
		scorecards:   make(map[string]*Scorecard),
		decisions:    make(map[string]*Decision),
		appeals:      make(map[string]*Appeal),
		sponsors:     make(map[string][]SponsorCommitment),
		awards:       make(map[string]*Award),
		fulfillments: make(map[string][]PrizeFulfillment),
		projectLinks: make(map[string][]ProjectLink),
		auditEvents:  make(map[string][]AuditEvent),
		idempotency:  make(map[string]idempotencyRecord),
	}
}

func (s *Service) Close() {}

func canOrganise(a Actor) bool {
	return a.IsHuman() && strings.TrimSpace(a.TenantID) != "" && a.HasRole("programme_owner", "institution_admin", "project_steward", "trust_safety_admin")
}

func canReview(a Actor) bool {
	return a.IsHuman() && strings.TrimSpace(a.TenantID) != "" && a.HasRole("programme_owner", "institution_admin", "community_verifier", "institution_verifier", "expert_verifier", "safety_reviewer", "trust_safety_admin")
}

func ValidateRubricWeights(criteria []RubricCriterion) error {
	if len(criteria) < 2 || len(criteria) > 12 {
		return ErrRubricWeightMismatch
	}
	total := 0
	seenCodes := make(map[string]bool, len(criteria))
	for _, c := range criteria {
		code := strings.TrimSpace(c.Code)
		if code == "" || seenCodes[code] || c.WeightBasisPoints <= 0 || c.MaximumScore <= 0 {
			return ErrRubricWeightMismatch
		}
		seenCodes[code] = true
		total += c.WeightBasisPoints
	}
	if total != 10000 {
		return ErrRubricWeightMismatch
	}
	return nil
}

func CalculateScorecardBasisPoints(criteria []RubricCriterion, lines []ScoreLine) (int, error) {
	if err := ValidateRubricWeights(criteria); err != nil {
		return 0, err
	}
	if len(lines) != len(criteria) {
		return 0, ErrInvalidInput
	}
	byID := make(map[string]RubricCriterion, len(criteria))
	for _, c := range criteria {
		byID[c.ID] = c
	}
	seen := make(map[string]bool, len(lines))
	totalScaled := int64(0)
	for _, line := range lines {
		c, ok := byID[line.CriterionID]
		if !ok || seen[line.CriterionID] {
			return 0, ErrInvalidInput
		}
		if line.Score < 0 || line.Score > c.MaximumScore || strings.TrimSpace(line.Rationale) == "" {
			return 0, ErrInvalidInput
		}
		seen[line.CriterionID] = true
		ratio := line.Score / c.MaximumScore
		points := int64(ratio*float64(c.WeightBasisPoints)*1000 + 0.5)
		totalScaled += points
	}
	bps := int((totalScaled + 500) / 1000)
	if bps < 0 {
		bps = 0
	}
	if bps > 10000 {
		bps = 10000
	}
	return bps, nil
}

func AggregateScorecardsBasisPoints(algorithm string, totals []int) (int, error) {
	if len(totals) == 0 {
		return 0, ErrInsufficientScorecardQuorum
	}
	cp := append([]int(nil), totals...)
	sort.Ints(cp)
	if algorithm == "weighted_mean_v1" {
		sum := 0
		for _, v := range cp {
			sum += v
		}
		return (sum + len(cp)/2) / len(cp), nil
	}
	mid := len(cp) / 2
	if len(cp)%2 == 1 {
		return cp[mid], nil
	}
	return (cp[mid-1] + cp[mid] + 1) / 2, nil
}

func (s *Service) checkIdempotencyLocked(actor Actor, route, key string, payload any) (any, bool, error) {
	key = strings.TrimSpace(key)
	if key == "" {
		return nil, false, nil
	}
	raw, _ := json.Marshal(payload)
	sum := sha256.Sum256(raw)
	hash := hex.EncodeToString(sum[:])
	scopeKey := actor.TenantID + "|" + actor.Subject + "|" + route + "|" + key
	if existing, ok := s.idempotency[scopeKey]; ok {
		if existing.payloadHash != hash {
			return nil, false, ErrIdempotencyConflict
		}
		return existing.response, true, nil
	}
	return hash, false, nil
}

func (s *Service) saveIdempotencyLocked(actor Actor, route, key, hash string, response any) {
	key = strings.TrimSpace(key)
	if key == "" || hash == "" {
		return
	}
	scopeKey := actor.TenantID + "|" + actor.Subject + "|" + route + "|" + key
	s.idempotency[scopeKey] = idempotencyRecord{payloadHash: hash, response: response}
}

func (s *Service) appendAuditLocked(tenantID, programID, aggType, aggID string, actor Actor, action, eventType string) {
	actorType := actor.ActorType
	if actorType == "" {
		actorType = "human"
	}
	ev := AuditEvent{
		ID:            newID(),
		TenantID:      tenantID,
		ProgramID:     programID,
		AggregateType: aggType,
		AggregateID:   aggID,
		ActorSubject:  actor.Subject,
		ActorType:     actorType,
		Action:        action,
		EventType:     eventType,
		OccurredAt:    s.now(),
	}
	s.auditEvents[programID] = append(s.auditEvents[programID], ev)
}

func (s *Service) CreateChallenge(_ context.Context, actor Actor, in CreateChallengeInput, idemKey string) (Programme, error) {
	if !actor.IsHuman() {
		return Programme{}, ErrHumanActorRequired
	}
	if !canOrganise(actor) {
		return Programme{}, ErrForbidden
	}
	title := strings.TrimSpace(in.Title)
	slug := strings.TrimSpace(in.Slug)
	if slug == "" {
		slug = strings.ToLower(strings.ReplaceAll(title, " ", "-"))
	}
	if title == "" || slug == "" {
		return Programme{}, ErrInvalidInput
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	val, replay, err := s.checkIdempotencyLocked(actor, "CreateChallenge", idemKey, in)
	if err != nil {
		return Programme{}, err
	}
	if replay {
		return val.(Programme), nil
	}
	hash, _ := val.(string)

	now := s.now()
	progID := "chg_" + newID()[:12]
	tracks := in.Tracks
	if len(tracks) == 0 {
		tracks = []Track{
			{
				ID:                      "trk_" + newID()[:10],
				ProgramID:               progID,
				Title:                   "Community Action Track",
				Description:             "Team or individual community problem-solving track.",
				LevelCode:               "secondary",
				ParticipationMode:       "both",
				MinimumTeamMembers:      1,
				MaximumTeamMembers:      5,
				RequiresGuardianConsent: true,
			},
		}
	} else {
		for i := range tracks {
			if tracks[i].ID == "" {
				tracks[i].ID = fmt.Sprintf("trk_%s_%d", progID, i+1)
			}
			tracks[i].ProgramID = progID
			if tracks[i].MinimumTeamMembers <= 0 {
				tracks[i].MinimumTeamMembers = 1
			}
			if tracks[i].MaximumTeamMembers < tracks[i].MinimumTeamMembers {
				tracks[i].MaximumTeamMembers = max(tracks[i].MinimumTeamMembers, 5)
			}
			if tracks[i].ParticipationMode == "" {
				tracks[i].ParticipationMode = "both"
			}
		}
	}

	rounds := in.Rounds
	if len(rounds) == 0 {
		roundID := "rnd_" + newID()[:10]
		rounds = []Round{
			{
				ID:               roundID,
				ProgramID:        progID,
				Sequence:         1,
				Title:            "Round 1: Problem & Solution Proposal",
				Kind:             "proposal",
				Status:           "open",
				OpensAt:          now.Add(-24 * time.Hour),
				ClosesAt:         now.Add(30 * 24 * time.Hour),
				RequiredJudges:   2,
				ScoringAlgorithm: "weighted_median_v1",
				RubricVersion:    1,
				Criteria: []RubricCriterion{
					{ID: "crit_problem", RoundID: roundID, RubricVersion: 1, Sequence: 1, Code: "problem", Title: "Clarity of problem", WeightBasisPoints: 2000, MaximumScore: 100},
					{ID: "crit_feasibility", RoundID: roundID, RubricVersion: 1, Sequence: 2, Code: "feasibility", Title: "Solution feasibility", WeightBasisPoints: 2500, MaximumScore: 100},
					{ID: "crit_participation", RoundID: roundID, RubricVersion: 1, Sequence: 3, Code: "participation", Title: "Community participation", WeightBasisPoints: 2000, MaximumScore: 100},
					{ID: "crit_evidence", RoundID: roundID, RubricVersion: 1, Sequence: 4, Code: "evidence", Title: "Verifiable progress and outcomes", WeightBasisPoints: 2500, MaximumScore: 100},
					{ID: "crit_sustainability", RoundID: roundID, RubricVersion: 1, Sequence: 5, Code: "sustainability", Title: "Maintenance and replication", WeightBasisPoints: 1000, MaximumScore: 100},
				},
			},
		}
	} else {
		for i := range rounds {
			if rounds[i].ID == "" {
				rounds[i].ID = fmt.Sprintf("rnd_%s_%d", progID, i+1)
			}
			rounds[i].ProgramID = progID
			if rounds[i].RequiredJudges <= 0 {
				rounds[i].RequiredJudges = 2
			}
			if rounds[i].ScoringAlgorithm == "" {
				rounds[i].ScoringAlgorithm = "weighted_median_v1"
			}
			if rounds[i].RubricVersion <= 0 {
				rounds[i].RubricVersion = 1
			}
			if err := ValidateRubricWeights(rounds[i].Criteria); err != nil {
				return Programme{}, err
			}
		}
	}

	prizes := in.Prizes
	if len(prizes) == 0 {
		prizes = []Prize{
			{
				ID:            "prz_" + newID()[:10],
				ProgramID:     progID,
				Title:         "Community Project Implementation Grant",
				PrizeKind:     "project_grant",
				CurrencyCode:  valueOr(in.CurrencyCode, "ZAR"),
				AmountMinor:   500000,
				Status:        "announced",
				FundingStatus: "unconfirmed",
			},
		}
	} else {
		for i := range prizes {
			if prizes[i].ID == "" {
				prizes[i].ID = fmt.Sprintf("prz_%s_%d", progID, i+1)
			}
			prizes[i].ProgramID = progID
			if prizes[i].FundingStatus == "" {
				prizes[i].FundingStatus = "unconfirmed"
			}
		}
	}

	rulesRaw, _ := json.Marshal(map[string]any{
		"title":   title,
		"mission": in.Mission,
		"tracks":  tracks,
		"rounds":  rounds,
		"prizes":  prizes,
	})
	rulesDigest := sha256.Sum256(rulesRaw)

	prog := &Programme{
		ID:                   progID,
		TenantID:             actor.TenantID,
		Slug:                 slug,
		Title:                title,
		Description:          strings.TrimSpace(in.Description),
		Mission:              strings.TrimSpace(in.Mission),
		OwnerActorID:         actor.Subject,
		JurisdictionCode:     valueOr(in.JurisdictionCode, "ZA-GP"),
		Locale:               valueOr(in.Locale, "en-ZA"),
		Timezone:             valueOr(in.Timezone, "Africa/Johannesburg"),
		CurrencyCode:         valueOr(in.CurrencyCode, "ZAR"),
		Visibility:           valueOr(in.Visibility, "public"),
		Status:               "draft",
		CurrentRulesVersion:  0,
		RulesSHA256:          hex.EncodeToString(rulesDigest[:]),
		FundingStatus:        "unconfirmed",
		SponsorStatus:        "not_confirmed",
		GuardianConsentRule:  "required_per_jurisdiction_and_policy",
		PublicResultPolicy:   "opt_in_redacted",
		RegistrationOpensAt:  in.RegistrationOpensAt,
		RegistrationClosesAt: in.RegistrationClosesAt,
		StartsAt:             in.StartsAt,
		EndsAt:               in.EndsAt,
		Version:              1,
		CreatedAt:            now,
		UpdatedAt:            now,
		Tracks:               tracks,
		Rounds:               rounds,
		Prizes:               prizes,
	}
	s.programs[progID] = prog
	s.appendAuditLocked(actor.TenantID, progID, "challenge_program", progID, actor, "create", "Challenge.ProgramCreated.v1")
	out := s.projectProgrammeLocked(prog, actor)
	s.saveIdempotencyLocked(actor, "CreateChallenge", idemKey, hash, out)
	return out, nil
}

func (s *Service) ApproveRules(_ context.Context, actor Actor, challengeID, rulesSHA256, decision string, idemKey string) (Programme, error) {
	if !actor.IsHuman() {
		return Programme{}, ErrHumanActorRequired
	}
	if !canOrganise(actor) && !canReview(actor) {
		return Programme{}, ErrForbidden
	}
	s.mu.Lock()
	defer s.mu.Unlock()

	prog, ok := s.programs[challengeID]
	if !ok || prog.TenantID != actor.TenantID {
		return Programme{}, ErrNotFound
	}
	val, replay, err := s.checkIdempotencyLocked(actor, "ApproveRules:"+challengeID, idemKey, map[string]string{"sha": rulesSHA256, "decision": decision})
	if err != nil {
		return Programme{}, err
	}
	if replay {
		return val.(Programme), nil
	}
	hash, _ := val.(string)

	if rulesSHA256 == "" {
		rulesSHA256 = prog.RulesSHA256
	}
	if rulesSHA256 != prog.RulesSHA256 {
		return Programme{}, ErrInvalidInput
	}
	if decision == "" {
		decision = "approve"
	}
	if decision != "approve" && decision != "reject" {
		return Programme{}, ErrInvalidInput
	}
	for _, existing := range s.approvals[challengeID] {
		if existing.RulesSHA256 == rulesSHA256 && existing.ApproverActorID == actor.Subject {
			return Programme{}, ErrDuplicateApproval
		}
	}
	app := RuleApproval{
		ID:              "apr_" + newID()[:10],
		ProgramID:       challengeID,
		RulesSHA256:     rulesSHA256,
		ApproverActorID: actor.Subject,
		Decision:        decision,
		CreatedAt:       s.now(),
	}
	s.approvals[challengeID] = append(s.approvals[challengeID], app)
	count := 0
	for _, a := range s.approvals[challengeID] {
		if a.RulesSHA256 == prog.RulesSHA256 && a.Decision == "approve" {
			count++
		}
	}
	prog.RuleApprovalCount = count
	if prog.Status == "draft" {
		prog.Status = "review"
	}
	prog.UpdatedAt = s.now()
	s.appendAuditLocked(actor.TenantID, challengeID, "challenge_program", challengeID, actor, "approve_rules", "Challenge.RuleApproved.v1")
	out := s.projectProgrammeLocked(prog, actor)
	s.saveIdempotencyLocked(actor, "ApproveRules:"+challengeID, idemKey, hash, out)
	return out, nil
}

func (s *Service) PublishChallenge(_ context.Context, actor Actor, challengeID string, idemKey string) (Programme, error) {
	if !actor.IsHuman() {
		return Programme{}, ErrHumanActorRequired
	}
	if !canOrganise(actor) {
		return Programme{}, ErrForbidden
	}
	s.mu.Lock()
	defer s.mu.Unlock()

	prog, ok := s.programs[challengeID]
	if !ok || prog.TenantID != actor.TenantID {
		return Programme{}, ErrNotFound
	}
	val, replay, err := s.checkIdempotencyLocked(actor, "PublishChallenge:"+challengeID, idemKey, challengeID)
	if err != nil {
		return Programme{}, err
	}
	if replay {
		return val.(Programme), nil
	}
	hash, _ := val.(string)

	for _, r := range prog.Rounds {
		if err := ValidateRubricWeights(r.Criteria); err != nil {
			return Programme{}, err
		}
	}
	var approvers []string
	for _, a := range s.approvals[challengeID] {
		if a.RulesSHA256 == prog.RulesSHA256 && a.Decision == "approve" {
			approvers = append(approvers, a.ApproverActorID)
		}
	}
	if len(approvers) < 2 || approvers[0] == approvers[1] {
		return Programme{}, ErrInsufficientRuleApprovals
	}
	prog.CurrentRulesVersion++
	prog.Status = "registration_open"
	prog.Version++
	prog.UpdatedAt = s.now()
	s.versions[challengeID] = append(s.versions[challengeID], ProgramVersion{
		ProgramID:             challengeID,
		RulesVersion:          prog.CurrentRulesVersion,
		ContentSHA256:         prog.RulesSHA256,
		ApprovedByActorID:     approvers[0],
		SecondApproverActorID: approvers[1],
		PublishedAt:           prog.UpdatedAt,
	})
	s.appendAuditLocked(actor.TenantID, challengeID, "challenge_program", challengeID, actor, "publish", "Challenge.Published.v1")
	out := s.projectProgrammeLocked(prog, actor)
	s.saveIdempotencyLocked(actor, "PublishChallenge:"+challengeID, idemKey, hash, out)
	return out, nil
}

func (s *Service) ListPublishedChallenges(_ context.Context, actor Actor) []Programme {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Programme, 0, len(s.programs))
	for _, p := range s.programs {
		isTenantOrganiser := actor.TenantID != "" && actor.TenantID == p.TenantID && canOrganise(actor)
		isPubliclyDiscoverable := p.Visibility != "private" && p.CurrentRulesVersion >= 1 && p.Status != "draft" && p.Status != "review"
		if isTenantOrganiser || isPubliclyDiscoverable {
			out = append(out, s.projectProgrammeLocked(p, actor))
		}
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].CreatedAt.After(out[j].CreatedAt)
	})
	return out
}

func (s *Service) GetChallenge(_ context.Context, actor Actor, challengeID string) (Programme, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	p, ok := s.programs[challengeID]
	if !ok {
		return Programme{}, ErrNotFound
	}
	isTenantMember := actor.TenantID != "" && actor.TenantID == p.TenantID && (canOrganise(actor) || canReview(actor))
	isPublic := p.Visibility != "private" && p.CurrentRulesVersion >= 1 && p.Status != "draft" && p.Status != "review"
	if !isTenantMember && !isPublic {
		return Programme{}, ErrNotFound
	}
	return s.projectProgrammeLocked(p, actor), nil
}

func (s *Service) Apply(_ context.Context, actor Actor, challengeID string, in ApplyInput, idemKey string) (Entry, error) {
	if !actor.IsHuman() {
		return Entry{}, ErrHumanActorRequired
	}
	s.mu.Lock()
	defer s.mu.Unlock()

	prog, ok := s.programs[challengeID]
	if !ok {
		return Entry{}, ErrNotFound
	}
	if prog.CurrentRulesVersion < 1 || (prog.Status != "registration_open" && prog.Status != "active") {
		return Entry{}, ErrInvalidState
	}
	if in.AgreedRulesVersion != 0 && in.AgreedRulesVersion != prog.CurrentRulesVersion {
		return Entry{}, ErrInvalidInput
	}
	val, replay, err := s.checkIdempotencyLocked(actor, "Apply:"+challengeID, idemKey, in)
	if err != nil {
		return Entry{}, err
	}
	if replay {
		return val.(Entry), nil
	}
	hash, _ := val.(string)

	var track *Track
	for i := range prog.Tracks {
		if prog.Tracks[i].ID == in.TrackID || in.TrackID == "" {
			track = &prog.Tracks[i]
			break
		}
	}
	if track == nil {
		return Entry{}, ErrInvalidInput
	}
	mode := in.ParticipationMode
	if mode == "" {
		if track.ParticipationMode == "individual" {
			mode = "individual"
		} else {
			mode = "team"
		}
	}
	needsConsent := track.RequiresGuardianConsent || in.RequiresGuardianConsent
	consentStatus := "not_applicable"
	entryStatus := "applied"
	if needsConsent {
		consentStatus = "required"
		entryStatus = "screening"
	}
	now := s.now()
	entryID := "ent_" + newID()[:10]
	entry := &Entry{
		ID:                    entryID,
		TenantID:              prog.TenantID,
		ProgramID:             challengeID,
		TrackID:               track.ID,
		LeadActorID:           actor.Subject,
		EntryCode:             strings.ToUpper("IRC-" + entryID[4:10]),
		TeamDisplayName:       valueOr(in.TeamDisplayName, "Community Team "+actor.Subject),
		ParticipationMode:     mode,
		Status:                entryStatus,
		EligibilityStatus:     "pending",
		GuardianConsentStatus: consentStatus,
		AgreedRulesVersion:    prog.CurrentRulesVersion,
		TeamMembers: []TeamMember{
			{
				EntryID:               entryID,
				ActorID:               actor.Subject,
				MemberRole:            "lead",
				InvitationState:       "accepted",
				GuardianConsentStatus: consentStatus,
				JoinedAt:              &now,
			},
		},
		AppliedAt: now,
		UpdatedAt: now,
	}
	s.entries[entryID] = entry
	s.appendAuditLocked(prog.TenantID, challengeID, "challenge_entry", entryID, actor, "apply", "Challenge.EntryApplied.v1")
	s.saveIdempotencyLocked(actor, "Apply:"+challengeID, idemKey, hash, *entry)
	return *entry, nil
}

func (s *Service) ListMyEntries(_ context.Context, actor Actor) []Entry {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := []Entry{}
	for _, e := range s.entries {
		if e.LeadActorID == actor.Subject {
			out = append(out, *e)
			continue
		}
		for _, m := range e.TeamMembers {
			if m.ActorID == actor.Subject {
				out = append(out, *e)
				break
			}
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].AppliedAt.After(out[j].AppliedAt) })
	return out
}

func (s *Service) ManageTeamMember(_ context.Context, actor Actor, challengeID, entryID string, in TeamMemberInput) (Entry, error) {
	if !actor.IsHuman() {
		return Entry{}, ErrHumanActorRequired
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	prog, ok := s.programs[challengeID]
	if !ok {
		return Entry{}, ErrNotFound
	}
	entry, ok := s.entries[entryID]
	if !ok || entry.ProgramID != challengeID {
		return Entry{}, ErrNotFound
	}
	var maxMembers = 5
	for _, t := range prog.Tracks {
		if t.ID == entry.TrackID {
			maxMembers = t.MaximumTeamMembers
			break
		}
	}
	action := strings.ToLower(strings.TrimSpace(in.Action))
	if action == "" {
		action = "invite"
	}
	now := s.now()
	switch action {
	case "invite":
		if entry.LeadActorID != actor.Subject {
			return Entry{}, ErrForbidden
		}
		target := strings.TrimSpace(in.ActorID)
		if target == "" {
			return Entry{}, ErrInvalidInput
		}
		activeCount := 0
		for _, m := range entry.TeamMembers {
			if m.InvitationState == "invited" || m.InvitationState == "accepted" {
				activeCount++
			}
			if m.ActorID == target {
				return *entry, nil
			}
		}
		if activeCount >= maxMembers {
			return Entry{}, ErrTeamCapacityExceeded
		}
		role := valueOr(in.Role, "member")
		entry.TeamMembers = append(entry.TeamMembers, TeamMember{
			EntryID:               entryID,
			ActorID:               target,
			MemberRole:            role,
			InvitationState:       "invited",
			GuardianConsentStatus: entry.GuardianConsentStatus,
		})
		s.appendAuditLocked(prog.TenantID, challengeID, "challenge_entry", entryID, actor, "invite_member", "Challenge.TeamInvited.v1")
	case "accept", "decline":
		found := false
		for i := range entry.TeamMembers {
			if entry.TeamMembers[i].ActorID == actor.Subject {
				found = true
				if action == "accept" {
					entry.TeamMembers[i].InvitationState = "accepted"
					entry.TeamMembers[i].JoinedAt = &now
				} else {
					entry.TeamMembers[i].InvitationState = "declined"
				}
			}
		}
		if !found {
			return Entry{}, ErrForbidden
		}
	default:
		return Entry{}, ErrInvalidInput
	}
	entry.UpdatedAt = now
	return *entry, nil
}

func (s *Service) RecordGuardianConsent(_ context.Context, actor Actor, challengeID, entryID string, in GuardianConsentInput) (Entry, error) {
	if !actor.IsHuman() {
		return Entry{}, ErrHumanActorRequired
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	prog, ok := s.programs[challengeID]
	if !ok {
		return Entry{}, ErrNotFound
	}
	entry, ok := s.entries[entryID]
	if !ok || entry.ProgramID != challengeID {
		return Entry{}, ErrNotFound
	}
	isParticipant := entry.LeadActorID == actor.Subject
	isReviewer := actor.TenantID == prog.TenantID && (canOrganise(actor) || canReview(actor))
	if !isParticipant && !isReviewer {
		return Entry{}, ErrForbidden
	}
	status := strings.ToLower(strings.TrimSpace(in.Status))
	if status == "" {
		status = "verified"
	}
	if status != "verified" && status != "revoked" {
		return Entry{}, ErrInvalidInput
	}
	if status == "verified" && strings.TrimSpace(in.SS24ConsentReceiptRef) == "" {
		return Entry{}, ErrInvalidInput
	}
	now := s.now()
	participant := valueOr(in.ParticipantActorID, entry.LeadActorID)
	rec := GuardianConsent{
		ID:                    "cns_" + newID()[:10],
		ProgramID:             challengeID,
		EntryID:               entryID,
		ParticipantActorID:    participant,
		GuardianSubjectRef:    in.GuardianSubjectRef,
		SS24ConsentReceiptRef: in.SS24ConsentReceiptRef,
		PurposeCode:           valueOr(in.PurposeCode, "challenge_participation"),
		RulesVersion:          entry.AgreedRulesVersion,
		Status:                status,
	}
	if status == "verified" {
		rec.VerifiedByActorID = actor.Subject
		rec.VerifiedAt = &now
		entry.GuardianConsentStatus = "verified"
		if entry.Status == "screening" {
			entry.Status = "applied"
		}
		s.appendAuditLocked(prog.TenantID, challengeID, "challenge_entry", entryID, actor, "verify_consent", "Challenge.GuardianConsentVerified.v1")
	} else {
		rec.RevokedAt = &now
		entry.GuardianConsentStatus = "revoked"
		entry.Status = "withdrawn"
		s.appendAuditLocked(prog.TenantID, challengeID, "challenge_entry", entryID, actor, "revoke_consent", "Challenge.ConsentRevoked.v1")
	}
	for i := range entry.TeamMembers {
		if entry.TeamMembers[i].ActorID == participant {
			entry.TeamMembers[i].GuardianConsentStatus = entry.GuardianConsentStatus
		}
	}
	s.consents[entryID] = append(s.consents[entryID], rec)
	entry.UpdatedAt = now
	return *entry, nil
}

func (s *Service) DecideEligibility(_ context.Context, actor Actor, challengeID, entryID string, in EligibilityDecisionInput) (Entry, error) {
	if !actor.IsHuman() {
		return Entry{}, ErrHumanActorRequired
	}
	if !canReview(actor) {
		return Entry{}, ErrForbidden
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	prog, ok := s.programs[challengeID]
	if !ok || prog.TenantID != actor.TenantID {
		return Entry{}, ErrNotFound
	}
	entry, ok := s.entries[entryID]
	if !ok || entry.ProgramID != challengeID || entry.TenantID != actor.TenantID {
		return Entry{}, ErrNotFound
	}
	if entry.LeadActorID == actor.Subject {
		return Entry{}, ErrSelfReviewForbidden
	}
	for _, m := range entry.TeamMembers {
		if m.ActorID == actor.Subject {
			return Entry{}, ErrSelfReviewForbidden
		}
	}
	if entry.GuardianConsentStatus == "required" || entry.GuardianConsentStatus == "revoked" {
		return Entry{}, ErrGuardianConsentRequired
	}
	decision := strings.ToLower(strings.TrimSpace(in.Decision))
	if decision != "eligible" && decision != "ineligible" && decision != "needs_information" {
		return Entry{}, ErrInvalidInput
	}
	entry.EligibilityStatus = decision
	entry.Status = decision
	entry.UpdatedAt = s.now()
	s.eligibility[entryID] = append(s.eligibility[entryID], EligibilityDecision{
		ID:              "elg_" + newID()[:10],
		ProgramID:       challengeID,
		EntryID:         entryID,
		Decision:        decision,
		RuleCode:        valueOr(in.RuleCode, "standard_eligibility_v1"),
		ReviewerActorID: actor.Subject,
		CreatedAt:       entry.UpdatedAt,
	})
	s.appendAuditLocked(prog.TenantID, challengeID, "challenge_entry", entryID, actor, "decide_eligibility", "Challenge.EligibilityDecided.v1")
	return *entry, nil
}

func (s *Service) SubmitRoundEntry(_ context.Context, actor Actor, challengeID, entryID string, in SubmissionInput, idemKey string) (Submission, error) {
	if !actor.IsHuman() {
		return Submission{}, ErrHumanActorRequired
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	prog, ok := s.programs[challengeID]
	if !ok {
		return Submission{}, ErrNotFound
	}
	entry, ok := s.entries[entryID]
	if !ok || entry.ProgramID != challengeID {
		return Submission{}, ErrNotFound
	}
	if entry.LeadActorID != actor.Subject {
		return Submission{}, ErrForbidden
	}
	if entry.GuardianConsentStatus == "required" || entry.GuardianConsentStatus == "revoked" {
		return Submission{}, ErrGuardianConsentRequired
	}
	val, replay, err := s.checkIdempotencyLocked(actor, "SubmitRoundEntry:"+entryID, idemKey, in)
	if err != nil {
		return Submission{}, err
	}
	if replay {
		return val.(Submission), nil
	}
	hash, _ := val.(string)

	var round *Round
	for i := range prog.Rounds {
		if prog.Rounds[i].ID == in.RoundID || in.RoundID == "" {
			round = &prog.Rounds[i]
			break
		}
	}
	if round == nil {
		return Submission{}, ErrInvalidInput
	}
	now := s.now()
	if !now.Before(round.ClosesAt) {
		return Submission{}, ErrSubmissionDeadlinePassed
	}
	if strings.TrimSpace(in.ProblemStatement) == "" || strings.TrimSpace(in.SolutionProposal) == "" {
		return Submission{}, ErrInvalidInput
	}
	shaHex := strings.ToLower(strings.TrimSpace(in.SubmissionSHA256))
	if shaHex == "" {
		digest := sha256.Sum256([]byte(in.ProblemStatement + "\n" + in.SolutionProposal + "\n" + in.EvidenceAssetRef))
		shaHex = hex.EncodeToString(digest[:])
	}
	if len(shaHex) != 64 {
		return Submission{}, ErrInvalidInput
	}
	rev := 1
	for _, existing := range s.submissions {
		if existing.EntryID == entryID && existing.RoundID == round.ID && existing.Revision >= rev {
			rev = existing.Revision + 1
		}
	}
	subID := "sub_" + newID()[:10]
	sub := &Submission{
		ID:                 subID,
		ProgramID:          challengeID,
		EntryID:            entryID,
		RoundID:            round.ID,
		Revision:           rev,
		Status:             "submitted",
		ProblemStatement:   strings.TrimSpace(in.ProblemStatement),
		SolutionProposal:   strings.TrimSpace(in.SolutionProposal),
		PublicAbstract:     strings.TrimSpace(in.PublicAbstract),
		EvidenceAssetRef:   strings.TrimSpace(in.EvidenceAssetRef),
		SubmittedByActorID: actor.Subject,
		SubmittedAt:        now,
		SubmissionSHA256:   shaHex,
	}
	s.submissions[subID] = sub
	s.appendAuditLocked(prog.TenantID, challengeID, "challenge_submission", subID, actor, "submit", "Challenge.SubmissionSubmitted.v1")
	s.saveIdempotencyLocked(actor, "SubmitRoundEntry:"+entryID, idemKey, hash, *sub)
	return *sub, nil
}

func (s *Service) AssignJudge(_ context.Context, actor Actor, challengeID string, in AssignJudgeInput) (JudgeAssignment, error) {
	if !actor.IsHuman() {
		return JudgeAssignment{}, ErrHumanActorRequired
	}
	if !canOrganise(actor) {
		return JudgeAssignment{}, ErrForbidden
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	prog, ok := s.programs[challengeID]
	if !ok || prog.TenantID != actor.TenantID {
		return JudgeAssignment{}, ErrNotFound
	}
	sub, ok := s.submissions[in.SubmissionID]
	if !ok || sub.ProgramID != challengeID {
		return JudgeAssignment{}, ErrNotFound
	}
	entry := s.entries[sub.EntryID]
	judgeID := strings.TrimSpace(in.JudgeActorID)
	if judgeID == "" {
		return JudgeAssignment{}, ErrInvalidInput
	}
	if entry != nil && entry.LeadActorID == judgeID {
		return JudgeAssignment{}, ErrSelfReviewForbidden
	}
	for _, existing := range s.assignments {
		if existing.SubmissionID == sub.ID && existing.JudgeActorID == judgeID {
			return *existing, nil
		}
	}
	asgID := "asg_" + newID()[:10]
	asg := &JudgeAssignment{
		ID:                asgID,
		ProgramID:         challengeID,
		SubmissionID:      sub.ID,
		EntryID:           sub.EntryID,
		RoundID:           sub.RoundID,
		JudgeActorID:      judgeID,
		AssignmentStatus:  "accepted",
		ConflictStatus:    "undisclosed",
		AssignedByActorID: actor.Subject,
		AssignedAt:        s.now(),
	}
	s.assignments[asgID] = asg
	s.appendAuditLocked(prog.TenantID, challengeID, "challenge_judge_assignment", asgID, actor, "assign_judge", "Challenge.JudgeAssigned.v1")
	return *asg, nil
}

func (s *Service) ListMyJudgeAssignments(_ context.Context, actor Actor) []JudgeAssignment {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := []JudgeAssignment{}
	for _, a := range s.assignments {
		if a.JudgeActorID == actor.Subject {
			out = append(out, *a)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].AssignedAt.After(out[j].AssignedAt) })
	return out
}

func (s *Service) DeclareOrResolveConflict(_ context.Context, actor Actor, challengeID, assignmentID string, in ConflictInput) (JudgeAssignment, error) {
	if !actor.IsHuman() {
		return JudgeAssignment{}, ErrHumanActorRequired
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	prog, ok := s.programs[challengeID]
	if !ok {
		return JudgeAssignment{}, ErrNotFound
	}
	asg, ok := s.assignments[assignmentID]
	if !ok || asg.ProgramID != challengeID {
		return JudgeAssignment{}, ErrNotFound
	}
	action := strings.ToLower(strings.TrimSpace(in.Action))
	status := strings.ToLower(strings.TrimSpace(in.Status))
	if action == "" {
		if status == "cleared" || status == "independently_cleared" || status == "recused" {
			action = "resolve"
		} else {
			action = "declare"
		}
	}
	switch action {
	case "declare":
		if asg.JudgeActorID != actor.Subject {
			return JudgeAssignment{}, ErrForbidden
		}
		if status != "no_conflict_declared" && status != "conflict_declared" {
			return JudgeAssignment{}, ErrInvalidInput
		}
		asg.ConflictStatus = status
		asg.ConflictReasonCode = strings.TrimSpace(in.ReasonCode)
		asg.ConflictReportedBy = actor.Subject
		if status == "conflict_declared" {
			asg.AssignmentStatus = "recused"
		}
		s.appendAuditLocked(prog.TenantID, challengeID, "challenge_judge_assignment", assignmentID, actor, "declare_conflict", "Challenge.ConflictDeclared.v1")
	case "resolve":
		if actor.TenantID != prog.TenantID || (!canOrganise(actor) && !canReview(actor)) {
			return JudgeAssignment{}, ErrForbidden
		}
		if asg.JudgeActorID == actor.Subject || asg.ConflictReportedBy == actor.Subject {
			return JudgeAssignment{}, ErrSelfConflictClearance
		}
		if status == "cleared" || status == "independently_cleared" {
			asg.ConflictStatus = "independently_cleared"
			asg.AssignmentStatus = "accepted"
		} else if status == "recused" {
			asg.ConflictStatus = "recused"
			asg.AssignmentStatus = "recused"
		} else {
			return JudgeAssignment{}, ErrInvalidInput
		}
		asg.ConflictResolvedBy = actor.Subject
	default:
		return JudgeAssignment{}, ErrInvalidInput
	}
	return *asg, nil
}

func (s *Service) SubmitScorecard(_ context.Context, actor Actor, challengeID, assignmentID string, in ScorecardInput, idemKey string) (Scorecard, error) {
	if !actor.IsHuman() {
		return Scorecard{}, ErrHumanActorRequired
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	prog, ok := s.programs[challengeID]
	if !ok {
		return Scorecard{}, ErrNotFound
	}
	asg, ok := s.assignments[assignmentID]
	if !ok || asg.ProgramID != challengeID {
		return Scorecard{}, ErrNotFound
	}
	if asg.JudgeActorID != actor.Subject {
		return Scorecard{}, ErrForbidden
	}
	if asg.ConflictStatus != "no_conflict_declared" && asg.ConflictStatus != "independently_cleared" {
		return Scorecard{}, ErrJudgeConflictBlocked
	}
	val, replay, err := s.checkIdempotencyLocked(actor, "SubmitScorecard:"+assignmentID, idemKey, in)
	if err != nil {
		return Scorecard{}, err
	}
	if replay {
		return val.(Scorecard), nil
	}
	hash, _ := val.(string)

	var round *Round
	for i := range prog.Rounds {
		if prog.Rounds[i].ID == asg.RoundID {
			round = &prog.Rounds[i]
			break
		}
	}
	if round == nil {
		return Scorecard{}, ErrInvalidInput
	}
	rev := 1
	for _, existing := range s.scorecards {
		if existing.AssignmentID == assignmentID {
			if existing.Status == "sealed" && strings.TrimSpace(in.SupersedesScorecardID) == "" {
				return Scorecard{}, ErrInvalidState
			}
			if existing.Revision >= rev {
				rev = existing.Revision + 1
			}
		}
	}
	totalBps, err := CalculateScorecardBasisPoints(round.Criteria, in.Lines)
	if err != nil {
		return Scorecard{}, err
	}
	now := s.now()
	scID := "scr_" + newID()[:10]
	sc := &Scorecard{
		ID:                    scID,
		ProgramID:             challengeID,
		AssignmentID:          assignmentID,
		SubmissionID:          asg.SubmissionID,
		EntryID:               asg.EntryID,
		RoundID:               asg.RoundID,
		JudgeActorID:          actor.Subject,
		RubricVersion:         round.RubricVersion,
		Revision:              rev,
		SupersedesScorecardID: strings.TrimSpace(in.SupersedesScorecardID),
		Status:                "sealed",
		TotalBasisPoints:      totalBps,
		Lines:                 in.Lines,
		SealedAt:              now,
	}
	s.scorecards[scID] = sc
	asg.AssignmentStatus = "completed"
	asg.CompletedAt = &now
	s.appendAuditLocked(prog.TenantID, challengeID, "challenge_scorecard", scID, actor, "seal_scorecard", "Challenge.ScorecardSealed.v1")
	s.saveIdempotencyLocked(actor, "SubmitScorecard:"+assignmentID, idemKey, hash, *sc)
	return *sc, nil
}

func (s *Service) RecordOrPublishDecision(_ context.Context, actor Actor, challengeID, roundID string, in RoundDecisionInput, idemKey string) (Decision, error) {
	if !actor.IsHuman() {
		return Decision{}, ErrHumanActorRequired
	}
	if !canOrganise(actor) {
		return Decision{}, ErrForbidden
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	prog, ok := s.programs[challengeID]
	if !ok || prog.TenantID != actor.TenantID {
		return Decision{}, ErrNotFound
	}
	var round *Round
	for i := range prog.Rounds {
		if prog.Rounds[i].ID == roundID {
			round = &prog.Rounds[i]
			break
		}
	}
	if round == nil {
		return Decision{}, ErrNotFound
	}
	entry, ok := s.entries[in.EntryID]
	if !ok || entry.ProgramID != challengeID {
		return Decision{}, ErrNotFound
	}
	var totals []int
	var scIDs []string
	for _, sc := range s.scorecards {
		if sc.ProgramID == challengeID && sc.RoundID == roundID && sc.EntryID == in.EntryID && sc.Status == "sealed" {
			totals = append(totals, sc.TotalBasisPoints)
			scIDs = append(scIDs, sc.ID)
		}
	}
	if len(totals) < round.RequiredJudges {
		return Decision{}, ErrInsufficientScorecardQuorum
	}
	aggScore, err := AggregateScorecardsBasisPoints(round.ScoringAlgorithm, totals)
	if err != nil {
		return Decision{}, err
	}
	action := strings.ToLower(strings.TrimSpace(in.Action))
	if action == "" {
		action = "publish"
	}
	if action == "publish" {
		for _, ap := range s.appeals {
			if ap.ProgramID == challengeID && (ap.Status == "submitted" || ap.Status == "admissibility_review" || ap.Status == "investigating") {
				return Decision{}, ErrAppealHoldActive
			}
		}
	}
	now := s.now()
	decID := "dec_" + newID()[:10]
	state := "approved"
	var pubBy string
	var pubAt *time.Time
	if action == "publish" {
		state = "published"
		pubBy = actor.Subject
		pubAt = &now
		prog.Status = "results_published"
	}
	rank := in.Rank
	if rank <= 0 {
		rank = 1
	}
	dec := &Decision{
		ID:                 decID,
		ProgramID:          challengeID,
		RoundID:            roundID,
		EntryID:            entry.ID,
		TeamDisplayName:    entry.TeamDisplayName,
		Decision:           valueOr(in.Decision, "winner"),
		State:              state,
		Rank:               rank,
		ScoreBasisPoints:   aggScore,
		SourceScorecardIDs: scIDs,
		CreatedByActorID:   actor.Subject,
		ApprovedByActorID:  actor.Subject,
		PublishedByActorID: pubBy,
		PublishedAt:        pubAt,
	}
	s.decisions[decID] = dec
	s.appendAuditLocked(prog.TenantID, challengeID, "challenge_decision", decID, actor, action+"_decision", "Challenge.DecisionPublished.v1")
	return *dec, nil
}

func (s *Service) FileOrResolveAppeal(_ context.Context, actor Actor, challengeID string, in AppealInput) (Appeal, error) {
	if !actor.IsHuman() {
		return Appeal{}, ErrHumanActorRequired
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	prog, ok := s.programs[challengeID]
	if !ok {
		return Appeal{}, ErrNotFound
	}
	action := strings.ToLower(strings.TrimSpace(in.Action))
	if action == "" {
		if in.AppealID != "" {
			action = "resolve"
		} else {
			action = "file"
		}
	}
	now := s.now()
	switch action {
	case "file":
		entry, ok := s.entries[in.EntryID]
		if !ok || entry.ProgramID != challengeID {
			return Appeal{}, ErrNotFound
		}
		if strings.TrimSpace(in.Reason) == "" {
			return Appeal{}, ErrInvalidInput
		}
		apID := "apl_" + newID()[:10]
		ap := &Appeal{
			ID:               apID,
			ProgramID:        challengeID,
			EntryID:          in.EntryID,
			RoundID:          in.RoundID,
			SubjectType:      valueOr(in.SubjectType, "round_decision"),
			SubjectID:        valueOr(in.SubjectID, in.EntryID),
			AppellantActorID: actor.Subject,
			Reason:           strings.TrimSpace(in.Reason),
			Status:           "submitted",
			SubmittedAt:      now,
		}
		s.appeals[apID] = ap
		s.appendAuditLocked(prog.TenantID, challengeID, "challenge_appeal", apID, actor, "file_appeal", "Challenge.AppealFiled.v1")
		return *ap, nil
	case "resolve":
		if actor.TenantID != prog.TenantID || !canReview(actor) {
			return Appeal{}, ErrForbidden
		}
		ap, ok := s.appeals[in.AppealID]
		if !ok || ap.ProgramID != challengeID {
			return Appeal{}, ErrNotFound
		}
		if ap.AppellantActorID == actor.Subject {
			return Appeal{}, ErrSelfReviewForbidden
		}
		status := strings.ToLower(strings.TrimSpace(in.Status))
		if status != "upheld" && status != "denied" && status != "remanded" {
			return Appeal{}, ErrInvalidInput
		}
		ap.Status = status
		ap.ReviewerActorID = actor.Subject
		ap.ResolutionNote = strings.TrimSpace(in.Reason)
		ap.ResolvedAt = &now
		s.appendAuditLocked(prog.TenantID, challengeID, "challenge_appeal", ap.ID, actor, "resolve_appeal", "Challenge.AppealResolved.v1")
		return *ap, nil
	default:
		return Appeal{}, ErrInvalidInput
	}
}

func (s *Service) RecordSponsorCommitment(_ context.Context, actor Actor, challengeID string, in SponsorInput) (SponsorCommitment, error) {
	if !actor.IsHuman() {
		return SponsorCommitment{}, ErrHumanActorRequired
	}
	if !canOrganise(actor) && !actor.HasRole("sponsor_rep") {
		return SponsorCommitment{}, ErrForbidden
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	prog, ok := s.programs[challengeID]
	if !ok || prog.TenantID != actor.TenantID {
		return SponsorCommitment{}, ErrNotFound
	}
	if strings.TrimSpace(in.SponsorDisplayName) == "" {
		return SponsorCommitment{}, ErrInvalidInput
	}
	status := valueOr(in.Status, "pledged")
	if status != "interest" && status != "pledged" && status != "provider_confirmed" && status != "fulfilled" {
		return SponsorCommitment{}, ErrInvalidInput
	}
	if status == "provider_confirmed" && strings.TrimSpace(in.SS22PaymentReference) == "" {
		return SponsorCommitment{}, ErrUnverifiedCashFulfillment
	}
	notice := "Sponsor commitment records intent or pledge only; not settled funds and grants zero judging authority."
	if status == "provider_confirmed" {
		notice = "Payment provider reference recorded; prize disbursement to participants remains tracked separately."
	}
	rec := SponsorCommitment{
		ID:                    "spn_" + newID()[:10],
		ProgramID:             challengeID,
		SponsorDisplayName:    strings.TrimSpace(in.SponsorDisplayName),
		OrganisationRef:       strings.TrimSpace(in.OrganisationRef),
		CommitmentKind:        valueOr(in.CommitmentKind, "cash"),
		CommitmentCurrency:    valueOr(in.CommitmentCurrency, prog.CurrencyCode),
		CommitmentAmountMinor: in.CommitmentAmountMinor,
		CommitmentDescription: strings.TrimSpace(in.CommitmentDescription),
		Status:                status,
		SS22PaymentReference:  strings.TrimSpace(in.SS22PaymentReference),
		TruthNotice:           notice,
		CreatedAt:             s.now(),
	}
	s.sponsors[challengeID] = append(s.sponsors[challengeID], rec)
	prog.SponsorStatus = status
	if status == "provider_confirmed" {
		prog.FundingStatus = "provider_confirmed"
	} else if prog.FundingStatus == "unconfirmed" && status == "pledged" {
		prog.FundingStatus = "pledged"
	}
	s.appendAuditLocked(prog.TenantID, challengeID, "challenge_sponsor", rec.ID, actor, "sponsor_commitment", "Challenge.SponsorCommitted.v1")
	return rec, nil
}

func (s *Service) CreateOrPublishAward(_ context.Context, actor Actor, challengeID string, in AwardInput) (Award, error) {
	if !actor.IsHuman() {
		return Award{}, ErrHumanActorRequired
	}
	if !canOrganise(actor) {
		return Award{}, ErrForbidden
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	prog, ok := s.programs[challengeID]
	if !ok || prog.TenantID != actor.TenantID {
		return Award{}, ErrNotFound
	}
	now := s.now()
	if in.AwardID != "" {
		aw, ok := s.awards[in.AwardID]
		if !ok || aw.ProgramID != challengeID {
			return Award{}, ErrNotFound
		}
		if in.Action == "publish" {
			aw.Status = "published"
			aw.PublishedByActorID = actor.Subject
			aw.PublishedAt = &now
			aw.TruthStateLabel = "Award approved & published — prize fulfilment pending independent delivery confirmation"
		}
		return *aw, nil
	}
	entry, ok := s.entries[in.EntryID]
	if !ok || entry.ProgramID != challengeID {
		return Award{}, ErrNotFound
	}
	var prize *Prize
	for i := range prog.Prizes {
		if prog.Prizes[i].ID == in.PrizeID || in.PrizeID == "" {
			prize = &prog.Prizes[i]
			break
		}
	}
	if prize == nil {
		return Award{}, ErrInvalidInput
	}
	awID := "awd_" + newID()[:10]
	aw := &Award{
		ID:                 awID,
		ProgramID:          challengeID,
		EntryID:            entry.ID,
		DecisionID:         in.DecisionID,
		PrizeID:            prize.ID,
		PrizeTitle:         prize.Title,
		PrizeKind:          prize.PrizeKind,
		Status:             "approved",
		FulfillmentStatus:  "pending",
		TruthStateLabel:    "Award approved — NOT yet fulfilled or paid",
		NominatedByActorID: actor.Subject,
		ApprovedByActorID:  actor.Subject,
		ApprovedAt:         &now,
	}
	s.awards[awID] = aw
	s.appendAuditLocked(prog.TenantID, challengeID, "challenge_award", awID, actor, "approve_award", "Challenge.AwardApproved.v1")
	return *aw, nil
}

func (s *Service) RecordPrizeFulfillment(_ context.Context, actor Actor, challengeID, awardID string, in PrizeFulfillmentInput) (PrizeFulfillment, error) {
	if !actor.IsHuman() {
		return PrizeFulfillment{}, ErrHumanActorRequired
	}
	if !canOrganise(actor) {
		return PrizeFulfillment{}, ErrForbidden
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	prog, ok := s.programs[challengeID]
	if !ok || prog.TenantID != actor.TenantID {
		return PrizeFulfillment{}, ErrNotFound
	}
	aw, ok := s.awards[awardID]
	if !ok || aw.ProgramID != challengeID {
		return PrizeFulfillment{}, ErrNotFound
	}
	kind := valueOr(in.FulfillmentKind, "in_kind_delivery")
	status := valueOr(in.Status, "pending")
	if in.UntrustedClientPaid {
		return PrizeFulfillment{}, ErrUnverifiedCashFulfillment
	}
	if status == "confirmed_delivered" && kind == "cash_provider" {
		if strings.TrimSpace(in.ProviderReference) == "" || !in.PayCoreSignatureVerified {
			return PrizeFulfillment{}, ErrUnverifiedCashFulfillment
		}
	}
	if status == "confirmed_delivered" && kind != "cash_provider" && strings.TrimSpace(in.DeliveryEvidenceRef) == "" {
		return PrizeFulfillment{}, ErrInvalidInput
	}
	now := s.now()
	var deliveredAt, confirmedAt *time.Time
	if status == "confirmed_delivered" {
		deliveredAt = &now
		if kind == "cash_provider" {
			confirmedAt = &now
		}
	}
	rec := PrizeFulfillment{
		ID:                  "flf_" + newID()[:10],
		ProgramID:           challengeID,
		AwardID:             awardID,
		FulfillmentKind:     kind,
		Status:              status,
		ProviderReference:   strings.TrimSpace(in.ProviderReference),
		DeliveryEvidenceRef: strings.TrimSpace(in.DeliveryEvidenceRef),
		VerifiedByActorID:   actor.Subject,
		ProviderConfirmedAt: confirmedAt,
		DeliveredAt:         deliveredAt,
		TruthNotice:         "Prize fulfilment requires verified delivery evidence or signed PayCore settlement.",
	}
	s.fulfillments[awardID] = append(s.fulfillments[awardID], rec)
	aw.FulfillmentStatus = status
	if status == "confirmed_delivered" {
		aw.TruthStateLabel = "Prize fulfilment confirmed with verified delivery receipt"
	} else {
		aw.TruthStateLabel = fmt.Sprintf("Award approved — fulfilment %s (not settled)", status)
	}
	s.appendAuditLocked(prog.TenantID, challengeID, "challenge_prize_fulfillment", rec.ID, actor, "record_fulfillment", "Challenge.PrizeFulfillmentConfirmed.v1")
	return rec, nil
}

func (s *Service) LinkProject(_ context.Context, actor Actor, challengeID, entryID string, in ProjectLinkInput) (ProjectLink, error) {
	if !actor.IsHuman() {
		return ProjectLink{}, ErrHumanActorRequired
	}
	if !canOrganise(actor) && !canReview(actor) {
		return ProjectLink{}, ErrForbidden
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	prog, ok := s.programs[challengeID]
	if !ok || prog.TenantID != actor.TenantID {
		return ProjectLink{}, ErrNotFound
	}
	entry, ok := s.entries[entryID]
	if !ok || entry.ProgramID != challengeID {
		return ProjectLink{}, ErrNotFound
	}
	projectID := strings.TrimSpace(in.ActionProjectID)
	if projectID == "" {
		return ProjectLink{}, ErrInvalidInput
	}
	link := ProjectLink{
		ID:              "cpl_" + newID()[:10],
		ProgramID:       challengeID,
		EntryID:         entryID,
		ActionProjectID: projectID,
		LinkedByActorID: actor.Subject,
		Relationship:    valueOr(in.Relationship, "challenge_delivery"),
		LinkedAt:        s.now(),
	}
	entry.LinkedProjectID = projectID
	s.projectLinks[entryID] = append(s.projectLinks[entryID], link)
	s.appendAuditLocked(prog.TenantID, challengeID, "challenge_project_link", link.ID, actor, "link_project", "Challenge.ProjectLinked.v1")
	return link, nil
}

func (s *Service) ProposeWithAICO(_ context.Context, actor Actor) error {
	if !actor.IsHuman() {
		return ErrHumanActorRequired
	}
	if !s.aicoEnabled {
		return ErrAICOFeatureDisabled
	}
	return nil
}

func (s *Service) projectProgrammeLocked(p *Programme, actor Actor) Programme {
	cp := *p
	isTenantOrganiser := actor.TenantID != "" && actor.TenantID == p.TenantID && canOrganise(actor)
	isTenantReviewer := actor.TenantID != "" && actor.TenantID == p.TenantID && canReview(actor)
	isJudge := actor.IsHuman() && actor.HasRole("challenge_judge", "expert_verifier", "institution_verifier")

	cp.Permissions = &Permissions{
		CanManageProgramme:   isTenantOrganiser,
		CanApproveRules:      isTenantOrganiser || isTenantReviewer,
		CanReviewEligibility: isTenantReviewer,
		CanAssignJudges:      isTenantOrganiser,
		CanJudge:             isJudge,
		CanReviewConflicts:   isTenantOrganiser || isTenantReviewer,
		CanReviewAppeals:     isTenantReviewer,
		CanManageSponsors:    isTenantOrganiser || actor.HasRole("sponsor_rep"),
		CanManageAwards:      isTenantOrganiser,
	}

	cp.Sponsors = append([]SponsorCommitment(nil), s.sponsors[p.ID]...)
	cp.PublishedResults = []Decision{}
	for _, d := range s.decisions {
		if d.ProgramID != p.ID {
			continue
		}
		entry := s.entries[d.EntryID]
		if entry != nil && entry.GuardianConsentStatus == "revoked" {
			continue
		}
		if d.State == "published" || isTenantOrganiser || isTenantReviewer {
			cp.PublishedResults = append(cp.PublishedResults, *d)
		}
	}
	cp.Awards = []Award{}
	for _, a := range s.awards {
		if a.ProgramID == p.ID {
			cp.Awards = append(cp.Awards, *a)
		}
	}
	if isTenantOrganiser || isTenantReviewer {
		cp.Entries = []Entry{}
		for _, e := range s.entries {
			if e.ProgramID == p.ID {
				cp.Entries = append(cp.Entries, *e)
			}
		}
		cp.Submissions = []Submission{}
		for _, sub := range s.submissions {
			if sub.ProgramID == p.ID {
				cp.Submissions = append(cp.Submissions, *sub)
			}
		}
		cp.Appeals = []Appeal{}
		for _, ap := range s.appeals {
			if ap.ProgramID == p.ID {
				cp.Appeals = append(cp.Appeals, *ap)
			}
		}
		cp.AuditEvents = append([]AuditEvent(nil), s.auditEvents[p.ID]...)
	}
	return cp
}

func newID() string {
	var b [12]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}

func valueOr(v, fallback string) string {
	if strings.TrimSpace(v) == "" {
		return fallback
	}
	return strings.TrimSpace(v)
}
