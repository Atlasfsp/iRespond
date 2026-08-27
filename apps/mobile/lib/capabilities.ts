export type Capability =
  | 'verification.request'
  | 'verification.community'
  | 'verification.institution'
  | 'verification.expert'
  | 'verification.audit'
  | 'verification.government'
  | 'verification.dispute'
  | 'verification.reject'
  | 'evidence.review'
  | 'project.convert'
  | 'project.steward'
  | 'milestone.validate'
  | 'safety.review';

const roleCapabilities: Record<string, Capability[]> = {
  community_verifier: ['verification.community', 'verification.dispute', 'evidence.review', 'project.convert', 'milestone.validate'],
  institution_verifier: ['verification.institution', 'verification.dispute', 'project.convert', 'milestone.validate'],
  expert_verifier: ['verification.expert', 'verification.dispute', 'milestone.validate'],
  impact_auditor: ['verification.audit', 'verification.dispute'],
  auditor: ['milestone.validate'],
  government_verifier: ['verification.government', 'verification.dispute'],
  evidence_reviewer: ['evidence.review'],
  safety_reviewer: ['safety.review'],
  project_steward: ['project.convert', 'project.steward'],
  trust_safety_admin: [
    'verification.community',
    'verification.institution',
    'verification.expert',
    'verification.audit',
    'verification.government',
    'verification.dispute',
    'verification.reject',
    'evidence.review',
    'project.convert',
    'project.steward',
    'milestone.validate',
    'safety.review'
  ]
};

export function capabilitiesForRoles(roles: string[]) {
  const values = new Set<Capability>(['verification.request']);
  for (const role of roles) for (const value of roleCapabilities[role] ?? []) values.add(value);
  return values;
}

export function hasCapability(roles: string[], capability: Capability) {
  return capabilitiesForRoles(roles).has(capability);
}

export function verificationTransitionsForRoles(roles: string[]) {
  const caps = capabilitiesForRoles(roles);
  const transitions: { state: string; label: string; capability: Capability }[] = [
    { state: 'verification_requested', label: 'Request verification', capability: 'verification.request' },
    { state: 'community_confirmed', label: 'Community confirm', capability: 'verification.community' },
    { state: 'institution_confirmed', label: 'Institution confirm', capability: 'verification.institution' },
    { state: 'expert_confirmed', label: 'Expert confirm', capability: 'verification.expert' },
    { state: 'independently_audited', label: 'Record independent audit', capability: 'verification.audit' },
    { state: 'government_confirmed', label: 'Government confirm', capability: 'verification.government' },
    { state: 'disputed', label: 'Dispute', capability: 'verification.dispute' },
    { state: 'rejected', label: 'Reject', capability: 'verification.reject' }
  ];
  return transitions.filter((item) => caps.has(item.capability));
}
