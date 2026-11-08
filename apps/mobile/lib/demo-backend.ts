import {publicProjectView} from '../../web/field-report-policy.mjs';
export const DEMO_API_BASE_URL = 'https://demo.irespond.local';
export const demoMode = process.env.EXPO_PUBLIC_DEMO_MODE === '1';

type DemoResult = { status: number; body: unknown };
type JsonRecord = Record<string, unknown>;

const needs = [
  {
    id: 'need-water-1',
    title: 'Restore safe water point',
    description: 'A public borehole requires a verified repair and water-quality check.',
    category: 'water',
    latitude: 6.5244,
    longitude: 3.3792,
    reporterId: 'offline-demo-user',
    verificationState: 'community_confirmed',
    sdgTags: [6, 11],
    createdAt: '2026-08-20T09:00:00.000Z',
    updatedAt: '2026-08-28T14:30:00.000Z',
  },
  {
    id: 'need-health-1',
    title: 'Community maternal health outreach',
    description: 'Residents requested a mobile antenatal and health-information day.',
    category: 'health',
    latitude: 6.5321,
    longitude: 3.3678,
    reporterId: 'offline-demo-user',
    verificationState: 'institution_confirmed',
    sdgTags: [3, 5],
    createdAt: '2026-08-21T10:00:00.000Z',
    updatedAt: '2026-08-29T11:15:00.000Z',
  },
  {
    id: 'need-school-1',
    title: 'Repair classrooms and learning kits',
    description: 'Two classrooms need roof repairs and replacement learning materials.',
    category: 'education',
    latitude: 6.5108,
    longitude: 3.4012,
    reporterId: 'offline-demo-user',
    verificationState: 'verification_requested',
    sdgTags: [4, 10],
    createdAt: '2026-08-22T08:30:00.000Z',
    updatedAt: '2026-08-30T12:00:00.000Z',
  },
];

const projects = [
  {
    id: 'project-water-1',
    sourceNeedId: 'need-water-1',
    title: 'Safe Water for 2,500 Residents',
    description: 'Repair, test and establish a community maintenance plan for the water point.',
    ownerCommunityId: 'community-lagos-mainland',
    status: 'executing',
    sdgTags: [6, 11],
  },
  {
    id: 'project-health-1',
    sourceNeedId: 'need-health-1',
    title: 'Mobile Community Health Days',
    description: 'Coordinate verified health partners for recurring community outreach.',
    ownerCommunityId: 'community-yaba',
    status: 'mobilising',
    sdgTags: [3, 5],
  },
];

const permissions = {
  canManageProject: true,
  canManageMilestones: true,
  canValidateMilestones: true,
  canManageRoles: true,
  canManageContributions: true,
  canPublishContributionNeeds: true,
  canManageFunding: true,
};

const milestones = [
  { id: 'milestone-assessment', title: 'Technical assessment', description: 'Confirm scope and safety controls.', status: 'validated', sequence: 1 },
  { id: 'milestone-repair', title: 'Repair and water testing', description: 'Complete repair and independent quality test.', status: 'ready', sequence: 2 },
  { id: 'milestone-maintenance', title: 'Maintenance handoff', description: 'Publish the local maintenance rota.', status: 'planned', sequence: 3 },
];

const contributionNeeds = [
  { id: 'contribution-plumber', kind: 'skill', description: 'Licensed plumbing assessment', quantityNote: 'One half-day visit', status: 'open' },
  { id: 'contribution-testing', kind: 'material', description: 'Water-quality test kits', quantityNote: 'Ten complete kits', status: 'open' },
];

const milestonesByProject: Record<string, typeof milestones> = {
  'project-water-1': milestones,
  'project-health-1': [],
};
const contributionNeedsByProject: Record<string, typeof contributionNeeds> = {
  'project-water-1': contributionNeeds,
  'project-health-1': [],
};

const projectRolesByProject: Record<string, Set<string>> = {
  'project-water-1': new Set(['project_manager']),
  'project-health-1': new Set(['project_manager']),
};

type DemoRoleInvite = {
  id: string;
  projectId: string;
  invitedActorId: string;
  role: string;
  invitedBy: string;
  status: string;
  createdAt: string;
  respondedAt?: string;
};

const roleInvites = new Map<string, DemoRoleInvite>([
  ['invite-1', {
    id: 'invite-1',
    projectId: 'project-water-1',
    invitedActorId: 'offline-demo-user',
    role: 'volunteer_lead',
    invitedBy: 'offline-demo-steward',
    status: 'pending',
    createdAt: '2026-08-30T09:00:00.000Z',
  }],
]);

const offers = [
  {
    id: 'offer-1',
    projectId: 'project-water-1',
    contributionNeedId: 'contribution-plumber',
    contributorId: 'offline-demo-user',
    kind: 'skill',
    note: 'Plumbing inspection and repair plan',
    availabilityNote: 'Available Saturday morning',
    status: 'accepted',
    createdAt: '2026-08-24T10:00:00.000Z',
    updatedAt: '2026-08-25T12:00:00.000Z',
  },
];

const fundingPlan = {
  projectId: 'project-water-1',
  currency: 'NGN',
  targetMinor: 18_000_000_00,
  communityCounterpartMinor: 2_000_000_00,
  externalTargetMinor: 16_000_000_00,
  status: 'open',
  pledgedMinor: 12_600_000_00,
  confirmedMinor: 0,
  updatedAt: '2026-08-30T12:00:00.000Z',
};
const fundingPlans: Record<string, typeof fundingPlan | undefined> = { 'project-water-1': fundingPlan };

const pledges = [
  {
    id: 'pledge-1',
    projectId: 'project-water-1',
    contributorId: 'offline-demo-user',
    contributionClass: 'external_donation',
    amountMinor: 25_000_00,
    currency: 'NGN',
    status: 'pledged',
    createdAt: '2026-08-28T10:00:00.000Z',
  },
];

const notifications = [
  {
    id: 'notice-1',
    title: 'Need verified',
    body: 'The safe-water observation was community confirmed.',
    category: 'verification',
    resourceType: 'need',
    resourceId: 'need-water-1',
    createdAt: '2026-09-01T11:48:00.000Z',
    readAt: null,
  },
  {
    id: 'notice-2',
    title: 'Project milestone ready',
    body: 'The water-point repair milestone is ready for coordinated action.',
    category: 'project',
    resourceType: 'project',
    resourceId: 'project-water-1',
    createdAt: '2026-09-01T10:00:00.000Z',
    readAt: '2026-09-01T10:30:00.000Z',
  },
];

const notificationPreferences = { inApp: true, push: true, sms: false, email: true };

const safetyReports = [
  {
    id: 'safety-1',
    reporterId: 'offline-demo-user',
    subjectType: 'project',
    subjectId: 'project-water-1',
    reason: 'safeguarding',
    details: 'Offline demonstration of the confidential follow-up workflow.',
    status: 'triage',
    createdAt: '2026-08-31T09:00:00.000Z',
    updatedAt: '2026-08-31T09:00:00.000Z',
  },
];

const privacyConsents = [
  { purpose: 'impact-research', granted: false, policyVersion: '2026-08', updatedAt: '2026-08-30T10:00:00.000Z' },
  { purpose: 'product-improvement', granted: true, policyVersion: '2026-08', updatedAt: '2026-08-30T10:00:00.000Z' },
];

const privacyRequests = [
  { id: 'privacy-1', type: 'export', status: 'received', requestedAt: '2026-08-29T09:00:00.000Z' },
];

const demoChallenges = [
  {
    id: 'challenge-gauteng-demo-2027',
    demoOnly: true,
    tenantId: 'demo-institution-gauteng',
    slug: 'community-innovation-challenge-2027-demo',
    title: 'Community Innovation Challenge 2027 (OFFLINE DEMO)',
    description: 'Identify community problems, propose responsible solutions, mobilise resources and show independently verified results.',
    mission: 'Identify community problems, propose responsible solutions, mobilise resources and show independently verified results.',
    jurisdictionCode: 'ZA-GP',
    locale: 'en-ZA',
    timezone: 'Africa/Johannesburg',
    currencyCode: 'ZAR',
    visibility: 'public',
    status: 'registration_open',
    currentRulesVersion: 1,
    rulesSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    ruleApprovalCount: 2,
    fundingStatus: 'unconfirmed',
    sponsorStatus: 'not_confirmed',
    guardianConsentRule: 'required_per_jurisdiction_and_policy',
    publicResultPolicy: 'opt_in_redacted',
    tracks: [
      { id: 'track-secondary', programId: 'challenge-gauteng-demo-2027', title: 'Secondary School Teams', levelCode: 'secondary', participationMode: 'team', minimumTeamMembers: 2, maximumTeamMembers: 5, requiresGuardianConsent: true },
      { id: 'track-tertiary', programId: 'challenge-gauteng-demo-2027', title: 'Tertiary & Youth Innovators', levelCode: 'tertiary', participationMode: 'both', minimumTeamMembers: 1, maximumTeamMembers: 5, requiresGuardianConsent: false },
    ],
    rounds: [
      {
        id: 'round-proposal-1',
        programId: 'challenge-gauteng-demo-2027',
        sequence: 1,
        title: 'Round 1: Problem and solution proposal',
        kind: 'proposal',
        status: 'open',
        opensAt: '2027-04-05T09:00:00+02:00',
        closesAt: '2027-04-20T17:00:00+02:00',
        requiredJudges: 3,
        scoringAlgorithm: 'weighted_median_v1',
        rubricVersion: 1,
        criteria: [
          { id: 'crit-problem', roundId: 'round-proposal-1', rubricVersion: 1, sequence: 1, code: 'problem', title: 'Clarity of the problem', weightBasisPoints: 2000, maximumScore: 100 },
          { id: 'crit-feasibility', roundId: 'round-proposal-1', rubricVersion: 1, sequence: 2, code: 'feasibility', title: 'Solution feasibility', weightBasisPoints: 2500, maximumScore: 100 },
          { id: 'crit-participation', roundId: 'round-proposal-1', rubricVersion: 1, sequence: 3, code: 'participation', title: 'Community participation', weightBasisPoints: 2000, maximumScore: 100 },
          { id: 'crit-evidence', roundId: 'round-proposal-1', rubricVersion: 1, sequence: 4, code: 'evidence', title: 'Verifiable progress and outcomes', weightBasisPoints: 2500, maximumScore: 100 },
          { id: 'crit-sustainability', roundId: 'round-proposal-1', rubricVersion: 1, sequence: 5, code: 'sustainability', title: 'Maintenance and replication', weightBasisPoints: 1000, maximumScore: 100 },
        ],
      },
    ],
    prizes: [
      { id: 'prize-demo-1', programId: 'challenge-gauteng-demo-2027', title: 'Illustrative R5,000 implementation grant — NOT funded or approved', prizeKind: 'project_grant', currencyCode: 'ZAR', amountMinor: 500000, status: 'announced', fundingStatus: 'unconfirmed' },
    ],
    sponsors: [] as Array<Record<string, unknown>>,
    publishedResults: [] as Array<Record<string, unknown>>,
    awards: [] as Array<Record<string, unknown>>,
    appeals: [] as Array<Record<string, unknown>>,
    permissions: {
      canManageProgramme: true,
      canApproveRules: true,
      canReviewEligibility: true,
      canAssignJudges: true,
      canJudge: true,
      canReviewConflicts: true,
      canReviewAppeals: true,
      canManageSponsors: true,
      canManageAwards: true,
    },
  },
];

const demoChallengeEntries = [
  {
    id: 'entry-demo-1',
    programId: 'challenge-gauteng-demo-2027',
    trackId: 'track-secondary',
    leadActorId: 'offline-demo-user',
    entryCode: 'IRC-DEMO01',
    teamDisplayName: 'Soweto Water Stewards (Demo)',
    participationMode: 'team',
    status: 'screening',
    eligibilityStatus: 'pending',
    guardianConsentStatus: 'required',
    agreedRulesVersion: 1,
    teamMembers: [{ entryId: 'entry-demo-1', actorId: 'offline-demo-user', memberRole: 'lead', invitationState: 'accepted', guardianConsentStatus: 'required' }],
  },
];

const demoJudgeAssignments = [
  {
    id: 'asg-demo-1',
    programId: 'challenge-gauteng-demo-2027',
    submissionId: 'sub-demo-1',
    entryId: 'entry-demo-1',
    roundId: 'round-proposal-1',
    judgeActorId: 'offline-demo-user',
    assignmentStatus: 'accepted',
    conflictStatus: 'no_conflict_declared',
  },
];

function ok(body: unknown): DemoResult { return { status: 200, body }; }
function badRequest(message: string): DemoResult { return { status: 400, body: { error: message } }; }
function missing(message = 'Offline demo record was not found.'): DemoResult { return { status: 404, body: { error: message } }; }
function conflict(message: string): DemoResult { return { status: 409, body: { error: message } }; }
function asRecord(value: unknown): JsonRecord { return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}; }
function lastSegment(path: string) { return decodeURIComponent(path.split('/').filter(Boolean).at(-1) ?? ''); }
function projectFor(id: string) { return projects.find((project) => project.id === id); }
function needFor(id: string) { return needs.find((need) => need.id === id); }
function isVerifiedState(state: string) { return ['community_confirmed', 'institution_confirmed', 'expert_confirmed', 'independently_audited', 'government_confirmed'].includes(state); }
function validProjectRole(role: string) { return ['project_manager', 'community_steward', 'verifier', 'volunteer_lead', 'procurement_lead', 'maintenance_owner'].includes(role); }
function allowedProjectTransition(from: string, to: string) {
  if (to === 'cancelled' && from !== 'completed' && from !== 'cancelled') return true;
  return ({ draft: 'approved', approved: 'mobilising', mobilising: 'executing', executing: 'validating', validating: 'maintaining', maintaining: 'completed' } as Record<string, string>)[from] === to;
}
function projectReadiness(projectId: string, target: string) {
  const projectMilestones = milestonesByProject[projectId] ?? [];
  const projectRoles = projectRolesByProject[projectId] ?? new Set<string>();
  if (target === 'approved' && !projectRoles.has('project_manager')) return 'project manager must accept role before approval';
  if (target === 'approved' && !projectMilestones.some((milestone) => milestone.status !== 'cancelled')) return 'at least one milestone is required before approval';
  if (target === 'validating' && projectMilestones.some((milestone) => !['submitted', 'validated', 'cancelled'].includes(milestone.status))) return 'all active milestones must be submitted before validation';
  if (target === 'maintaining' && projectMilestones.some((milestone) => !['validated', 'cancelled'].includes(milestone.status))) return 'all active milestones must be validated before maintenance';
  if (target === 'completed' && !projectRoles.has('maintenance_owner')) return 'maintenance owner is required before completion';
  return null;
}
function allowedMilestoneTransition(from: string, to: string) {
  if (to === 'cancelled' && from !== 'validated' && from !== 'cancelled') return true;
  if (from === 'planned') return to === 'ready';
  if (from === 'ready') return to === 'in_progress';
  if (from === 'in_progress') return to === 'blocked' || to === 'submitted';
  if (from === 'blocked') return to === 'in_progress';
  if (from === 'submitted') return to === 'validated';
  return false;
}
function projectDetail(id: string) {
  const project = projectFor(id);
  return project ? { project, milestones: milestonesByProject[id] ?? [], contributionNeeds: contributionNeedsByProject[id] ?? [], permissions,viewerRoles:Array.from(projectRolesByProject[id]??[]) } : null;
}

export function isDemoRequest(raw: string) {
  try {
    return new URL(raw).hostname === 'demo.irespond.local';
  } catch {
    return false;
  }
}

export function createDemoPayload(url: URL, method = 'GET', requestBody?: unknown, now = new Date()): DemoResult {
  const path = url.pathname.replace(/\/$/, '') || '/';
  const verb = method.toUpperCase();
  const input = asRecord(requestBody);

  if (verb === 'GET' && path === '/v1/platform') return ok({
    name: 'iRespond Offline Demo',
    doctrine: 'See it. Own it. Solve it. Demonstrate locally without claiming production authority.',
    lifecycle: ['see', 'report', 'verify', 'diagnose', 'project', 'mobilise', 'execute', 'measure', 'maintain', 'replicate'],
    capabilities: ['needs', 'projects', 'contributions', 'funding-pledges', 'impact-passport', 'privacy', 'safety'],
    demo: true,
  });
  if (verb === 'GET' && path === '/v1/session') return ok({
    subject: 'offline-demo-user',
    roles: ['community_verifier', 'impact_auditor', 'evidence_reviewer', 'safety_reviewer'],
  });
  if (verb === 'GET' && path === '/v1/needs') return ok(needs);
  if (verb === 'POST' && path === '/v1/needs') {
    const need = {
      ...needs[0],
      id: `demo-need-${now.getTime()}-${needs.length}`,
      title: String(input.title ?? 'Offline demo observation'),
      description: String(input.description ?? ''),
      category: String(input.category ?? 'community'),
      categoryDetail:String(input.categoryDetail??''),
      latitude: Number(input.latitude ?? 0),
      longitude: Number(input.longitude ?? 0),
      reporterId: 'offline-demo-user',
      verificationState: 'observed',
      sdgTags: Array.isArray(input.sdgTags) ? input.sdgTags.map(Number) : [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    needs.push(need);
    return ok(need);
  }
  if (verb === 'GET' && path === '/v1/projects') return ok(projects);

  const evidenceInitiate = path.match(/^\/v1\/needs\/([^/]+)\/evidence\/uploads$/);
  if (verb === 'POST' && evidenceInitiate) return ok({
    evidenceId: `demo-evidence-${now.getTime()}`,
    uploadUrl: `${DEMO_API_BASE_URL}/v1/demo-uploads/demo-evidence-${now.getTime()}`,
    method: 'PUT',
    headers: { 'X-iRespond-Demo-Upload': 'offline' },
  });
  if (verb === 'PUT' && /^\/v1\/demo-uploads\/[^/]+$/.test(path)) return ok({ stored: true, demo: true });
  if (verb === 'POST' && /^\/v1\/needs\/[^/]+\/evidence\/[^/]+\/complete$/.test(path)) return ok({ id: path.split('/')[5], status: 'pending_review', demo: true });

  const evidenceAccess = path.match(/^\/v1\/needs\/([^/]+)\/evidence\/([^/]+)\/access$/);
  if (verb === 'GET' && evidenceAccess) return ok({
    available: false,
    unavailableReason: 'Approved evidence bytes are not bundled with this offline demonstration. Review decisions remain available as local sample data.',
  });
  const needProject = path.match(/^\/v1\/needs\/([^/]+)\/project$/);
  if (needProject && verb === 'GET') {
    const need = needFor(decodeURIComponent(needProject[1]));
    const project = projects.find((candidate) => candidate.sourceNeedId === need?.id);
    return project ? ok(project) : missing();
  }
  if (needProject && verb === 'POST') {
    const sourceNeedId = decodeURIComponent(needProject[1]);
    const need = needFor(sourceNeedId);
    if (!need) return missing();
    if (!isVerifiedState(need.verificationState)) return conflict('need must be verified before project conversion');
    if (projects.some((candidate) => candidate.sourceNeedId === sourceNeedId)) return conflict('need already has an action project');
    const project = {
      ...projects[0],
      id: `demo-project-${sourceNeedId}-${now.getTime()}`,
      sourceNeedId,
      title: String(input.title ?? need.title),
      description: String(input.description ?? need.description),
      ownerCommunityId: String(input.ownerCommunityId ?? 'offline-demo-community'),
      status: 'draft',
      sdgTags: need.sdgTags,
    };
    projects.push(project);
    milestonesByProject[project.id] = [];
    contributionNeedsByProject[project.id] = [];
    projectRolesByProject[project.id] = new Set();
    return ok(project);
  }
  const verification = path.match(/^\/v1\/needs\/([^/]+)\/verification$/);
  if (verification && verb === 'POST') {
    const needId = decodeURIComponent(verification[1]);
    const index = needs.findIndex((candidate) => candidate.id === needId);
    if (index < 0) return missing();
    const need = { ...needs[index], verificationState: String(input.state ?? needs[index].verificationState), updatedAt: now.toISOString() };
    needs[index] = need;
    return ok(need);
  }
  const needMatch = path.match(/^\/v1\/needs\/([^/]+)$/);
  if (verb === 'GET' && needMatch) {
    const need = needFor(decodeURIComponent(needMatch[1]));
    return need ? ok(need) : missing();
  }

  const projectFundingPledges = path.match(/^\/v1\/projects\/([^/]+)\/funding\/pledges$/);
  if (projectFundingPledges && verb === 'GET') return ok(pledges.filter((pledge) => pledge.projectId === decodeURIComponent(projectFundingPledges[1])));
  if (projectFundingPledges && verb === 'POST') {
    const projectId = decodeURIComponent(projectFundingPledges[1]);
    const plan = fundingPlans[projectId];
    if (!plan) return missing('Funding plan was not found.');
    const pledge = {
      ...pledges[0],
      id: `demo-pledge-${now.getTime()}-${pledges.length}`,
      projectId,
      contributorId: 'offline-demo-user',
      contributionClass: String(input.contributionClass ?? 'external_donation'),
      amountMinor: Number(input.amountMinor ?? 0),
      currency: plan.currency,
      status: 'pledged',
      createdAt: now.toISOString(),
    };
    pledges.push(pledge);
    plan.pledgedMinor += pledge.amountMinor;
    return ok(pledge);
  }
  const projectFunding = path.match(/^\/v1\/projects\/([^/]+)\/funding$/);
  if (projectFunding && verb === 'GET') {
    const projectId = decodeURIComponent(projectFunding[1]);
    const plan = fundingPlans[projectId];
    return projectFor(projectId) && plan ? ok({ ...plan }) : missing();
  }
  if (projectFunding && verb === 'PUT') {
    const projectId = decodeURIComponent(projectFunding[1]);
    if (!projectFor(projectId)) return missing();
    const plan = fundingPlans[projectId] ?? { projectId, currency: 'NGN', targetMinor: 0, communityCounterpartMinor: 0, externalTargetMinor: 0, status: 'draft', pledgedMinor: 0, confirmedMinor: 0, updatedAt: now.toISOString() };
    const targetMinor = Number(input.targetMinor ?? plan.targetMinor);
    const communityCounterpartMinor = Number(input.communityCounterpartMinor ?? plan.communityCounterpartMinor);
    Object.assign(plan, {
      projectId,
      currency: String(input.currency ?? plan.currency),
      targetMinor,
      communityCounterpartMinor,
      externalTargetMinor: targetMinor - communityCounterpartMinor,
      status: String(input.status ?? plan.status),
      updatedAt: now.toISOString(),
    });
    fundingPlans[projectId] = plan;
    return ok({ ...plan });
  }
  const contributionOffer = path.match(/^\/v1\/projects\/([^/]+)\/contribution-needs\/([^/]+)\/offers$/);
  if (contributionOffer && verb === 'POST') {
    const projectId = decodeURIComponent(contributionOffer[1]);
    const contributionNeedId = decodeURIComponent(contributionOffer[2]);
    const contributionNeed = (contributionNeedsByProject[projectId] ?? []).find((candidate) => candidate.id === contributionNeedId);
    if (!contributionNeed) return missing('contribution need not found');
    if (!['open', 'partially_filled'].includes(contributionNeed.status)) return conflict('contribution need is not accepting offers');
    const offer = {
      ...offers[0],
      id: `demo-offer-${now.getTime()}-${offers.length}`,
      projectId,
      contributionNeedId,
      kind: contributionNeed.kind,
      contributorId: 'offline-demo-user',
      note: String(input.note ?? ''),
      availabilityNote: String(input.availabilityNote ?? ''),
      status: 'offered',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    offers.push(offer);
    return ok(offer);
  }
  const projectOffers = path.match(/^\/v1\/projects\/([^/]+)\/contribution-offers$/);
  if (projectOffers && verb === 'GET') return ok(offers.filter((offer) => offer.projectId === decodeURIComponent(projectOffers[1])));
  const milestoneCreate = path.match(/^\/v1\/projects\/([^/]+)\/milestones$/);
  if (verb === 'POST' && milestoneCreate) {
    const projectId = decodeURIComponent(milestoneCreate[1]);
    if (!projectFor(projectId)) return missing();
    const projectMilestones = milestonesByProject[projectId] ?? (milestonesByProject[projectId] = []);
    const milestone = { id: `demo-milestone-${now.getTime()}-${projectMilestones.length}`, title: String(input.title ?? 'Demo milestone'), description: String(input.description ?? ''), status: 'planned', sequence: Number(input.sequence ?? projectMilestones.length + 1) };
    projectMilestones.push(milestone);
    return ok(milestone);
  }
  const contributionNeedCreate = path.match(/^\/v1\/projects\/([^/]+)\/contribution-needs$/);
  if (verb === 'POST' && contributionNeedCreate) {
    const projectId = decodeURIComponent(contributionNeedCreate[1]);
    if (!projectFor(projectId)) return missing();
    const projectContributionNeeds = contributionNeedsByProject[projectId] ?? (contributionNeedsByProject[projectId] = []);
    const contributionNeed = { id: `demo-contribution-need-${now.getTime()}-${projectContributionNeeds.length}`, kind: String(input.kind ?? 'time'), description: String(input.description ?? ''), quantityNote: String(input.quantityNote ?? ''), status: 'open' };
    projectContributionNeeds.push(contributionNeed);
    return ok(contributionNeed);
  }
  const projectTransition = path.match(/^\/v1\/projects\/([^/]+)\/transition$/);
  if (verb === 'POST' && projectTransition) {
    const projectId = decodeURIComponent(projectTransition[1]);
    const index = projects.findIndex((project) => project.id === projectId);
    if (index < 0) return missing();
    const target = String(input.state ?? '');
    if (!allowedProjectTransition(projects[index].status, target)) return conflict('invalid project transition');
    const readinessError = projectReadiness(projectId, target);
    if (readinessError) return conflict(readinessError);
    projects[index] = { ...projects[index], status: target };
    return ok(projects[index]);
  }
  const offerMutation = path.match(/^\/v1\/projects\/([^/]+)\/contribution-offers\/([^/]+)\/(decision|fulfill)$/);
  if (verb === 'POST' && offerMutation) {
    const projectId = decodeURIComponent(offerMutation[1]);
    const offerId = decodeURIComponent(offerMutation[2]);
    const index = offers.findIndex((offer) => offer.id === offerId && offer.projectId === projectId);
    if (offerMutation[3] === 'fulfill') {
      if (index < 0 || offers[index].status !== 'accepted') return missing('accepted contribution offer not found');
      offers[index] = { ...offers[index], status: 'fulfilled', updatedAt: now.toISOString() };
      return ok(offers[index]);
    }
    if (index < 0) return missing('contribution offer not found');
    const status = String(input.decision ?? '').toLowerCase().trim();
    if (status !== 'accepted' && status !== 'declined') return badRequest('decision must be accepted or declined');
    if (offers[index].status !== 'offered') return conflict('only offered contributions may be accepted or declined');
    offers[index] = { ...offers[index], status, updatedAt: now.toISOString() };
    if (status === 'accepted') {
      const projectContributionNeeds = contributionNeedsByProject[projectId] ?? [];
      const contributionNeed = projectContributionNeeds.find((candidate) => candidate.id === offers[index].contributionNeedId);
      if (contributionNeed && ['open', 'partially_filled'].includes(contributionNeed.status)) contributionNeed.status = input.closeNeed ? 'filled' : 'partially_filled';
    }
    return ok(offers[index]);
  }
  const roleInvite = path.match(/^\/v1\/projects\/([^/]+)\/roles\/invite$/);
  if (verb === 'POST' && roleInvite) {
    const projectId = decodeURIComponent(roleInvite[1]);
    const invitedActorId = String(input.actorId ?? '').trim();
    const role = String(input.role ?? '').trim();
    if (!invitedActorId || !role) return badRequest('actorId and role are required');
    if (!validProjectRole(role)) return badRequest('invalid project role');
    if (!projectFor(projectId)) return badRequest('project not found');
    const invite: DemoRoleInvite = { id: `demo-invite-${now.getTime()}-${roleInvites.size}`, projectId, invitedActorId, role, invitedBy: 'offline-demo-steward', status: 'pending', createdAt: now.toISOString() };
    roleInvites.set(invite.id, invite);
    return ok(invite);
  }
  const projectMatch = path.match(/^\/v1\/projects\/([^/]+)$/);
  if (verb === 'GET' && projectMatch) {
    const detail = projectDetail(decodeURIComponent(projectMatch[1]));
    return detail ? ok(detail) : missing();
  }
  const milestoneTransition = path.match(/^\/v1\/projects\/([^/]+)\/milestones\/([^/]+)\/transition$/);
  if (verb === 'POST' && milestoneTransition) {
    const projectId = decodeURIComponent(milestoneTransition[1]);
    const milestoneId = decodeURIComponent(milestoneTransition[2]);
    const projectMilestones = milestonesByProject[projectId] ?? [];
    const index = projectMilestones.findIndex((milestone) => milestone.id === milestoneId);
    if (index < 0) return missing();
    const target = String(input.state ?? '');
    if (!allowedMilestoneTransition(projectMilestones[index].status, target)) return conflict('invalid milestone transition');
    projectMilestones[index] = { ...projectMilestones[index], status: target };
    return ok(projectMilestones[index]);
  }

  if (verb === 'GET' && path === '/v1/me/impact-passport') return ok({
    subject: 'offline-demo-user',
    projectsLed: 2,
    projectsCompleted: 1,
    verifications: 7,
    fulfilledContributions: 4,
    acceptedCommitments: 5,
    sdgs: [3, 4, 5, 6, 11],
    contributions: [{ kind: 'skill', fulfilled: 2, accepted: 3 }, { kind: 'material', fulfilled: 2, accepted: 2 }],
    roles: [{ role: 'project_lead', projects: 1 }, { role: 'community_verifier', projects: 2 }],
    generatedAt: now.toISOString(),
  });
  if (verb === 'GET' && path === '/v1/me/notifications') return ok(notifications);
  if (verb === 'GET' && path === '/v1/me/notification-preferences') return ok(notificationPreferences);
  if (verb === 'PUT' && path === '/v1/me/notification-preferences') {
    for (const key of ['inApp', 'push', 'sms', 'email'] as const) {
      if (key in input) notificationPreferences[key] = Boolean(input[key]);
    }
    return ok({ ...notificationPreferences });
  }
  const notificationRead = path.match(/^\/v1\/me\/notifications\/([^/]+)\/read$/);
  if (verb === 'POST' && notificationRead) {
    const noticeId = decodeURIComponent(notificationRead[1]);
    const index = notifications.findIndex((item) => item.id === noticeId);
    if (index < 0) return missing();
    notifications[index] = { ...notifications[index], readAt: now.toISOString() };
    return ok(notifications[index]);
  }
  if (verb === 'GET' && path === '/v1/me/contribution-offers') return ok(offers);
  const withdraw = path.match(/^\/v1\/contribution-offers\/([^/]+)\/withdraw$/);
  if (verb === 'POST' && withdraw) {
    const offerId = decodeURIComponent(withdraw[1]);
    const index = offers.findIndex((item) => item.id === offerId && item.contributorId === 'offline-demo-user' && item.status === 'offered');
    if (index < 0) return missing('open contribution offer not found for this identity');
    offers[index] = { ...offers[index], status: 'withdrawn', updatedAt: now.toISOString() };
    return ok(offers[index]);
  }
  if (verb === 'GET' && path === '/v1/me/funding/pledges') return ok(pledges);
  const pledgeCancel = path.match(/^\/v1\/funding\/pledges\/([^/]+)\/cancel$/);
  if (verb === 'POST' && pledgeCancel) {
    const pledgeId = decodeURIComponent(pledgeCancel[1]);
    const index = pledges.findIndex((pledge) => pledge.id === pledgeId);
    if (index < 0) return missing();
    const plan = fundingPlans[pledges[index].projectId];
    if (pledges[index].status === 'pledged' && plan) plan.pledgedMinor = Math.max(0, plan.pledgedMinor - pledges[index].amountMinor);
    pledges[index] = { ...pledges[index], status: 'cancelled' };
    return ok(pledges[index]);
  }
  if (verb === 'GET' && path === '/v1/me/privacy/consents') return ok(privacyConsents);
  if (verb === 'GET' && path === '/v1/me/privacy/requests') return ok(privacyRequests);
  if (verb === 'PUT' && /^\/v1\/me\/privacy\/consents\/[^/]+$/.test(path)) {
    const purpose = lastSegment(path);
    const consent = { purpose, granted: Boolean(input.granted), policyVersion: String(input.policyVersion ?? '2026-08'), updatedAt: now.toISOString() };
    const index = privacyConsents.findIndex((item) => item.purpose === purpose);
    if (index >= 0) privacyConsents[index] = consent;
    else privacyConsents.push(consent);
    return ok(consent);
  }
  if (verb === 'POST' && path === '/v1/me/privacy/requests') {
    const request = { id: `demo-privacy-${now.getTime()}-${privacyRequests.length}`, type: String(input.type ?? 'access'), status: 'received', requestedAt: now.toISOString() };
    privacyRequests.unshift(request);
    return ok(request);
  }
  if (verb === 'GET' && path === '/v1/me/safety/reports') return ok(safetyReports);
  if (verb === 'GET' && path === '/v1/safety/review-queue') return ok(safetyReports);
  if (verb === 'POST' && path === '/v1/safety/reports') {
    const report = { id: `demo-safety-${now.getTime()}-${safetyReports.length}`, reporterId: 'offline-demo-user', subjectType: String(input.subjectType ?? 'platform'), subjectId: String(input.subjectId ?? 'general'), reason: String(input.reason ?? 'other'), details: String(input.details ?? ''), status: 'received', createdAt: now.toISOString(), updatedAt: now.toISOString() };
    safetyReports.unshift(report);
    return ok(report);
  }
  const safetyMutation = path.match(/^\/v1\/safety\/reports\/([^/]+)\/(appeal|decision)$/);
  if (verb === 'POST' && safetyMutation) {
    const reportId = decodeURIComponent(safetyMutation[1]);
    const index = safetyReports.findIndex((report) => report.id === reportId);
    if (index < 0) return missing();
    const status = safetyMutation[2] === 'appeal' ? 'appealed' : String(input.decision ?? 'triage');
    safetyReports[index] = { ...safetyReports[index], status, updatedAt: now.toISOString() };
    return ok(safetyReports[index]);
  }
  const roleInviteAccept = path.match(/^\/v1\/project-role-invites\/([^/]+)\/accept$/);
  if (verb === 'POST' && roleInviteAccept) {
    const inviteId = decodeURIComponent(roleInviteAccept[1]);
    const invite = roleInvites.get(inviteId);
    if (!invite || invite.invitedActorId !== 'offline-demo-user' || invite.status !== 'pending') return missing('pending invite not found for this identity');
    const accepted = { ...invite, status: 'accepted', respondedAt: now.toISOString() };
    roleInvites.set(inviteId, accepted);
    (projectRolesByProject[invite.projectId] ?? (projectRolesByProject[invite.projectId] = new Set())).add(invite.role);
    return ok(accepted);
  }
  if (verb === 'POST' && /^\/v1\/evidence\/[^/]+\/review$/.test(path)) return ok({ id: path.split('/')[3], status: String(input.decision ?? 'available') });

  if (verb === 'GET' && path === '/v1/challenges') return ok({ items: demoChallenges, demo: true });
  if (verb === 'POST' && path === '/v1/challenges') {
    const created = {
      ...demoChallenges[0],
      id: `demo-challenge-${now.getTime()}`,
      title: String(input.title ?? 'Offline Demo Challenge'),
      description: String(input.description ?? ''),
      mission: String(input.mission ?? ''),
      status: 'draft',
      currentRulesVersion: 0,
      ruleApprovalCount: 0,
      fundingStatus: 'unconfirmed',
    };
    demoChallenges.unshift(created);
    return { status: 201, body: created };
  }
  const challengeGet = path.match(/^\/v1\/challenges\/([^/]+)$/);
  if (verb === 'GET' && challengeGet) {
    const found = demoChallenges.find((item) => item.id === decodeURIComponent(challengeGet[1])) ?? demoChallenges[0];
    return ok(found);
  }
  const challengeApprove = path.match(/^\/v1\/challenges\/([^/]+)\/rule-approvals$/);
  if (verb === 'POST' && challengeApprove) {
    const found = demoChallenges.find((item) => item.id === decodeURIComponent(challengeApprove[1])) ?? demoChallenges[0];
    found.ruleApprovalCount = (found.ruleApprovalCount || 0) + 1;
    if (found.status === 'draft') found.status = 'review';
    return { status: 201, body: found };
  }
  const challengePublish = path.match(/^\/v1\/challenges\/([^/]+)\/publish$/);
  if (verb === 'POST' && challengePublish) {
    const found = demoChallenges.find((item) => item.id === decodeURIComponent(challengePublish[1])) ?? demoChallenges[0];
    found.currentRulesVersion = (found.currentRulesVersion || 0) + 1;
    found.status = 'registration_open';
    return { status: 201, body: found };
  }
  const challengeApply = path.match(/^\/v1\/challenges\/([^/]+)\/entries$/);
  if (verb === 'POST' && challengeApply) {
    const entry = {
      ...demoChallengeEntries[0],
      id: `demo-entry-${now.getTime()}`,
      programId: decodeURIComponent(challengeApply[1]),
      trackId: String(input.trackId ?? 'track-secondary'),
      teamDisplayName: String(input.teamDisplayName ?? 'Demo Team'),
      participationMode: String(input.participationMode ?? 'team'),
      guardianConsentStatus: input.requiresGuardianConsent === false ? 'not_applicable' : 'required',
    };
    demoChallengeEntries.unshift(entry);
    return { status: 201, body: entry };
  }
  if (verb === 'GET' && path === '/v1/me/challenge-entries') return ok(demoChallengeEntries);
  if (verb === 'POST' && /^\/v1\/challenges\/[^/]+\/entries\/[^/]+\/team-members$/.test(path)) return ok(demoChallengeEntries[0]);
  if (verb === 'POST' && /^\/v1\/challenges\/[^/]+\/entries\/[^/]+\/guardian-consents$/.test(path)) {
    demoChallengeEntries[0].guardianConsentStatus = String(input.status ?? 'verified');
    return { status: 201, body: demoChallengeEntries[0] };
  }
  if (verb === 'POST' && /^\/v1\/challenges\/[^/]+\/entries\/[^/]+\/eligibility-decisions$/.test(path)) {
    demoChallengeEntries[0].eligibilityStatus = String(input.decision ?? 'eligible');
    demoChallengeEntries[0].status = demoChallengeEntries[0].eligibilityStatus;
    return { status: 201, body: demoChallengeEntries[0] };
  }
  if (verb === 'POST' && /^\/v1\/challenges\/[^/]+\/entries\/[^/]+\/submissions$/.test(path)) {
    return { status: 201, body: { id: `demo-sub-${now.getTime()}`, programId: 'challenge-gauteng-demo-2027', entryId: 'entry-demo-1', roundId: 'round-proposal-1', status: 'submitted', submissionSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' } };
  }
  if (verb === 'POST' && /^\/v1\/challenges\/[^/]+\/judge-assignments$/.test(path)) return { status: 201, body: demoJudgeAssignments[0] };
  if (verb === 'GET' && path === '/v1/me/challenge-judge-assignments') return ok(demoJudgeAssignments);
  if (verb === 'POST' && /^\/v1\/challenges\/[^/]+\/judge-assignments\/[^/]+\/conflict$/.test(path)) {
    demoJudgeAssignments[0].conflictStatus = String(input.status ?? 'no_conflict_declared');
    return ok(demoJudgeAssignments[0]);
  }
  if (verb === 'POST' && /^\/v1\/challenges\/[^/]+\/judge-assignments\/[^/]+\/scorecards$/.test(path)) {
    return { status: 201, body: { id: `demo-sc-${now.getTime()}`, assignmentId: 'asg-demo-1', status: 'sealed', totalBasisPoints: 8500 } };
  }
  if (verb === 'POST' && /^\/v1\/challenges\/[^/]+\/rounds\/[^/]+\/decisions$/.test(path)) {
    return { status: 201, body: { id: `demo-dec-${now.getTime()}`, roundId: 'round-proposal-1', entryId: 'entry-demo-1', decision: String(input.decision ?? 'finalist'), state: 'published', scoreBasisPoints: 8500 } };
  }
  if (verb === 'POST' && /^\/v1\/challenges\/[^/]+\/appeals$/.test(path)) {
    return { status: 201, body: { id: `demo-appeal-${now.getTime()}`, entryId: 'entry-demo-1', status: 'submitted' } };
  }
  if (verb === 'POST' && /^\/v1\/challenges\/[^/]+\/sponsors$/.test(path)) {
    return { status: 201, body: { id: `demo-sponsor-${now.getTime()}`, sponsorDisplayName: String(input.sponsorDisplayName ?? 'Demo Sponsor'), status: String(input.status ?? 'pledged'), truthNotice: 'Sponsor commitment is intent only, not settled funds.' } };
  }
  if (verb === 'POST' && /^\/v1\/challenges\/[^/]+\/awards$/.test(path)) {
    return { status: 201, body: { id: `demo-award-${now.getTime()}`, entryId: 'entry-demo-1', prizeId: 'prize-demo-1', status: 'approved', fulfillmentStatus: 'pending', truthStateLabel: 'Award approved — NOT yet fulfilled or paid' } };
  }
  if (verb === 'POST' && /^\/v1\/challenges\/[^/]+\/awards\/[^/]+\/fulfillments$/.test(path)) {
    return { status: 201, body: { id: `demo-fulfillment-${now.getTime()}`, awardId: 'demo-award-1', fulfillmentKind: String(input.fulfillmentKind ?? 'in_kind_delivery'), status: String(input.status ?? 'pending'), truthNotice: 'Prize fulfilment requires verified delivery evidence or PayCore proof.' } };
  }
  if (verb === 'POST' && /^\/v1\/challenges\/[^/]+\/entries\/[^/]+\/project-link$/.test(path)) {
    return { status: 201, body: { id: `demo-link-${now.getTime()}`, entryId: 'entry-demo-1', actionProjectId: String(input.actionProjectId ?? 'project-water-1'), relationship: 'challenge_delivery' } };
  }

  return { status: 404, body: { error: 'Offline demo route is not implemented.' } };
}

function requestBody(value: BodyInit | null | undefined) {
  if (typeof value !== 'string' || !value) return undefined;
  try { return JSON.parse(value) as unknown; } catch { return undefined; }
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function createDemoFetch(realFetch: FetchLike, latencyMs = 80): FetchLike {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (!isDemoRequest(raw)) {
      try {
        const protocol = new URL(raw).protocol;
        if (protocol === 'http:' || protocol === 'https:') {
          return new Response(JSON.stringify({ error: 'External network requests are disabled in the offline demo.' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json', 'X-iRespond-Demo': 'network-blocked' },
          });
        }
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid request URL.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'X-iRespond-Demo': 'invalid-url' },
        });
      }
      return realFetch(input, init);
    }
    const url = new URL(raw.replace(/^http:/, 'https:'));
    const method = (init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase();
    let result = createDemoPayload(url, method, requestBody(init?.body));
    const headers=new Headers(init?.headers??(typeof input==='object'&&'headers' in input?input.headers:undefined));
    if(method==='GET'&&/^\/v1\/projects\/[^/]+$/.test(url.pathname)&&headers.get('Authorization')!=='Bearer irespond-offline-demo-token'&&result.status===200){result={...result,body:publicProjectView(result.body as JsonRecord)}}
    if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs));
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { 'Content-Type': 'application/json', 'X-iRespond-Demo': 'offline' },
    });
  };
}

export function installDemoBackend() {
  const demoGlobal = globalThis as typeof globalThis & { __IRESPOND_DEMO_FETCH__?: boolean };
  if (!demoMode || demoGlobal.__IRESPOND_DEMO_FETCH__) return;
  demoGlobal.__IRESPOND_DEMO_FETCH__ = true;
  const realFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = createDemoFetch(realFetch);
}
