const DEMO_API = 'https://demo.irespond.local';

export const demoMode = process.env.EXPO_PUBLIC_DEMO_MODE === '1';

const needs = [
  { id: 'need-water-1', title: 'Restore safe water point', category: 'water', latitude: 6.5244, longitude: 3.3792, verificationState: 'community_confirmed', sdgTags: [6, 11] },
  { id: 'need-health-1', title: 'Community maternal health outreach', category: 'health', latitude: 6.5321, longitude: 3.3678, verificationState: 'institution_confirmed', sdgTags: [3, 5] },
  { id: 'need-school-1', title: 'Repair classrooms and learning kits', category: 'education', latitude: 6.5108, longitude: 3.4012, verificationState: 'verification_requested', sdgTags: [4, 10] },
  { id: 'need-clean-1', title: 'Drainage and neighbourhood clean-up', category: 'environment', latitude: 6.5419, longitude: 3.3894, verificationState: 'community_confirmed', sdgTags: [11, 13] },
];

const projects = [
  { id: 'project-water-1', title: 'Safe Water for 2,500 Residents', status: 'active', category: 'water', targetAmount: 18000000, fundedAmount: 12600000, currency: 'NGN', sdgTags: [6, 11], location: 'Lagos Mainland' },
  { id: 'project-skills-1', title: 'Youth Skills & Enterprise Lab', status: 'active', category: 'livelihood', targetAmount: 12000000, fundedAmount: 8400000, currency: 'NGN', sdgTags: [4, 8], location: 'Surulere' },
  { id: 'project-health-1', title: 'Mobile Community Health Days', status: 'active', category: 'health', targetAmount: 9000000, fundedAmount: 6750000, currency: 'NGN', sdgTags: [3, 5], location: 'Yaba' },
];

const notifications = [
  { id: 'n1', title: 'Need verified', body: 'The safe water need you followed has been community verified.', read: false, createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(), type: 'verification' },
  { id: 'n2', title: 'Project milestone reached', body: 'Youth Skills & Enterprise Lab has reached 70% of its funding target.', read: false, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), type: 'project' },
  { id: 'n3', title: 'Volunteer check-in recorded', body: 'Your demo attendance for Community Action Day has been recorded.', read: true, createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), type: 'attendance' },
];

const contributions = [
  { id: 'c1', projectId: 'project-water-1', projectTitle: 'Safe Water for 2,500 Residents', amount: 25000, currency: 'NGN', status: 'completed', createdAt: '2026-08-18T10:30:00Z' },
  { id: 'c2', projectId: 'project-skills-1', projectTitle: 'Youth Skills & Enterprise Lab', amount: 50000, currency: 'NGN', status: 'completed', createdAt: '2026-08-09T15:00:00Z' },
];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function oneById<T extends { id: string }>(items: T[], path: string) {
  const id = decodeURIComponent(path.split('/').filter(Boolean).at(-1) ?? '');
  return items.find((item) => item.id === id);
}

export function installDemoBackend() {
  if (!demoMode || (globalThis as any).__IRESPOND_DEMO_FETCH__) return;
  (globalThis as any).__IRESPOND_DEMO_FETCH__ = true;

  const realFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (!raw.startsWith(DEMO_API) && !raw.startsWith('http://demo.irespond.local')) return realFetch(input as any, init);

    const url = new URL(raw.replace('http://demo.irespond.local', DEMO_API));
    const path = url.pathname;
    const method = (init?.method ?? 'GET').toUpperCase();

    await new Promise((resolve) => setTimeout(resolve, 120));

    if (method !== 'GET') {
      return json({ id: `demo-${Date.now()}`, status: 'accepted', ok: true, demo: true }, 200);
    }

    if (path === '/v1/needs') return json(needs);
    if (/^\/v1\/needs\/[^/]+$/.test(path)) return json(oneById(needs, path) ?? needs[0]);
    if (path === '/v1/projects') return json(projects);
    if (/^\/v1\/projects\/[^/]+$/.test(path)) return json(oneById(projects, path) ?? projects[0]);
    if (path.includes('/notifications')) return json(notifications);
    if (path.includes('/contributions')) return json(contributions);
    if (path.includes('/pledges')) return json([{ id: 'p1', projectId: 'project-health-1', amount: 30000, currency: 'NGN', status: 'active' }]);
    if (path.includes('/impact')) return json({ peopleReached: 12840, verifiedNeeds: 143, activeProjects: 28, volunteerHours: 9320, fundsMobilised: 48600000, sdgs: [3, 4, 6, 8, 11, 13] });
    if (path.includes('/evidence')) return json([{ id: 'e1', type: 'photo', status: 'verified', caption: 'Community verification evidence', createdAt: '2026-08-20T09:00:00Z' }]);
    if (path.includes('/privacy')) return json({ spatialVisibility: true, discoveryEnabled: true, attendanceSharing: true });
    if (path.includes('/profile') || path.endsWith('/me')) return json({ id: 'demo-user', displayName: 'Demo Citizen', role: 'community_member', city: 'Lagos', country: 'Nigeria', verified: true });

    return json([]);
  };
}
