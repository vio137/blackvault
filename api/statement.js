'use strict';
/* INTENTIONALLY VULNERABLE training endpoint #2: numeric injection + UNION. */
const { freshDb, rateOk, clientKey, send } = require('../lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { ok: false, error: 'GET only' });
  if (!rateOk('stmt:' + clientKey(req), 120, 60000)) return send(res, 429, { ok: false, error: 'slow down' });

  const url = new URL(req.url, 'http://local');
  const account = url.searchParams.get('account') || '';

  // The vulnerable line: no quotes needed for a numeric parameter.
  const query = 'SELECT id, kind, amount, note FROM transactions WHERE account = ' + account;

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
  send(res, 200, { ok: true, columns: cols, rows: values, query: query });
};
