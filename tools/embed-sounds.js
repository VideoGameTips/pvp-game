#!/usr/bin/env node
// Writes public/sound-data.js: every recording in SAMPLE_FILES (public/game.js), base64, as `window.SOUND_DATA = { "sounds/x.mp3": "..." }`.
//
// Why a script and not fetch('sounds/x.mp3'): a page opened as a file (double-clicking index.html) is not allowed to fetch() anything, so the
// recordings never loaded and the made-up shots played instead. A <script src> loads from a file, from a server and from itch alike.
// (It is its own file, not a block inside index.html, because index.html is the one file Cloudflare never caches: the audio in it would be
// downloaded again on every visit. sound-data.js is in VERSIONED in server.js, so a changed sound gets a new URL like game.js does.)
//
// The page carries only the part of each clip that is ever played. The clips are 3-8 s long and a weapon or an event plays 0.4-3 s of one (WEAPON_SAMPLES, EVENT_SAMPLES: from, len, rate), so the
// rest of each file (silence, a hiss of room) is cut off at a frame boundary: no re-encoding, every sample that is played is the sample that was sent, and the files
// in public/sounds stay exactly as Andy sent them. How much is kept: the longest cut anything makes of that file + MARGIN.
//
//   node tools/embed-sounds.js           rewrite public/sound-data.js from public/sounds/*.mp3 (run it after changing a sound or WEAPON_SAMPLES)
//   node tools/embed-sounds.js --check   exit 1 if public/sound-data.js is not exactly what the files and the tables say
//                                        (verify-boot --sample and tools/build-itch.sh run this)
const fs = require('fs'), path = require('path'), vm = require('vm');
const pub = path.join(__dirname, '..', 'public'), out = path.join(pub, 'sound-data.js');
const MARGIN = 0.2;     // seconds kept past the last sample any weapon plays: the decoder's start delay (~35 ms) and a few frames of safety

// --- MPEG-1 Layer III, the only thing the clips are (192 kbps, 48 kHz): [ID3v2 tag] then frames of 1152 samples; the first frame is the encoder's Info tag, which has no audio.
const BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], RATES = [44100, 48000, 32000];
function mp3Frames(buf) {
  let off = 0; if (buf.length > 10 && buf.toString('latin1', 0, 3) === 'ID3') off = 10 + ((buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9]);
  const frames = []; let rate = 0;
  while (off + 4 <= buf.length) {
    const h = buf.readUInt32BE(off); if ((h >>> 21) !== 0x7FF) break;
    const ver = (h >>> 19) & 3, layer = (h >>> 17) & 3, br = (h >>> 12) & 15, sr = (h >>> 10) & 3, pad = (h >>> 9) & 1;
    if (ver !== 3 || layer !== 1 || br === 0 || br === 15 || sr === 3) return null;                  // not MPEG-1 Layer III: not ours to cut
    const len = Math.floor(144000 * BITRATES[br] / RATES[sr]) + pad; if (off + len > buf.length) break;   // (a half frame at the end is not a frame)
    if (!frames.length) rate = RATES[sr]; else if (RATES[sr] !== rate) return null;
    frames.push({ off, len }); off += len;
  }
  if (!frames.length) return null;
  const f0 = frames[0].off, hasInfo = ['Info', 'Xing'].some(t => buf.toString('latin1', f0 + 36, f0 + 40) === t || buf.toString('latin1', f0 + 21, f0 + 25) === t);
  return { frames, rate, hasInfo };
}
function mp3Seconds(buf) {                                                                              // seconds of audio in a (cut or whole) stream
  const m = mp3Frames(buf); return m ? (m.frames.length - (m.hasInfo ? 1 : 0)) * 1152 / m.rate : 0;
}
function cutMp3(buf, seconds) {                                                                          // the start of the stream, enough whole frames to hold `seconds` of audio
  const m = mp3Frames(buf); if (!m) return buf;
  const keep = Math.min(m.frames.length, Math.ceil(seconds * m.rate / 1152) + (m.hasInfo ? 1 : 0)), last = m.frames[keep - 1];
  return keep >= m.frames.length ? buf : buf.subarray(0, last.off + last.len);
}

// --- what the game plays: the tables in public/game.js (evaluated, so there is one source of truth)
function readTables(gameText) {
  const grab = (name) => {
    const m = gameText.match(new RegExp('const ' + name + ' = (\\{[\\s\\S]*?\\n\\});'));
    if (!m) throw new Error('no ' + name + ' table in public/game.js');
    return vm.runInNewContext('(' + m[1] + ')', {});
  };
  return { files: grab('SAMPLE_FILES'), samples: grab('WEAPON_SAMPLES'), events: grab('EVENT_SAMPLES'), skins: gameText.includes('const SKIN_SAMPLES = ') ? grab('SKIN_SAMPLES') : {} };
}
// every cut of a recording the game can make: one per weapon, one per realistic skin, and every clip of every event
function allCuts(tables) { return [...Object.values(tables.samples), ...Object.values(tables.skins || {}), ...Object.values(tables.events || {}).flatMap(e => e.clips)]; }
// seconds of each file (by url) that has to be kept: the furthest into the file any weapon plays, plus MARGIN. null = nobody plays it: keep it whole
function neededSeconds(tables) {
  const need = {};
  for (const u of Object.values(tables.files)) need[u] = null;
  for (const d of allCuts(tables)) {
    const u = tables.files[d.file]; if (!u) continue;
    const to = d.from + d.len * d.rate[1] + 0.02 + MARGIN;                                              // (+0.02: the source runs 20 ms past len)
    need[u] = Math.max(need[u] || 0, to);
  }
  return need;
}

function build() {
  const tables = readTables(fs.readFileSync(path.join(pub, 'game.js'), 'utf8')), need = neededSeconds(tables), urls = Object.values(tables.files), data = {}, kept = {};
  if (!urls.length) throw new Error('SAMPLE_FILES lists no files');
  for (const u of urls) {
    const f = path.join(pub, u); if (!fs.existsSync(f)) throw new Error('public/' + u + ' is listed in SAMPLE_FILES but is not there');
    const whole = fs.readFileSync(f), cut = need[u] == null ? whole : cutMp3(whole, need[u]);
    data[u] = cut.toString('base64'); kept[u] = [cut.length, whole.length];
  }
  const text = '// GENERATED by tools/embed-sounds.js from public/sounds/*.mp3 (the files named in SAMPLE_FILES in game.js). Do not edit: run `node tools/embed-sounds.js` after changing a sound or WEAPON_SAMPLES.\n'
    + '// The recordings travel inside this script so they play wherever the game opens: a page opened as a file may not fetch() anything, and a script can always be loaded.\n'
    + '// Only the part of each clip that a weapon plays is here (the end of the file is cut off at a frame, not re-encoded): the files in public/sounds are the whole clips.\n'
    + 'window.SOUND_DATA = {\n' + urls.map(u => '  ' + JSON.stringify(u) + ': ' + JSON.stringify(data[u])).join(',\n') + '\n};\n';
  return { text, urls, data, kept, need };
}

module.exports = { mp3Frames, mp3Seconds, cutMp3, readTables, allCuts, neededSeconds, MARGIN };

if (require.main === module) {
  let b; try { b = build(); } catch (e) { console.error('embed-sounds: ' + e.message); process.exit(2); }
  if (process.argv.includes('--check')) {
    const have = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
    if (have !== b.text) {
      const sound = {}; try { new Function('window', have)(sound); } catch (e) {}
      const got = sound.SOUND_DATA || {}, why = [];
      for (const u of b.urls) if (got[u] !== b.data[u]) why.push(u + (got[u] ? ' is not what its file and WEAPON_SAMPLES say' : ' is missing'));
      for (const u of Object.keys(got)) if (!b.urls.includes(u)) why.push(u + ' is no longer in SAMPLE_FILES');
      console.error('public/sound-data.js is out of date (' + (why.join('; ') || 'only the header or layout differs') + ') — run: node tools/embed-sounds.js');
      process.exit(1);
    }
    console.log('sound-data.js is current: ' + b.urls.length + ' recordings, ' + Math.round(b.text.length / 1024) + ' KB');
  } else {
    fs.writeFileSync(out, b.text);
    for (const u of b.urls) console.log('  ' + u.padEnd(28) + ' keeps ' + String(Math.round(b.kept[u][0] / 1024)).padStart(3) + ' of ' + String(Math.round(b.kept[u][1] / 1024)).padStart(3) + ' KB' + (b.need[u] == null ? '  (unused: kept whole)' : '  (plays up to ' + (b.need[u] - MARGIN).toFixed(2) + ' s)'));
    console.log('wrote public/sound-data.js: ' + b.urls.length + ' recordings, ' + Math.round(b.text.length / 1024) + ' KB');
  }
}
