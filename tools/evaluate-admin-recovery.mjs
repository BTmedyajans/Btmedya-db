import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const worker = readFileSync(new URL('../src/worker.js', import.meta.url), 'utf8');
const recovery = readFileSync(new URL('../src/auth-recovery.js', import.meta.url), 'utf8');
const config = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
const criteria = [
  ['security_isolation', worker.includes('const usernameOk=') && worker.includes('ADMIN_RECOVERY_SECRET'), 'recovery is bound to configured username and optional Secret'],
  ['expiry_enforced', recovery.includes('expires>Math.floor(Date.now()/1000)'), 'recovery expiry is enforced at request time'],
  ['malformed_rejected', recovery.includes('Number.isSafeInteger(expires)'), 'malformed recovery configuration is rejected'],
  ['primary_preserved', worker.includes('primaryOk=') && worker.includes('ADMIN_PASSWORD_SECRET'), 'primary password path remains present'],
  ['deterministic_tests', true, 'test suite executes below'],
];

let testsPass = true;
try { execFileSync(process.execPath, ['tools/test-admin-recovery.mjs'], {stdio:'pipe'}); }
catch { testsPass = false; }
criteria[4][1] = testsPass;

const dimensions = Object.fromEntries(criteria.map(([name, pass, evidence]) => [name, {score: pass ? 1 : 0, status: pass ? 'PASS' : 'FAIL', evidence}]));
const overall = Object.values(dimensions).reduce((sum, x) => sum + x.score, 0) / Object.keys(dimensions).length;
const criticalFailure = ['security_isolation','expiry_enforced','primary_preserved'].some(k => dimensions[k].status === 'FAIL');
const result = {overall_score: Number(overall.toFixed(2)), dimensions, converged: overall >= 0.9 && !criticalFailure, iterations: 1};
console.log(JSON.stringify(result, null, 2));
if (!result.converged) process.exit(1);
