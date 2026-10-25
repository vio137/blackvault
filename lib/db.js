'use strict';
/* Shared in-memory SQLite for the intentionally vulnerable training API.
   A fresh database is built per request: no persistence, fake data only. */
const path = require('path');
const initSqlJs = require('sql.js');

let sqlPromise = null;
function getSql() {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      locateFile: (file) => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file)
    });
  }
  return sqlPromise;
}

async function freshDb() {
  const SQL = await getSql();
  const db = new SQL.Database();
  db.run(`
    CREATE TABLE users (id INTEGER, username TEXT, password TEXT, display_name TEXT, role TEXT, balance REAL);
    INSERT INTO users VALUES
      (1, 'admin',  's3cure!Vault#99', 'A. Mondal (Root Teller)', 'ADMIN', 999999.00),
      (2, 'guest',  'guest123',        'Guest User',              'GUEST', 12.50),
      (3, 'arya',   'chai-lover',      'Arya Sen',                'USER',  5400.75),
      (4, 'rishi',  'password1',       'Rishi Kapoor',            'USER',  870.00);
    CREATE TABLE transactions (id INTEGER, account INTEGER, kind TEXT, amount REAL, note TEXT);
    INSERT INTO transactions VALUES
      (1, 2, 'coffee',       -210.00,  'Cafe on Park St'),
      (2, 2, 'topup',        500.00,   'UPI top-up'),
      (3, 1, 'vault_audit',  0.00,     'Quarterly audit seal'),
      (4, 3, 'rent',         -18000.0, 'Salt Lake flat');
    CREATE TABLE vault_secrets (id INTEGER, code TEXT, note TEXT);
    INSERT INTO vault_secrets VALUES
      (1, 'FLAG{sql1_1s_4ll_1_n33d}', 'Master vault override code'),
      (2, 'VAULT-COMBO-7319',         'Side gate PIN, in plain text. Oops.');
  `);
  return db;
}

/* Naive per-instance rate limiter, good enough for a training toy. */
const hits = new Map();
function rateOk(key, limit, windowMs) {
  const now = Date.now();
  const rec = hits.get(key) || { count: 0, reset: now + windowMs };
  if (now > rec.reset) { rec.count = 0; rec.reset = now + windowMs; }
  rec.count += 1;
  hits.set(key, rec);
  return rec.count <= limit;
}

function clientKey(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (typeof fwd === 'string' ? fwd.split(',')[0].trim() : 'anon');
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 8192) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}

function parseForm(body) {
  const out = {};
  for (const pair of String(body).split('&')) {
    if (!pair) continue;
    const i = pair.indexOf('=');
    const k = i === -1 ? pair : pair.slice(0, i);
    const v = i === -1 ? '' : pair.slice(i + 1);
    out[decodeURIComponent(k.replace(/\+/g, ' '))] = decodeURIComponent(v.replace(/\+/g, ' '));
  }
  return out;
}

module.exports = { freshDb, rateOk, clientKey, send, readBody, parseForm };
