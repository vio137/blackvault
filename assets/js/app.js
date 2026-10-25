/* BLACKVAULT app: UI, motion, lab wiring, deck. */
(function () {
'use strict';
var C = window.BVCore;
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

/* ---------- toast ---------- */
var toastTimer = null;
function toast(msg) {
  var t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
}

/* ---------- sound (optional, off by default) ---------- */
var audio = { on: false, ctx: null };
function beep(freq, dur, type, gain) {
  if (!audio.on) return;
  try {
    audio.ctx = audio.ctx || new (window.AudioContext || window.webkitAudioContext)();
    var o = audio.ctx.createOscillator(), g = audio.ctx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(gain || 0.05, audio.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.ctx.currentTime + (dur || 0.12));
    o.connect(g); g.connect(audio.ctx.destination);
    o.start(); o.stop(audio.ctx.currentTime + (dur || 0.12));
  } catch (e) {}
}
function successChime() { beep(523, .14, 'triangle', .06); setTimeout(function(){beep(784,.18,'triangle',.06);},130); setTimeout(function(){beep(1047,.3,'triangle',.05);},280); }
$('#sound-toggle').addEventListener('click', function () {
  audio.on = !audio.on;
  this.setAttribute('aria-pressed', String(audio.on));
  this.textContent = 'Sound: ' + (audio.on ? 'on' : 'off');
  if (audio.on) beep(660, .1);
});

/* ---------- background particles ---------- */
(function () {
  var cv = $('#bg-canvas'), ctx = cv.getContext('2d'), pts = [], W, H;
  function size() { W = cv.width = innerWidth; H = cv.height = innerHeight; }
  size(); addEventListener('resize', size);
  for (var i = 0; i < 70; i++) pts.push({ x: Math.random(), y: Math.random(), vx: (Math.random() - .5) * .0004, vy: (Math.random() - .5) * .0004, r: Math.random() * 1.8 + .4 });
  (function loop() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      p.x = (p.x + p.vx + 1) % 1; p.y = (p.y + p.vy + 1) % 1;
      ctx.fillStyle = 'rgba(255,176,32,' + (0.12 + p.r * 0.08) + ')';
      ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.r, 0, 7); ctx.fill();
      for (var j = i + 1; j < pts.length; j++) {
        var q = pts[j], dx = (p.x - q.x) * W, dy = (p.y - q.y) * H, d = dx * dx + dy * dy;
        if (d < 130 * 130) {
          ctx.strokeStyle = 'rgba(45,212,238,' + (0.05 * (1 - d / 16900)) + ')';
          ctx.beginPath(); ctx.moveTo(p.x * W, p.y * H); ctx.lineTo(q.x * W, q.y * H); ctx.stroke();
        }
      }
    }
    requestAnimationFrame(loop);
  })();
})();

/* ---------- confetti ---------- */
var confetti = (function () {
  var cv = $('#confetti-canvas'), ctx = cv.getContext('2d'), parts = [], running = false;
  function size() { cv.width = innerWidth; cv.height = innerHeight; }
  size(); addEventListener('resize', size);
  function burst(n) {
    for (var i = 0; i < (n || 160); i++) {
      parts.push({ x: innerWidth / 2, y: innerHeight * .38, vx: (Math.random() - .5) * 14, vy: Math.random() * -11 - 2,
        g: .32, life: 90 + Math.random() * 50, c: ['#ffb020', '#ff6b1a', '#2dd4ee', '#34d399', '#eaf0fa'][i % 5],
        s: Math.random() * 6 + 3, rot: Math.random() * 6 });
    }
    if (!running) { running = true; loop(); }
  }
  function loop() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter(function (p) { return p.life > 0 && p.y < cv.height + 30; });
    if (!parts.length) { running = false; return; }
    parts.forEach(function (p) {
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life--; p.rot += .1;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); ctx.restore();
    });
    requestAnimationFrame(loop);
  }
  return { burst: burst };
})();

/* ---------- reveal on scroll ---------- */
var io = new IntersectionObserver(function (es) {
  es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); beep(220, .05, 'sine', .015); } });
}, { threshold: .12 });
$$('.reveal').forEach(function (el) { io.observe(el); });

/* ---------- tilt ---------- */
$$('.tilt').forEach(function (card) {
  card.addEventListener('pointermove', function (e) {
    var r = card.getBoundingClientRect();
    var rx = ((e.clientY - r.top) / r.height - .5) * -7, ry = ((e.clientX - r.left) / r.width - .5) * 7;
    card.style.transform = 'perspective(700px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
  });
  card.addEventListener('pointerleave', function () { card.style.transform = ''; });
});

/* ---------- ticker ---------- */
(function () {
  var items = ['INTERCEPT', 'INJECT', "OR '1'='1", 'HTTP/1.1 200 OK', 'REPEATER', 'INTRUDER', 'FORWARD', 'DROP', 'UNION SELECT', 'BURP SUITE', 'SQL INJECTION', 'VAULT OPEN'];
  var half = items.map(function (t, i) { return i % 2 ? '<span>' + t + '</span>' : '<b>' + t + '</b>'; }).join('<span>&middot;</span>');
  $('#ticker-track').innerHTML = half + '<span>&middot;</span>' + half + '<span>&middot;</span>';
})();

/* ---------- copy buttons ---------- */
var PAYLOADS = {
  'payload-1': "' OR '1'='1' -- ",
  'payload-2': '-1 UNION SELECT id, code, note, 0 FROM vault_secrets',
  'pin-list': C.PIN_CANDIDATES.join('\n')
};
$$('.copy-btn').forEach(function (b) {
  b.addEventListener('click', function () {
    var key = b.getAttribute('data-copy'), text;
    if (key === 'page-url') text = location.href;
    else if (key === 'union-target-url') text = location.origin + '/api/statement?account=2';
    else text = PAYLOADS[key] || '';
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () {
      toast('Copied to clipboard'); beep(880, .07, 'square', .03);
    }, function () { toast('Copy failed - select the text manually'); });
  });
});

/* ---------- lab state ---------- */
var lab = { mode: 'burp', endpoint: 'vuln', baseline401: false, won: false };

function setStep(listSel, name, state, note) {
  var li = $(listSel + ' .step[data-step="' + name + '"]');
  if (!li) return;
  li.classList.remove('active', 'done');
  if (state) li.classList.add(state);
  if (note) { var s = $('.step-status', li); if (s) s.textContent = note; }
}

/* wire view */
function showWire(reqText, resStatus, resJson) {
  $('#http-req').textContent = reqText;
  var res = $('#http-res');
  res.textContent = C.renderRawResponse(resStatus, C.statusText(resStatus), resJson);
}
$$('.http-tab').forEach(function (tab) {
  tab.addEventListener('click', function () {
    $$('.http-tab').forEach(function (t) { t.classList.remove('active'); });
    tab.classList.add('active');
    var pane = tab.getAttribute('data-pane');
    $('#http-req').hidden = pane !== 'req';
    $('#http-res').hidden = pane !== 'res';
  });
});

/* endpoint toggle */
$('#mode-vuln').addEventListener('click', function () { setEndpoint('vuln'); });
$('#mode-safe').addEventListener('click', function () { setEndpoint('safe'); });
$('#go-hardened').addEventListener('click', function () {
  setEndpoint('safe');
  document.getElementById('lab').scrollIntoView({ behavior: 'smooth' });
  toast('Bank switched to the hardened server. Fire the payload again.');
});
function setEndpoint(which) {
  lab.endpoint = which;
  $('#mode-vuln').classList.toggle('active', which === 'vuln');
  $('#mode-safe').classList.toggle('active', which === 'safe');
  $('#endpoint-label').textContent = 'POST ' + (which === 'vuln' ? '/api/login' : '/api/login-safe');
}

/* mode tabs */
$('#tab-burp').addEventListener('click', function () { setMode('burp'); });
$('#tab-direct').addEventListener('click', function () { setMode('direct'); });
function setMode(m) {
  lab.mode = m;
  $('#tab-burp').classList.toggle('active', m === 'burp');
  $('#tab-direct').classList.toggle('active', m === 'direct');
  $('#steps-burp').hidden = m !== 'burp';
  $('#steps-direct').hidden = m !== 'direct';
  $('#direct-note').hidden = m !== 'direct';
}

/* login flow */
var pendingRequest = null;
$('#login-form').addEventListener('submit', function (e) {
  e.preventDefault();
  var u = $('#f-user').value, p = $('#f-pass').value;
  var path = lab.endpoint === 'vuln' ? '/api/login' : '/api/login-safe';
  var body = C.buildLoginBody(u, p);
  var raw = C.renderRawRequest('POST', path, body, location.host);
  if (lab.mode === 'direct') {
    pendingRequest = { typedU: u, typedP: p };
    $('#intercept-editor').value = raw;
    $('#intercept-modal').hidden = false;
    beep(330, .15, 'square', .04);
  } else {
    sendLogin(path, body, u, p, raw);
  }
});
$('#intercept-drop').addEventListener('click', function () {
  $('#intercept-modal').hidden = true; pendingRequest = null;
  toast('Request dropped. The server never saw it.');
});
$('#intercept-forward').addEventListener('click', function () {
  var parsed = C.parseRawRequest($('#intercept-editor').value);
  if (!parsed.ok) { toast(parsed.error); return; }
  $('#intercept-modal').hidden = true;
  var u = pendingRequest ? pendingRequest.typedU : '';
  var p = pendingRequest ? pendingRequest.typedP : '';
  sendLogin(parsed.path, parsed.body, u, p, $('#intercept-editor').value);
  pendingRequest = null;
});

function sendLogin(path, body, typedU, typedP, rawForView, retried) {
  var btn = $('#login-btn'); btn.disabled = true; btn.textContent = retried ? 'Waking server...' : 'Sending...';
  fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
    .then(function (res) {
      return res.text().then(function (text) { return { status: res.status, text: text }; });
    })
    .then(function (r) {
      showWire(rawForView || C.renderRawRequest('POST', path, body, location.host), r.status, pretty(r.text));
      var json;
      try { json = JSON.parse(r.text); } catch (e) { json = { ok: false, error: 'non-JSON response' }; }
      handleLoginResult(r.status, json, typedU, typedP);
    })
    .catch(function () {
      if (!retried) { toast('Server is waking from idle - one automatic retry.'); sendLogin(path, body, typedU, typedP, rawForView, true); return; }
      toast('Network error - the server did not answer');
    })
    .finally(function () { btn.disabled = false; btn.textContent = 'Sign in'; });
}
function pretty(text) { try { return JSON.stringify(JSON.parse(text), null, 2); } catch (e) { return text; } }

function handleLoginResult(status, json, typedU, typedP) {
  if (status === 404 || status === 405) {
    beep(180, .2, 'sawtooth', .05);
    toast(status + ' - the bank has nothing at that path. Check the request line.');
    return;
  }
  if (status === 401) {
    document.dispatchEvent(new CustomEvent('bv:login401'));
    $('#bank-app').classList.add('shake');
    setTimeout(function () { $('#bank-app').classList.remove('shake'); }, 500);
    beep(160, .25, 'sawtooth', .05);
    if (lab.endpoint === 'vuln' && !lab.baseline401) {
      lab.baseline401 = true;
      setStep('#steps-burp', 'baseline', 'done', '401 seen. Good. That wall is the target.');
      setStep('#steps-burp', 'openburp', 'active');
    }
    if (lab.endpoint === 'safe' && /OR|'/i.test(typedU)) {
      toast('Same payload, hardened server: 401. The fix works.');
    } else {
      toast('Access denied (401). Exactly what the bank wants you to see.');
    }
    return;
  }
  if (status === 500) {
    beep(200, .3, 'sawtooth', .05);
    toast('SQL error! The database just told you it heard your quote. Read the response.');
    return;
  }
  if (json && json.ok && json.user) {
    openDashboard(json, typedU, typedP);
  }
}

function openDashboard(json, typedU, typedP) {
  document.dispatchEvent(new CustomEvent('bv:dash'));
  $('#login-pane').hidden = true;
  $('#dash-pane').hidden = false;
  $('#dash-welcome').textContent = 'Welcome, ' + (json.user.display_name || json.user.username);
  $('#dash-role').textContent = 'role: ' + json.user.role + ' · account #' + json.user.id;
  $('#dash-balance').textContent = '₹ ' + Number(json.user.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  $('#dash-token').textContent = json.session_token || '-';

  var det = C.detectInjection(typedU, typedP, json);
  if (det.injected && lab.endpoint === 'vuln') {
    $('#injection-banner').hidden = false;
    $('#injection-detail').textContent = 'You signed in as "' + det.as + '" without knowing a password. The server ran your SQL, not the bank\'s.';
    if (!lab.won) {
      lab.won = true;
      confetti.burst(220); successChime();
      setStep('#steps-burp', 'inject', 'done', 'VAULT OPEN. Heist complete.');
      setStep('#steps-direct', 'd-win', 'done', 'VAULT OPEN. Heist complete.');
      ['openburp', 'arm', 'fire'].forEach(function (s) { setStep('#steps-burp', s, 'done'); });
      setStep('#steps-direct', 'd-fire', 'done'); setStep('#steps-direct', 'd-edit', 'done');
      toast('VAULT OPEN - you are in as ' + det.as);
    }
  } else {
    $('#injection-banner').hidden = true;
    confetti.burst(60);
    toast('Signed in as ' + (json.user.username || '?') + ' (real credentials)');
  }
}
$('#logout-btn').addEventListener('click', function () {
  $('#dash-pane').hidden = true; $('#login-pane').hidden = false;
  $('#f-user').value = ''; $('#f-pass').value = '';
});

/* ---------- query assembly animation ---------- */
var qbFrames = [
  { html: '<span class="q-kw">SELECT</span> <span class="q-tpl">id, username, role, balance</span> <span class="q-kw">FROM</span> <span class="q-tpl">users</span>\n<span class="q-kw">WHERE</span> <span class="q-tpl">username = </span><span class="q-str">\'<span class="q-hole">?????</span>\'</span><span class="q-tpl"> </span><span class="q-kw">AND</span> <span class="q-tpl">password = </span><span class="q-str">\'<span class="q-hole">?????</span>\'</span>',
    cap: 'The server starts with a template and two holes where your input goes.' },
  { html: '<span class="q-kw">SELECT</span> <span class="q-tpl">id, username, role, balance</span> <span class="q-kw">FROM</span> <span class="q-tpl">users</span>\n<span class="q-kw">WHERE</span> <span class="q-tpl">username = </span><span class="q-str">\'<span class="q-inj">\' OR \'1\'=\'1\' -- </span>\'</span><span class="q-tpl"> </span><span class="q-kw">AND</span> <span class="q-tpl">password = </span><span class="q-str">\'x\'</span>',
    cap: 'Your typing lands inside the quotes. But your first character is a quote of its own...' },
  { html: '<span class="q-kw">WHERE</span> <span class="q-tpl">username = </span><span class="q-str">\'\'</span> <span class="q-kw">OR</span> <span class="q-str">\'1\'=\'1\'</span><span class="q-inj"> -- </span><span class="q-dead">\' AND password = \'x\'</span>',
    cap: 'The quote closes the string early. OR \'1\'=\'1\' is always true. The -- comments out everything after, including the password check.' },
  { html: '<span class="q-kw">WHERE</span> <span class="q-tpl">username = \'\'</span> <span class="q-kw">OR</span> <span class="q-inj">TRUE</span>',
    cap: 'What the database actually runs: return every row. The server signs you in as the first one. The first one is admin.' }
];
var qbIdx = 0, qbTimer = null;
$('#qb-play').addEventListener('click', function () {
  qbIdx = 0; clearInterval(qbTimer);
  renderQb();
  qbTimer = setInterval(function () {
    qbIdx++;
    if (qbIdx >= qbFrames.length) { clearInterval(qbTimer); return; }
    renderQb(); beep(440 + qbIdx * 120, .1, 'triangle', .04);
  }, 2600);
});
function renderQb() {
  $('#query-build').innerHTML = qbFrames[qbIdx].html;
  $('#qb-caption').textContent = qbFrames[qbIdx].cap;
}
renderQb();

/* ---------- bonus lab 1: UNION ---------- */
$('#union-url').value = '/api/statement?account=2';
$('#union-run').addEventListener('click', function () {
  var url = $('#union-url').value.trim();
  if (!url.startsWith('/api/statement')) { toast('Keep the path at /api/statement - that is the target'); return; }
  fetch(url).then(function (res) { return res.text().then(function (t) { return { status: res.status, text: t }; }); })
    .then(function (r) {
      var json; try { json = JSON.parse(r.text); } catch (e) { toast('Non-JSON response'); return; }
      renderUnion(json);
    });
});
function renderUnion(json) {
  var wrap = $('#union-result'), table = $('#union-table');
  wrap.hidden = false;
  if (!json.ok) {
    table.innerHTML = '<tr><td style="color:var(--red)">' + escapeHtml(json.error || 'error') + '</td></tr>';
    beep(200, .3, 'sawtooth', .05);
    toast('SQL error - the database is complaining. Read it, it is helping you.');
    return;
  }
  var html = '<tr>' + json.columns.map(function (c) { return '<th>' + escapeHtml(c) + '</th>'; }).join('') + '</tr>';
  var stoleFlag = false;
  json.rows.forEach(function (row) {
    var isFlag = row.some(function (cell) { return typeof cell === 'string' && (cell.indexOf('FLAG{') === 0 || cell.indexOf('VAULT-COMBO') === 0); });
    if (isFlag) stoleFlag = true;
    html += '<tr' + (isFlag ? ' class="flagrow"' : '') + '>' + row.map(function (c) { return '<td>' + escapeHtml(String(c)) + '</td>'; }).join('') + '</tr>';
  });
  table.innerHTML = html;
  if (stoleFlag) { confetti.burst(160); successChime(); toast('Vault codes stolen. FLAG captured.'); }
  else { beep(660, .1); toast(json.rows.length + ' rows returned'); }
}
function escapeHtml(s) { return s.replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

/* ---------- bonus lab 2: Intruder-style PIN attack ---------- */
var pinRunning = false;
$('#pin-auto').addEventListener('click', function () {
  if (pinRunning) return;
  pinRunning = true;
  var grid = $('#pin-grid'); grid.hidden = false; grid.innerHTML = '';
  var list = C.PIN_CANDIDATES.slice();
  $('#pin-status').textContent = 'firing 0/' + list.length + ' (about 1 request per 450ms, same requests Intruder sends)';
  var i = 0;
  (function next() {
    if (i >= list.length) { pinRunning = false; return; }
    var pin = list[i]; i++;
    $('#pin-status').textContent = 'firing ' + i + '/' + list.length + ' - watch for the odd response';
    fetch('/api/pin', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'pin=' + pin })
      .then(function (res) { return res.text().then(function (t) { return { status: res.status, len: t.length, ok: res.status === 200, flag: safeFlag(t) }; }); })
      .then(function (r) {
        var cell = document.createElement('div');
        cell.className = 'pin-cell ' + (r.ok ? 'good' : 'bad');
        cell.innerHTML = pin + '<small>' + r.status + ' · ' + r.len + 'B</small>';
        grid.appendChild(cell);
        beep(r.ok ? 880 : 240, r.ok ? .2 : .04, r.ok ? 'triangle' : 'square', r.ok ? .06 : .015);
        if (r.ok) {
          pinRunning = false;
          confetti.burst(180); successChime();
          $('#pin-status').textContent = 'CRACKED: ' + pin + ' - ' + (r.flag || 'gate open') + '. One response out of ' + i + ' had a different status and length.';
          toast('Side gate cracked: PIN ' + pin);
          return;
        }
        setTimeout(next, 450);
      })
      .catch(function () { pinRunning = false; });
  })();
});
function safeFlag(t) { try { var j = JSON.parse(t); return j.flag; } catch (e) { return null; } }

/* ---------- presentation deck ---------- */
var SLIDES = [
  { h: 'BLACKVAULT', body: '<p class="big">Break the bank<br><span class="accent">with Burp Suite.</span></p><p style="margin-top:1rem">A live SQL injection heist, demonstrated on this very website.</p><p style="margin-top:1.6rem">Done by <strong style="color:var(--text)">Debabrata Mondal</strong> · PCA1 · MAKAUT, West Bengal</p>' },
  { h: 'What is Burp Suite?', body: '<p>The industry-standard toolkit for testing web security, made by PortSwigger. Its heart is an <strong style="color:var(--text)">interception proxy</strong>: it parks itself between your browser and the website and lets you read, edit and replay everything that passes.</p><ul style="margin-top:1rem"><li><strong style="color:var(--text)">Proxy</strong> - pause and rewrite live traffic</li><li><strong style="color:var(--text)">Repeater</strong> - hand-craft and resend one request, again and again</li><li><strong style="color:var(--text)">Intruder</strong> - fire thousands of automated payload variations</li></ul>' },
  { h: 'The middle seat', body: '<p>Your browser thinks it is talking to the bank. The bank thinks it is talking to you. Burp sits in between, and nothing moves until you say so.</p><div class="mono-block">browser  ──▶  [ BURP: read · edit · forward ]  ──▶  server\nbrowser  ◀──  [ BURP: read · edit · forward ]  ◀──  server</div><p style="margin-top:1rem">Tonight\'s weapon of choice: the Proxy.</p>' },
  { h: 'HTTP in 15 seconds', body: '<p>Every action on the web is a request and a response. Plain text. Readable. Rewritable.</p><div class="mono-block">POST /api/login HTTP/1.1\nContent-Type: application/x-www-form-urlencoded\n\nusername=admin&amp;password=hunter2</div><p style="margin-top:1rem">If you can edit that block before the server sees it, you control what the server believes.</p>' },
  { h: 'The bank\'s fatal habit', body: '<p>BLACKVAULT checks your login by gluing your typing into a SQL command:</p><div class="mono-block">query = <span class="q-kw">"SELECT ... WHERE username = \'"</span> + you + <span class="q-kw">"\' AND password = \'"</span> + you + <span class="q-kw">"\'"</span></div><p style="margin-top:1rem">Whatever you type becomes part of the command. Data was supposed to stay data. It does not.</p>' },
  { h: 'SQL in 20 seconds', body: '<p>SQL is how programs ask databases questions.</p><div class="mono-block"><span class="q-kw">SELECT</span> * <span class="q-kw">FROM</span> users <span class="q-kw">WHERE</span> username = \'admin\' <span class="q-kw">AND</span> password = \'...\'</div><p style="margin-top:1rem">Quotes mark where text begins and ends. <span class="q-inj">--</span> starts a comment and silences the rest of the line. Remember those two facts; they are the whole exploit.</p>' },
  { h: 'The payload, dissected', body: '<div class="mono-block">\' <span class="q-inj">OR</span> \'1\'=\'1\' <span class="q-inj">-- </span></div><ul style="margin-top:1rem"><li><strong style="color:var(--text)">\'</strong> - closes the string the server opened</li><li><strong style="color:var(--text)">OR \'1\'=\'1\'</strong> - adds a condition that is always true</li><li><strong style="color:var(--text)">--</strong> - comments out the password check entirely</li></ul><p style="margin-top:1rem">The WHERE clause collapses to "true for every row". The database returns everyone. The server signs you in as row one: admin.</p>' },
  { h: 'The heist, live', body: '<ul><li>Try <strong style="color:var(--text)">admin / anything</strong> - collect the 401</li><li>Open Burp, Proxy &rarr; Intercept &rarr; <strong style="color:var(--text)">Open browser</strong></li><li>Turn <strong style="color:var(--text)">Intercept on</strong>, submit the login again</li><li>Replace the username with the payload, press <strong style="color:var(--text)">Forward</strong></li><li>The server runs your SQL. The vault opens.</li></ul><p style="margin-top:1rem">No Burp at hand? Direct mode on the page sends the same edited bytes to the same server.</p>' },
  { h: 'Bonus: Repeater and UNION', body: '<p>The statement endpoint drops an account number into SQL without quotes. Repeater lets you replay it with a rider attached:</p><div class="mono-block">/api/statement?account=<span class="q-inj">-1 UNION SELECT id, code, note, 0 FROM vault_secrets</span></div><p style="margin-top:1rem">Two result sets, stacked into one response. The vault\'s override codes come out with the transactions.</p>' },
  { h: 'Bonus: Intruder', body: '<p>A four-digit PIN guards the side gate. Intruder fires a candidate list, one request per guess, and you sort the results by response length.</p><div class="mono-block">401 · 24B   401 · 24B   401 · 24B   <span class="q-inj">200 · 87B  &lt;-- odd one out</span></div><p style="margin-top:1rem">Same attack shape cracks passwords, tokens, and hidden IDs anywhere guessing is allowed.</p>' },
  { h: 'The fix', body: '<div class="mono-block">stmt = db.prepare(<span class="q-kw">"SELECT ... WHERE username = ? AND password = ?"</span>)\nstmt.bind([you, you])</div><p style="margin-top:1rem">Parameters are never concatenated into the command, so your text can never become SQL. The site lets you fire the same payload at the hardened endpoint and watch it die. Defense is not a claim here; it is a button.</p>' },
  { h: 'Rules of the game', body: '<p>These skills are legal only on systems you own or have written permission to test. This site grants you that permission for itself, on this page, right now.</p><p style="margin-top:1.4rem">Now scroll down and break the bank. &darr;</p>' }
];
var SLIDE_NOTES = [
  'Introduce the project in one line: a bank that is meant to be broken, broken live with Burp Suite. Hold this slide ten seconds, then move.',
  'One sentence per tool. If asked: Burp Suite Community Edition is free, and everything shown today works in it.',
  'Trace the diagram with your cursor. Land one idea: Burp sees and can change everything that passes.',
  'Read the request aloud once. Stress that it is plain text - anyone parked in the middle can rewrite it.',
  'This is the entire bug: string glue. If the room remembers one slide, make it this one.',
  'Two facts only: quotes delimit text, and -- comments out the rest. Ask the room to say them back.',
  'Walk the three bullets slowly. Finish with: after this payload, the password check simply ceases to exist.',
  'Switch to the live lab now (or press Auto-demo and narrate). Do not rush the intercept moment; let the room read the edited request.',
  'Open the Repeater lab on the page, run the UNION payload, and point at the flag row when it lands in the table.',
  'Run the 40-guess attack live. The lesson is the odd response length: automation plus one anomaly.',
  'Fire the same payload at the hardened server, live. Watch it return 401. Defense is proven here, not claimed.',
  'Close on ethics: written permission is the whole difference between an engineer and a criminal. Then thank the room.'
];
var deckIdx = 0;
function buildDeck() {
  $('#deck-slides').innerHTML = SLIDES.map(function (s, i) {
    return '<div class="slide' + (i === 0 ? ' on' : '') + '"><h3>' + s.h + '</h3>' + s.body +
      '<div class="speaker-note"><span>Presenter notes</span>' + (SLIDE_NOTES[i] || '') + '</div></div>';
  }).join('');
}
buildDeck();
function deckShow(i) {
  var slides = $$('.slide');
  deckIdx = Math.max(0, Math.min(SLIDES.length - 1, i));
  slides.forEach(function (s, j) { s.classList.toggle('on', j === deckIdx); });
  $('#deck-count').textContent = (deckIdx + 1) + ' / ' + SLIDES.length;
  $('#deck-bar').style.width = ((deckIdx + 1) / SLIDES.length * 100) + '%';
  beep(500 + deckIdx * 30, .06, 'triangle', .03);
}
function deckOpen() { $('#deck').hidden = false; deckShow(0); document.body.style.overflow = 'hidden'; }
function deckClose() { $('#deck').hidden = true; document.body.style.overflow = ''; }
$('#open-deck').addEventListener('click', deckOpen);
$('#open-deck-2').addEventListener('click', deckOpen);
$('#deck-close').addEventListener('click', deckClose);
$('#deck-prev').addEventListener('click', function () { deckShow(deckIdx - 1); });
$('#deck-next').addEventListener('click', function () { deckShow(deckIdx + 1); });
$('#deck-notes').addEventListener('click', function () {
  var on = $('#deck').classList.toggle('notes-on');
  this.setAttribute('aria-pressed', on ? 'true' : 'false');
});
document.addEventListener('keydown', function (e) {
  if ($('#deck').hidden) return;
  if (e.key === 'ArrowRight') deckShow(deckIdx + 1);
  if (e.key === 'ArrowLeft') deckShow(deckIdx - 1);
  if (e.key === 'Escape') deckClose();
  if (e.key === 'n' || e.key === 'N') $('#deck-notes').click();
});

/* deep link: #presentation opens the deck */
if (location.hash === '#presentation') deckOpen();

/* ---------- connection warmup ----------
   One real request per route on page load (triggered by the actual visit) so the
   first click never pays the cold-start cost. No timers, no polling. */
(function () {
  var chip = $('#link-status');
  var routes = ['/api/login', '/api/login-safe', '/api/statement?ping=1', '/api/pin'];
  function ping(url) { return fetch(url).then(function (r) { return r.ok; }).catch(function () { return false; }); }
  function warm(attempt) {
    if (chip) { chip.className = 'link-status warming'; chip.innerHTML = '<i></i>waking the vault server&hellip;'; }
    Promise.all(routes.map(ping)).then(function (rs) {
      var ok = rs.filter(Boolean).length;
      if (ok === routes.length) {
        if (chip) { chip.className = 'link-status live'; chip.innerHTML = '<i></i>secure link live'; }
      } else if (attempt < 1) {
        setTimeout(function () { warm(attempt + 1); }, 3000);
      } else if (chip) {
        chip.className = 'link-status down';
        chip.innerHTML = '<i></i>server unreachable - reload once';
      }
    });
  }
  warm(0);
})();

/* ---------- auto-demo: the whole heist, choreographed for a room ----------
   Real requests to the real server throughout. The only simulated element is the
   intercept window standing in for Burp - the same simulated element Direct mode
   already labels. */
var autoRunning = false;
function typeInto(el, text, done) {
  el.value = '';
  var i = 0;
  (function tick() {
    if (!autoRunning) return;
    if (i >= text.length) { done(); return; }
    el.value += text[i++];
    beep(600 + Math.random() * 200, .02, 'square', .012);
    setTimeout(tick, 55 + Math.random() * 70);
  })();
}
function submitLogin() {
  var f = $('#login-form');
  if (f.requestSubmit) f.requestSubmit();
  else f.dispatchEvent(new Event('submit', { cancelable: true }));
}
function autoDemoEnd(msg) {
  autoRunning = false;
  var b = $('#auto-demo'); b.classList.remove('running'); b.innerHTML = '&#9654; Auto-demo';
  $('#bank-app').classList.remove('auto-glow');
  if (msg) toast(msg);
}
$('#auto-demo').addEventListener('click', function () {
  if (autoRunning) { autoDemoEnd('Auto-demo stopped.'); return; }
  autoRunning = true;
  var ab = $('#auto-demo'); ab.classList.add('running'); ab.innerHTML = '&#9632; Stop';
  document.getElementById('lab').scrollIntoView({ behavior: 'smooth' });
  $('#bank-app').classList.add('auto-glow');
  $('#dash-pane').hidden = true; $('#login-pane').hidden = false; $('#injection-banner').hidden = true;
  setEndpoint('vuln'); setMode('direct');
  toast('Auto-demo: every request below is real. Only the intercept window stands in for Burp.');

  setTimeout(function () {
    if (!autoRunning) return;
    toast('Step 1 of 4: an honest login with a wrong password.');
    typeInto($('#f-user'), 'admin', function () {
      typeInto($('#f-pass'), 'hunter2', function () {
        setTimeout(function () {
          if (!autoRunning) return;
          submitLogin();
          setTimeout(function () {
            if (!autoRunning) return;
            if (!$('#intercept-modal').hidden) {
              toast('Burp catches even the honest request. Forwarding it unchanged.');
              $('#intercept-forward').click();
            }
          }, 2200);
        }, 600);
      });
    });
  }, 1000);

  var on401 = function () {
    if (!autoRunning) return;
    setTimeout(function () {
      if (!autoRunning) return;
      toast('Step 2 of 4: 401, as expected. Now the same login, but intercepted.');
      typeInto($('#f-user'), "' OR '1'='1' -- ", function () {
        typeInto($('#f-pass'), 'x', function () {
          setTimeout(function () {
            if (!autoRunning) return;
            toast('Step 3 of 4: Burp catches the request before the server sees it.');
            submitLogin();
            setTimeout(function () {
              if (!autoRunning) return;
              if (!$('#intercept-modal').hidden) {
                toast('Step 4 of 4: forwarding the edited request to the real server.');
                $('#intercept-forward').click();
              }
            }, 2600);
          }, 700);
        });
      });
    }, 1800);
  };
  document.addEventListener('bv:login401', function once() {
    document.removeEventListener('bv:login401', once);
    on401();
  });
  document.addEventListener('bv:dash', function once2() {
    document.removeEventListener('bv:dash', once2);
    if (!autoRunning) return;
    setTimeout(function () {
      autoDemoEnd();
      $('#qb-play').click();
      toast('Heist complete - the query assembly below shows exactly why it worked.');
    }, 2200);
  });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape' && autoRunning) { autoDemoEnd('Auto-demo stopped.'); document.removeEventListener('keydown', esc); }
  });
});

/* smooth nav */
$$('[data-nav]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    var href = a.getAttribute('href');
    if (href && href.startsWith('#')) {
      e.preventDefault();
      var el = $(href); if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  });
});
})();
