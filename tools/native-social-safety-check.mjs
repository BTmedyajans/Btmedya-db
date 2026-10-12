import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const autopilot = readFileSync("src/autopilot.js", "utf8");
const worker = readFileSync("src/worker.js", "utf8");
const direct = readFileSync("src/direct-social.js", "utf8");

// Prevent a silent D1 CREATE TABLE failure in the audit/error log.
assert.match(
  autopilot,
  /CREATE TABLE IF NOT EXISTS autopilot_log \([\s\S]*?created_at TEXT NOT NULL\s*\)\`\)\.run\(\)\.catch\(\(\)=>\{\}\);/,
  "autopilot_log CREATE TABLE must close its SQL parenthesis before execution"
);
assert.match(
  autopilot,
  /INSERT INTO autopilot_log\(run_id,action,target,status,reason,detail,created_at\)/,
  "autopilot must write structured audit events"
);

// The native publisher must encrypt stored OAuth credentials and require an admin session.
assert.match(direct, /AES-GCM/, "OAuth tokens must be encrypted at rest");
assert.match(direct, /validSession\(/, "Social OS mutations must have session validation");
assert.match(worker, /processDirectSocialQueue\(/, "Worker must process the native queue");

// Drafts are not equivalent to scheduled/published posts.
assert.match(autopilot, /mode\s*:\s*"draft"/, "unconnected platforms should fall back to drafts");
assert.match(autopilot, /"onayda"/, "social drafts must remain approval-gated");

console.log("BTMEDYA_NATIVE_SOCIAL_SAFETY_CHECKS_PASS");
