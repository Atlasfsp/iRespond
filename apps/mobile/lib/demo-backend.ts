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
    status: 'active',
    sdgTags: [6, 11],
  },
  {
    id: 'project-health-1',
    sourceNeedId: 'need-health-1',
    title: 'Mobile Community Health Days',
    description: 'Coordinate verified health partners for recurring community outreach.',
    ownerCommunityId: 'community-yaba',
    status: 'active',
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

function ok(body: unknown): DemoResult { return { status: 200, body }; }
function missing(message = 'Offline demo record was not found.'): DemoResult { return { status: 404, body: { error: message } }; }
function asRecord(value: unknown): JsonRecord { return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}; }
function lastSegment(path: string) { return decodeURIComponent(path.split('/').filter(Boolean).at(-1) ?? ''); }
function projectFor(id: string) { return projects.find((project) => project.id === id); }
function needFor(id: string) { return needs.find((need) => need.id === id); }
function projectDetail(id: string) {
  const project = projectFor(id);
  return project ? { project, milestones, contributionNeeds, permissions } : null;
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
  if (verb === 'POST' && path === '/v1/needs') return ok({ ...needs[0], ...input, id: `demo-need-${now.getTime()}`, verificationState: 'observed', createdAt: now.toISOString(), updatedAt: now.toISOString() });
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
  if (verb === 'GET' && evidenceAccess) return ok({ url: `${DEMO_API_BASE_URL}/approved-evidence/${encodeURIComponent(evidenceAccess[2])}` });
  const needProject = path.match(/^\/v1\/needs\/([^/]+)\/project$/);
  if (needProject && verb === 'GET') {
    const need = needFor(decodeURIComponent(needProject[1]));
    const project = projects.find((candidate) => candidate.sourceNeedId === need?.id);
    return project ? ok(project) : missing();
  }
  if (needProject && verb === 'POST') return ok({ ...projects[0], ...input, id: `demo-project-${now.getTime()}`, sourceNeedId: decodeURIComponent(needProject[1]) });
  const verification = path.match(/^\/v1\/needs\/([^/]+)\/verification$/);
  if (verification && verb === 'POST') {
    const need = needFor(decodeURIComponent(verification[1]));
    return need ? ok({ ...need, verificationState: String(input.state ?? need.verificationState), updatedAt: now.toISOString() }) : missing();
  }
  const needMatch = path.match(/^\/v1\/needs\/([^/]+)$/);
  if (verb === 'GET' && needMatch) {
    const need = needFor(decodeURIComponent(needMatch[1]));
    return need ? ok(need) : missing();
  }

  const projectFundingPledges = path.match(/^\/v1\/projects\/([^/]+)\/funding\/pledges$/);
  if (projectFundingPledges && verb === 'GET') return ok(pledges);
  if (projectFundingPledges && verb === 'POST') return ok({
    ...pledges[0],
    ...input,
    id: `demo-pledge-${now.getTime()}`,
    projectId: decodeURIComponent(projectFundingPledges[1]),
    status: 'pledged',
    currency: fundingPlan.currency,
    createdAt: now.toISOString(),
  });
  const projectFunding = path.match(/^\/v1\/projects\/([^/]+)\/funding$/);
  if (projectFunding && verb === 'GET') return projectFor(decodeURIComponent(projectFunding[1])) ? ok({ ...fundingPlan, projectId: decodeURIComponent(projectFunding[1]) }) : missing();
  if (projectFunding && verb === 'PUT') {
    const targetMinor = Number(input.targetMinor ?? fundingPlan.targetMinor);
    const communityCounterpartMinor = Number(input.communityCounterpartMinor ?? fundingPlan.communityCounterpartMinor);
    return ok({ ...fundingPlan, ...input, projectId: decodeURIComponent(projectFunding[1]), targetMinor, communityCounterpartMinor, externalTargetMinor: targetMinor - communityCounterpartMinor, updatedAt: now.toISOString() });
  }
  const contributionOffer = path.match(/^\/v1\/projects\/([^/]+)\/contribution-needs\/([^/]+)\/offers$/);
  if (contributionOffer && verb === 'POST') return ok({
    ...offers[0],
    ...input,
    id: `demo-offer-${now.getTime()}`,
    projectId: decodeURIComponent(contributionOffer[1]),
    contributionNeedId: decodeURIComponent(contributionOffer[2]),
    contributorId: 'offline-demo-user',
    status: 'offered',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
  const projectOffers = path.match(/^\/v1\/projects\/([^/]+)\/contribution-offers$/);
  if (projectOffers && verb === 'GET') return ok(offers.filter((offer) => offer.projectId === decodeURIComponent(projectOffers[1])));
  if (projectOffers && verb === 'POST') return ok({ ...offers[0], ...input, id: `demo-offer-${now.getTime()}`, projectId: decodeURIComponent(projectOffers[1]), status: 'offered', createdAt: now.toISOString(), updatedAt: now.toISOString() });
  const projectMatch = path.match(/^\/v1\/projects\/([^/]+)$/);
  if (verb === 'GET' && projectMatch) {
    const detail = projectDetail(decodeURIComponent(projectMatch[1]));
    return detail ? ok(detail) : missing();
  }
  if (verb === 'POST' && /^\/v1\/projects\/[^/]+\/(milestones|transition|contribution-needs|roles\/invite|contribution-offers\/[^/]+\/(decision|fulfill))$/.test(path)) return ok({ id: `demo-action-${now.getTime()}`, status: 'accepted', demo: true });
  const milestoneTransition = path.match(/^\/v1\/projects\/[^/]+\/milestones\/([^/]+)\/transition$/);
  if (verb === 'POST' && milestoneTransition) return ok({ id: decodeURIComponent(milestoneTransition[1]), status: String(input.state ?? 'ready'), demo: true });

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
  if (verb === 'PUT' && path === '/v1/me/notification-preferences') return ok({ ...notificationPreferences, ...input });
  const notificationRead = path.match(/^\/v1\/me\/notifications\/([^/]+)\/read$/);
  if (verb === 'POST' && notificationRead) {
    const notice = notifications.find((item) => item.id === decodeURIComponent(notificationRead[1]));
    return notice ? ok({ ...notice, readAt: now.toISOString() }) : missing();
  }
  if (verb === 'GET' && path === '/v1/me/contribution-offers') return ok(offers);
  const withdraw = path.match(/^\/v1\/contribution-offers\/([^/]+)\/withdraw$/);
  if (verb === 'POST' && withdraw) {
    const offer = offers.find((item) => item.id === decodeURIComponent(withdraw[1]));
    return offer ? ok({ ...offer, status: 'withdrawn', updatedAt: now.toISOString() }) : missing();
  }
  if (verb === 'GET' && path === '/v1/me/funding/pledges') return ok(pledges);
  if (verb === 'POST' && /^\/v1\/funding\/pledges\/[^/]+\/cancel$/.test(path)) return ok({ ...pledges[0], id: path.split('/')[4], status: 'cancelled' });
  if (verb === 'GET' && path === '/v1/me/privacy/consents') return ok(privacyConsents);
  if (verb === 'GET' && path === '/v1/me/privacy/requests') return ok(privacyRequests);
  if (verb === 'PUT' && /^\/v1\/me\/privacy\/consents\/[^/]+$/.test(path)) return ok({ purpose: lastSegment(path), granted: Boolean(input.granted), policyVersion: String(input.policyVersion ?? '2026-08'), updatedAt: now.toISOString() });
  if (verb === 'POST' && path === '/v1/me/privacy/requests') return ok({ id: `demo-privacy-${now.getTime()}`, type: String(input.type ?? 'access'), status: 'received', requestedAt: now.toISOString() });
  if (verb === 'GET' && path === '/v1/me/safety/reports') return ok(safetyReports);
  if (verb === 'GET' && path === '/v1/safety/review-queue') return ok(safetyReports);
  if (verb === 'POST' && path === '/v1/safety/reports') return ok({ id: `demo-safety-${now.getTime()}`, reporterId: 'offline-demo-user', ...input, status: 'received', createdAt: now.toISOString(), updatedAt: now.toISOString() });
  if (verb === 'POST' && /^\/v1\/safety\/reports\/[^/]+\/(appeal|decision)$/.test(path)) return ok({ id: path.split('/')[4], status: path.endsWith('/appeal') ? 'appealed' : String(input.decision ?? 'triage'), updatedAt: now.toISOString() });
  if (verb === 'POST' && /^\/v1\/project-role-invites\/[^/]+\/accept$/.test(path)) return ok({ projectId: 'project-water-1', role: 'volunteer_lead' });
  if (verb === 'POST' && /^\/v1\/evidence\/[^/]+\/review$/.test(path)) return ok({ id: path.split('/')[3], status: String(input.decision ?? 'available') });

  return { status: 404, body: { error: 'Offline demo route is not implemented.' } };
}

function requestBody(value: BodyInit | null | undefined) {
  if (typeof value !== 'string' || !value) return undefined;
  try { return JSON.parse(value) as unknown; } catch { return undefined; }
}

export function installDemoBackend() {
  const demoGlobal = globalThis as typeof globalThis & { __IRESPOND_DEMO_FETCH__?: boolean };
  if (!demoMode || demoGlobal.__IRESPOND_DEMO_FETCH__) return;
  demoGlobal.__IRESPOND_DEMO_FETCH__ = true;
  const realFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (!isDemoRequest(raw)) return realFetch(input, init);
    const url = new URL(raw.replace(/^http:/, 'https:'));
    const method = (init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase();
    const result = createDemoPayload(url, method, requestBody(init?.body));
    await new Promise((resolve) => setTimeout(resolve, 80));
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { 'Content-Type': 'application/json', 'X-iRespond-Demo': 'offline' },
    });
  };
}
