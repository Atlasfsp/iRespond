import { readFile } from 'node:fs/promises';

const files = {
  html: await readFile('apps/web/index.html', 'utf8'),
  js: await readFile('apps/web/app.js', 'utf8'),
  config: await readFile('apps/web/config.js', 'utf8'),
  css: await readFile('apps/web/styles.css', 'utf8'),
  gateway: await readFile('services/api/cmd/server/gateway.go', 'utf8'),
  helm: await readFile('deploy/helm/irespond/templates/api.yaml', 'utf8')
};

const failures = [];
const requireText = (where, text, reason) => {
  if (!files[where].includes(text)) failures.push(`${where}: ${reason} (${text})`);
};

for (const [where, text, reason] of [
  ['html', 'id="primary-nav"', 'role-aware navigation mount is required'],
  ['html', 'id="main"', 'application main landmark is required'],
  ['js', '/v1/session', 'frontend must derive identity roles from the API'],
  ['js', 'code_challenge_method', 'browser sign-in must use PKCE'],
  ['js', '/v1/needs', 'need reporting/discovery must be wired'],
  ['js', '/evidence/uploads', 'evidence upload must be wired'],
  ['js', '/verification', 'verification workflow must be wired'],
  ['js', '/contribution-offers', 'contribution workflow must be wired'],
  ['js', '/funding/pledges', 'funding pledge workflow must be wired'],
  ['js', '/impact-passport', 'impact passport must be wired'],
  ['js', '/notification-preferences', 'notification preferences must be wired'],
  ['js', '/privacy/', 'privacy controls must be wired'],
  ['js', '/safety/', 'safety workflows must be wired'],
  ['gateway', 'WEB_ALLOWED_ORIGINS', 'API must have explicit web-origin configuration'],
  ['helm', 'WEB_ALLOWED_ORIGINS', 'deployment must pass the web-origin allowlist']
]) requireText(where, text, reason);

if (/clientSecret|client_secret|OIDC_CLIENT_SECRET/i.test(files.config)) failures.push('config: browser runtime configuration must not contain a client secret');
if (/Access-Control-Allow-Origin[^\n]*\*/.test(files.gateway)) failures.push('gateway: wildcard authenticated CORS is forbidden');
if (!files.gateway.includes('origin == "*"')) failures.push('gateway: wildcard origin rejection must remain explicit');
if (!files.css.includes('@media(max-width:620px)')) failures.push('css: small-screen responsive contract is missing');

if (failures.length) {
  console.error('Web frontend contract FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Web frontend contract verified');
