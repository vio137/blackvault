'use strict';
/* INTENTIONALLY VULNERABLE training endpoint. Fake data only.
   The flaw on purpose: user input is concatenated into SQL. */
const { freshDb, rateOk, clientKey, send, readBody, parseForm } = require('../lib/db');
const crypto = require('crypto');

module.exports = async (req, res) => {
  // GET ping: lets the page warm the function on first load (real visit, one request).
  if (req.method === 'GET') {
    const db = await freshDb(); db.close();
    return send(res, 200, { ok: true, ping: true });
  }
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'POST only' });
  if (!rateOk('login:' + clientKey(req), 60, 60000)) return send(res, 429, { ok: false, error: 'slow down' });

  const form = parseForm(await readBody(req));
  const u = String(form.username || '');
  const p = String(form.password || '');

  // The vulnerable line, kept exactly this way for the lesson:
  const query = "SELECT id, username, display_name, role, balance FROM users WHERE username = '" + u + "' AND password = '" + p + "'";

  const db = await freshDb();
  let rows;
  try {
    rows = db.exec(query);
  } catch (err) {
    db.close();
    return send(res, 500, { ok: false, error: 'SQLite error: ' + String(err.message || err), query: query });
  }

  const cols = rows.length ? rows[0].columns : [];
  const values = rows.length ? rows[0].values : [];
  db.close();

  if (!values.length) {
    return send(res, 401, { ok: false, error: 'Access denied. Invalid credentials.', query: query });
  }
  const user = {};
  cols.forEach((c, i) => { user[c] = values[0][i]; });
  send(res, 200, {
    ok: true,
    user: user,
    matched_rows: values.length,
    session_token: 'bv_' + crypto.randomBytes(12).toString('hex'),
    query: query
  });
};
