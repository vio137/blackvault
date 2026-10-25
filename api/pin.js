'use strict';
/* Side gate PIN for the Intruder lab. Correct combo leaks via the UNION lab too. */
const { rateOk, clientKey, send, readBody, parseForm } = require('../lib/db');

const COMBO = '7319';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'POST only' });
  if (!rateOk('pin:' + clientKey(req), 240, 60000)) return send(res, 429, { ok: false, error: 'slow down' });

  const form = parseForm(await readBody(req));
  const pin = String(form.pin || '');
  if (pin === COMBO) {
    return send(res, 200, { ok: true, message: 'Side gate unlocked.', flag: 'FLAG{1ntrud3r_f0rc3d_th3_c0mb0}' });
  }
  send(res, 401, { ok: false, error: 'Wrong combo.' });
};
