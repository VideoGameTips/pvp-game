// Sound bait (public/game.js useBait / playBait): the server hands a thrown sound to the OPPONENTS of the player who threw it, and only then.
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
let clock = 100000; const handlers = {}, sent = [], players = {};
const ctx = { players, HUB_MATCH: 'hub', Math, Number, Date: { now: () => clock }, socket: { id: 'a', on: (n, f) => handlers[n] = f },
  socketIdsInMatch: m => Object.values(players).filter(p => !p.isBot && p.matchId === m).map(p => p.id),
  blocksFriendlyFire: (s, t) => !!s.team && s.team === t.team, io: { to: id => ({ emit: (ev, d) => sent.push({ to: id, ev, d }) }) } };
vm.createContext(ctx);
const start = source.indexOf("socket.on('soundBait',"), end = source.indexOf('\n  });', start) + 7;
assert(start > 0 && end > start, 'handler soundBait not found');
vm.runInContext(source.slice(start, end), ctx);
const reset = () => { sent.length = 0; clock += 10000; for (const k of Object.keys(players)) delete players[k];
  Object.assign(players, { a: { id: 'a', matchId: 'm', team: 'red', x: 0, z: 0, dead: false }, b: { id: 'b', matchId: 'm', team: 'red', x: 5, z: 5 }, c: { id: 'c', matchId: 'm', team: 'blue', x: 30, z: 0 }, d: { id: 'd', matchId: 'm', team: 'blue', x: -30, z: 9 }, bot: { id: 'bot', matchId: 'm', team: 'blue', isBot: true }, e: { id: 'e', matchId: 'other', team: 'blue' } }); };
const bait = (o = {}) => handlers.soundBait({ kind: 'steps', weapon: 'ak20', x: 20, y: 0, z: 10, ang: 1, ...o });
reset(); bait();
assert.deepEqual(sent.map(s => s.to).sort(), ['c', 'd'], 'only the opponents in the match hear it: not the sender, not a teammate, not a bot, not another match');
assert.equal(sent[0].ev, 'soundBait'); assert.equal(sent[0].d.from, 'a'); assert.equal(sent[0].d.kind, 'steps'); assert.equal(sent[0].d.x, 20);
reset(); bait({ kind: 'shot', weapon: 'sg8' }); assert.equal(sent[0].d.kind, 'shot'); assert.equal(sent[0].d.weapon, 'sg8');
reset(); bait({ weapon: 'x; drop table' }); assert.equal(sent[0].d.weapon, 'ak20', 'a weapon id that is not a plain id becomes the default');
reset(); bait(); sent.length = 0; clock += 1000; bait(); assert.equal(sent.length, 0, 'one every four seconds');
clock += 4000; bait(); assert.equal(sent.length, 2, 'and again after the wait');
reset(); bait({ kind: 'nonsense' }); assert.equal(sent.length, 0, 'an unknown kind is dropped');
reset(); bait({ x: Infinity }); assert.equal(sent.length, 0, 'not a number'); bait({ x: 500 }); assert.equal(sent.length, 0, 'a spot far from the player is not a throw');
reset(); players.a.dead = true; bait(); assert.equal(sent.length, 0, 'the dead throw nothing');
reset(); players.a.matchId = 'hub'; bait(); assert.equal(sent.length, 0, 'nor in the hub');
reset(); delete players.a.team; players.b.team = undefined; bait(); assert.equal(sent.length, 3, 'with no teams (free for all) everybody else in the match hears it, humans only: ' + sent.length);
console.log('Sound bait server: opponents only, rate limited, validated');
