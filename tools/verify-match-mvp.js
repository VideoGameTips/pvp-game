const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { pick, snapshot, kd } = require('../public/match-mvp');

const scores = {}, deaths = {};
const roster = Array.from({ length: 20 }, (_, i) => {
  const id = String(i).padStart(2, '0');
  scores[id] = i;
  deaths[id] = 8;
  return { id, name: 'Player ' + id, team: i < 10 ? 'ally' : 'enemy', rank: i % 12, weaponId: 'ak20', isBot: i === 19 };
});
scores['06'] = scores['07'] = scores['08'] = 11;
deaths['06'] = deaths['07'] = 3;
const winner = pick(roster, 'ally', scores, deaths);
assert.equal(winner.id, '06', 'highest kills, then lowest deaths, then stable ID');
assert.deepEqual(pick(roster.slice().reverse(), 'ally', scores, deaths), winner);
const bot = pick(roster, 'enemy', scores, deaths);
assert.equal(bot.id, '19');
assert.equal(bot.isBot, true);
assert.equal(bot.rank, null);
assert.equal(pick(roster, null, scores, deaths), null);
assert.equal(pick([], 'ally', scores, deaths), null);
assert.equal(snapshot({ ...winner, rank: 900, weaponId: '<invalid>' }).rank, null);
assert.equal(snapshot({ ...winner, rank: 900, weaponId: '<invalid>' }).weaponId, null);
assert.equal(kd(24, 5), '4.80');
assert.equal(kd(3, 0), '\u221e');
assert.equal(kd(0, 0), '0.00');

const server = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
const get = name => {
  const i = server.indexOf('function ' + name + '(');
  const j = server.indexOf('\n}', i);
  assert.ok(i >= 0 && j >= 0, name);
  return server.slice(i, j + 2);
};
const peers = { ranked: { matchId: 'a', account: 'veteran' }, guest: { matchId: 'a' } };
const packets = [];
const ctx = {
  RANK: require('../public/rank-core'),
  users: { veteran: { rank: { points: 1931, games: 42 } }, firstMatch: { rank: { points: 600, games: 0 } } },
  players: { ...peers, fresh: { matchId: 'b', account: 'firstMatch' } },
  io: { to: sid => ({ emit: (event, data) => packets.push({ sid, event, data }) }) },
};
vm.createContext(ctx);
vm.runInContext(get('rankEmblemOfSocket') + '\n' + get('sendMatchRoster') + "\nfor (const id of ['ranked','guest','fresh']) sendMatchRoster(id);", ctx);
assert.deepEqual(packets.map(p => p.data.mvpRank), [6, null, null]);
assert.deepEqual(Object.keys(packets[0].data.players), ['guest']);
console.log('MVP: 20-player selection, stable ties, bots, draws, K/D, and saved-rank roster metadata');
