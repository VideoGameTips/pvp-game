#!/usr/bin/env node
// Every model skin's sound and reload, actually run.
//
// A skin's firing voice and its reload only execute when a player fires or
// reloads, so a typo in one of them boots clean and ships -- and playWeaponSound
// sits in the fire path, where a throw takes the shot down with it. This lifts
// the real code out of game.js and drives every skin's voice, every reload
// sound, and every reload part against a fake audio graph, then checks the
// tables agree with each other.
const fs = require('fs'), path = require('path');
const THREE = require('../public/three.min.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'game.js'), 'utf8');

function blockAt(re) {
  const m = src.match(re); if (!m) return null;
  let i = m.index, depth = 0, k = src.indexOf('{', i);
  if (src.startsWith('function', i)) {           // skip the parameter list
    let pk = src.indexOf('(', i), d = 0;
    for (; pk < src.length; pk++) { if (src[pk] === '(') d++; else if (src[pk] === ')') { d--; if (!d) break; } }
    k = src.indexOf('{', pk);
  }
  for (; k < src.length; k++) { if (src[k] === '{') depth++; else if (src[k] === '}') { depth--; if (!depth) break; } }
  return src.slice(i, k + 1);
}
const fn = n => blockAt(new RegExp('^function ' + n + '\\(', 'm'));
const cblock = n => blockAt(new RegExp('^const ' + n + ' = \\{', 'm')) + ';';

// A fake Web Audio graph: every node accepts every call, and we count what gets
// scheduled so a voice that silently does nothing is caught too.
let scheduled = 0;
const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {},
  exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
const node = () => ({ connect(n) { return n || node(); }, disconnect() {},
  start() { scheduled++; }, stop() {}, gain: param(), frequency: param(), Q: param(),
  detune: param(), type: '', buffer: null });
const ctx = { currentTime: 0, sampleRate: 8000,
  createOscillator: node, createGain: node, createBiquadFilter: node,
  createBufferSource: node, createDynamicsCompressor: node,
  createBuffer: (c, len) => ({ getChannelData: () => new Float32Array(len) }) };

let code = '';
for (const n of ['playTone', 'playNoise', 'playFilteredNoise', 'playSweptNoise', 'metalClack',
                 'playObjectShot', 'playObjectSfx', '_makeObjectProp', '_fxS', '_fxR']) {
  const b = fn(n); if (!b) { console.log('MISSING function ' + n); process.exit(1); } code += b + '\n';
}
code += cblock('PROP_SFX') + '\n';
// A voice may layer the ordinary gun report under its own (the crystal AK does).
// That synthesis has its own tuning table and is not what is being tested here,
// so it stands in as something that schedules a sound.
code += "function playMuzzleBlast(ctx) { ctx.createOscillator().start(); }\n";
code += src.match(/^const K = [\s\S]*?\}, o\);/m)[0] + '\n';
code += src.match(/^const RP = .*$/m)[0] + '\n';
code += 'const RELOAD_KEYS = ' + blockAt(/^const RELOAD_KEYS = \{/m).replace(/^const RELOAD_KEYS = /, '') + ';\n';
code += cblock('_RK') + '\n';
code += src.match(/^const _emoReload = [\s\S]*?'ding'\);/m)[0] + '\n';
code += cblock('SKIN_FX') + '\n';
const ms = src.match(/^const MODEL_SKINS = \[[\s\S]*?\n\];/m)[0];
code += 'return { playObjectShot, playObjectSfx, _makeObjectProp, PROP_SFX, SKIN_FX };';
const _rGeoCache = {};
const api = new Function('THREE', '_rGeo', code)(THREE, (k, f) => _rGeoCache[k] || (_rGeoCache[k] = f()));

const problems = [];
const skinIds = [...ms.matchAll(/\{ id: '(\w+)', weapon:/g)].map(m => m[1]);
const cases = name => [...(fn(name) || '').matchAll(/case '(\w+)'/g)].map(m => m[1]);
const shotKinds = new Set(cases('playObjectShot'));
const sfxNames = new Set(cases('playObjectSfx'));
const propKinds = new Set(cases('_makeObjectProp'));
// The gun synthesis handles these kinds itself; a real-gun skin uses them.
const gunKinds = new Set(['auto_blast', 'auto_blast_heavy', 'rifle', 'pistol', 'crack', 'boom',
  'heavy', 'thump', 'tick', 'energy', 'arc', 'freeze', 'flamethrower', 'flame', 'twang', 'pop', 'throw', 'firework']);
const stockProps = new Set(['mag', 'shell', 'case', 'round', 'link', 'clip', 'belt', 'bottle', 'rocket',
  'grenade', 'bolt', 'dart', 'ball', 'nail']);
const WHERE = new Set(['mag', 'breech', 'muzzle', 'rear']);

// 1. Every skin has an entry, and every entry is a skin.
for (const id of skinIds) if (!api.SKIN_FX[id]) problems.push(id.padEnd(28) + 'has no sound: it still fires with the gun\'s voice');
for (const id of Object.keys(api.SKIN_FX)) if (!skinIds.includes(id)) problems.push(id.padEnd(28) + 'SKIN_FX entry for a skin that does not exist');

// 2. Every voice runs and schedules something; every reload is well formed.
let voices = 0, reloads = 0, props = 0, sounds = 0;
for (const [id, fx] of Object.entries(api.SKIN_FX)) {
  const s = fx.sound;
  if (!s) { problems.push(id.padEnd(28) + 'no sound'); continue; }
  if (!shotKinds.has(s.kind) && !gunKinds.has(s.kind)) problems.push(id.padEnd(28) + 'unknown shot kind ' + s.kind);
  if (shotKinds.has(s.kind)) {
    const before = scheduled;
    try { if (!api.playObjectShot(ctx, 0, node(), s, 1)) problems.push(id.padEnd(28) + 'voice not handled'); }
    catch (e) { problems.push(id.padEnd(28) + 'voice throws: ' + e.message); }
    if (scheduled === before) problems.push(id.padEnd(28) + 'voice makes no sound');
    voices++;
  }
  const r = fx.reload;
  if (!r) continue;
  reloads++;
  let last = 0;
  for (const k of r.keys) {
    if (!(k.t > last - 1e-9 && k.t <= 1)) problems.push(id.padEnd(28) + 'reload keyframes out of order at t=' + k.t);
    last = k.t;
    for (const c of ['px','py','pz','rx','ry','rz','hx','hy','hz','hr'])
      if (!Number.isFinite(k[c])) problems.push(id.padEnd(28) + 'non-finite ' + c + ' at t=' + k.t);
  }
  for (const e of r.props) {
    props++;
    if (!(e.t >= 0 && e.t <= 1)) problems.push(id.padEnd(28) + 'prop outside the reload at t=' + e.t);
    if (!WHERE.has(e.w)) problems.push(id.padEnd(28) + 'prop anchored to unknown "' + e.w + '"');
    if (!propKinds.has(e.k) && !stockProps.has(e.k)) problems.push(id.padEnd(28) + 'unknown part ' + e.k);
    if (propKinds.has(e.k) && !api.PROP_SFX[e.k]) problems.push(id.padEnd(28) + 'part ' + e.k + ' has no sound');
  }
  for (const b of [...r.beats.map(b => b.s), ...(r.finish ? [r.finish] : [])]) {
    sounds++;
    if (!sfxNames.has(b)) problems.push(id.padEnd(28) + 'unknown reload sound ' + b);
  }
}
// 3. Every reload sound and every part runs.
for (const n of sfxNames) {
  const before = scheduled;
  try { api.playObjectSfx(ctx, node(), n, 0, 1); } catch (e) { problems.push(('sfx ' + n).padEnd(28) + 'throws: ' + e.message); }
  if (scheduled === before) problems.push(('sfx ' + n).padEnd(28) + 'makes no sound');
}
const M = c => new THREE.MeshPhongMaterial({ color: c, transparent: true });
for (const k of propKinds) {
  const g = new THREE.Group();
  try { if (!api._makeObjectProp(k, M, g)) problems.push(('part ' + k).padEnd(28) + 'not built'); }
  catch (e) { problems.push(('part ' + k).padEnd(28) + 'throws: ' + e.message); continue; }
  const b = new THREE.Box3().setFromObject(g), sz = b.getSize(new THREE.Vector3());
  if (!g.children.length) problems.push(('part ' + k).padEnd(28) + 'is empty');
  else if (![sz.x, sz.y, sz.z].every(Number.isFinite) || Math.max(sz.x, sz.y, sz.z) > 0.14)
    problems.push(('part ' + k).padEnd(28) + 'is the wrong size (' + [sz.x, sz.y, sz.z].map(v => (v * 1000).toFixed(0)).join('x') + 'mm)');
  if (!api.PROP_SFX[k]) problems.push(('part ' + k).padEnd(28) + 'has no sound');
}

console.log('skins: ' + skinIds.length + '   with their own sound: ' + Object.keys(api.SKIN_FX).length
  + '   with their own reload: ' + reloads);
console.log('object voices run: ' + voices + '   reload parts placed: ' + props + '   reload sounds cued: ' + sounds);
console.log('library: ' + shotKinds.size + ' firing voices, ' + sfxNames.size + ' reload sounds, ' + propKinds.size + ' reload parts');
console.log('\nPROBLEMS (' + problems.length + '):');
(problems.length ? problems : ['none']).forEach(p => console.log('   ' + p));
process.exit(problems.length ? 1 : 0);
