import { readFile } from 'node:fs/promises';

const files={
 web:await readFile('apps/web/app.js','utf8'),
 webCatalog:await readFile('apps/web/stitch-catalog.js','utf8'),
 mobileCatalog:await readFile('apps/mobile/lib/stitch-screen-catalog.ts','utf8'),
 capabilities:await readFile('apps/mobile/lib/capabilities.ts','utf8'),
 verify:await readFile('apps/mobile/app/verify.tsx','utf8'),
 project:await readFile('apps/mobile/app/project/[id].tsx','utf8'),
 projectAdmin:await readFile('apps/mobile/app/project-admin.tsx','utf8'),
 projectFunding:await readFile('apps/mobile/app/project/funding.tsx','utf8'),
 evidence:await readFile('apps/mobile/app/evidence.tsx','utf8'),
 mobileSync:await readFile('apps/mobile/lib/sync.ts','utf8'),
 workspace:await readFile('apps/mobile/app/workspace.tsx','utf8'),
 safetyOps:await readFile('apps/mobile/app/safety-ops.tsx','utf8'),
 mobileApi:await readFile('apps/mobile/lib/api.ts','utf8'),
 server:await readFile('services/api/cmd/server/main.go','utf8'),
 projectRoutes:await readFile('services/api/cmd/server/project_routes.go','utf8'),
 safetyService:await readFile('services/api/internal/safety/service.go','utf8'),
 safetyMigration:await readFile('services/api/migrations/0010_platform_safety_subject.sql','utf8'),
 apiMap:await readFile('docs/frontend/frontend-api-map.json','utf8')
};
const failures=[];
const need=(where,text,why)=>{if(!files[where].includes(text))failures.push(`${where}: ${why} (${text})`)};
const forbid=(where,re,why)=>{if(re.test(files[where]))failures.push(`${where}: ${why}`)};

// Web resource authority must come from authenticated GET /projects/{id} permissions.
need('web','detail.permissions||emptyPermissions','Project Room must consume the server permission envelope');
need('web','permissions.canManageContributions','project contribution review must be permission-gated');
need('web','p.canManageMilestones','milestone creation must be permission-gated');
need('web','p.canValidateMilestones','milestone validation must be permission-gated');
need('web',"p.canValidateMilestones&&m.status==='submitted'",'web verifier controls must be limited to submitted milestone validation');
need('web',"if(p.canValidateMilestones&&m.status==='submitted')return",'submitted milestone validation must take precedence for dual-authority identities');
need('web',"if(m.status==='submitted')return''",'submitted milestones must not expose a manager-only self-transition');
need('web',"if(!p.canManageMilestones)return''",'non-managers must not receive milestone-management transitions');
need('web',"offerState==='offered'",'web contribution decisions must be limited to offered commitments');
need('web',"offerState==='accepted'",'web contribution fulfillment must be limited to accepted commitments');
need('web','p.canManageRoles','project role management must be permission-gated');
need('web','p.canManageProject','project lifecycle management must be permission-gated');
need('web','p.canManageFunding','funding-plan management must be permission-gated');
need('web','verificationButtons(need.verificationState)','web verification actions must honor the loaded need state');
need('web','Promise.all([loadFundingPlan(id),api(`/v1/projects/${encodeURIComponent(id)}`)])','funding must load project permissions even when no plan exists yet');
need('web','if(error.status===404)return null','a missing funding plan must be treated as an empty first-plan state');
for(const role of ['project_manager','community_steward','verifier','volunteer_lead','procurement_lead','maintenance_owner'])need('web',`<option>${role}</option>`,`project role selector must offer canonical role ${role}`);
forbid('web',/<option>technical_reviewer<\/option>/,'project role selector must not offer a server-invalid technical_reviewer role');
forbid('web',/managerByRecord|createdBy\s*===\s*state\.session|projectManagerId\s*===\s*state\.session/,'client record fields must not be used as project authorization');

// Mobile resource authority must preserve project context then render the same envelope.
need('project',"pathname:'/project-admin'",'Project Room must navigate into the resource-authorized control surface');
need('project','projectId:detail.project.id','Project Room must carry its concrete project ID into controls');
need('project',"{},'optional'",'public Project Room loading must attach a session token when one is available');
need('mobileApi',"authenticated: boolean | 'optional'",'the API client must expose optional authenticated loading');
need('mobileApi','authenticated === true','optional authentication must require a token only for protected requests');
need('mobileApi','if (token)','optional authentication must attach an available token');
need('projectAdmin','detail?.permissions??none','project admin must consume server permissions');
for(const reset of ["setCurrency('NGN')","setTarget('')","setCounterpart('')"])need('projectAdmin',reset,`project admin must clear stale funding input with ${reset}`);
for(const reset of ["setCurrency('NGN')","setTarget('')","setCounterpart('')"])need('projectFunding',reset,`project funding route must clear stale funding input with ${reset}`);
need('projectFunding','resetProjectFundingState();try','project funding route must reset project-scoped state before loading another project');
need('projectAdmin',"m.status==='submitted'&&perms.canValidateMilestones",'mobile verifier controls must be limited to submitted milestones');
for(const permission of ['canManageProject','canManageMilestones','canValidateMilestones','canManageRoles','canManageContributions','canPublishContributionNeeds','canManageFunding'])need('projectAdmin',permission,`project admin must honor ${permission}`);
forbid('projectAdmin',/createdBy|projectManagerId/,'mobile must not infer resource authority from record ownership fields');
need('mobileSync','syncedKeys:string[]','sync results must identify the individual queue items completed');
need('evidence','result.syncedKeys.includes(queued.idempotencyKey)','evidence submission feedback must use the current queue item result');
forbid('evidence',/result\.synced\s*>\s*0/,'evidence submission must not claim current success from aggregate queue progress');

// Resource-only Stitch screens cannot be advertised to every authenticated identity.
need('mobileCatalog',"role !== 'resource-authorized'",'mobile catalog must exclude resource-authorized from global session roles');
need('webCatalog',"role!=='resource-authorized'",'web catalog must exclude resource-authorized from global session roles');
need('webCatalog','Open this capability from a concrete Project Room','web catalog must route resource authority through Project Room');

// Global privileged domains remain centralized in the role/capability boundary.
for(const role of ['community_verifier','institution_verifier','expert_verifier','impact_auditor','government_verifier','evidence_reviewer','safety_reviewer','trust_safety_admin'])need('capabilities',role,`global capability map must preserve ${role}`);
for(const capability of ['verification.community','verification.institution','verification.expert','verification.audit','verification.government','evidence.review','project.convert','milestone.validate','safety.review'])need('capabilities',capability,`global capability map must preserve ${capability}`);
need('capabilities','verificationTransitionAllowed','mobile verification actions must share the server transition graph');
need('verify','verificationTransitionsForRoles(session?.roles ?? [], need?.verificationState)','mobile verification actions must honor the loaded need state');
if(!/impact_auditor:\s*\[[^\]]*'milestone\.validate'/.test(files.capabilities))failures.push('capabilities: impact_auditor must receive milestone validation');
need('projectRoutes','p.HasRole("impact_auditor")','server milestone validation must recognize the canonical impact_auditor role');
forbid('projectRoutes',/p\.HasRole\("auditor"\)/,'server milestone validation must not depend on the non-canonical auditor role');
need('safetyOps',"hasCapability(session.roles,'safety.review')",'safety operations must require safety-review capability');
need('safetyService','"platform":true','generic platform safety reports must be accepted by the domain service');
need('safetyMigration',"'platform'",'database safety subject constraint must accept generic platform reports');
need('workspace',"caps.has('safety.review')",'workspace must hide safety operations without reviewer authority');
need('workspace',"v.startsWith('verification.')",'workspace must expose verification only through derived capabilities');
if(!/has\('evidence\.review'\)\?`(?:(?!`:\x27\x27}).)*Approved evidence access(?:(?!`:\x27\x27}).)*`:\x27\x27}/s.test(files.web))failures.push('web: evidence access must be inside the evidence-review capability branch');
if((files.server.match(/auth\.CanReviewEvidence\(principal\)/g)||[]).length<2)failures.push('server: evidence review and signed access routes must share the reviewer authorization policy');

// Service-to-service ingress is deliberately absent from untrusted clients.
forbid('web',/\/v1\/internal\/notifications/,'internal notification ingress must not be callable by the web client');
forbid('projectAdmin',/\/v1\/internal\/notifications/,'internal notification ingress must not be callable by mobile project controls');
need('apiMap','createInternalNotification','API map must document the internal-only exclusion');
need('apiMap','MUST NOT be exposed to untrusted frontends','internal-only exclusion must remain explicit');

if(failures.length){console.error('Frontend authorization contract FAILED');for(const failure of failures)console.error(`- ${failure}`);process.exit(1)}
console.log('Frontend authorization contract verified: global roles, project permission envelopes, and internal API boundaries remain distinct.');
