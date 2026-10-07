import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const source = readFileSync('src/worker.js','utf8');
assert.match(source,/function normalizeAiDraft\(value, fallback\)/);
assert.match(source,/Array\.isArray\(value\)/);
assert.match(source,/const body=clean\(o.body,16000\)/);
assert.match(source,/guardrail:'invalid-ai-output'/);
assert.match(source,/draft\=normalizeAiDraft\(parsed,\{title\}\)/);

console.log('AI draft guardrail contract: OK');
