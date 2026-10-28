#!/usr/bin/env node
// Writes dist/sound-organizer.html: one page with every recording and every weapon, so Andy can hear each clip, drop it on a weapon, and send back what he decided.
//
// It is a single file with the WHOLE clips inside (public/sounds/*.mp3 as base64), so it opens by double-clicking, from anywhere, with no server:
// a page opened as a file may not fetch(), but it can decode audio it already holds (the same reason public/sound-data.js exists).
// What the game plays now is read from the tables in public/game.js (WEAPON_SAMPLES, EVENT_SAMPLES), so the page starts as "what you hear today".
//
//   node tools/make-sound-organizer.js                          write dist/sound-organizer.html
//   node tools/make-sound-organizer.js --ambient some.mp3       also carry a recording that no weapon plays (shown under "Ambient"; not part of the game yet)
//   node tools/make-sound-organizer.js --out path.html
const fs = require('fs'), path = require('path'), vm = require('vm');
const { readTables, mp3Seconds } = require('./embed-sounds.js');
const root = path.join(__dirname, '..'), pub = path.join(root, 'public');
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const outFile = arg('--out') || path.join(root, 'dist', 'sound-organizer.html');

// What each recording is, as far as the file names tell. `orig` is the name Andy's download had (the part of his prompt that survived); `label` is only a first guess he can retype in the page.
const CLIPS = {
  vector:     { label: 'Vector shot',              orig: 'A_single_shot_from_a_#1-1792981281450', kind: 'shot' },
  thump:      { label: 'Thump (big pistol)',       orig: 'A_single_shot_from_a_#1-1792981380400', kind: 'shot' },
  ring:       { label: 'Ring (sniper)',            orig: 'A_single_shot_from_a_#3-1792981451433', kind: 'shot' },
  blast:      { label: 'Blast (Storm Bloom)',           orig: 'A_single_blast_from__#4-1792981401343', kind: 'shot' },
  lightning:  { label: 'Lightning?',               orig: 'A_single,_lightning-_#1-1792981771691', kind: 'shot', note: 'the name was cut off after "lightning-"' },
  isolated:   { label: 'Isolated shot',            orig: 'A_single,_isolated_s_#2-1793055313374', kind: 'shot' },
  heavy:      { label: 'Heavy shot',               orig: 'A_single_heavy_shot__#4-1793055526042', kind: 'shot' },
  rocket:     { label: 'RPG rocket',               orig: 'A_heavy_RPG_rocket_i_#1-1793055413297', kind: 'shot' },
  quick1:     { label: 'Quick shot 1',             orig: 'A_singular,_ultra-sh_#1-1793057556205', kind: 'shot' },
  quick2:     { label: 'Quick shot 2',             orig: 'A_singular,_ultra-sh_#3-1793057561237', kind: 'shot' },
  dry1:       { label: 'Dry shot 1',               orig: 'An_ultra-short,_dry__#1-1793057583188', kind: 'shot' },
  dry4:       { label: 'Dry shot 4',               orig: 'An_ultra-short,_dry__#4-1793057596427', kind: 'shot' },
  sharp1:     { label: 'Sharp shot 1',             orig: 'A_short,_sharp_singl_#1-1793057538348', kind: 'shot' },
  sharp3:     { label: 'Sharp shot 3',             orig: 'A_short,_sharp_singl_#3-1793057534132', kind: 'shot' },
  single:     { label: 'Single isolated shot',     orig: 'One_single_isolated__#1-1793057430709', kind: 'shot' },
  heavy3:     { label: 'Heavy shot 3',             orig: 'One_singular_heavy_s_#3-1793057399811', kind: 'shot' },
  isolatedB:  { label: 'Isolated shot B',          orig: 'A_single,_isolated_s_#2-1793057362745', kind: 'shot' },
  laser1:     { label: 'Laser: bright',            orig: 'A_single_stylized_vi_#1-1793145661889', kind: 'shot' },
  laser2:     { label: 'Laser: low (Railgun)',     orig: 'A_single_stylized_vi_#2-1793145659742', kind: 'shot' },
  laser4:     { label: 'Laser: short',             orig: 'A_single_stylized_vi_#4-1793145674673', kind: 'shot' },
  smgV3:      { label: 'SMG: low zap',             orig: 'A_single_stylized_vi_#3-1793145666169', kind: 'shot' },
  snappy2:    { label: 'SMG: snappy',              orig: 'A_snappy_single_guns_#2-1793145632715', kind: 'shot' },
  smgA1:      { label: 'SMG: stylized 1',          orig: 'A_single_stylized_ac_#1-1793145579594', kind: 'shot' },
  smgA3:      { label: 'SMG: stylized 3',          orig: 'A_single_stylized_ac_#3-1793145577641', kind: 'shot' },
  smgA4:      { label: 'SMG: stylized 4',          orig: 'A_single_stylized_ac_#4-1793145587188', kind: 'shot' },
  ak1:        { label: 'AK-47 boom (realistic skins)', orig: 'A_crisp,_loud_AK-47__#1-1793144543539', kind: 'shot' },
  ak2:        { label: 'AK-47 crack',              orig: 'A_crisp,_loud_AK-47__#2-1793144359586', kind: 'shot' },
  ak4:        { label: 'AK-47 boom',               orig: 'A_crisp,_loud_AK-47__#4-1793144365268', kind: 'shot' },
  boomRoll:   { label: 'Boom: roll',               orig: 'The_exact_moment_of__#2-1793057644904', kind: 'boom' },
  boomTwin:   { label: 'Boom: twin',               orig: 'The_exact_moment_of__#3-1793057649450', kind: 'boom' },
  boomCrack:  { label: 'Boom: crack',              orig: 'The_exact_moment_of__#4-1793057652613', kind: 'boom' },
};

// Which heading each gun sits under. A gun that is in none of these still shows up, under "Not sorted yet", so adding a weapon never breaks this page.
const GUN_GROUPS = [
  ['Pistols',                   'pistol m1911 five_seven mauser duelist_pistol omega_pistol akimbo gatecrasher flare signal_pistol dart_gun nail_gun slingshot continuum cycler'],
  ['Revolvers & hand cannons',  'revolver snub_revolver auto_revolver machine_revolver desert_eagle hand_cannon gunslinger'],
  ['SMGs & machine pistols',    'vector mp40 p90 p90_spec hkmp7 machine_pistol glock18 sticker_blaster smart_smg'],
  ['Assault rifles',            'ak20 m4a1_arena xm7 burst twin_ar swarm_rifle flechette burst_cannon quantum_repeater event_horizon'],
  ['Rifles',                    'm1_garand lever air_rifle'],
  ['Shotguns',                  'sg8 shorty sawed_off boomstick'],
  ['Snipers & bows',            'srx amr barrett railgun coilgun crossbow boombow'],
  ['Machine guns',              'rpd mg42 mk44 minigun m134 gau19 chain_gun'],
  ['Rockets & launchers',       'rpg bazooka grenade_launcher mortar_rifle javelin_launcher firework_launcher potato_cannon harpoon_gun nebula_mortar pinball_launcher portal_launcher gravity_launcher shockwave_launcher prism_launcher magnetar glassmaker foam_cannon airburst_projector seismic_hammer void_harvester'],
  ['Lightning & energy',        'storm_bloom arc_rifle storm_cannon arc_torrent storm_core plasma_carbine solar_lance prism_engine lancer taser laser_pointer pulse_needle'],
  ['Fire, ice & beams',         'flamethrower hellfire freeze_gun frost_blaster cyroclasm abs_zero'],
  ['Paint & gadgets',           'paintball painter_beam gravity_paint traffic_controller switchblade_gun'],
  ['Thrown',                    'throwing_knives throwing_axes boomerang traffic_cone cream_pie'],
].map(([title, ids]) => ({ title, ids: ids.split(' ') }));
const MELEE_GROUPS = { blade: 'Melee: blades (the swing makes a "shing")', heavy: 'Melee: heavy & blunt (the swing makes a thud)', generic: 'Melee: light & silly (the swing makes a swish)' };

// the arrays in game.js, evaluated (one source of truth, as embed-sounds.js does)
function grabArray(src, decl, ctx) {
  const s = src.indexOf(decl); if (s < 0) throw new Error('no ' + decl + ' in public/game.js');
  let d = 0, i = src.indexOf('[', s), e = -1;
  for (let j = i; j < src.length; j++) { const c = src[j]; if (c === '[') d++; else if (c === ']' && --d === 0) { e = j + 1; break; } }
  return vm.runInNewContext('(' + src.slice(i, e) + ')', ctx || {});
}
function grabObject(src, name) {
  const m = src.match(new RegExp('const ' + name + ' = (\\{[\\s\\S]*?\\n\\});')); if (!m) throw new Error('no ' + name + ' in public/game.js');
  return vm.runInNewContext('(' + m[1] + ')', {});
}

const gameText = fs.readFileSync(path.join(pub, 'game.js'), 'utf8');
const tables = readTables(gameText);
const guns = grabArray(gameText, 'const WEAPONS = [');
const melee = grabArray(gameText, 'const MELEE_ITEMS = [', { MELEE_COMBO_MODE: true, Object, console });
const swingOf = grabObject(gameText, 'MELEE_SWING_SOUND');
const mid = (r) => r ? (r[0] + r[1]) / 2 : 1;
const isAdmin = (w) => /^Admin/i.test(w.type || '') || !!w.adminItem;       // admin weapons can not be obtained

// --- the clips
const clips = [];
for (const [key, file] of Object.entries(tables.files)) {
  const meta = CLIPS[key] || { label: key, orig: path.basename(file), kind: /^boom/i.test(key) ? 'boom' : 'shot' };   // a clip added after this table was written
  const buf = fs.readFileSync(path.join(pub, file));
  // how the game plays this clip when nothing else is said: the settings most of its weapons share (median gain), the longest cut
  const uses = [...Object.values(tables.samples), ...Object.values(tables.events || {}).flatMap(e => e.clips)].filter(d => d.file === key);
  const gains = uses.map(d => d.gain).sort((a, b) => a - b);
  const play = uses.length ? { gain: +gains[gains.length >> 1].toFixed(3), from: Math.min(...uses.map(d => d.from || 0)), len: Math.max(...uses.map(d => d.len)), fade: Math.max(...uses.map(d => d.fade || 0.05)) } : null;
  // the realistic skins that play this clip when you hold them (SKIN_SAMPLES): they are not in the weapon list, so the page only says so
  const skins = Object.entries(tables.skins || {}).filter(([, d]) => d.file === key).map(([id]) => { const m = gameText.match(new RegExp("id: '" + id + "', weapon: '[^']+', name: '([^']+)'")); return m ? m[1] + ' skin' : id; });
  clips.push({ key, ...meta, file, seconds: +mp3Seconds(buf).toFixed(2), play, skins, b64: buf.toString('base64') });
}
const ambientFile = arg('--ambient');
if (ambientFile) {
  const buf = fs.readFileSync(ambientFile);
  clips.push({ key: 'ambient', label: 'Ambient background', orig: path.basename(ambientFile, path.extname(ambientFile)), kind: 'ambient', file: null, seconds: +mp3Seconds(buf).toFixed(2), play: null, b64: buf.toString('base64'), note: 'not in the game yet' });
}

// --- the weapons
const cur = (id) => { const d = tables.samples[id]; return d ? { clip: d.file, gain: d.gain, from: d.from || 0, len: d.len, fade: d.fade || 0.05, pitch: +mid(d.rate).toFixed(3) } : { clip: null, pitch: 1 }; };
const weapons = [], seen = new Set(), groups = [];
const gunById = Object.fromEntries(guns.map(g => [g.id, g]));
for (const g of GUN_GROUPS) {
  const rows = [];
  for (const id of g.ids) {
    const w = gunById[id]; if (!w || seen.has(id)) continue;                                           // a gun that was removed, or listed twice
    seen.add(id); rows.push(id);
    weapons.push({ id, name: w.name, type: w.type, archived: !!w.archived, admin: isAdmin(w), kind: 'gun', fireMs: w.fireRate || 300, cur: cur(id) });
  }
  groups.push({ title: g.title, ids: rows });
}
const lost = guns.filter(g => !seen.has(g.id));
if (lost.length) {
  groups.push({ title: 'Not sorted yet', ids: lost.map(w => w.id) });
  for (const w of lost) weapons.push({ id: w.id, name: w.name, type: w.type, archived: !!w.archived, admin: isAdmin(w), kind: 'gun', fireMs: w.fireRate || 300, cur: cur(w.id) });
}
const swordIds = { blade: [], heavy: [], generic: [] };
for (const m of melee) {
  if (m.skinFor) continue;
  const sw = swingOf[m.id] || 'blade'; swordIds[sw].push(m.id);
  weapons.push({ id: m.id, name: m.name, type: m.type, archived: !!m.archived, admin: isAdmin(m), kind: 'melee', swing: sw, fireMs: m.cooldown || 500, cur: cur(m.id) });
}
for (const sw of Object.keys(MELEE_GROUPS)) groups.push({ title: MELEE_GROUPS[sw], ids: swordIds[sw] });

const maps = grabArray(gameText, 'const MAP_IDS = [');
const data = { clips, weapons, groups, maps, explosionPool: (tables.events.explosion || { clips: [] }).clips.map(c => c.file), built: new Date().toISOString().slice(0, 10) };
const json = JSON.stringify(data).replace(/</g, '\\u003c');
const html = fs.readFileSync(path.join(__dirname, 'sound-organizer.template.html'), 'utf8').replace('/*DATA*/', () => json);
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, html);
console.log('wrote ' + path.relative(process.cwd(), outFile) + ': ' + clips.length + ' recordings, ' + weapons.length + ' weapons, ' + Math.round(html.length / 1024) + ' KB');
