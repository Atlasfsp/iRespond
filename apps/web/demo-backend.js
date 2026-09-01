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
 const offers=[{id:'offer-1',projectId:'project-water-1',contributionNeedId:'contribution-testing',kind:'material',note:'I can provide test kits.',availabilityNote:'This week',status:'accepted'}];
 const pledges=[{id:'pledge-1',projectId:'project-water-1',contributorId:'offline-demo-user',amountMinor:2500000,currency:'NGN',status:'pledged'}];
 let funding={projectId:'project-water-1',currency:'NGN',targetMinor:1800000000,communityCounterpartMinor:200000000,externalTargetMinor:1600000000,status:'open',pledgedMinor:1260000000,confirmedMinor:0};
 const notifications=[{id:'notice-1',title:'Need verified',body:'The safe-water observation was community confirmed.',readAt:null}];
 const preferences={inApp:true,push:true,sms:false,email:true};
 const consents=[{purpose:'impact-research',granted:false,policyVersion:'2026-08'},{purpose:'product-improvement',granted:true,policyVersion:'2026-08'}];
 const privacyRequests=[{id:'privacy-1',type:'export',status:'received'}];
 const safetyReports=[{id:'safety-1',reason:'safeguarding',details:'Offline demonstration of the confidential follow-up workflow.',status:'triage'}];

 function error(status,message){throw Object.assign(new Error(message),{status,body:{error:message}})}
 function body(init){try{return init?.body?JSON.parse(init.body):{}}catch{return{}}}
 function id(prefix){return`${prefix}-${Date.now()}-${crypto.randomUUID().slice(0,8)}`}
 function projectDetail(project){return{project,milestones,contributionNeeds,permissions}}

 return Object.freeze({session:demoSession,installUploadFetch(){const marker='__IRESPOND_WEB_DEMO_FETCH__';if(window[marker])return;window[marker]=true;const realFetch=window.fetch.bind(window);window.fetch=async(input,init)=>{const raw=typeof input==='string'?input:input instanceof URL?input.toString():input.url;try{const url=new URL(raw);if(url.hostname==='demo.irespond.local'&&url.pathname.startsWith('/v1/demo-uploads/'))return new Response(JSON.stringify({stored:true,demo:true}),{status:200,headers:{'Content-Type':'application/json'}})}catch{}return realFetch(input,init)}},async request(rawPath,init={}){
  const url=new URL(rawPath,'https://demo.irespond.local'),path=url.pathname.replace(/\/$/,'')||'/',method=String(init.method||'GET').toUpperCase(),input=body(init);
  if(method==='GET'&&path==='/v1/platform')return{name:'iRespond browser demo',lifecycle:['see','report','verify','diagnose','project','mobilise','execute','measure','maintain','replicate'],demo:true};
  if(method==='GET'&&path==='/v1/session')return demoSession;
  if(path==='/v1/needs'&&method==='GET')return needs;
  if(path==='/v1/needs'&&method==='POST'){const created={id:id('demo-need'),title:String(input.title||'Demo observation'),description:String(input.description||''),category:String(input.category||'community'),latitude:Number(input.latitude),longitude:Number(input.longitude),verificationState:'observed',sdgTags:Array.isArray(input.sdgTags)?input.sdgTags.map(Number):[]};needs.push(created);return created}
  let match=path.match(/^\/v1\/needs\/([^/]+)$/);if(match&&method==='GET'){const found=needs.find(item=>item.id===decodeURIComponent(match[1]));if(!found)error(404,'Need was not found.');return found}
  match=path.match(/^\/v1\/needs\/([^/]+)\/verification$/);if(match&&method==='POST'){const found=needs.find(item=>item.id===decodeURIComponent(match[1]));if(!found)error(404,'Need was not found.');found.verificationState=String(input.state||found.verificationState);return found}
  match=path.match(/^\/v1\/needs\/([^/]+)\/project$/);if(match){const needId=decodeURIComponent(match[1]),existing=projects.find(item=>item.sourceNeedId===needId);if(method==='GET'){if(!existing)error(404,'No Action Project is linked to this need.');return existing}if(method==='POST'){if(existing)error(409,'This need already has an Action Project.');const project={id:id('demo-project'),sourceNeedId:needId,title:String(input.title||'Demo Action Project'),description:String(input.description||''),status:'draft',sdgTags:needs.find(item=>item.id===needId)?.sdgTags||[]};projects.push(project);return project}}
  if(method==='POST'&&/^\/v1\/needs\/[^/]+\/evidence\/uploads$/.test(path)){const evidenceId=id('demo-evidence');return{evidenceId,uploadUrl:`https://demo.irespond.local/v1/demo-uploads/${evidenceId}`,method:'PUT',headers:{'X-iRespond-Demo-Upload':'offline'}}}
  if(method==='POST'&&/^\/v1\/needs\/[^/]+\/evidence\/[^/]+\/complete$/.test(path))return{status:'pending_review'};
  if(method==='GET'&&/^\/v1\/needs\/[^/]+\/evidence\/[^/]+\/access$/.test(path))error(404,'Approved evidence bytes are not bundled with this demo.');
  if(method==='POST'&&/^\/v1\/evidence\/[^/]+\/review$/.test(path))return{status:String(input.decision||'available')};
  match=path.match(/^\/v1\/projects\/([^/]+)$/);if(match&&method==='GET'){const project=projects.find(item=>item.id===decodeURIComponent(match[1]));if(!project)error(404,'Project was not found.');return projectDetail(project)}
  if(path==='/v1/me/contribution-offers'&&method==='GET')return offers;
  match=path.match(/^\/v1\/projects\/([^/]+)\/contribution-offers$/);if(match&&method==='GET')return offers.filter(item=>item.projectId===decodeURIComponent(match[1]));
  match=path.match(/^\/v1\/projects\/([^/]+)\/contribution-needs\/([^/]+)\/offers$/);if(match&&method==='POST'){const offer={id:id('demo-offer'),projectId:decodeURIComponent(match[1]),contributionNeedId:decodeURIComponent(match[2]),kind:'contribution',note:String(input.note||''),availabilityNote:String(input.availabilityNote||''),status:'offered'};offers.push(offer);return offer}
  match=path.match(/^\/v1\/contribution-offers\/([^/]+)\/withdraw$/);if(match&&method==='POST'){const offer=offers.find(item=>item.id===decodeURIComponent(match[1]));if(!offer)error(404,'Offer was not found.');offer.status='withdrawn';return offer}
  match=path.match(/^\/v1\/projects\/([^/]+)\/contribution-offers\/([^/]+)\/(decision|fulfill)$/);if(match&&method==='POST'){const offer=offers.find(item=>item.id===decodeURIComponent(match[2]));if(!offer)error(404,'Offer was not found.');offer.status=match[3]==='fulfill'?'fulfilled':String(input.decision||'accepted');return offer}
  if(method==='POST'&&/^\/v1\/project-role-invites\/[^/]+\/accept$/.test(path))return{projectId:'project-water-1',role:'volunteer_lead',status:'accepted'};
  match=path.match(/^\/v1\/projects\/([^/]+)\/milestones$/);if(match&&method==='POST'){const milestone={id:id('demo-milestone'),title:String(input.title||'Demo milestone'),description:String(input.description||''),sequence:Number(input.sequence||milestones.length+1),status:'planned'};milestones.push(milestone);return milestone}
  match=path.match(/^\/v1\/projects\/([^/]+)\/milestones\/([^/]+)\/transition$/);if(match&&method==='POST'){const milestone=milestones.find(item=>item.id===decodeURIComponent(match[2]));if(!milestone)error(404,'Milestone was not found.');milestone.status=String(input.state||milestone.status);return milestone}
  match=path.match(/^\/v1\/projects\/([^/]+)\/contribution-needs$/);if(match&&method==='POST'){const item={id:id('demo-contribution'),kind:String(input.kind||'time'),description:String(input.description||''),quantityNote:String(input.quantityNote||''),status:'open'};contributionNeeds.push(item);return item}
  if(method==='POST'&&/^\/v1\/projects\/[^/]+\/roles\/invite$/.test(path))return{id:id('demo-invite'),status:'pending',...input};
  match=path.match(/^\/v1\/projects\/([^/]+)\/transition$/);if(match&&method==='POST'){const project=projects.find(item=>item.id===decodeURIComponent(match[1]));if(!project)error(404,'Project was not found.');project.status=String(input.state||project.status);return project}
  if(path==='/v1/me/funding/pledges'&&method==='GET')return pledges;
  match=path.match(/^\/v1\/funding\/pledges\/([^/]+)\/cancel$/);if(match&&method==='POST'){const pledge=pledges.find(item=>item.id===decodeURIComponent(match[1]));if(!pledge)error(404,'Pledge was not found.');pledge.status='cancelled';return pledge}
  match=path.match(/^\/v1\/projects\/([^/]+)\/funding\/pledges$/);if(match&&method==='GET')return pledges.filter(item=>item.projectId===decodeURIComponent(match[1]));
  if(match&&method==='POST'){const pledge={id:id('demo-pledge'),projectId:decodeURIComponent(match[1]),contributorId:'offline-demo-user',amountMinor:Number(input.amountMinor||0),currency:funding.currency,status:'pledged'};pledges.push(pledge);funding.pledgedMinor+=pledge.amountMinor;return pledge}
  match=path.match(/^\/v1\/projects\/([^/]+)\/funding$/);if(match&&method==='GET'){if(match[1]!==funding.projectId)error(404,'Funding plan was not found.');return funding}
  if(match&&method==='PUT'){funding={...funding,...input,projectId:decodeURIComponent(match[1])};return funding}
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
  error(404,'This browser demo action is not implemented.');
 }});
}
