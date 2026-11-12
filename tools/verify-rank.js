// Ranked: the ladder, the zero-sum Elo, and the server's rules for when a ranked match counts (slices the RANKED block out of server.js into a vm, like verify-rarity-server.js).
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const RANK = require('../public/rank-core.js');

// ── the ladder ──
assert.equal(RANK.tierOf(0).label, 'Copper III · 0 RR');
assert.equal(RANK.tierOf(99).label, 'Copper III · 99 RR');
assert.equal(RANK.tierOf(100).label, 'Copper II · 0 RR');
assert.equal(RANK.tierOf(300).label, 'Bronze III · 0 RR');
assert.equal(RANK.tierOf(RANK.START_POINTS).label, 'Silver III · 0 RR');
assert.equal(RANK.tierOf(3299).label, 'Grandmaster I · 99 RR');
assert.equal(RANK.tierOf(3300).label, 'Legend 0 RR');
assert.equal(RANK.tierOf(4000).label, 'Legend 700 RR');
assert.equal(RANK.tierOf(-50).label, 'Copper III · 0 RR');                     // below zero still reads as the bottom
assert.equal(RANK.RANKS.length, 12);

// ── zero-sum: whoever gains, someone loses exactly the same ──
for (const [ra, rb] of [[600, 600], [600, 1400], [1400, 600], [0, 3300], [3300, 0], [1234, 1250]]) for (const w of ['A', 'B', 'draw']) {
  const out = RANK.settle([{ id: 'a', points: ra }], [{ id: 'b', points: rb }], w);
  assert.equal(out.reduce((s, c) => s + c.delta, 0), 0, `1v1 ${ra} v ${rb} ${w} is zero-sum`);
  if (w !== 'draw') assert.ok(out.find(c => c.id === (w === 'A' ? 'a' : 'b')).delta >= 1, 'a win always pays at least a point');
}
const t2 = RANK.settle([{ id: 'a1', points: 900 }, { id: 'a2', points: 1100 }], [{ id: 'b1', points: 500 }, { id: 'b2', points: 700 }], 'B');
assert.equal(t2.reduce((s, c) => s + c.delta, 0), 0, '2v2 is zero-sum');
assert.ok(t2.filter(c => c.id[0] === 'b').every(c => c.delta === t2.find(x => x.id === 'b1').delta), 'every winner gets the same');
assert.ok(t2.find(c => c.id === 'b1').delta > 20, 'an upset win over a stronger team pays more than an even one (20)');
const even = RANK.settle([{ id: 'a', points: 800 }], [{ id: 'b', points: 800 }], 'A');
assert.equal(even[0].delta, 20, 'beating an equal pays K/2'); assert.equal(even[1].delta, -20);
const sure = RANK.settle([{ id: 'a', points: 2000 }], [{ id: 'b', points: 500 }], 'A');
assert.ok(sure[0].delta >= 1 && sure[0].delta <= 2, 'beating someone far worse pays almost nothing');
assert.ok(RANK.settle([{ id: 'a', points: 500 }], [{ id: 'b', points: 2000 }], 'draw')[0].delta > 0, 'a draw favours the lower-rated side');
// farming: the same people again in a day pay less, for BOTH sides, and it is still zero-sum
const f1 = RANK.settle([{ id: 'a', points: 800 }], [{ id: 'b', points: 800 }], 'A', 1)[0].delta, f3 = RANK.settle([{ id: 'a', points: 800 }], [{ id: 'b', points: 800 }], 'A', 3);
assert.equal(f1, 20); assert.equal(f3[0].delta, 10); assert.equal(f3[0].delta + f3[1].delta, 0);
assert.ok(RANK.matchWindow(0) < RANK.matchWindow(15000) && RANK.matchWindow(1e9) === 900, 'the pairing window widens, then stops');

// ── when a ranked match counts (the server block) ──
const src = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
const a = src.indexOf('const rankedMatches = {};'), b = src.indexOf('// ── 🏛️ MATCH STAGING LOBBIES');
assert.ok(a > 0 && b > a, 'the ranked block was not found in server.js');
function world(names) {
  const users = {}, players = {}, sent = [];
  for (const n of names) { users[n] = {}; players[n + '-sid'] = { account: n }; }
  const ctx = { RANK, users, players, io: { to: sid => ({ emit: (ev, d) => sent.push({ sid, ev, d }) }) }, saveUsers() {}, setTimeout: () => 0, clearTimeout() {}, Date, Math, Set };
  vm.createContext(ctx);
  vm.runInContext(src.slice(a, b) + '\n__api = { rankedMatches, rankedTryResolve, rankedLeft, rankedSettle };', ctx);   // (a top-level const is not a property of the context)
  const api = ctx.__api;
  const mk = (mode, teams) => { const rm = { matchId: 'm', mode, startedAt: 0, parts: teams.map(([n, team]) => ({ sid: n + '-sid', account: n, team, reported: null })), done: false, timer: null }; api.rankedMatches.m = rm; return rm; };
  return { ctx: api, users, players, sent, mk };
}
const pts = (w, n) => w.users[n].rank.points;
{ // both report the same winner: paid, and the total never moves
  const w = world(['a', 'b']); const rm = w.mk('1v1', [['a', 'ally'], ['b', 'enemy']]);
  rm.parts[0].reported = { won: true, draw: false }; w.ctx.rankedTryResolve(rm);
  assert.ok(!rm.done, 'waits for the other player who is still connected');
  rm.parts[1].reported = { won: false, draw: false }; w.ctx.rankedTryResolve(rm);
  assert.ok(rm.done); assert.equal(pts(w, 'a') + pts(w, 'b'), 1200); assert.equal(pts(w, 'a'), 620); assert.equal(w.users.a.rank.wins, 1); assert.equal(w.users.b.rank.losses, 1);
  assert.ok(w.sent.some(s => s.sid === 'a-sid' && s.ev === 'rankUpdate' && s.d.result === 'win' && s.d.delta === 20));
}
{ // both claim to have won: nothing changes
  const w = world(['a', 'b']); const rm = w.mk('1v1', [['a', 'ally'], ['b', 'enemy']]);
  rm.parts[0].reported = { won: true }; rm.parts[1].reported = { won: true }; w.ctx.rankedTryResolve(rm);
  assert.ok(rm.done); assert.ok(!w.users.a.rank && !w.users.b.rank, 'a disagreement leaves both ratings alone');
  assert.ok(w.sent.every(s => s.d.result === 'void'));
}
{ // one leaves before anyone reported: a forfeit
  const w = world(['a', 'b']); w.mk('1v1', [['a', 'ally'], ['b', 'enemy']]);
  w.ctx.rankedLeft('a-sid');
  assert.equal(pts(w, 'a'), 580); assert.equal(pts(w, 'b'), 620);
}
{ // the winner reports and the loser has already gone: it is paid; leaving AFTER a report is not a forfeit
  const w = world(['a', 'b']); const rm = w.mk('1v1', [['a', 'ally'], ['b', 'enemy']]);
  rm.parts[0].reported = { won: true }; delete w.players['b-sid']; w.ctx.rankedLeft('b-sid');
  assert.ok(rm.done); assert.equal(pts(w, 'a'), 620); assert.equal(pts(w, 'b'), 580);
}
{ // the wait ran out with one side silent: void
  const w = world(['a', 'b']); const rm = w.mk('1v1', [['a', 'ally'], ['b', 'enemy']]);
  rm.parts[0].reported = { won: true }; w.ctx.rankedTryResolve(rm, true);
  assert.ok(rm.done); assert.ok(!w.users.a.rank);
}
{ // a draw
  const w = world(['a', 'b']); const rm = w.mk('1v1', [['a', 'ally'], ['b', 'enemy']]);
  rm.parts[0].reported = { draw: true }; rm.parts[1].reported = { draw: true }; w.ctx.rankedTryResolve(rm);
  assert.equal(pts(w, 'a'), 600); assert.equal(pts(w, 'b'), 600); assert.equal(w.users.a.rank.draws, 1);
}
{ // 2v2: all four report, zero-sum across the four
  const w = world(['a', 'b', 'c', 'd']); const rm = w.mk('2v2', [['a', 'ally'], ['b', 'ally'], ['c', 'enemy'], ['d', 'enemy']]);
  w.users.a.rank = { points: 1500, games: 0, wins: 0, losses: 0, draws: 0, peak: 1500, log: [] };
  for (const p of rm.parts) p.reported = { won: p.team === 'enemy' };
  w.ctx.rankedTryResolve(rm);
  assert.ok(rm.done); assert.equal(['a', 'b', 'c', 'd'].reduce((s, n) => s + pts(w, n), 0), 1500 + 600 * 3);
  assert.ok(pts(w, 'c') > 600 && pts(w, 'a') < 1500);
}
{ // the same two again and again pay less each time, and it still adds up
  const w = world(['a', 'b']); const gains = [];
  for (let i = 0; i < 5; i++) {
    const before = (w.users.a.rank || { points: 600 }).points, rm = w.mk('1v1', [['a', 'ally'], ['b', 'enemy']]);
    rm.parts[0].reported = { won: true }; rm.parts[1].reported = { won: false }; w.ctx.rankedTryResolve(rm);
    gains.push(pts(w, 'a') - before); assert.equal(pts(w, 'a') + pts(w, 'b'), 1200);
  }
  assert.ok(gains[4] < gains[0] && gains[4] >= 1, 'farming the same opponent pays less: ' + gains.join(','));
}
console.log('Ranked: ladder, zero-sum Elo (1v1, 2v2, draws, farming), and the settle / void / forfeit rules all hold');
