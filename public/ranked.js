// 🏆 RANKED, the client half: the twelve badges, the ladder panel, the rank card on the match-over screen, and telling the server how a ranked match ended.
// The ratings themselves live on the server (public/rank-core.js is the shared ladder). Only 1v1 and 2v2 against real, signed-in players are ranked.
(function () {
  const R = window.PVP_RANK;
  if (!R || typeof socket === 'undefined') return;

  // ── the badges: a shield with a gem, one colour per rank; wings from Gold up, a crown from Master up ──
  const LOOK = [   // [dark, base, light]
    ['#6b3a1c', '#b87333', '#ffb27a'], ['#6f4420', '#cd8a3c', '#f6c07a'], ['#5b6470', '#aeb7c2', '#f4f7fb'], ['#8a6410', '#e0a81c', '#ffe27a'],
    ['#126f6b', '#29c7c1', '#a8fff7'], ['#4b1f8a', '#8a3fe0', '#dcb0ff'], ['#173f9a', '#2f66e8', '#9cc0ff'], ['#2c1a52', '#6a43b8', '#c09aff'],
    ['#1f6aa8', '#3aa0f0', '#d4f0ff'], ['#8a1f55', '#e0388a', '#ffa6d2'], ['#7a1218', '#d9262f', '#ff9a9a'], ['#8a5a0a', '#f0b323', '#fff4b8'],
  ];
  function badge(rank, size = 96) {
    const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), s = size / 100, [dk, base, lt] = LOOK[Math.max(0, Math.min(11, rank))];
    g.scale(s, s);
    const poly = (pts, fill, stroke) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); } };
    const grad = (x0, y0, x1, y1) => { const q = g.createLinearGradient(x0, y0, x1, y1); q.addColorStop(0, lt); q.addColorStop(0.5, base); q.addColorStop(1, dk); return q; };
    const wings = rank >= 3 ? Math.min(4, 1 + Math.floor((rank - 3) / 2)) : 0;               // 1 pair at Gold, up to 4 at Legend
    for (let i = 0; i < wings; i++) for (const sx of [-1, 1]) {
      const y = 34 + i * 11, w = 22 - i * 3, x = 50 + sx * 30;
      poly([[x - sx * 6, y], [x + sx * w, y - 10 - i * 3], [x + sx * (w - 6), y + 16], [x - sx * 4, y + 14]], grad(x, y - 12, x, y + 16), dk);
    }
    poly([[50, 90], [24, 66], [24, 30], [50, 16], [76, 30], [76, 66]], grad(30, 18, 70, 90), dk);                // the shield
    poly([[50, 82], [31, 63], [31, 34], [50, 24], [69, 34], [69, 63]], dk, null);                                  // its inner field
    poly([[50, 34], [62, 52], [50, 70], [38, 52]], grad(40, 34, 60, 70), lt);                                       // the gem
    poly([[50, 34], [56, 52], [50, 70], [44, 52]], lt, null); g.globalAlpha = 0.55; poly([[50, 34], [62, 52], [50, 52]], '#fff', null); g.globalAlpha = 1;
    if (rank >= 9) { poly([[36, 18], [41, 6], [46, 14], [50, 2], [54, 14], [59, 6], [64, 18]], grad(36, 2, 64, 18), dk); }   // the crown
    return c;
  }

  // ── what the server last told us about you ──
  const state = { me: null, top: null };
  const logged = () => typeof currentUser !== 'undefined' && currentUser && currentUser.username && !currentUser.isGuest;
  async function loadMe() {
    if (!logged() || typeof authRequest !== 'function') return null;
    const r = await authRequest('/rank/me', { username: currentUser.username, password: currentUser.password });
    if (r && r.ok) state.me = r.rank;
    return state.me;
  }
  async function loadTop() { const r = await authRequest('/rank/top', {}, 'GET'); if (r && r.ok) state.top = r.top; return state.top; }

  // ── the panel ──
  const css = document.createElement('style');
  css.textContent = '#rk-panel{position:fixed;inset:0;z-index:260;background:rgba(6,8,14,.92);color:#fff;font-family:Arial,sans-serif;display:none;overflow:auto;padding:18px}' +
    '#rk-panel .rk-card{max-width:760px;margin:0 auto;background:#10141f;border:1px solid #2c3550;border-radius:10px;padding:18px}' +
    '#rk-panel h2{margin:0 0 4px;letter-spacing:3px;font-size:18px}#rk-panel .rk-sub{color:#8fa0c8;font-size:12px;margin-bottom:12px;line-height:1.5}' +
    '#rk-panel .rk-me{display:flex;gap:16px;align-items:center;flex-wrap:wrap}#rk-panel .rk-big{font-size:22px;font-weight:bold;letter-spacing:1px}' +
    '#rk-panel .rk-bar{height:10px;background:#1d2538;border-radius:5px;overflow:hidden;margin:8px 0 4px;width:260px}#rk-panel .rk-fill{height:100%;background:linear-gradient(90deg,#4d7cff,#9ec0ff)}' +
    '#rk-panel .rk-ladder{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0}#rk-panel .rk-step{width:56px;text-align:center;font-size:9px;color:#8fa0c8;opacity:.55}#rk-panel .rk-step.on{opacity:1;color:#fff}' +
    '#rk-panel table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}#rk-panel td,#rk-panel th{padding:4px 6px;text-align:left;border-bottom:1px solid #1d2538}' +
    '#rk-panel button.rk-x{float:right;background:#1d2538;color:#fff;border:1px solid #3a4666;border-radius:5px;padding:6px 12px;cursor:pointer}' +
    '#rk-open{position:absolute;top:12px;right:12px;z-index:5;background:#171c2b;color:#ffd86a;border:1px solid #4a5680;border-radius:6px;padding:7px 12px;font-size:12px;letter-spacing:1px;cursor:pointer}' +
    '#match-over-rank{margin-top:10px;padding:8px 12px;border:1px solid #3a4666;border-radius:6px;background:rgba(16,20,31,.85);display:flex;gap:10px;align-items:center;font-size:13px}';
  document.head.appendChild(css);
  let panel = null;
  async function open() {
    if (!panel) { panel = document.createElement('div'); panel.id = 'rk-panel'; document.body.appendChild(panel); panel.addEventListener('keydown', e => e.stopPropagation()); }
    panel.style.display = 'block'; panel.innerHTML = '<div class="rk-card">Loading…</div>';
    if (typeof releasePointer === 'function') { try { releasePointer(); } catch (e) {} }
    const [me, top] = await Promise.all([logged() ? loadMe() : null, loadTop()]);
    const t = me ? R.tierOf(me.points) : null;
    const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    panel.innerHTML = '<div class="rk-card"><button class="rk-x">CLOSE</button><h2>🏆 RANKED</h2>' +
      '<div class="rk-sub">1v1 and 2v2 against real players are ranked. Every point you win is a point the other side loses: beat someone better than you and you gain more, someone worse and you gain less. Leave a ranked match early and it counts as a loss. Meeting the same people again and again pays less.</div>' +
      (me ? '<div class="rk-me"><div id="rk-badge"></div><div><div class="rk-big">' + esc(t.label) + '</div>' +
        '<div class="rk-bar"><div class="rk-fill" style="width:' + (t.division == null ? 100 : t.rr) + '%"></div></div>' +
        '<div class="rk-sub" style="margin:0">' + (t.division == null ? 'Legend: the top of the ladder' : t.toNext + ' RR to the next division') + '</div>' +
        '<div class="rk-sub" style="margin:6px 0 0">' + me.wins + ' wins · ' + me.losses + ' losses · ' + me.draws + ' draws · best ' + esc(me.peakLabel) + '</div></div></div>'
        : '<div class="rk-sub">Sign in to get a rank.</div>') +
      '<div class="rk-ladder" id="rk-ladder"></div>' +
      '<div style="letter-spacing:2px;font-size:12px;margin-top:6px">TOP PLAYERS</div>' +
      '<table><tr><th>#</th><th>Player</th><th>Rank</th><th>W</th><th>Games</th></tr>' +
      ((top && top.length) ? top.map((r, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(r.name) + '</td><td>' + esc(r.label) + '</td><td>' + r.wins + '</td><td>' + r.games + '</td></tr>').join('') : '<tr><td colspan="5" style="color:#8fa0c8">Nobody has played a ranked match yet.</td></tr>') + '</table></div>';
    if (me) panel.querySelector('#rk-badge').appendChild(badge(t.rank, 104));
    const lad = panel.querySelector('#rk-ladder');
    R.RANKS.forEach((n, i) => { const d = document.createElement('div'); d.className = 'rk-step' + (t && t.rank === i ? ' on' : ''); d.appendChild(badge(i, 52)); d.appendChild(document.createTextNode(n)); lad.appendChild(d); });
    panel.querySelector('.rk-x').onclick = () => { panel.style.display = 'none'; };
  }

  // a button on the mode screen, where 1v1 and 2v2 are picked
  const btn = document.createElement('button'); btn.id = 'rk-open'; btn.textContent = '🏆 RANKED'; btn.onclick = open;
  const attach = () => { const ms = document.getElementById('mode-screen'); if (ms && !ms.contains(btn)) ms.appendChild(btn); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach); else attach();

  // ── a ranked match: say so, and report how it ended ──
  let current = null;
  socket.on('lobbyStart', d => {
    current = d && d.ranked ? { matchId: d.matchId, mode: d.mode, reported: false } : null;
    if (current && typeof showAnnouncement === 'function') {
      const them = (d.opponents || []).filter(o => o.rating != null).map(o => R.tierOf(o.rating).label).join('  ·  ');
      try { showAnnouncement('RANKED MATCH', them ? 'Opponents: ' + them : 'Win to climb the ladder', '#ffd86a', 3000); } catch (e) {}
    }
  });
  const originalAward = window.awardMatchCredits;
  if (typeof originalAward === 'function') {
    window.awardMatchCredits = function (kills, won, draw) {
      if (current && !current.reported) { current.reported = true; socket.emit('rankedReport', { matchId: current.matchId, won: !!won, draw: !!draw }); }
      return originalAward.apply(this, arguments);
    };
  }
  socket.on('rankUpdate', u => {
    if (u && u.after) state.me = u.after;
    current = null;
    const after = u.after ? R.tierOf(u.after.points) : null, before = u.before;
    let msg;
    if (u.result === 'void') msg = '🏆 Ranked: ' + (u.why || 'no change');
    else {
      const sign = u.delta > 0 ? '+' : '';
      msg = '🏆 ' + sign + u.delta + ' RR · ' + (u.result === 'win' ? 'WIN' : u.result === 'loss' ? 'LOSS' : 'DRAW') + (u.why === 'forfeit' ? ' (forfeit)' : '') +
        (after ? ' · ' + (before && before.label !== after.label ? before.label + ' → ' : '') + after.label : '') + (u.farmed ? ' · repeat opponent: reduced' : '');
    }
    if (typeof pushFeedLine === 'function') { try { pushFeedLine(msg, '', u.delta > 0 ? '#7dffa0' : u.delta < 0 ? '#ff8a8a' : '#ffd86a', false); } catch (e) {} }
    const over = document.getElementById('match-over-screen');
    if (over) {
      let row = document.getElementById('match-over-rank');
      if (!row) { row = document.createElement('div'); row.id = 'match-over-rank'; const stats = document.getElementById('match-over-stats'); stats ? stats.after(row) : over.appendChild(row); }
      row.innerHTML = ''; if (after) row.appendChild(badge(after.rank, 40)); const span = document.createElement('span'); span.textContent = msg; row.appendChild(span);
    }
  });
  window.PVP_RANKED = { badge, open, loadMe, state };
})();
