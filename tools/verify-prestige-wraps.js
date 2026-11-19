const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const PRESTIGE_WRAP = require('../prestige-wraps');
const { IDS, grant, isPrestigeWrap, ownsPrestigeWrap, recordRankResult, recordHeadshot, ladderRows } = PRESTIGE_WRAP;
const { LEGEND_AT } = require('../public/rank-core');
const account = (peak = 0) => ({ rank: { peak, points: peak, games: 1, wins: 0 }, skinInventory: [] });

const player = account(), users = { player };
for (const result of ['loss','draw']) {
  for (let i = 0; i < 24; i++) assert.deepEqual(recordRankResult(player, users, 'win', 0, LEGEND_AT), []);
  assert.deepEqual(recordRankResult(player, users, result, 0, LEGEND_AT), []);
  assert.equal(player.rank.prestigeWins, 0);
}
for (let i = 0; i < 24; i++) recordRankResult(player, users, 'win', 0, LEGEND_AT);
assert.deepEqual(recordRankResult(player, users, 'win', 0, LEGEND_AT), [IDS.untouchable]);
assert.deepEqual(recordRankResult(player, users, 'win', 0, LEGEND_AT), []);

const historic = Object.fromEntries(Array.from({ length: 99 }, (_, i) => ['seat-' + i, account(LEGEND_AT)]));
const hundredth = historic.one = account(LEGEND_AT);
assert.deepEqual(recordRankResult(hundredth, historic, 'win', LEGEND_AT - 1, LEGEND_AT), [IDS.legend, IDS.first]);
assert.deepEqual(recordRankResult(hundredth, historic, 'loss', LEGEND_AT, LEGEND_AT), []);
const next = historic.two = account(LEGEND_AT);
assert.deepEqual(recordRankResult(next, historic, 'win', LEGEND_AT - 1, LEGEND_AT), [IDS.legend]);
assert.deepEqual(recordRankResult(historic['seat-0'], historic, 'win', LEGEND_AT, LEGEND_AT), [IDS.legend]);

for (let i = 0; i < 999; i++) assert.equal(recordHeadshot(player, 'ak20'), false);
assert.equal(recordHeadshot(player, 'srx'), false);
assert.equal(recordHeadshot(player, 'ak20'), true);
assert.equal(recordHeadshot(player, 'ak20'), false);

const champion = account(5000), runnerUp = account(5000), admin = { ...account(99999), isAdmin: true };
champion.rank.wins = 17;
runnerUp.rank.wins = 15;
assert.deepEqual(ladderRows({ runnerUp, champion, admin }).map(([key]) => key), ['champion', 'runnerUp']);
assert.ok(grant(champion, IDS.worldbreaker));
assert.ok(!grant(admin, IDS.worldbreaker));
assert.ok(!ownsPrestigeWrap(runnerUp, IDS.worldbreaker));
assert.ok(!grant(champion, IDS.clutch));
assert.ok(!ownsPrestigeWrap({ skinInventory: [IDS.clutch] }, IDS.clutch));
assert.ok(!isPrestigeWrap('blueprint'));
assert.equal(new Set(Object.values(IDS)).size, 6);

const source = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
const season = { current: 1, closed: {} }, winner = account(4000), second = account(3910);
let saved = null;
const closeStart = source.indexOf('function closeSeason()');
const closeEnd = source.indexOf("app.get('/rank/season'", closeStart);
assert.ok(closeStart > 0 && closeEnd > closeStart);
const close = vm.runInNewContext(source.slice(closeStart, closeEnd) + '\ncloseSeason', {
  PRESTIGE_WRAP, RANK: { LEGEND_AT }, SEASON_SKIN_IDS: ['ak20_phoenix_reign'], SEASON_FILE: 'season.json',
  users: { winner, second }, players: {}, console: { log() {} }, readSeason: () => season,
  fs: { writeFileSync: (_, data) => { saved = JSON.parse(data); } }, saveUsers() {},
});
assert.equal(close().champion, 'winner');
assert.equal(saved.closed[1].champion, 'winner');
assert.ok(winner.skinInventory.includes('ak20_phoenix_reign') && second.skinInventory.includes('ak20_phoenix_reign'));
assert.ok(ownsPrestigeWrap(winner, IDS.worldbreaker) && !ownsPrestigeWrap(second, IDS.worldbreaker));
assert.equal(close().season, 2);

const start = source.indexOf("socket.on('setWrap',");
const end = source.indexOf('\n  });', start) + 7;
assert.ok(start > 0 && end > start);
const carrier = { account: 'second', matchId: 'test' };
let setWrap, now = 1000;
vm.runInNewContext(source.slice(start, end), {
  PRESTIGE_WRAP, users: { second, winner }, players: { sid: carrier }, Date: { now: () => now },
  socket: { id: 'sid', on(ev, fn) { setWrap = fn; } }, emitToMatch() {},
});
setWrap({ wrap: IDS.worldbreaker });
assert.equal(carrier.wrap, null);
now += 250; carrier.account = 'winner'; setWrap({ wrap: IDS.worldbreaker });
assert.equal(carrier.wrap, IDS.worldbreaker);
console.log('Prestige wraps: ranked streak resets, first 100 cap, per-weapon headshots, season tie-break and availability gates');
