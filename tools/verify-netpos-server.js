#!/usr/bin/env node
// Position relay, end to end against a real server: one client reports its position every 33 ms, another listens.
// The relay must run at ~30 Hz and stamp each position with `at` (the server's clock when it was reported), and the stamps
// must keep up with the reporting -- the client interpolates on them. Starts its own server on a spare port; ~6 s.
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const { io } = require('socket.io-client');
const PORT = 3900 + Math.floor(Math.random() * 90);
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'pvp-netpos-'));
const server = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], { env: { ...process.env, PORT: String(PORT), DATA_DIR: DATA }, stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await sleep(2500);
  const issues = [];
  const a = io('http://localhost:' + PORT, { transports: ['websocket'], forceNew: true });
  const b = io('http://localhost:' + PORT, { transports: ['websocket'], forceNew: true });
  const got = [];
  let aId = null;
  a.on('init', d => { aId = d.id; });
  b.on('posUpdate', pos => { if (aId && pos[aId]) got.push({ t: Date.now(), p: pos[aId] }); });
  await sleep(600);
  let x = 0;
  const send = setInterval(() => { x += 0.2; a.emit('move', { x, y: 1.65, z: 0, rotY: 0, rotX: 0, emote: null }); }, 33);
  await sleep(3000);
  clearInterval(send);
  const span = (got[got.length - 1]?.t - got[0]?.t) / 1000;
  const rate = got.length / (span || 1);
  if (got.length < 40) issues.push('only ' + got.length + ' position updates in 3 s');
  if (rate < 24 || rate > 36) issues.push('relay runs at ' + rate.toFixed(1) + ' Hz, wanted ~30');
  const moving = got.filter(g => g.p.x > 0);
  if (!moving.length || moving.some(g => typeof g.p.at !== 'number')) issues.push('positions are not stamped with `at`');
  else {
    const fresh = moving.filter((g, i) => i === 0 || g.p.at !== moving[i - 1].p.at);
    const age = moving.map(g => g.t - g.p.at);
    if (fresh.length < moving.length * 0.8) issues.push('most relayed positions repeat the previous stamp (' + fresh.length + '/' + moving.length + ')');
    if (Math.max(...age) > 120) issues.push('a stamped position was ' + Math.max(...age) + ' ms old on arrival');
    console.log('relay ' + rate.toFixed(1) + ' Hz, ' + fresh.length + '/' + moving.length + ' fresh stamps, age on arrival ' + Math.min(...age) + '-' + Math.max(...age) + ' ms');
  }
  a.close(); b.close(); server.kill();
  fs.rmSync(DATA, { recursive: true, force: true });
  if (issues.length) { console.log(issues.join('\n')); process.exit(1); }
  console.log('netpos server checks: ~30 Hz relay, every position stamped with the server clock');
  process.exit(0);
})();
