export type VerificationState = 'observed' | 'verification_requested' | 'community_confirmed' | 'institution_confirmed' | 'expert_confirmed' | 'independently_audited' | 'government_confirmed' | 'disputed' | 'rejected';

export type ContributionKind =
  | 'money'
  | 'time'
  | 'skill'
  | 'materials'
  | 'equipment'
  | 'transport'
  | 'knowledge'
  | 'access'
  | 'influence'
  | 'care'
  | 'approval'
  | 'space'
  | 'leadership';

export interface GeoPoint {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
}

export interface EvidenceItem {
  id: string;
  kind: 'image' | 'video' | 'document' | 'audio';
  uri: string;
  capturedAt: string;
  location?: GeoPoint;
  consentClassification: 'public_space' | 'beneficiary_consented' | 'redacted' | 'restricted';
}

export interface VerificationRecord {
  id: string;
  needId: string;
  verifierId: string;
  state: VerificationState;
  note?: string;
  evidenceIds: string[];
  createdAt: string;
}

export interface NeedReport {
  id: string;
  title: string;
  description: string;
  category: string;
  location?: GeoPoint;
  communityId?: string;
  reporterId: string;
  verificationState: VerificationState;
  evidence: EvidenceItem[];
  createdAt: string;
  updatedAt: string;
  sdgTags: number[];
}

export interface AbilityProfile {
  userId: string;
  place?: string;
  position?: string;
  abilities: ContributionKind[];
  availabilityNote?: string;
}

export interface ContributionOffer {
  id: string;
  projectId: string;
  contributorId: string;
  kind: ContributionKind;
  description: string;
  estimatedValueMinor?: number;
  currency?: string;
}

export interface ActionProject {
  id: string;
  sourceNeedId: string;
  title: string;
  ownerCommunityId: string;
  projectManagerId?: string;
  status: 'draft' | 'approved' | 'mobilising' | 'executing' | 'validating' | 'maintaining' | 'completed' | 'cancelled';
  sdgTags: number[];
}

export type ChallengeStatus =
  | 'draft'
  | 'review'
  | 'scheduled'
  | 'registration_open'
  | 'active'
  | 'judging'
  | 'results_pending'
  | 'results_published'
  | 'archived'
  | 'cancelled';

export type ChallengeEntryStatus =
  | 'draft'
  | 'applied'
  | 'screening'
  | 'eligible'
  | 'needs_information'
  | 'ineligible'
  | 'accepted'
  | 'withdrawn'
  | 'disqualified';

export type ChallengeEligibilityStatus =
  | 'unreviewed'
  | 'pending'
  | 'eligible'
  | 'ineligible'
  | 'needs_information'
  | 'appealed';

export type ChallengeSponsorStatus =
  | 'interest'
  | 'verified'
  | 'pledged'
  | 'provider_confirmed'
  | 'fulfilled'
  | 'withdrawn'
  | 'disputed';

export type ChallengeAwardStatus = 'nominated' | 'approved' | 'published' | 'revoked';

export type ChallengeFulfillmentStatus =
  | 'pending'
  | 'provider_initiated'
  | 'confirmed_delivered'
  | 'failed'
  | 'cancelled'
  | 'disputed';

export type ChallengeCredentialKind =
  | 'participated'
  | 'finalist'
  | 'award_approved'
  | 'prize_fulfilled'
  | 'contribution_verified'
  | 'outcome_verified';

export interface ChallengeRubricCriterion {
  id: string;
  roundId: string;
  rubricVersion: number;
  sequence: number;
  code: string;
  title: string;
  description: string;
  weightBasisPoints: number;
  maximumScore: number;
}

export interface ChallengeTrack {
  id: string;
  programId: string;
  title: string;
  description: string;
  levelCode: string;
  participationMode: 'individual' | 'team' | 'both';
  minimumTeamMembers: number;
  maximumTeamMembers: number;
  requiresGuardianConsent?: boolean;
}

export interface ChallengeRound {
  id: string;
  programId: string;
  sequence: number;
  title: string;
  kind: 'qualification' | 'proposal' | 'mentorship' | 'implementation' | 'finale' | 'other';
  status: 'draft' | 'scheduled' | 'open' | 'closed' | 'judging' | 'completed' | 'cancelled';
  opensAt: string;
  closesAt: string;
  requiredJudges: number;
  scoringAlgorithm: 'weighted_mean_v1' | 'weighted_median_v1';
  rubricVersion: number;
  criteria?: ChallengeRubricCriterion[];
}

export interface ChallengeProgramme {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  description: string;
  mission: string;
  jurisdictionCode: string;
  locale: string;
  timezone: string;
  currencyCode?: string;
  visibility: 'private' | 'listed' | 'public';
  status: ChallengeStatus;
  currentRulesVersion: number;
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  startsAt?: string;
  endsAt?: string;
  version: number;
  tracks?: ChallengeTrack[];
  rounds?: ChallengeRound[];
  fundingStatus: 'unconfirmed' | 'pledged' | 'provider_confirmed';
}

