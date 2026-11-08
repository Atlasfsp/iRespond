/**
 * ImpactFlow Web Component Library (IF-01 .. IF-46)
 * Pure, accessible HTML rendering helpers for the canonical apps/web/app.js runtime.
 * Enforces server-authoritative truth labels, WCAG 2.2 AA semantics, and 44px touch targets.
 */

export const IMPACTFLOW_COMPONENT_CATALOG = Object.freeze([
  { id: 'IF-01', name: 'AppShell', category: 'foundation' },
  { id: 'IF-02', name: 'BrandHeader', category: 'foundation' },
  { id: 'IF-03', name: 'DesktopSidebar', category: 'foundation' },
  { id: 'IF-04', name: 'MobileBottomNav', category: 'foundation' },
  { id: 'IF-05', name: 'PageHeader', category: 'foundation' },
  { id: 'IF-06', name: 'SearchField', category: 'foundation' },
  { id: 'IF-07', name: 'FilterChipBar', category: 'foundation' },
  { id: 'IF-08', name: 'Button', category: 'foundation' },
  { id: 'IF-09', name: 'IconButton', category: 'foundation' },
  { id: 'IF-10', name: 'TextField', category: 'foundation' },
  { id: 'IF-11', name: 'SelectAutocomplete', category: 'foundation' },
  { id: 'IF-12', name: 'StepperFormWizard', category: 'foundation' },
  { id: 'IF-13', name: 'StatusPill', category: 'foundation' },
  { id: 'IF-14', name: 'CardSectionPanel', category: 'foundation' },
  { id: 'IF-15', name: 'OpportunityCard', category: 'foundation' },
  { id: 'IF-16', name: 'ProjectProgress', category: 'foundation' },
  { id: 'IF-17', name: 'ImpactMetric', category: 'foundation' },
  { id: 'IF-18', name: 'TrustNotice', category: 'foundation' },
  { id: 'IF-19', name: 'EvidenceUploader', category: 'foundation' },
  { id: 'IF-20', name: 'ModalDrawer', category: 'foundation' },
  { id: 'IF-21', name: 'ToastAlert', category: 'foundation' },
  { id: 'IF-22', name: 'SkeletonProgress', category: 'foundation' },
  { id: 'IF-23', name: 'EmptyErrorState', category: 'foundation' },
  { id: 'IF-24', name: 'DataTableResponsiveList', category: 'foundation' },
  { id: 'IF-25', name: 'ChallengeCard', category: 'domain' },
  { id: 'IF-26', name: 'ChallengeDetailTabs', category: 'domain' },
  { id: 'IF-27', name: 'EligibilitySummary', category: 'domain' },
  { id: 'IF-28', name: 'TeamRoster', category: 'domain' },
  { id: 'IF-29', name: 'SubmissionComposer', category: 'domain' },
  { id: 'IF-30', name: 'ReviewQueue', category: 'domain' },
  { id: 'IF-31', name: 'RubricScorecard', category: 'domain' },
  { id: 'IF-32', name: 'ConflictOfInterestPanel', category: 'domain' },
  { id: 'IF-33', name: 'ResultTimeline', category: 'domain' },
  { id: 'IF-34', name: 'AwardCard', category: 'domain' },
  { id: 'IF-35', name: 'SponsorProfile', category: 'domain' },
  { id: 'IF-36', name: 'MentorWorkspace', category: 'domain' },
  { id: 'IF-37', name: 'VolunteerOffer', category: 'domain' },
  { id: 'IF-38', name: 'NeedLocationCapture', category: 'domain' },
  { id: 'IF-39', name: 'NeedVerificationPanel', category: 'domain' },
  { id: 'IF-40', name: 'ProjectRoom', category: 'domain' },
  { id: 'IF-41', name: 'FundingLedgerSummary', category: 'domain' },
  { id: 'IF-42', name: 'ImpactPassportCard', category: 'domain' },
  { id: 'IF-43', name: 'SafeguardingCase', category: 'domain' },
  { id: 'IF-44', name: 'PrivacyControl', category: 'domain' },
  { id: 'IF-45', name: 'NotificationCenter', category: 'domain' },
  { id: 'IF-46', name: 'OfflineSyncStatus', category: 'domain' },
]);

export function escHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

export const SERVER_TRUTH_LABELS = Object.freeze({
  observed: { text: 'Observed (unverified)', tone: 'warning', icon: '◎' },
  verification_requested: { text: 'Review requested', tone: 'info', icon: '◷' },
  community_confirmed: { text: 'Community-confirmed', tone: 'success', icon: '✓' },
  institution_confirmed: { text: 'Institution-confirmed', tone: 'success', icon: '✓' },
  expert_confirmed: { text: 'Expert-confirmed', tone: 'success', icon: '✓' },
  independently_audited: { text: 'Independently audited', tone: 'success', icon: '✓' },
  government_confirmed: { text: 'Government-confirmed', tone: 'success', icon: '✓' },
  disputed: { text: 'Disputed', tone: 'danger', icon: '!' },
  rejected: { text: 'Rejected', tone: 'danger', icon: '✕' },
  pledged: { text: 'Pledged commitment (not settled)', tone: 'warning', icon: '◷' },
  confirmed: { text: 'Externally confirmed settlement', tone: 'success', icon: '✓' },
  nominated: { text: 'Award nominated — approval pending', tone: 'info', icon: '◷' },
  approved: { text: 'Award selected — fulfilment pending', tone: 'warning', icon: '★' },
  published: { text: 'Published decision', tone: 'info', icon: '✓' },
  confirmed_delivered: { text: 'Prize fulfilment verified', tone: 'success', icon: '✓' },
});

/** IF-13: StatusPill — semantic text + non-colour icon */
export function renderStatusPill(stateKey, fallbackLabel) {
  const mapped = SERVER_TRUTH_LABELS[stateKey] || {
    text: fallbackLabel || String(stateKey || 'unknown').replaceAll('_', ' '),
    tone: 'info',
    icon: '•',
  };
  return `<span class="if-status-pill ${escHtml(mapped.tone)}" data-state="${escHtml(stateKey)}"><span aria-hidden="true">${escHtml(mapped.icon)}</span><span>${escHtml(mapped.text)}</span></span>`;
}

/** IF-18: TrustNotice — plain-language verification/payout/evidence boundary notice */
export function renderTrustNotice(title, message, tone = 'warning') {
  return `<div class="notice ${escHtml(tone)}" role="note"><strong>${escHtml(title)}:</strong> ${escHtml(message)}</div>`;
}

/** IF-15 / IF-25: OpportunityCard / ChallengeCard */
export function renderOpportunityCard({ kind = 'Need', title, summary, metaLeft, metaRight, href = '#needs', ctaLabel = 'Open', statusKey }) {
  const bannerClass = kind.toLowerCase() === 'project' ? 'project' : kind.toLowerCase() === 'need' ? 'need' : '';
  const pillClass = kind.toLowerCase() === 'need' ? 'amber' : kind.toLowerCase() === 'project' ? 'info' : 'solid-green';
  return `<article class="if-opportunity-card">
    <div class="if-opportunity-banner ${bannerClass}">
      <span class="if-status-pill ${pillClass}">${escHtml(kind)}</span>
      ${statusKey ? renderStatusPill(statusKey) : ''}
    </div>
    <div class="if-opportunity-body">
      <h3>${escHtml(title)}</h3>
      <p>${escHtml(summary)}</p>
      <div class="if-opportunity-meta">
        <span>${escHtml(metaLeft || '')}</span>
        <span>${escHtml(metaRight || '')}</span>
        <a class="if-card-cta" href="${escHtml(href)}">${escHtml(ctaLabel)} <span aria-hidden="true">→</span></a>
      </div>
    </div>
  </article>`;
}

/** IF-17: ImpactMetric */
export function renderImpactMetric({ label, value, provenance = 'Server-evidenced' }) {
  const display = value === null || value === undefined ? 'No verified metrics yet' : String(value);
  return `<div class="if-impact-metric">
    <strong>${escHtml(display)}</strong>
    <span>${escHtml(label)}</span>
    <small>${escHtml(provenance)}</small>
  </div>`;
}

/** IF-24: DataTable */
export function renderDataTable({ caption, headers = [], rows = [], emptyMessage = 'No records in this scope.' }) {
  if (!rows.length) {
    return `<div class="empty">${escHtml(emptyMessage)}</div>`;
  }
  return `<div class="if-table-wrap" role="region" aria-label="${escHtml(caption || 'Data table')}" tabindex="0">
    <table class="if-table">
      ${caption ? `<caption class="sr-only">${escHtml(caption)}</caption>` : ''}
      <thead><tr>${headers.map((h) => `<th scope="col">${escHtml(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((cells) => `<tr>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
  </div>`;
}
