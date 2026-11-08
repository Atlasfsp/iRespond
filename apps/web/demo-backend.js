const demoSession=Object.freeze({subject:'offline-demo-user',roles:['community_verifier','impact_auditor','evidence_reviewer','safety_reviewer']});
const permissions=Object.freeze({canManageProject:true,canManageMilestones:true,canValidateMilestones:true,canManageRoles:true,canManageContributions:true,canPublishContributionNeeds:true,canManageFunding:true});

export function createWebDemoBackend(){
 const needs=[
  {id:'need-water-1',title:'Restore safe water point',description:'A public borehole requires a verified repair and water-quality check.',category:'water',latitude:6.5244,longitude:3.3792,verificationState:'community_confirmed',sdgTags:[6,11]},
  {id:'need-health-1',title:'Community maternal health outreach',description:'Residents requested a mobile antenatal and health-information day.',category:'health',latitude:6.5321,longitude:3.3678,verificationState:'institution_confirmed',sdgTags:[3,5]},
  {id:'need-school-1',title:'Repair classrooms and learning kits',description:'Two classrooms need roof repairs and replacement learning materials.',category:'education',latitude:6.5108,longitude:3.4012,verificationState:'verification_requested',sdgTags:[4,10]}
 ];
 const projects=[{id:'project-water-1',sourceNeedId:'need-water-1',title:'Safe Water for 2,500 Residents',description:'Repair, test and establish a community maintenance plan for the water point.',status:'executing',sdgTags:[6,11]}];
 const milestones=[{id:'milestone-assessment',title:'Technical assessment',description:'Confirm scope and safety controls.',status:'validated',sequence:1},{id:'milestone-repair',title:'Repair and water testing',description:'Complete repair and independent quality test.',status:'ready',sequence:2}];
 const contributionNeeds=[{id:'contribution-testing',kind:'material',description:'Water-quality test kits',quantityNote:'Ten complete kits',status:'open'}];
 const milestonesByProject=new Map([['project-water-1',milestones]]);
 const contributionNeedsByProject=new Map([['project-water-1',contributionNeeds]]);
 const projectRolesByProject=new Map([['project-water-1',new Set(['project_manager'])]]);
 const roleInvites=new Map([['invite-1',{id:'invite-1',projectId:'project-water-1',invitedActorId:'offline-demo-user',role:'volunteer_lead',status:'pending'}]]);
 const offers=[{id:'offer-1',projectId:'project-water-1',contributionNeedId:'contribution-testing',kind:'material',note:'I can provide test kits.',availabilityNote:'This week',status:'accepted'}];
 const pledges=[{id:'pledge-1',projectId:'project-water-1',contributorId:'offline-demo-user',amountMinor:2500000,currency:'NGN',status:'pledged'}];
 const fundingPlans=new Map([['project-water-1',{projectId:'project-water-1',currency:'NGN',targetMinor:1800000000,communityCounterpartMinor:200000000,externalTargetMinor:1600000000,status:'open',pledgedMinor:1260000000,confirmedMinor:0}]]);
 const notifications=[{id:'notice-1',title:'Need verified',body:'The safe-water observation was community confirmed.',readAt:null}];
 const preferences={inApp:true,push:true,sms:false,email:true};
 const consents=[{purpose:'impact-research',granted:false,policyVersion:'2026-08'},{purpose:'product-improvement',granted:true,policyVersion:'2026-08'}];
 const privacyRequests=[{id:'privacy-1',type:'export',status:'received'}];
 const safetyReports=[{id:'safety-1',reason:'safeguarding',details:'Offline demonstration of the confidential follow-up workflow.',status:'triage'}];
 const challenges=[{
  id:'challenge-gauteng-demo-2027',
  demoOnly:true,
  tenantId:'demo-institution-gauteng',
  slug:'community-innovation-challenge-2027-demo',
  title:'Community Innovation Challenge 2027 (OFFLINE DEMO)',
  description:'Identify community problems, propose responsible solutions, mobilise resources and show independently verified results.',
  mission:'Identify community problems, propose responsible solutions, mobilise resources and show independently verified results.',
  jurisdictionCode:'ZA-GP',
  locale:'en-ZA',
  timezone:'Africa/Johannesburg',
  currencyCode:'ZAR',
  visibility:'public',
  status:'registration_open',
  currentRulesVersion:1,
  rulesSha256:'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  ruleApprovalCount:2,
  fundingStatus:'unconfirmed',
  sponsorStatus:'not_confirmed',
  guardianConsentRule:'required_per_jurisdiction_and_policy',
  publicResultPolicy:'opt_in_redacted',
  tracks:[
   {id:'track-secondary',programId:'challenge-gauteng-demo-2027',title:'Secondary School Teams',levelCode:'secondary',participationMode:'team',minimumTeamMembers:2,maximumTeamMembers:5,requiresGuardianConsent:true},
   {id:'track-tertiary',programId:'challenge-gauteng-demo-2027',title:'Tertiary & Youth Innovators',levelCode:'tertiary',participationMode:'both',minimumTeamMembers:1,maximumTeamMembers:5,requiresGuardianConsent:false}
  ],
  rounds:[
   {id:'round-proposal-1',programId:'challenge-gauteng-demo-2027',sequence:1,title:'Round 1: Problem and solution proposal',kind:'proposal',status:'open',opensAt:'2027-04-05T09:00:00+02:00',closesAt:'2027-04-20T17:00:00+02:00',requiredJudges:3,scoringAlgorithm:'weighted_median_v1',rubricVersion:1,criteria:[
    {id:'crit-problem',roundId:'round-proposal-1',rubricVersion:1,sequence:1,code:'problem',title:'Clarity of the problem',weightBasisPoints:2000,maximumScore:100},
    {id:'crit-feasibility',roundId:'round-proposal-1',rubricVersion:1,sequence:2,code:'feasibility',title:'Solution feasibility',weightBasisPoints:2500,maximumScore:100},
    {id:'crit-participation',roundId:'round-proposal-1',rubricVersion:1,sequence:3,code:'participation',title:'Community participation',weightBasisPoints:2000,maximumScore:100},
    {id:'crit-evidence',roundId:'round-proposal-1',rubricVersion:1,sequence:4,code:'evidence',title:'Verifiable progress and outcomes',weightBasisPoints:2500,maximumScore:100},
    {id:'crit-sustainability',roundId:'round-proposal-1',rubricVersion:1,sequence:5,code:'sustainability',title:'Maintenance and replication',weightBasisPoints:1000,maximumScore:100}
   ]}
  ],
  prizes:[{id:'prize-demo-1',programId:'challenge-gauteng-demo-2027',title:'Illustrative R5,000 implementation grant — NOT funded or approved',prizeKind:'project_grant',currencyCode:'ZAR',amountMinor:500000,status:'announced',fundingStatus:'unconfirmed'}],
  sponsors:[],
  publishedResults:[],
  awards:[],
  appeals:[],
  permissions:{canManageProgramme:true,canApproveRules:true,canReviewEligibility:true,canAssignJudges:true,canJudge:true,canReviewConflicts:true,canReviewAppeals:true,canManageSponsors:true,canManageAwards:true}
 }];
 const challengeEntries=[{id:'entry-demo-1',programId:'challenge-gauteng-demo-2027',trackId:'track-secondary',leadActorId:'offline-demo-user',entryCode:'IRC-DEMO01',teamDisplayName:'Soweto Water Stewards (Demo)',participationMode:'team',status:'screening',eligibilityStatus:'pending',guardianConsentStatus:'required',agreedRulesVersion:1,teamMembers:[{entryId:'entry-demo-1',actorId:'offline-demo-user',memberRole:'lead',invitationState:'accepted',guardianConsentStatus:'required'}]}];
 const challengeAssignments=[{id:'asg-demo-1',programId:'challenge-gauteng-demo-2027',submissionId:'sub-demo-1',entryId:'entry-demo-1',roundId:'round-proposal-1',judgeActorId:'offline-demo-user',assignmentStatus:'accepted',conflictStatus:'no_conflict_declared'}];

 function error(status,message){throw Object.assign(new Error(message),{status,body:{error:message}})}
 function body(init){try{return init?.body?JSON.parse(init.body):{}}catch{return{}}}
 function id(prefix){return`${prefix}-${Date.now()}-${crypto.randomUUID().slice(0,8)}`}
 function isVerified(state){return['community_confirmed','institution_confirmed','expert_confirmed','independently_audited','government_confirmed'].includes(state)}
 function validProjectRole(role){return['project_manager','community_steward','verifier','volunteer_lead','procurement_lead','maintenance_owner'].includes(role)}
 function allowedProjectTransition(from,to){if(to==='cancelled'&&!['completed','cancelled'].includes(from))return true;return({draft:'approved',approved:'mobilising',mobilising:'executing',executing:'validating',validating:'maintaining',maintaining:'completed'})[from]===to}
 function projectReadiness(projectId,target){const projectMilestones=milestonesByProject.get(projectId)||[],roles=projectRolesByProject.get(projectId)||new Set();if(target==='approved'&&!roles.has('project_manager'))return'project manager must accept role before approval';if(target==='approved'&&!projectMilestones.some(item=>item.status!=='cancelled'))return'at least one milestone is required before approval';if(target==='validating'&&projectMilestones.some(item=>!['submitted','validated','cancelled'].includes(item.status)))return'all active milestones must be submitted before validation';if(target==='maintaining'&&projectMilestones.some(item=>!['validated','cancelled'].includes(item.status)))return'all active milestones must be validated before maintenance';if(target==='completed'&&!roles.has('maintenance_owner'))return'maintenance owner is required before completion';return null}
 function allowedMilestoneTransition(from,to){if(to==='cancelled'&&!['validated','cancelled'].includes(from))return true;if(from==='planned')return to==='ready';if(from==='ready')return to==='in_progress';if(from==='in_progress')return['blocked','submitted'].includes(to);if(from==='blocked')return to==='in_progress';if(from==='submitted')return to==='validated';return false}
 function projectDetail(project){return{project,milestones:milestonesByProject.get(project.id)||[],contributionNeeds:contributionNeedsByProject.get(project.id)||[],permissions,viewerRoles:Array.from(projectRolesByProject.get(project.id)||[])}}

 return Object.freeze({session:demoSession,installUploadFetch(){const marker='__IRESPOND_WEB_DEMO_FETCH__';if(window[marker])return;window[marker]=true;const realFetch=window.fetch.bind(window);window.fetch=async(input,init)=>{const raw=typeof input==='string'?input:input instanceof URL?input.toString():input.url;try{const url=new URL(raw);if(url.hostname==='demo.irespond.local'&&url.pathname.startsWith('/v1/demo-uploads/'))return new Response(JSON.stringify({stored:true,demo:true}),{status:200,headers:{'Content-Type':'application/json'}})}catch{}return realFetch(input,init)}},async request(rawPath,init={}){
  const url=new URL(rawPath,'https://demo.irespond.local'),path=url.pathname.replace(/\/$/,'')||'/',method=String(init.method||'GET').toUpperCase(),input=body(init);
  if(method==='GET'&&path==='/v1/platform')return{name:'iRespond browser demo',lifecycle:['see','report','verify','diagnose','project','mobilise','execute','measure','maintain','replicate'],demo:true};
  if(method==='GET'&&path==='/v1/session')return demoSession;
  if(path==='/v1/needs'&&method==='GET')return needs;
  if(path==='/v1/needs'&&method==='POST'){const created={id:id('demo-need'),title:String(input.title||'Demo observation'),description:String(input.description||''),category:String(input.category||'community'),categoryDetail:String(input.categoryDetail||''),latitude:Number(input.latitude),longitude:Number(input.longitude),verificationState:'observed',sdgTags:Array.isArray(input.sdgTags)?input.sdgTags.map(Number):[]};needs.push(created);return created}
  let match=path.match(/^\/v1\/needs\/([^/]+)$/);if(match&&method==='GET'){const found=needs.find(item=>item.id===decodeURIComponent(match[1]));if(!found)error(404,'Need was not found.');return found}
  match=path.match(/^\/v1\/needs\/([^/]+)\/verification$/);if(match&&method==='POST'){const found=needs.find(item=>item.id===decodeURIComponent(match[1]));if(!found)error(404,'Need was not found.');found.verificationState=String(input.state||found.verificationState);return found}
  match=path.match(/^\/v1\/needs\/([^/]+)\/project$/);if(match){const needId=decodeURIComponent(match[1]),need=needs.find(item=>item.id===needId),existing=projects.find(item=>item.sourceNeedId===needId);if(method==='GET'){if(!existing)error(404,'No Action Project is linked to this need.');return existing}if(method==='POST'){if(!need)error(404,'Need was not found.');if(existing)error(409,'This need already has an Action Project.');if(!isVerified(need.verificationState))error(409,'need must be verified before project conversion');const project={id:id('demo-project'),sourceNeedId:needId,title:String(input.title||'Demo Action Project'),description:String(input.description||''),status:'draft',sdgTags:[...(need.sdgTags||[])]};projects.push(project);milestonesByProject.set(project.id,[]);contributionNeedsByProject.set(project.id,[]);projectRolesByProject.set(project.id,new Set());return project}}
  if(method==='POST'&&/^\/v1\/needs\/[^/]+\/evidence\/uploads$/.test(path)){const evidenceId=id('demo-evidence');return{evidenceId,uploadUrl:`https://demo.irespond.local/v1/demo-uploads/${evidenceId}`,method:'PUT',headers:{'X-iRespond-Demo-Upload':'offline'}}}
  if(method==='POST'&&/^\/v1\/needs\/[^/]+\/evidence\/[^/]+\/complete$/.test(path))return{status:'pending_review'};
  if(method==='GET'&&/^\/v1\/needs\/[^/]+\/evidence\/[^/]+\/access$/.test(path))error(404,'Approved evidence bytes are not bundled with this demo.');
  if(method==='POST'&&/^\/v1\/evidence\/[^/]+\/review$/.test(path))return{status:String(input.decision||'available')};
  match=path.match(/^\/v1\/projects\/([^/]+)$/);if(match&&method==='GET'){const project=projects.find(item=>item.id===decodeURIComponent(match[1]));if(!project)error(404,'Project was not found.');return projectDetail(project)}
  if(path==='/v1/me/contribution-offers'&&method==='GET')return offers;
  match=path.match(/^\/v1\/projects\/([^/]+)\/contribution-offers$/);if(match&&method==='GET')return offers.filter(item=>item.projectId===decodeURIComponent(match[1]));
  match=path.match(/^\/v1\/projects\/([^/]+)\/contribution-needs\/([^/]+)\/offers$/);if(match&&method==='POST'){const projectId=decodeURIComponent(match[1]),contributionNeedId=decodeURIComponent(match[2]),need=(contributionNeedsByProject.get(projectId)||[]).find(item=>item.id===contributionNeedId);if(!need)error(404,'Contribution need was not found.');const offer={id:id('demo-offer'),projectId,contributionNeedId,contributorId:'offline-demo-user',kind:need.kind,note:String(input.note||''),availabilityNote:String(input.availabilityNote||''),status:'offered'};offers.push(offer);return offer}
  match=path.match(/^\/v1\/contribution-offers\/([^/]+)\/withdraw$/);if(match&&method==='POST'){const offer=offers.find(item=>item.id===decodeURIComponent(match[1])&&item.status==='offered');if(!offer)error(409,'only offered contributions may be withdrawn');offer.status='withdrawn';return offer}
  match=path.match(/^\/v1\/projects\/([^/]+)\/contribution-offers\/([^/]+)\/(decision|fulfill)$/);if(match&&method==='POST'){const projectId=decodeURIComponent(match[1]),offerId=decodeURIComponent(match[2]),action=match[3],offer=offers.find(item=>item.id===offerId&&item.projectId===projectId);if(action==='fulfill'){if(!offer||offer.status!=='accepted')error(404,'accepted contribution offer not found');offer.status='fulfilled';return offer}if(!offer||offer.status!=='offered')error(409,'only offered contributions may be accepted or declined');const decision=String(input.decision||'accepted');if(!['accepted','declined'].includes(decision))error(400,'decision must be accepted or declined');offer.status=decision;return offer}
  match=path.match(/^\/v1\/project-role-invites\/([^/]+)\/accept$/);if(match&&method==='POST'){const invite=roleInvites.get(decodeURIComponent(match[1]));if(!invite||invite.invitedActorId!==demoSession.subject||invite.status!=='pending')error(404,'pending invite not found for this identity');invite.status='accepted';const roles=projectRolesByProject.get(invite.projectId)||new Set();roles.add(invite.role);projectRolesByProject.set(invite.projectId,roles);return invite}
  match=path.match(/^\/v1\/projects\/([^/]+)\/milestones$/);if(match&&method==='POST'){const projectId=decodeURIComponent(match[1]),projectMilestones=milestonesByProject.get(projectId);if(!projectMilestones)error(404,'Project was not found.');const milestone={id:id('demo-milestone'),title:String(input.title||'Demo milestone'),description:String(input.description||''),sequence:Number(input.sequence||projectMilestones.length+1),status:'planned'};projectMilestones.push(milestone);return milestone}
  match=path.match(/^\/v1\/projects\/([^/]+)\/milestones\/([^/]+)\/transition$/);if(match&&method==='POST'){const projectMilestones=milestonesByProject.get(decodeURIComponent(match[1]))||[],milestone=projectMilestones.find(item=>item.id===decodeURIComponent(match[2]));if(!milestone)error(404,'Milestone was not found.');const target=String(input.state||'');if(!allowedMilestoneTransition(milestone.status,target))error(409,'invalid milestone transition');milestone.status=target;return milestone}
  match=path.match(/^\/v1\/projects\/([^/]+)\/contribution-needs$/);if(match&&method==='POST'){const projectId=decodeURIComponent(match[1]),projectContributionNeeds=contributionNeedsByProject.get(projectId);if(!projectContributionNeeds)error(404,'Project was not found.');const item={id:id('demo-contribution'),kind:String(input.kind||'time'),description:String(input.description||''),quantityNote:String(input.quantityNote||''),status:'open'};projectContributionNeeds.push(item);return item}
  match=path.match(/^\/v1\/projects\/([^/]+)\/roles\/invite$/);if(match&&method==='POST'){const projectId=decodeURIComponent(match[1]),invitedActorId=String(input.actorId||'').trim(),role=String(input.role||'').trim();if(!projects.some(item=>item.id===projectId))error(404,'Project was not found.');if(!invitedActorId||!role)error(400,'actorId and role are required');if(!validProjectRole(role))error(400,'unsupported project role');const invite={id:id('demo-invite'),projectId,invitedActorId,role,status:'pending'};roleInvites.set(invite.id,invite);return invite}
  match=path.match(/^\/v1\/projects\/([^/]+)\/transition$/);if(match&&method==='POST'){const project=projects.find(item=>item.id===decodeURIComponent(match[1]));if(!project)error(404,'Project was not found.');const target=String(input.state||'');if(!allowedProjectTransition(project.status,target))error(409,'invalid project transition');const readiness=projectReadiness(project.id,target);if(readiness)error(409,readiness);project.status=target;return project}
  if(path==='/v1/me/funding/pledges'&&method==='GET')return pledges;
  match=path.match(/^\/v1\/funding\/pledges\/([^/]+)\/cancel$/);if(match&&method==='POST'){const pledge=pledges.find(item=>item.id===decodeURIComponent(match[1]));if(!pledge)error(404,'Pledge was not found.');pledge.status='cancelled';return pledge}
  match=path.match(/^\/v1\/projects\/([^/]+)\/funding\/pledges$/);if(match&&method==='GET')return pledges.filter(item=>item.projectId===decodeURIComponent(match[1]));
  if(match&&method==='POST'){const projectId=decodeURIComponent(match[1]),funding=fundingPlans.get(projectId);if(!funding)error(404,'Funding plan was not found.');const pledge={id:id('demo-pledge'),projectId,contributorId:'offline-demo-user',amountMinor:Number(input.amountMinor||0),currency:funding.currency,status:'pledged'};pledges.push(pledge);funding.pledgedMinor+=pledge.amountMinor;return pledge}
  match=path.match(/^\/v1\/projects\/([^/]+)\/funding$/);if(match&&method==='GET'){const funding=fundingPlans.get(decodeURIComponent(match[1]));if(!funding)error(404,'Funding plan was not found.');return funding}
  if(match&&method==='PUT'){const projectId=decodeURIComponent(match[1]),current=fundingPlans.get(projectId),funding={...(current||{}),...input,projectId};fundingPlans.set(projectId,funding);return funding}
  if(path==='/v1/me/impact-passport'&&method==='GET')return{subject:'offline-demo-user',projectsLed:1,projectsCompleted:0,verifications:3,fulfilledContributions:2,sdgs:[3,4,5,6,10,11]};
  if(path==='/v1/me/notifications'&&method==='GET')return notifications;
  match=path.match(/^\/v1\/me\/notifications\/([^/]+)\/read$/);if(match&&method==='POST'){const notice=notifications.find(item=>item.id===decodeURIComponent(match[1]));if(!notice)error(404,'Notification was not found.');notice.readAt=new Date().toISOString();return notice}
  if(path==='/v1/me/notification-preferences'&&method==='GET')return preferences;
  if(path==='/v1/me/notification-preferences'&&method==='PUT'){Object.assign(preferences,input);return preferences}
  if(path==='/v1/me/privacy/consents'&&method==='GET')return consents;
  match=path.match(/^\/v1\/me\/privacy\/consents\/([^/]+)$/);if(match&&method==='PUT'){const purpose=decodeURIComponent(match[1]),record=consents.find(item=>item.purpose===purpose)||{purpose,granted:false,policyVersion:'2026-08'};Object.assign(record,input);if(!consents.includes(record))consents.push(record);return record}
  if(path==='/v1/me/privacy/requests'&&method==='GET')return privacyRequests;
  if(path==='/v1/me/privacy/requests'&&method==='POST'){const request={id:id('demo-privacy'),type:String(input.type||'access'),status:'received'};privacyRequests.push(request);return request}
  if(path==='/v1/me/safety/reports'&&method==='GET')return safetyReports;
  if(path==='/v1/safety/review-queue'&&method==='GET')return safetyReports;
  if(path==='/v1/safety/reports'&&method==='POST'){const report={id:id('demo-safety'),reason:String(input.reason||'other'),details:String(input.details||''),status:'received'};safetyReports.push(report);return report}
  match=path.match(/^\/v1\/safety\/reports\/([^/]+)\/(appeal|decision)$/);if(match&&method==='POST'){const report=safetyReports.find(item=>item.id===decodeURIComponent(match[1]));if(!report)error(404,'Safety report was not found.');report.status=match[2]==='appeal'?'appealed':String(input.decision||'triage');return report}
  if(path==='/v1/challenges'&&method==='GET')return{items:challenges,demo:true};
  if(path==='/v1/challenges'&&method==='POST'){const created={...challenges[0],id:id('demo-challenge'),title:String(input.title||'Demo Challenge'),description:String(input.description||''),mission:String(input.mission||''),status:'draft',currentRulesVersion:0,ruleApprovalCount:0,fundingStatus:'unconfirmed'};challenges.unshift(created);return created}
  match=path.match(/^\/v1\/challenges\/([^/]+)$/);if(match&&method==='GET'){const c=challenges.find(item=>item.id===decodeURIComponent(match[1]))||challenges[0];return c}
  match=path.match(/^\/v1\/challenges\/([^/]+)\/rule-approvals$/);if(match&&method==='POST'){const c=challenges.find(item=>item.id===decodeURIComponent(match[1]))||challenges[0];c.ruleApprovalCount=(c.ruleApprovalCount||0)+1;if(c.status==='draft')c.status='review';return c}
  match=path.match(/^\/v1\/challenges\/([^/]+)\/publish$/);if(match&&method==='POST'){const c=challenges.find(item=>item.id===decodeURIComponent(match[1]))||challenges[0];c.currentRulesVersion=(c.currentRulesVersion||0)+1;c.status='registration_open';return c}
  match=path.match(/^\/v1\/challenges\/([^/]+)\/entries$/);if(match&&method==='POST'){const entry={id:id('demo-entry'),programId:decodeURIComponent(match[1]),trackId:String(input.trackId||'track-secondary'),leadActorId:'offline-demo-user',entryCode:'IRC-DEMO',teamDisplayName:String(input.teamDisplayName||'Demo Team'),participationMode:String(input.participationMode||'team'),status:'screening',eligibilityStatus:'pending',guardianConsentStatus:input.requiresGuardianConsent===false?'not_applicable':'required',agreedRulesVersion:1,teamMembers:[{actorId:'offline-demo-user',memberRole:'lead',invitationState:'accepted'}]};challengeEntries.unshift(entry);return entry}
  if(path==='/v1/me/challenge-entries'&&method==='GET')return challengeEntries;
  match=path.match(/^\/v1\/challenges\/([^/]+)\/entries\/([^/]+)\/team-members$/);if(match&&method==='POST'){const entry=challengeEntries.find(item=>item.id===decodeURIComponent(match[2]))||challengeEntries[0];if(input.actorId)entry.teamMembers.push({actorId:String(input.actorId),memberRole:String(input.role||'member'),invitationState:'invited'});return entry}
  match=path.match(/^\/v1\/challenges\/([^/]+)\/entries\/([^/]+)\/guardian-consents$/);if(match&&method==='POST'){const entry=challengeEntries.find(item=>item.id===decodeURIComponent(match[2]))||challengeEntries[0];entry.guardianConsentStatus=String(input.status||'verified');if(entry.guardianConsentStatus==='verified'&&entry.status==='screening')entry.status='applied';return entry}
  match=path.match(/^\/v1\/challenges\/([^/]+)\/entries\/([^/]+)\/eligibility-decisions$/);if(match&&method==='POST'){const entry=challengeEntries.find(item=>item.id===decodeURIComponent(match[2]))||challengeEntries[0];entry.eligibilityStatus=String(input.decision||'eligible');entry.status=entry.eligibilityStatus;return entry}
  match=path.match(/^\/v1\/challenges\/([^/]+)\/entries\/([^/]+)\/submissions$/);if(match&&method==='POST')return{id:id('demo-sub'),programId:decodeURIComponent(match[1]),entryId:decodeURIComponent(match[2]),roundId:String(input.roundId||'round-proposal-1'),status:'submitted',problemStatement:String(input.problemStatement||''),solutionProposal:String(input.solutionProposal||''),submissionSha256:'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'};
  match=path.match(/^\/v1\/challenges\/([^/]+)\/judge-assignments$/);if(match&&method==='POST'){const asg={id:id('demo-asg'),programId:decodeURIComponent(match[1]),submissionId:String(input.submissionId||'sub-demo-1'),judgeActorId:String(input.judgeActorId||'offline-demo-user'),assignmentStatus:'accepted',conflictStatus:'undisclosed'};challengeAssignments.unshift(asg);return asg}
  if(path==='/v1/me/challenge-judge-assignments'&&method==='GET')return challengeAssignments;
  match=path.match(/^\/v1\/challenges\/([^/]+)\/judge-assignments\/([^/]+)\/conflict$/);if(match&&method==='POST'){const asg=challengeAssignments.find(item=>item.id===decodeURIComponent(match[2]))||challengeAssignments[0];asg.conflictStatus=String(input.status||'no_conflict_declared');return asg}
  match=path.match(/^\/v1\/challenges\/([^/]+)\/judge-assignments\/([^/]+)\/scorecards$/);if(match&&method==='POST')return{id:id('demo-scorecard'),assignmentId:decodeURIComponent(match[2]),status:'sealed',totalBasisPoints:8500};
  match=path.match(/^\/v1\/challenges\/([^/]+)\/rounds\/([^/]+)\/decisions$/);if(match&&method==='POST'){const dec={id:id('demo-decision'),programId:decodeURIComponent(match[1]),roundId:decodeURIComponent(match[2]),entryId:String(input.entryId||'entry-demo-1'),decision:String(input.decision||'finalist'),state:String(input.action||'approve')==='publish'?'published':'approved',scoreBasisPoints:8500,rank:1};challenges[0].publishedResults.push(dec);return dec}
  match=path.match(/^\/v1\/challenges\/([^/]+)\/appeals$/);if(match&&method==='POST'){const ap={id:id('demo-appeal'),programId:decodeURIComponent(match[1]),entryId:String(input.entryId||'entry-demo-1'),status:input.action==='resolve'?String(input.status||'denied'):'submitted',reason:String(input.reason||'')};challenges[0].appeals.push(ap);return ap}
  match=path.match(/^\/v1\/challenges\/([^/]+)\/sponsors$/);if(match&&method==='POST'){const sp={id:id('demo-sponsor'),programId:decodeURIComponent(match[1]),sponsorDisplayName:String(input.sponsorDisplayName||'Demo Sponsor'),commitmentKind:String(input.commitmentKind||'cash'),status:String(input.status||'pledged'),truthNotice:'Sponsor pledge is intent only, not settled funds.'};challenges[0].sponsors.push(sp);return sp}
  match=path.match(/^\/v1\/challenges\/([^/]+)\/awards$/);if(match&&method==='POST'){const aw={id:id('demo-award'),programId:decodeURIComponent(match[1]),entryId:String(input.entryId||'entry-demo-1'),prizeId:String(input.prizeId||'prize-demo-1'),status:'approved',fulfillmentStatus:'pending',truthStateLabel:'Award approved — NOT yet fulfilled or paid'};challenges[0].awards.push(aw);return aw}
  match=path.match(/^\/v1\/challenges\/([^/]+)\/awards\/([^/]+)\/fulfillments$/);if(match&&method==='POST')return{id:id('demo-fulfillment'),awardId:decodeURIComponent(match[2]),fulfillmentKind:String(input.fulfillmentKind||'in_kind_delivery'),status:String(input.status||'pending'),truthNotice:'Prize fulfilment requires verified delivery evidence or PayCore proof.'};
  match=path.match(/^\/v1\/challenges\/([^/]+)\/entries\/([^/]+)\/project-link$/);if(match&&method==='POST')return{id:id('demo-project-link'),entryId:decodeURIComponent(match[2]),actionProjectId:String(input.actionProjectId||'project-water-1'),relationship:String(input.relationship||'challenge_delivery')};
  error(404,'This browser demo action is not implemented.');
 }});
}
