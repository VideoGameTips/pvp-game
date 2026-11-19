// 🏆 RANKED, the client half: the twelve badges, the ladder panel, the rank card on the match-over screen, and telling the server how a ranked match ended.
// The ratings themselves live on the server (public/rank-core.js is the shared ladder). Only 1v1 and 2v2 against real, signed-in players are ranked.
(function () {
  const R = window.PVP_RANK;
  if (!R || typeof socket === 'undefined') return;

  // Every rank builds around the same shield and diamond. The silhouette earns its layers before it earns a crown.
  const LOOK = [ // shadow, metal, edge, jewel
    ['#543124', '#9c6149', '#d09674', '#d9ab92'], // Copper
    ['#533327', '#ad793b', '#efbe75', '#f6cd8a'], // Bronze
    ['#33424b', '#84939b', '#d9e4ea', '#f0f5fa'], // Silver
    ['#715020', '#c79839', '#ffe09a', '#fff0b1'], // Gold
    ['#214450', '#779da5', '#e0ffff', '#91f3e1'], // Platinum
    ['#38244b', '#8360ae', '#e0b7f3', '#e8a8ff'], // Amethyst
    ['#172e58', '#3673b6', '#9bcfff', '#79d4ff'], // Sapphire
    ['#101016', '#272730', '#92919f', '#ff5474'], // Obsidian
    ['#253d52', '#7ab0c6', '#e6fcff', '#c2f6ff'], // Diamond
    ['#47213e', '#ad4e7d', '#ffc1dc', '#ffe5ed'], // Master
    ['#471c28', '#a4243c', '#ffb0a6', '#ffe3c6'], // Grandmaster
    ['#695032', '#b58a41', '#ffebae', '#fff8dc'], // Legend
  ];
  function badge(rank, size = 96) {
    rank = Math.max(0, Math.min(LOOK.length - 1, Math.trunc(rank) || 0));
    const c = document.createElement('canvas'); c.width = c.height = size;
    c.setAttribute('aria-hidden', 'true');
    const g = c.getContext('2d'), [dark, metal, edge, jewel] = LOOK[rank];
    const obsidian = rank === 7, legend = rank === LOOK.length - 1;
    g.scale(size / 100, size / 100); g.lineJoin = 'round'; g.lineCap = 'round';
    const path = (pts, fill, stroke, width = 1, close = true) => {
      g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); if (close) g.closePath();
      if (fill) { g.fillStyle = fill; g.fill(); }
      if (stroke) { g.strokeStyle = stroke; g.lineWidth = width; g.stroke(); }
    };
    const alloy = (top, bottom) => {
      const q = g.createLinearGradient(24, top, 76, bottom);
      q.addColorStop(0, edge); q.addColorStop(.46, metal); q.addColorStop(1, dark); return q;
    };
    const shield = (w, y, bottom) => [[50,y],[50+w,y+11],[50+w,y+35],[50+w*.72,bottom-12],[50,bottom],[50-w*.72,bottom-12],[50-w,y+35],[50-w,y+11]];
    const diamond = (x, y, w, h = w) => [[x,y-h],[x+w,y],[x,y+h],[x-w,y]];

    if (legend) {
      g.strokeStyle = '#e9c674'; g.lineWidth = 1.2;
      g.beginPath(); g.arc(50, 49, 38, 3.67, 5.75); g.moveTo(79, 72); g.arc(50, 49, 37, .67, 2.47); g.stroke();
      path(diamond(20,25,1.6),edge); path(diamond(80,25,1.6),edge);
    }
    if (rank >= 3) for (const side of [-1, 1]) {
      const plate = (pts, fill, stroke, width, close) => path(pts.map(([x,y]) => [50 + side*x,y]),fill,stroke,width,close);
      const span = [25, 29, 32, 36, 43, 36, 39, 42, 46][rank - 3];
      const tip = obsidian ? 21 : legend ? 17 : rank >= 8 ? 24 : 43 - (rank - 3) * 3;
      const feathers = rank < 5 ? 1 : rank < 8 ? 2 : legend ? 4 : 3;
      for (let i = feathers - 1; i >= 0; i--) {
        const x = span-i*3.9, y = tip+i*12;
        plate([[19,44+i*5],[x,y],[x-4,y+13],[x-8,y+22],[18,61+i*6]],alloy(y,y+27),obsidian ? '#676575' : dark,1.4);
        plate([[23,47+i*5],[x-1,y+3]],null,obsidian ? '#92919f' : edge,1,false);
      }
    }

    const w = rank < 2 ? 19 + rank*2 : 22, top = legend ? 31 : rank >= 8 ? 24 : rank < 3 ? 22 : 23, bottom = rank < 3 ? 79 + rank*2 : 86;
    path(shield(w,top,bottom), rank === 0 ? metal : alloy(top,bottom), rank === 0 ? dark : '#090d15', 2.5);
    path(shield(w-4,top+4,bottom-5),rank === 0 ? '#85513e' : obsidian ? '#14121a' : dark, rank === 0 ? edge : metal,1.1);
    if (rank >= 2) path([[50-w+2,top+13],[50,top+2],[50+w-2,top+13]],null,edge,1.4,false);
    const y = top + 27, gem = Math.min(13,7 + Math.floor(rank*.65));
    if (rank === 0) {
      path(diamond(50,y,gem,gem+2),dark,edge,1.4);
    } else {
      path(diamond(50,y,gem+2,gem+5),jewel,rank >= 5 ? edge : dark,1.1);
      path([[50,y-gem-5],[50+gem+2,y],[50,y+gem+5],[52,y-1]],obsidian ? '#922c4a' : metal);
      path([[50,y-gem-4],[52,y-1],[50-gem-1,y]],'#ffffff40');
    }
    if (rank >= 4) {
      path([[39,bottom-16],[50,bottom-10],[61,bottom-16]],null,obsidian ? '#975065' : edge,1.5,false);
      if (rank >= 6) path([[43,bottom-8],[50,bottom-4],[57,bottom-8]],null,metal,1.4,false);
    }
    if (obsidian) for (const side of [-1,1]) {
      path([[50+side*22,38],[50+side*14,45],[50+side*17,51],[50+side*13,62]],null,'#d45470',1.15,false);
    }
    if (rank === 9 || rank === 10) {
      path([[32,24],[40,17],[50,21-rank+9],[60,17],[68,24],[62,28],[50,24],[38,28]],alloy(16,30),edge,1.15);
      if (rank === 10) path(diamond(50,13,3,5),edge,dark,1);
    }
    if (legend) {
      path([[31,13],[42,20],[50,6],[58,20],[69,13],[64,30],[50,34],[36,30]],alloy(9,35),'#fff1be',1.5);
      path(diamond(50,22,4,6),'#fff8dc','#80562e',1.2);
      path([[40,26],[50,29],[60,26]],null,'#fff8dc',1.35,false);
      path(diamond(50,88,3.4,6),edge,dark,1.1);
    }
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
    '#rk-panel .rk-ladder{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;margin:14px 0}#rk-panel .rk-step{min-width:0;display:grid;justify-items:center;align-content:start;gap:1px;padding:4px 0;text-align:center;font-size:11px;overflow-wrap:anywhere;color:#bac6d8;border:1px solid transparent;border-radius:4px}#rk-panel .rk-step.on{color:#fff;border-color:#8a7650;background:#26241f}' +
    '@media(max-width:560px){#rk-panel .rk-ladder{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:380px){#rk-panel .rk-ladder{grid-template-columns:repeat(3,minmax(0,1fr))}}' +
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
