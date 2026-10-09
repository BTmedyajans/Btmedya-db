import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../public/haberler-akisi.js", import.meta.url), "utf8");
assert.match(source, /function zamanAsimliFetch\(url, options, sure\)/, "feed timeout wrapper must exist");
assert.match(source, /8000\)/, "news API must have a bounded timeout");
assert.match(source, /5000\)/, "cover credits must have a bounded timeout");
assert.match(source, /catch \(e\) \{\s*akisYuklenemedi\(\);\s*return;\s*\}/, "feed failures must use visible fallback");
assert.match(source, /finally\(function \(\) \{ if \(zamanlayici\) clearTimeout\(zamanlayici\); \}\)/, "timeout must be cleared after completion");
console.log("NEWS_FEED_TIMEOUT_SMOKE_OK");
