/* BLACKVAULT frontend core: pure logic, unit-tested in node. */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BVCore = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  function buildLoginBody(username, password) {
    return 'username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password);
  }

  /* Did this login succeed because of an injection rather than real creds?
     Honest rule: the server returned ok, and either the typed text contains
     SQL meta-characters or the server logged us in as someone else. */
  function detectInjection(typedUsername, typedPassword, response) {
    if (!response || !response.ok || !response.user) return { injected: false };
    var meta = /('|"|--|\/\*|\bOR\b|\bUNION\b)/i;
    var typedSomethingElse = response.user.username && typedUsername !== response.user.username;
    if (meta.test(typedUsername) || meta.test(typedPassword) || typedSomethingElse) {
      return { injected: true, as: response.user.username || null };
    }
    return { injected: false };
  }

  function renderRawRequest(method, path, body, host) {
    var lines = [
      method + ' ' + path + ' HTTP/1.1',
      'Host: ' + (host || 'blackvault.vercel.app'),
      'Content-Type: application/x-www-form-urlencoded',
      'Content-Length: ' + (body ? body.length : 0),
      '',
      body || ''
    ];
    return lines.join('\r\n');
  }

  function renderRawResponse(status, statusText, jsonText) {
    return [
      'HTTP/1.1 ' + status + ' ' + statusText,
      'Content-Type: application/json',
      '',
      jsonText
    ].join('\r\n');
  }

  var STATUS_TEXT = { 200: 'OK', 401: 'Unauthorized', 404: 'Not Found', 405: 'Method Not Allowed', 429: 'Too Many Requests', 500: 'Internal Server Error' };

  function statusText(code) { return STATUS_TEXT[code] || 'Status'; }

  /* Parse the editable raw request in Direct mode: first line + body. */
  function parseRawRequest(raw) {
    var text = String(raw);
    var sep = text.indexOf('\r\n\r\n');
    var sepLen = 4;
    if (sep === -1) { sep = text.indexOf('\n\n'); sepLen = 2; }
    var head = sep === -1 ? text : text.slice(0, sep);
    var body = sep === -1 ? '' : text.slice(sep + sepLen);
    var firstLine = head.split(/\r?\n/, 1)[0];
    var m = firstLine.match(/^([A-Z]+)\s+(\S+)\s+HTTP\/[\d.]+/);
    if (!m) return { ok: false, error: 'first line must look like: POST /api/login HTTP/1.1' };
    return { ok: true, method: m[1], path: m[2], body: body };
  }

  var PIN_CANDIDATES = ['1234','0000','1111','2222','1212','7777','1004','2000','4444','9999',
    '1122','1313','4321','1010','2020','5555','6666','8888','6969','2580',
    '0852','1975','1990','2001','9876','7410','8520','9630','1590','3570',
    '4862','1029','3141','2718','1618','7319','5150','4040','9009','1337'];

  return {
    buildLoginBody: buildLoginBody,
    detectInjection: detectInjection,
    renderRawRequest: renderRawRequest,
    renderRawResponse: renderRawResponse,
    statusText: statusText,
    parseRawRequest: parseRawRequest,
    PIN_CANDIDATES: PIN_CANDIDATES
  };
});
