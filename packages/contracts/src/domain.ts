export type VerificationState = 'observed' | 'community_confirmed' | 'institution_confirmed' | 'expert_confirmed' | 'independently_audited' | 'government_confirmed';

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

export interface NeedReport {
  id: string;
  title: string;
  description: string;
  category: string;
  location?: GeoPoint;
  communityId?: string;
  reporterId: string;
  verificationState: VerificationState;
  createdAt: string;
  sdgTags: number[];
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
