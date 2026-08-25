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
