export type StitchScreenSource = 'stitch' | 'extended';
export type StitchScreenStatus = 'live' | 'design';
export type StitchScreenDefinition = {
  id: string;
  title: string;
  domain: string;
  roles: string[];
  source: StitchScreenSource;
  status: StitchScreenStatus;
  mobileRoute?: string;
  webRoute?: string;
  description?: string;
};

export const STITCH_ARCHIVE_SHA256 = 'aeb72a9e78cae84999a31b41d61375fd4d9629e90fa766999c2921ccb09a9b82';
export const STITCH_SUPPLIED_SCREEN_COUNT = 77;

const suppliedScreens: string[] = [
  'ai_assisted_dispatch','asset_health_matrix','asset_maintenance_lifecycle_hub','certification_training_library','community_feedback_loop','community_governance_voting','community_impact_hub','community_leader_dashboard','compliance_library','donor_impact_portfolio','donor_impact_receipt','donor_transparency_portal','emergency_field_safety','emergency_response_command','field_incident_timeline','field_ops_commander','financial_compliance_audit_trail','find_your_impact','find_your_role_action_compass','funding_resources','global_command_center','global_logistics_resource_hub','global_sdg_impact_dashboard','governance_policy_management','help_support_hub','home_discovery','impact_forecasting','impact_passport','impact_story_completed_project','incident_resolution_report','institutional_audit_compliance_hub','institutional_audit_dashboard','institutional_audit_detail','institutional_partner_hub','local_community_directory','local_resource_inventory','logistics_orchestration_hub','micro_grant_proposal','my_ability_profile','network_ability_capacity_hub','notifications','offline_sync_manager','procurement_list','procurement_verification','project_evidence_archive','project_finance_ledger','project_handover_sustainment','project_risk_register','project_room_coordination','project_room_overview','project_sustainability_audit','regional_coordination_hub','regional_node_detail_sub_saharan_b','regional_node_operations_center','report_a_need','resource_maintenance_log','responder_training','safeguarding_support','sdg_impact_explorer','sdg_impact_modeler_forecast','sdg_milestone_celebration','settings_privacy','skill_based_matchmaker','strategic_grant_proposal','strategic_impact_analytics','strategic_portfolio_finance_hub','submit_proof_of_impact','system_integrity_dashboard','technical_field_assessment','trust_reputation','trust_safety_hub','trust_score_breakdown','verification_consensus','verification_queue','verified_credential_wallet','verified_outcome_report','volunteer_attendance_hours',
];

const liveSupplied: Record<string, { mobileRoute: string; webRoute: string }> = {
  home_discovery: { mobileRoute: '/', webRoute: '#home' },
  report_a_need: { mobileRoute: '/report', webRoute: '#needs' },
  verification_queue: { mobileRoute: '/verify', webRoute: '#verification' },
  impact_passport: { mobileRoute: '/impact', webRoute: '#impact' },
  project_room_overview: { mobileRoute: '/project/[id]', webRoute: '#project' },
  funding_resources: { mobileRoute: '/project/funding', webRoute: '#funding' },
  my_ability_profile: { mobileRoute: '/profile', webRoute: '#impact' },
  submit_proof_of_impact: { mobileRoute: '/evidence', webRoute: '#needs' },
  community_impact_hub: { mobileRoute: '/impact', webRoute: '#impact' },
  project_room_coordination: { mobileRoute: '/project-admin', webRoute: '#project' },
  notifications: { mobileRoute: '/notifications', webRoute: '#notifications' },
  settings_privacy: { mobileRoute: '/privacy', webRoute: '#privacy' },
  safeguarding_support: { mobileRoute: '/safety', webRoute: '#safety' },
  trust_safety_hub: { mobileRoute: '/safety-ops', webRoute: '#safety-ops' },
  project_evidence_archive: { mobileRoute: '/verify', webRoute: '#verification' },
  verification_consensus: { mobileRoute: '/verify', webRoute: '#verification' },
  donor_impact_receipt: { mobileRoute: '/pledges', webRoute: '#funding' },
  project_finance_ledger: { mobileRoute: '/project/funding', webRoute: '#funding' },
  offline_sync_manager: { mobileRoute: '/', webRoute: '#needs' },
};

// Live screens use exact audience rules. Resource-scoped roles are deliberately
// represented as `resource-authorized`: they are discovered from a concrete
// project permission envelope, never inferred from generic authentication.
const liveRoleOverrides: Record<string, string[]> = {
  home_discovery: ['public', 'authenticated'],
  report_a_need: ['public', 'authenticated'],
  verification_queue: ['authenticated', 'community_verifier', 'institution_verifier', 'expert_verifier', 'impact_auditor', 'government_verifier', 'evidence_reviewer', 'trust_safety_admin'],
  impact_passport: ['authenticated'],
  project_room_overview: ['public', 'authenticated'],
  funding_resources: ['authenticated'],
  my_ability_profile: ['authenticated'],
  submit_proof_of_impact: ['authenticated'],
  community_impact_hub: ['authenticated'],
  project_room_coordination: ['resource-authorized', 'project_steward', 'trust_safety_admin'],
  notifications: ['authenticated'],
  settings_privacy: ['authenticated'],
  safeguarding_support: ['authenticated'],
  trust_safety_hub: ['safety_reviewer', 'trust_safety_admin'],
  project_evidence_archive: ['community_verifier', 'evidence_reviewer', 'trust_safety_admin'],
  verification_consensus: ['community_verifier', 'institution_verifier', 'expert_verifier', 'impact_auditor', 'government_verifier', 'trust_safety_admin'],
  donor_impact_receipt: ['authenticated'],
  project_finance_ledger: ['resource-authorized', 'project_steward', 'trust_safety_admin'],
  offline_sync_manager: ['public', 'authenticated'],
};

const publicScreens = new Set<string>(['home_discovery','local_community_directory','find_your_impact','sdg_impact_explorer']);
const authenticatedScreens = new Set<string>(['report_a_need','submit_proof_of_impact','my_ability_profile','notifications','settings_privacy','find_your_role_action_compass','trust_reputation','impact_passport','community_impact_hub','impact_story_completed_project','skill_based_matchmaker','volunteer_attendance_hours','offline_sync_manager','help_support_hub','verified_credential_wallet']);
const domainRules: Record<string, string[]> = {
  'funding-finance': ['funding','finance','donor','grant','procurement','financial_compliance'],
  'verification-trust': ['verification','trust_score','trust_reputation','verified_outcome','credential','audit'],
  'safety-emergency': ['safety','incident','emergency'],
  'operations-logistics': ['logistics','resource_inventory','asset','maintenance','field_ops','dispatch'],
  'institutional-governance': ['institutional','regional','global_command','governance','compliance'],
  'impact-analytics': ['sdg','impact','forecast','analytics'],
  'training-support': ['training','certification','help_support'],
  'project-delivery': ['project','handover','sustainability','milestone'],
  'contributions-ability': ['ability','skill','volunteer','role_action'],
};

const extended: StitchScreenDefinition[] = [
  { id:'secure_sign_in', title:'Secure Sign In', domain:'account', roles:['public','authenticated'], mobileRoute:'/signin', webRoute:'#home', description:'Authenticate through the configured OIDC Authorization Code + PKCE flow without exposing a browser client secret.', source:'extended', status:'live' },
  { id:'need_detail', title:'Need Detail & Verification State', domain:'community-discovery', roles:['public','authenticated'], mobileRoute:'/need/[id]', webRoute:'#needs', description:'Read a single observed need, its verification truth state, project lineage and evidence actions.', source:'extended', status:'live' },
  { id:'contribution_offer_center', title:'Contribution Offer Center', domain:'contributions-ability', roles:['authenticated'], mobileRoute:'/contributions', webRoute:'#contributions', description:'Track personal offers; project-scoped review and fulfilment controls appear only after the project API grants them.', source:'extended', status:'live' },
  { id:'personal_pledge_center', title:'My Funding Commitments', domain:'funding-finance', roles:['authenticated'], mobileRoute:'/pledges', webRoute:'#funding', description:'Review and cancel personal project funding pledges while keeping commitments distinct from settled money.', source:'extended', status:'live' },
  { id:'project_steward_console', title:'Project Steward Console', domain:'project-delivery', roles:['resource-authorized','project_steward','trust_safety_admin'], mobileRoute:'/project-admin', webRoute:'#project', description:'Manage project lifecycle, milestones, contribution plans, roles and funding only after a concrete Project Room returns the required permission envelope.', source:'extended', status:'live' },
  { id:'project_role_invitation', title:'Project Role Invitation', domain:'project-delivery', roles:['authenticated'], mobileRoute:'/role-invite', webRoute:'#contributions', description:'Accept an invitation issued to the current identity; creation remains available only from a project with role-management permission.', source:'extended', status:'live' },
  { id:'evidence_review_detail', title:'Evidence Review Detail', domain:'verification-trust', roles:['evidence_reviewer','community_verifier','trust_safety_admin'], mobileRoute:'/verify', webRoute:'#verification', description:'Review immutable evidence metadata and authorize access only where the backend grants reviewer authority.', source:'extended', status:'live' },
  { id:'safety_case_center', title:'My Safety Cases', domain:'safety-emergency', roles:['authenticated'], mobileRoute:'/safety', webRoute:'#safety', description:'Create confidential safety reports, review personal case status and lodge an appeal.', source:'extended', status:'live' },
  { id:'safety_review_operations', title:'Safety Review Operations', domain:'safety-emergency', roles:['safety_reviewer','trust_safety_admin'], mobileRoute:'/safety-ops', webRoute:'#safety-ops', description:'Triage and decide safety reports through the backend reviewer queue.', source:'extended', status:'live' },
  { id:'notification_preferences', title:'Notification Preferences', domain:'account', roles:['authenticated'], mobileRoute:'/notifications', webRoute:'#notifications', description:'Manage notification inbox state and channel preferences.', source:'extended', status:'live' },
  { id:'privacy_request_center', title:'Privacy & Data Rights Center', domain:'account', roles:['authenticated'], mobileRoute:'/privacy', webRoute:'#privacy', description:'Manage optional consent purposes and create auditable access, export, correction and deletion requests.', source:'extended', status:'live' },
  { id:'project_milestone_control', title:'Project Milestone Control', domain:'project-delivery', roles:['resource-authorized','community_verifier','institution_verifier','expert_verifier','impact_auditor','trust_safety_admin'], mobileRoute:'/project-admin', webRoute:'#project', description:'Create or transition milestones only when the server permission envelope grants management or validation for that project.', source:'extended', status:'live' },
  { id:'project_contribution_plan', title:'Project Contribution Plan', domain:'project-delivery', roles:['resource-authorized','project_steward','trust_safety_admin'], mobileRoute:'/project-admin', webRoute:'#project', description:'Publish project needs for time, skills, materials, equipment and other non-cash abilities after server authorization.', source:'extended', status:'live' },
  { id:'project_funding_control', title:'Project Funding Control', domain:'funding-finance', roles:['resource-authorized','project_steward','trust_safety_admin'], mobileRoute:'/project-admin', webRoute:'#funding', description:'Publish or update transparent funding targets and counterpart amounts only after server authorization, without claiming regulated settlement.', source:'extended', status:'live' },
];

function titleize(id: string) {
  return id.split('_').map((word) => ['sdg','ai'].includes(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
function domainFor(id: string) {
  for (const [domain, needles] of Object.entries(domainRules)) if (needles.some((needle) => id.includes(needle))) return domain;
  if (['notifications','settings_privacy'].includes(id)) return 'account';
  return 'community-discovery';
}
function rolesFor(id: string, domain: string): string[] {
  if (publicScreens.has(id)) return ['public','authenticated'];
  if (authenticatedScreens.has(id)) return ['authenticated'];
  if (domain === 'verification-trust') return ['community_verifier','institution_verifier','expert_verifier','impact_auditor','government_verifier','evidence_reviewer','trust_safety_admin'];
  if (domain === 'safety-emergency') return ['authenticated','safety_reviewer','trust_safety_admin'];
  if (domain === 'funding-finance') return ['authenticated','institution_partner'];
  if (domain === 'institutional-governance') return ['institution_partner','trust_safety_admin'];
  if (domain === 'operations-logistics') return ['field_operator','institution_partner'];
  if (domain === 'impact-analytics') return ['authenticated','impact_auditor','institution_partner'];
  if (domain === 'training-support') return ['authenticated','institution_partner'];
  if (domain === 'project-delivery') return ['authenticated'];
  if (domain === 'contributions-ability') return ['authenticated'];
  return ['authenticated'];
}

const supplied: StitchScreenDefinition[] = suppliedScreens.map((id) => {
  const domain = domainFor(id);
  const live = liveSupplied[id];
  return {
    id,
    title: titleize(id),
    domain,
    roles: liveRoleOverrides[id] ?? rolesFor(id, domain),
    source: 'stitch',
    status: live ? 'live' : 'design',
    ...(live ?? {}),
  };
});

export const stitchScreens: StitchScreenDefinition[] = [...supplied, ...extended];
export function stitchScreen(id: string) { return stitchScreens.find((screen) => screen.id === id); }
export function stitchPurpose(screen: StitchScreenDefinition) {
  if (screen.description) return screen.description;
  return screen.status === 'live'
    ? `Google Stitch supplied ${screen.title} surface. The current backend-backed product route implements this capability.`
    : `Google Stitch supplied ${screen.title} surface. The visual contract is canonical; interactive actions remain disabled until a matching backend contract and authorization policy exist.`;
}

export function stitchScreensForRoles(roles: string[], authenticated = false) {
  const globalRoles = new Set(roles);
  return stitchScreens.filter((screen) => {
    // Design backlog is inspectable after sign-in, but never actionable.
    if (screen.status === 'design') return authenticated;
    if (screen.roles.includes('public')) return true;
    if (!authenticated) return false;
    if (screen.roles.includes('authenticated')) return true;
    // Resource-authorized is intentionally NOT treated as a global role.
    return screen.roles.some((role) => role !== 'resource-authorized' && globalRoles.has(role));
  });
}
