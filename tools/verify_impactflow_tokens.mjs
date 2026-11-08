import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function lum(hex) {
  const clean = hex.replace('#', '');
  const c = clean
    .match(/\w\w/g)
    .map((x) => parseInt(x, 16) / 255)
    .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
}

export function contrastRatio(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const [jsonRaw, cssRaw, tsRaw] = await Promise.all([
  readFile('docs/design/impactflow-tokens.json', 'utf8'),
  readFile('apps/web/impactflow-tokens.css', 'utf8'),
  readFile('apps/mobile/lib/impactflow-tokens.ts', 'utf8'),
]);

const tokens = JSON.parse(jsonRaw);

// 1. Validate core approved 5-colour foundation + accessible button derivative
assert.equal(tokens.color.brand.forest, '#123E34', 'Forest token must be #123E34');
assert.equal(tokens.color.brand.action, '#24A27B', 'Action accent token must be #24A27B');
assert.equal(tokens.color.brand.amber, '#F2B84B', 'Amber token must be #F2B84B');
assert.equal(tokens.color.brand.canvas, '#F7F6F0', 'Canvas token must be #F7F6F0');
assert.equal(tokens.color.brand.ink, '#1E293B', 'Ink token must be #1E293B');
assert.equal(tokens.color.action.primary, '#0A6C50', 'Accessible primary button fill must be #0A6C50');
assert.equal(tokens.color.action.focus, '#0B7454', 'Focus ring must be #0B7454');

// 2. Verify CSS and TS parity with JSON tokens
const requiredCssVars = [
  ['--if-color-brand-forest', '#123E34'],
  ['--if-color-brand-action', '#24A27B'],
  ['--if-color-brand-amber', '#F2B84B'],
  ['--if-color-brand-canvas', '#F7F6F0'],
  ['--if-color-brand-ink', '#1E293B'],
  ['--if-color-surface-base', '#FFFFFF'],
  ['--if-color-surface-canvas', '#F7F6F0'],
  ['--if-color-surface-soft', '#EEF3EF'],
  ['--if-color-surface-softest', '#F9FBF8'],
  ['--if-color-surface-inverse', '#123E34'],
  ['--if-color-text-primary', '#1E293B'],
  ['--if-color-text-secondary', '#44625A'],
  ['--if-color-text-tertiary', '#586F67'],
  ['--if-color-text-inverse', '#FFFFFF'],
  ['--if-color-text-link', '#0A6C50'],
  ['--if-color-action-primary', '#0A6C50'],
  ['--if-color-action-hover', '#08573F'],
  ['--if-color-action-pressed', '#06442F'],
  ['--if-color-action-disabled', '#B4C6BD'],
  ['--if-color-action-on-primary', '#FFFFFF'],
  ['--if-color-action-focus', '#0B7454'],
  ['--if-color-border-default', '#DDE7E1'],
  ['--if-color-border-strong', '#9AAFA4'],
  ['--if-color-border-focus', '#0B7454'],
  ['--if-color-status-success', '#0A6C50'],
  ['--if-color-status-warning', '#7B5200'],
  ['--if-color-status-danger', '#B23B3B'],
  ['--if-color-status-info', '#165C87'],
  ['--if-radius-control', '12px'],
  ['--if-radius-card', '18px'],
  ['--if-radius-hero', '24px'],
  ['--if-radius-modal', '20px'],
  ['--if-radius-pill', '999px'],
];

for (const [prop, val] of requiredCssVars) {
  assert.ok(cssRaw.includes(`${prop}: ${val}`), `Missing or mismatched CSS variable ${prop}: ${val}`);
}

for (const hex of ['#123E34', '#24A27B', '#F2B84B', '#F7F6F0', '#1E293B', '#0A6C50', '#0B7454', '#DDE7E1']) {
  assert.ok(tsRaw.includes(hex), `Native ImpactFlow tokens missing ${hex}`);
}

assert.ok(cssRaw.includes('Manrope'), 'CSS must include Manrope in heading font stack');
assert.ok(cssRaw.includes('Inter'), 'CSS must include Inter in font stack');
assert.ok(cssRaw.includes('prefers-reduced-motion: reduce'), 'CSS must respect prefers-reduced-motion');
assert.equal(tokens.control.touchMin, 44, 'Minimum touch target must be 44px');
assert.equal(tokens.control.primaryHeight, 52, 'Primary control height must be 52px');

// 3. Static WCAG 2.2 AA Contrast Precheck & Prohibited Pairs
const passingTextPairs = [
  ['#0A6C50', '#FFFFFF', 4.5, 'Primary button on white text'],
  ['#123E34', '#FFFFFF', 4.5, 'Forest sidebar white labels'],
  ['#24A27B', '#1E293B', 4.5, 'Accent green INK labels'],
  ['#F2B84B', '#1E293B', 4.5, 'Amber chip INK labels'],
  ['#1E293B', '#F7F6F0', 4.5, 'Body on canvas'],
  ['#44625A', '#FFFFFF', 4.5, 'Secondary on white'],
  ['#B23B3B', '#FFFFFF', 4.5, 'Danger on white'],
  ['#0B7454', '#FFFFFF', 3.0, 'Focus ring on white'],
];

for (const [fg, bg, threshold, label] of passingTextPairs) {
  const ratio = contrastRatio(fg, bg);
  assert.ok(ratio >= threshold, `${label} failed contrast: ${ratio.toFixed(2)}:1 < ${threshold}:1`);
}

// Prohibited pairs must remain below 4.5:1 threshold so our detector catches any misuse
assert.ok(contrastRatio('#24A27B', '#FFFFFF') < 4.5, 'White on #24A27B is a prohibited normal-text pair');
assert.ok(contrastRatio('#F2B84B', '#FFFFFF') < 4.5, 'White on #F2B84B is a prohibited normal-text pair');

console.log('ImpactFlow tokens verified — JSON/CSS/TS parity, WCAG 2.2 AA contrast, and prohibited colour pairs checked.');
