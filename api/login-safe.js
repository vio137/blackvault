'use strict';
/* The hardened twin: same login, parameterized query. Used by the defense demo. */
const { freshDb, rateOk, clientKey, send, readBody, parseForm } = require('../lib/db');
const crypto = require('crypto');

module.exports = async (req, res) => {
  // GET ping: lets the page warm the function on first load (real visit, one request).
  if (req.method === 'GET') {
    const db = await freshDb(); db.close();
    return send(res, 200, { ok: true, ping: true });
  }
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'POST only' });
  if (!rateOk('safelogin:' + clientKey(req), 60, 60000)) return send(res, 429, { ok: false, error: 'slow down' });

  const form = parseForm(await readBody(req));
  const u = String(form.username || '');
  const p = String(form.password || '');

  const db = await freshDb();
  const stmt = db.prepare('SELECT id, username, display_name, role, balance FROM users WHERE username = ? AND password = ?');
  stmt.bind([u, p]);
  const found = stmt.step();
  const row = found ? stmt.getAsObject() : null;
  stmt.free();
  db.close();

  if (!row) {
    return send(res, 401, { ok: false, error: 'Access denied. Invalid credentials.', query: 'SELECT ... WHERE username = ? AND password = ?  (parameters bound, never concatenated)' });
  }
  send(res, 200, {
    ok: true,
    user: row,
    matched_rows: 1,
    session_token: 'bv_' + crypto.randomBytes(12).toString('hex'),
    query: 'SELECT ... WHERE username = ? AND password = ?  (parameters bound, never concatenated)'
  });
};
