import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const map = JSON.parse(await readFile('docs/frontend/frontend-api-map.json', 'utf8'));
const openapi = await readFile('services/api/openapi.yaml', 'utf8');
const web = await readFile('apps/web/app.js', 'utf8');
const mobile = await readTree(['apps/mobile/app', 'apps/mobile/lib']);

const operations = parseOperations(openapi);
const excluded = new Set(Object.keys(map.excludedOperations || {}));
const mapped = new Set(Object.keys(map.operations || {}));
const failures = [];

for (const op of operations) {
  if (excluded.has(op.operationId)) continue;
  if (!mapped.has(op.operationId)) {
    failures.push(`${op.operationId}: missing frontend mapping`);
    continue;
  }
  if (!hasInvocation(mobile, op)) failures.push(`${op.operationId}: mobile frontend does not execute ${op.method.toUpperCase()} ${op.path}`);
  if (!hasInvocation(web, op)) failures.push(`${op.operationId}: web frontend does not execute ${op.method.toUpperCase()} ${op.path}`);
}

for (const id of excluded) {
  const op = operations.find((entry) => entry.operationId === id);
  if (!op) failures.push(`${id}: exclusion is stale`);
  if (mapped.has(id)) failures.push(`${id}: excluded operation must not also be mapped`);
}

if (failures.length) {
  console.error('Frontend execution coverage FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Frontend execution coverage verified: ${operations.length - excluded.size} user-facing operations execute in both mobile and web clients.`);

async function readTree(roots) {
  const chunks = [];
  for (const root of roots) await walk(root, chunks);
  return chunks.join('\n');
}
async function walk(dir, chunks) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file, chunks);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) chunks.push(`\n/* ${file} */\n${await readFile(file, 'utf8')}`);
  }
}
function parseOperations(source) {
  const lines = source.split(/\r?\n/); const out = []; let currentPath = ''; let currentMethod = '';
  for (const line of lines) {
    const pathMatch = line.match(/^  (\/[^:]+):\s*$/);
    if (pathMatch) { currentPath = pathMatch[1]; currentMethod = ''; continue; }
    const methodMatch = line.match(/^    (get|post|put|patch|delete):\s*$/);
    if (methodMatch && currentPath) { currentMethod = methodMatch[1]; continue; }
    const operationMatch = line.match(/^      operationId:\s*([^\s#]+)\s*$/);
    if (operationMatch && currentPath && currentMethod) out.push({ path: currentPath, method: currentMethod, operationId: operationMatch[1] });
  }
  return out;
}
function endpointRegex(endpoint) {
  const pieces = endpoint.split(/\{[^}]+\}/g).map(escapeRegex);
  const dynamic = '(?:\\$\\{[^}]+\\}|[^`\\"\\'\\s/]+)';
  return new RegExp(pieces.join(dynamic), 'g');
}
function hasInvocation(source, op) {
  const regex = endpointRegex(op.path); let match;
  while ((match = regex.exec(source))) {
    const start = Math.max(0, match.index - 450), end = Math.min(source.length, match.index + match[0].length + 500);
    const window = source.slice(start, end);
    if (methodEvidence(window, op.method)) return true;
    if (regex.lastIndex === match.index) regex.lastIndex++;
  }
  return false;
}
function methodEvidence(window, method) {
  if (method === 'get') {
    if (/method\s*:\s*['\"](?:POST|PUT|PATCH|DELETE)['\"]/i.test(window)) return false;
    return /\b(?:apiFetch|api|fetch)\s*\(/.test(window);
  }
  if (method === 'post') return /\b(?:postJSON|post)\s*\(|method\s*:\s*['\"]POST['\"]/i.test(window);
  if (method === 'put') return /\b(?:putJSON|put)\s*\(|method\s*:\s*['\"]PUT['\"]/i.test(window);
  if (method === 'patch') return /method\s*:\s*['\"]PATCH['\"]/i.test(window);
  if (method === 'delete') return /method\s*:\s*['\"]DELETE['\"]/i.test(window);
  return false;
}
function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
