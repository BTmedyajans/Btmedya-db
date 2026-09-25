import assert from 'node:assert/strict';
import { recoveryPasswordValid } from '../src/auth-recovery.js';

const now = Math.floor(Date.now() / 1000);
const valid = `${now + 900}:Btmedya10.10`;

assert.equal(recoveryPasswordValid('Btmedya10.10', valid), true, 'valid recovery code should pass');
assert.equal(recoveryPasswordValid('wrong', valid), false, 'wrong recovery code should fail');
assert.equal(recoveryPasswordValid('Btmedya10.10', `${now - 1}:Btmedya10.10`), false, 'expired code should fail');
assert.equal(recoveryPasswordValid('Btmedya10.10', 'not-a-timestamp:Btmedya10.10'), false, 'malformed timestamp should fail');
assert.equal(recoveryPasswordValid('Btmedya10.10', `${now + 900}:`), false, 'empty code should fail');
assert.equal(recoveryPasswordValid('Btmedya10.10', ''), false, 'missing recovery secret should fail');
assert.equal(recoveryPasswordValid('Btmedya10.10', undefined), false, 'undefined recovery secret should fail');

console.log('admin recovery tests: PASS (7 assertions)');
