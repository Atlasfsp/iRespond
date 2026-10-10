import http from 'node:http';

const port = Number(process.env.DOCS_MOCK_API_PORT || 4777);
const now = '2026-08-27T12:00:00Z';
const json = (res, status, body) => {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization,content-type,idempotency-key',
    'access-control-allow-methods': 'GET,POST,PUT,OPTIONS'
  });
  res.end(JSON.stringify(body));
};

const needs = [
  {id:'water-001',title:'Community water point needs repair',category:'water_sanitation',latitude:6.5244,longitude:3.3792,verificationState:'community_confirmed',sdgTags:[6,11]},
  {id:'school-001',title:'Restore books and lighting in a school library',category:'education',latitude:6.6018,longitude:3.3515,verificationState:'verification_requested',sdgTags:[4]}
];
const project = {
  project:{id:'project-water-001',sourceNeedId:'water-001',title:'Restore Surulere Community Water Point',description:'A community-owned repair project with transparent milestones and verified outcomes.',ownerCommunityId:'community-surulere',projectManagerId:'docs-steward',status:'mobilising',sdgTags:[6,11]},
  milestones:[
    {id:'m1',title:'Verify scope and parts',description:'Confirm failure mode, parts and safe repair approach.',status:'complete',sequence:1},
    {id:'m2',title:'Repair and recommission',description:'Complete repair and test the restored water point.',status:'in_progress',sequence:2}
  ],
  contributionNeeds:[
    {id:'c1',kind:'skilled_time',description:'Qualified plumbing support',quantityNote:'Two half-days',status:'open'},
    {id:'c2',kind:'materials',description:'Replacement pump fittings and seals',quantityNote:'Approved specification only',status:'open'}
  ]
};
const funding = {projectId:'project-water-001',currency:'NGN',targetMinor:85000000,communityCounterpartMinor:25000000,externalTargetMinor:60000000,status:'open',pledgedMinor:41000000,confirmedMinor:0,updatedAt:now};
const impact = {subject:'docs-user',projectsLed:2,projectsCompleted:1,verifications:8,fulfilledContributions:6,acceptedCommitments:2,sdgs:[4,6,11],contributions:[{kind:'skilled_time',fulfilled:3,accepted:1},{kind:'materials',fulfilled:2,accepted:1}],roles:[{role:'community_steward',projects:2}],generatedAt:now};
const consents = [{purpose:'impact-research',granted:true,policyVersion:'2026-08',updatedAt:now},{purpose:'product-improvement',granted:false,policyVersion:'2026-08',updatedAt:now}];
const privacyRequests = [{id:'pr-docs-1',type:'access',status:'received',requestedAt:now}];

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/healthz') return json(res, 200, {status:'ok'});
  if (req.method === 'GET' && url.pathname === '/v1/needs') return json(res, 200, needs);
  if (req.method === 'GET' && url.pathname === '/v1/projects/project-water-001') return json(res, 200, project);
  if (req.method === 'GET' && url.pathname === '/v1/projects/project-water-001/funding') return json(res, 200, funding);
  if (req.method === 'PUT' && url.pathname === '/v1/projects/project-water-001/funding') return json(res, 200, funding);
  if (req.method === 'POST' && url.pathname === '/v1/projects/project-water-001/funding/pledges') return json(res, 201, {id:'pledge-docs-1',status:'recorded'});
  if (req.method === 'GET' && url.pathname === '/v1/me/impact-passport') return json(res, 200, impact);
  if (req.method === 'GET' && url.pathname === '/v1/me/privacy/consents') return json(res, 200, consents);
  if (req.method === 'GET' && url.pathname === '/v1/me/privacy/requests') return json(res, 200, privacyRequests);
  if (req.method === 'POST' && url.pathname === '/v1/me/privacy/requests') return json(res, 201, {id:'pr-docs-new',type:'access',status:'received',requestedAt:now});
  if (req.method === 'POST' && url.pathname === '/v1/safety/reports') return json(res, 201, {id:'safety-docs-1',status:'received'});
  return json(res, 404, {error:'documentation mock route not found'});
});
server.listen(port, '127.0.0.1', () => console.log(`iRespond documentation mock API listening on http://127.0.0.1:${port}`));
