const assert = require('assert');
const c = require('../assets/js/core.js');

assert.strictEqual(c.buildLoginBody('a b', "x'--"), "username=a%20b&password=x'--");

let d = c.detectInjection("' OR '1'='1' -- ", 'x', { ok: true, user: { username: 'admin' } });
assert.strictEqual(d.injected, true);
d = c.detectInjection('guest', 'guest123', { ok: true, user: { username: 'guest' } });
assert.strictEqual(d.injected, false);
d = c.detectInjection('admin', 's3cure!Vault#99', { ok: true, user: { username: 'admin' } });
assert.strictEqual(d.injected, false);
d = c.detectInjection('bob', 'bob', { ok: true, user: { username: 'admin' } });
assert.strictEqual(d.injected, true, 'logged in as someone else counts');
d = c.detectInjection('x', 'y', { ok: false });
assert.strictEqual(d.injected, false);

let raw = c.renderRawRequest('POST', '/api/login', 'username=a&password=b');
assert.ok(raw.startsWith('POST /api/login HTTP/1.1'));
assert.ok(raw.includes('Content-Length: ' + 'username=a&password=b'.length));

let p = c.parseRawRequest(raw);
assert.strictEqual(p.ok, true); assert.strictEqual(p.method, 'POST');
assert.strictEqual(p.path, '/api/login'); assert.strictEqual(p.body, 'username=a&password=b');
p = c.parseRawRequest('junk');
assert.strictEqual(p.ok, false);

assert.strictEqual(c.statusText(401), 'Unauthorized');
assert.ok(c.PIN_CANDIDATES.includes('7319'), 'real combo is in the candidate list');
console.log('frontend core tests: all pass');
