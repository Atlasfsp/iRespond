import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ImpactFlow } from '../../apps/mobile/lib/impactflow-tokens.ts';

function lum(hex) {
  const clean = hex.replace('#', '');
  const c = clean
    .match(/\w\w/g)
    .map((x) => parseInt(x, 16) / 255)
    .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
}
function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

test('ImpactFlow tokens match approved palette and WCAG 2.2 AA contrast rules', () => {
  assert.equal(ImpactFlow.color.brand.forest, '#123E34');
  assert.equal(ImpactFlow.color.brand.action, '#24A27B');
  assert.equal(ImpactFlow.color.brand.amber, '#F2B84B');
  assert.equal(ImpactFlow.color.brand.canvas, '#F7F6F0');
  assert.equal(ImpactFlow.color.brand.ink, '#1E293B');
  assert.equal(ImpactFlow.color.action.primary, '#0A6C50');
  assert.ok(contrast(ImpactFlow.color.action.primary, ImpactFlow.color.action.onPrimary) >= 4.5);
  assert.ok(contrast(ImpactFlow.color.brand.forest, ImpactFlow.color.text.inverse) >= 4.5);
  assert.ok(contrast(ImpactFlow.color.brand.amber, ImpactFlow.color.brand.ink) >= 4.5);
  assert.ok(contrast(ImpactFlow.color.brand.action, ImpactFlow.color.brand.ink) >= 4.5);
  assert.ok(contrast(ImpactFlow.color.action.focus, ImpactFlow.color.surface.base) >= 3.0);
  assert.ok(ImpactFlow.control.touchMin >= 44);
  assert.equal(ImpactFlow.control.primaryHeight, 52);
});

test('ImpactFlow CSS and TS tokens remain synchronized with JSON source of truth', () => {
  const json = JSON.parse(readFileSync('docs/design/impactflow-tokens.json', 'utf8'));
  const css = readFileSync('apps/web/impactflow-tokens.css', 'utf8');
  assert.deepEqual(ImpactFlow.color, json.color);
  assert.deepEqual(ImpactFlow.space, json.space);
  assert.deepEqual(ImpactFlow.radius, json.radius);
  assert.match(css, /--if-color-action-primary:\s*#0A6C50/);
  assert.match(css, /--if-color-brand-forest:\s*#123E34/);
});
