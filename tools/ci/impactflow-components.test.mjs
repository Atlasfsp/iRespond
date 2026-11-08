import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IMPACTFLOW_COMPONENT_CATALOG,
  renderStatusPill,
  renderTrustNotice,
  renderOpportunityCard,
  renderImpactMetric,
  renderDataTable,
} from '../../apps/web/impactflow-components.mjs';
import { readFileSync } from 'node:fs';
import { IMPACTFLOW_NATIVE_CATALOG } from '../../apps/mobile/lib/impactflow-tokens.ts';

test('ImpactFlow component library covers all 46 contracts (IF-01 .. IF-46) across web and native', () => {
  assert.equal(IMPACTFLOW_COMPONENT_CATALOG.length, 46);
  assert.equal(IMPACTFLOW_NATIVE_CATALOG.length, 46);
  for (let i = 1; i <= 46; i++) {
    const id = `IF-${String(i).padStart(2, '0')}`;
    assert.ok(IMPACTFLOW_COMPONENT_CATALOG.some((c) => c.id === id), `Web catalog missing ${id}`);
    assert.ok(IMPACTFLOW_NATIVE_CATALOG.some((c) => c.startsWith(`${id}:`)), `Native catalog missing ${id}`);
  }
});

test('ImpactFlow primitives render server-authoritative truth states and escape untrusted input', () => {
  const pill = renderStatusPill('observed');
  assert.match(pill, /Observed \(unverified\)/);
  assert.match(pill, /data-state="observed"/);

  const pledgePill = renderStatusPill('pledged');
  assert.match(pledgePill, /Pledged commitment \(not settled\)/);

  const awardPill = renderStatusPill('approved');
  assert.match(awardPill, /Award selected — fulfilment pending/);

  const card = renderOpportunityCard({
    kind: 'Challenge',
    title: 'Gauteng <script>alert(1)</script> Innovation',
    summary: 'Identify a real community problem.',
    metaLeft: 'Apr 1 – Jun 30',
    metaRight: 'Teams (2–6)',
    href: '#challenges',
    ctaLabel: 'Explore',
    statusKey: 'published',
  });
  assert.doesNotMatch(card, /<script>/);
  assert.match(card, /&lt;script&gt;/);
  assert.match(card, /href="#challenges"/);

  const metricEmpty = renderImpactMetric({ label: 'People engaged', value: null });
  assert.match(metricEmpty, /No verified metrics yet/);

  const notice = renderTrustNotice('Money-state boundary', 'Funding pledges are commitments, not settled cash.');
  assert.match(notice, /role="note"/);

  const table = renderDataTable({
    caption: 'Review queue',
    headers: ['ID', 'Status'],
    rows: [['entry-1', 'Pending']],
  });
  assert.match(table, /<th scope="col">ID<\/th>/);
});
