#!/usr/bin/env node
// The map vote, end to end against a real server: two people with different votes (a coin flip), a person against
// a bot (the bot's pick travels with the vote), an opponent leaving the vote, nobody voting (random after 15 s), and
// the other lobby modes: a free-for-all over its grid pool (a lone voter's pick is final, the most votes of three
// wins) and King of the Hill, which has its own arena and skips it.
// Starts its own server on a spare port with an empty data directory. Needs socket.io-client
// (a dev dependency of the server's own socket.io install).
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const { io } = require('socket.io-client');
const PORT = 3900 + Math.floor(Math.random() * 90);
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'pvp-mappick-'));
const server = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], { env: { ...process.env, PORT: String(PORT), DATA_DIR: DATA }, stdio: 'ignore' });
const URL = 'http://localhost:' + PORT;
const oneOnOne = ['corner_yard','split_plaza','warehouse_box','overlook','shift_maze','launch_pad','rotator','low_grav',
  'bridgeworks','courtyard','double_ramp','atrium','multi_level_yard','reactor_core','grid_trenches','skybridge'];
const ffaMaps = ['iron_harbor','siegebreaker','dead_city','fracture_canyon','megaforge','titan_carrier'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = [];
const fail = m => { log.push('FAIL: ' + m); };
function client(name) {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  s.ev = {};
  for (const e of ['mapPickStart', 'mapPickLocked', 'mapPickResult', 'lobbyStart']) s.on(e, d => { s.ev[e] = d; s.ev[e + '_t'] = Date.now(); });
  s.nm = name;
  return s;
}
const until = async (f, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await sleep(50); } return false; };
(async () => {
  await sleep(2500);   // the server is starting
  // A: two humans, different votes
  {
    const a = client('A'), b = client('B');
    await until(() => a.connected && b.connected);
    a.emit('joinStagingLobby', { mode: '1v1', map: null }); b.emit('joinStagingLobby', { mode: '1v1', map: null });
    await sleep(300);
    a.emit('setLobbyReady', { ready: true, fillBots: true }); b.emit('setLobbyReady', { ready: true, fillBots: true });
    if (!await until(() => a.ev.mapPickStart && b.ev.mapPickStart, 3000)) fail('A: no mapPickStart for two humans');
    else {
      if (!a.ev.mapPickStart.vs || !b.ev.mapPickStart.vs) fail('A: vs should be a person');
      if (a.ev.lobbyStart) fail('A: lobbyStart arrived before the vote');
      a.emit('mapPickVote', { mapId: 'shift_maze' });
      await sleep(150);
      if (!b.ev.mapPickLocked) fail('A: b was not told a locked in');
      b.emit('mapPickVote', { mapId: 'courtyard' });
      if (!await until(() => a.ev.mapPickResult && b.ev.mapPickResult, 3000)) fail('A: no result');
      else {
        const r = a.ev.mapPickResult;
        if (!r.coin) fail('A: different votes should be a coin flip');
        if (!['shift_maze', 'courtyard'].includes(r.mapId)) fail('A: winner not one of the votes: ' + r.mapId);
        if (a.ev.mapPickResult.mapId !== b.ev.mapPickResult.mapId) fail('A: players got different results');
      }
      if (!await until(() => a.ev.lobbyStart && b.ev.lobbyStart, 5000)) fail('A: no lobbyStart after the result');
      else {
        if (a.ev.lobbyStart.mapId !== a.ev.mapPickResult.mapId || b.ev.lobbyStart.mapId !== a.ev.mapPickResult.mapId) fail('A: match map is not the voted one');
        if (a.ev.lobbyStart.opponents.length !== 1) fail('A: should have 1 human opponent');
        if (a.ev.lobbyStart.enemyBots + a.ev.lobbyStart.allyBots !== 0) fail('A: no bots expected');
      }
    }
    a.close(); b.close();
  }
  await sleep(300);
  // B: one human, bot opponent
  {
    const a = client('A');
    await until(() => a.connected);
    a.emit('joinStagingLobby', { mode: '1v1', map: 'gb_duel_yard' });
    await sleep(100);
    a.emit('setLobbyReady', { ready: true, fillBots: true });
    if (!await until(() => a.ev.mapPickStart, 3000)) fail('B: no mapPickStart vs bot');
    else {
      if (a.ev.mapPickStart.vs !== null) fail('B: vs should be null for a bot');
      if (JSON.stringify(a.ev.mapPickStart.options.slice().sort()) !== JSON.stringify(oneOnOne.slice().sort())) fail('B: options ' + a.ev.mapPickStart.options);
      const t0 = Date.now();
      a.emit('mapPickVote', { mapId: 'gb_duel_yard' }); // archived and must not lock the vote
      a.emit('mapPickVote', { mapId: 'bridgeworks', botMapId: 'split_plaza' });
      a.emit('mapPickVote', { mapId: 'atrium', botMapId: 'atrium' });   // a second vote must be ignored
      if (!await until(() => a.ev.mapPickResult, 5000)) fail('B: no result');
      else {
        const r = a.ev.mapPickResult;
        if (Date.now() - t0 < 1500) fail('B: the bot was not given time to be seen deciding');
        if (!r.coin || !r.picks.some(p => p.bot && p.mapId === 'split_plaza') || !r.picks.some(p => !p.bot && p.mapId === 'bridgeworks')) fail('B: picks wrong ' + JSON.stringify(r));
      }
      if (!await until(() => a.ev.lobbyStart, 5000)) fail('B: no lobbyStart');
      else {
        const l = a.ev.lobbyStart;
        if (l.mapId !== a.ev.mapPickResult.mapId) fail('B: map mismatch');
        if (l.enemyBots + l.allyBots !== 1) fail('B: want exactly one bot, got ' + (l.enemyBots + l.allyBots));
      }
    }
    a.close();
  }
  await sleep(300);
  // C: an opponent leaves the vote
  {
    const a = client('A'), b = client('B');
    await until(() => a.connected && b.connected);
    a.emit('joinStagingLobby', { mode: '1v1', map: null }); b.emit('joinStagingLobby', { mode: '1v1', map: null });
    await sleep(300);
    a.emit('setLobbyReady', { ready: true, fillBots: true }); b.emit('setLobbyReady', { ready: true, fillBots: true });
    await until(() => a.ev.mapPickStart && b.ev.mapPickStart, 3000);
    a.emit('mapPickVote', { mapId: 'overlook' });
    await sleep(200);
    b.emit('leaveMapPick');
    if (!await until(() => a.ev.lobbyStart, 7000)) fail('C: nobody started after the opponent left');
    else if (a.ev.lobbyStart.mapId !== 'overlook') fail('C: the remaining vote should stand, got ' + a.ev.lobbyStart.mapId);
    else if (a.ev.lobbyStart.enemyBots + a.ev.lobbyStart.allyBots !== 1) fail('C: a bot should take the place');
    if (b.ev.lobbyStart) fail('C: the leaver was started anyway');
    a.close(); b.close();
  }
  await sleep(300);
  // D: nobody votes: random after the timer
  {
    const a = client('A');
    await until(() => a.connected);
    a.emit('joinStagingLobby', { mode: '1v1', map: null }); await sleep(100);
    a.emit('setLobbyReady', { ready: true, fillBots: true });
    await until(() => a.ev.mapPickStart, 3000);
    const t0 = Date.now();
    const ms = a.ev.mapPickStart?.ms || 25000;
    if (!await until(() => a.ev.lobbyStart, ms + 6500)) fail('D: never started');
    else {
      const dt = Date.now() - t0;
      if (dt < ms - 1000 || dt > ms + 6000) fail('D: started after ' + dt + ' ms, want vote time + reveal');
      if (!oneOnOne.includes(a.ev.lobbyStart.mapId)) fail('D: map ' + a.ev.lobbyStart.mapId);
    }
    a.close();
  }
  await sleep(300);
  // E: a free-for-all with one human: the vote is over the whole pool (not the duel maps) and the pick is final
  {
    const a = client('A');
    await until(() => a.connected);
    a.emit('joinStagingLobby', { mode: 'ffa5', map: 'volcano' }); await sleep(100);   // an up-front pick means nothing now
    a.emit('setLobbyReady', { ready: true, fillBots: true });
    if (!await until(() => a.ev.mapPickStart, 3000)) fail('E: no map vote in a free-for-all');
    else {
      const o = a.ev.mapPickStart.options;
      if (JSON.stringify(o.slice().sort()) !== JSON.stringify(ffaMaps.slice().sort())) fail('E: FFA map pool changed: ' + o);
      if (o.some(id => id.startsWith('duel_'))) fail('E: duel maps are 1v1 only');
      if (a.ev.mapPickStart.vsBot) fail('E: bots do not vote outside 1v1');
      a.emit('mapPickVote', { mapId: 'dead_city' });
      if (!await until(() => a.ev.lobbyStart, 6000)) fail('E: never started');
      else {
        if (a.ev.lobbyStart.mapId !== 'dead_city') fail('E: a lone voter\'s pick is final, got ' + a.ev.lobbyStart.mapId);
        if (a.ev.lobbyStart.enemyBots < 1) fail('E: bots should still fill the match');
        if (a.ev.mapPickResult.coin) fail('E: one vote is not a coin flip');
      }
    }
    a.close();
  }
  await sleep(300);
  // F: three people in a free-for-all: the most votes plays
  {
    const [a, b, c] = [client('A'), client('B'), client('C')];
    await until(() => a.connected && b.connected && c.connected);
    for (const x of [a, b, c]) x.emit('joinStagingLobby', { mode: 'ffa5', map: null });
    await sleep(300);
    for (const x of [a, b, c]) x.emit('setLobbyReady', { ready: true, fillBots: true });
    if (!await until(() => a.ev.mapPickStart && b.ev.mapPickStart && c.ev.mapPickStart, 3000)) fail('F: not every human was asked');
    else {
      if ((a.ev.mapPickStart.others || []).length !== 2) fail('F: a should be told about 2 others');
      a.emit('mapPickVote', { mapId: 'iron_harbor' }); b.emit('mapPickVote', { mapId: 'iron_harbor' }); c.emit('mapPickVote', { mapId: 'dead_city' });
      if (!await until(() => a.ev.lobbyStart && b.ev.lobbyStart && c.ev.lobbyStart, 6000)) fail('F: never started');
      else {
        const r = a.ev.mapPickResult;
        if (r.mapId !== 'iron_harbor' || r.coin) fail('F: two votes beat one, got ' + JSON.stringify({ m: r.mapId, coin: r.coin }));
        if (new Set([a, b, c].map(x => x.ev.lobbyStart.mapId)).size !== 1) fail('F: players got different maps');
      }
    }
    for (const x of [a, b, c]) x.close();
  }
  await sleep(300);
  // G: King of the Hill plays its own arena: no vote
  {
    const a = client('A');
    await until(() => a.connected);
    a.emit('joinStagingLobby', { mode: 'koth', map: null }); await sleep(100);
    a.emit('setLobbyReady', { ready: true, fillBots: true });
    if (!await until(() => a.ev.lobbyStart || a.ev.mapPickStart, 4000)) fail('G: koth never started');
    else if (a.ev.mapPickStart) fail('G: koth has its own arena and should not vote');
    a.close();
  }
  server.kill();
  try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {}
  console.log(log.length ? log.join('\n') : 'map vote server checks: two humans, a bot, a leaver, a timeout: all OK (plus free-for-all and koth)');
  process.exit(log.length ? 1 : 0);
})();
