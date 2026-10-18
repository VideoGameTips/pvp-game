(function () {
  'use strict';
  const D = window.UNDERWORLD_DATA;
  let api, progress, run = null, panel, hud, markers = [], paused = false, selected = 1, accountKey;
  const el = (tag, text, cls) => { const n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; };
  const button = (text, action, cls) => { const b = el('button', text, cls); b.type = 'button'; b.onclick = action; return b; };
  function load() {
    accountKey = 'pvp_underworld_v1:' + (api.account() || 'guest');
    try { progress = D.sanitize(JSON.parse(localStorage.getItem(accountKey))); } catch (_) { progress = D.fresh(); }
  }
  function save() {
    try { localStorage.setItem(accountKey, JSON.stringify(progress)); }
    catch (_) { if (hud) hud.querySelector('.uw-save').textContent = 'Save unavailable'; }
  }
  function initUI() {
    if (panel) return;
    panel = el('section', null, 'uw-panel'); panel.id = 'underworld-panel'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', 'Underworld campaign');
    hud = el('section', null, 'uw-hud'); hud.id = 'underworld-hud'; hud.hidden = true;
    document.body.append(panel, hud);
    panel.addEventListener('keydown', e => {
      if (e.code !== 'Tab') return;
      const nodes = [...panel.querySelectorAll('button:not(:disabled)')];
      if (e.shiftKey && document.activeElement === nodes[0]) { e.preventDefault(); nodes.at(-1)?.focus(); }
      else if (!e.shiftKey && document.activeElement === nodes.at(-1)) { e.preventDefault(); nodes[0]?.focus(); }
    });
    document.addEventListener('keydown', e => {
      if (!panel.hidden) {
        if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); if (run?.status === 'active' && panel.dataset.view === 'pause') resume(); }
        else if (e.code !== 'Tab') e.stopImmediatePropagation();
        return;
      }
      if (!run || run.status !== 'active') return;
      if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); pauseMenu(); }
      else if (e.code === 'KeyF' && !e.repeat && canInteract()) { e.preventDefault(); e.stopImmediatePropagation(); interact(); }
    }, true);
    document.addEventListener('visibilitychange', () => { if (document.hidden && run?.status === 'active' && !paused) pauseMenu(); });
    document.addEventListener('pointerlockchange', () => {
      if (run?.status === 'active' && !paused && !document.pointerLockElement && !api.touch()) pauseMenu();
    });
  }
  function pause(value) { paused = value; api.halt(value); }
  function show(view) { panel.hidden = false; panel.dataset.view = view; panel.replaceChildren(); pause(true); }
  function focus() { panel.querySelector('button:not(:disabled)')?.focus(); }
  function open() {
    if (!api) return;
    if (run?.status === 'active') { pauseMenu(); return; }
    api.stopWorld(); load(); initUI();
    selected = progress.checkpoint?.mission || D.missions.find(m => !progress.completed[m.id])?.id || 16;
    journal();
  }
  function journal() {
    show('journal'); hud.hidden = true;
    const heading = el('header', null, 'uw-header');
    const title = el('div'); title.append(el('small', 'PVP ARENA / STORY CAMPAIGN'), el('h1', 'UNDERWORLD'));
    const stats = el('div', `${D.rank(progress).name} / ${D.reputation(progress)} REP / ${Object.keys(progress.completed).length}/16`, 'uw-profile');
    heading.append(title, stats);
    if (Object.keys(progress.completed).length || progress.checkpoint) heading.append(button('New Campaign', async () => {
      if (!await api.confirmReset()) return;
      progress = D.fresh(); selected = 1; save(); journal();
    }, 'uw-secondary'));
    heading.append(button('Back to Lobby', () => { stop(); api.lobby(); }, 'uw-secondary'));
    panel.append(heading);
    const layout = el('div', null, 'uw-journal');
    const list = el('nav', null, 'uw-missions'); list.setAttribute('aria-label', 'Campaign missions');
    for (let ch = 1; ch <= 4; ch++) {
      list.append(el('h2', `${ch}. ${D.chapters[ch - 1]}`));
      for (const m of D.missions.filter(m => m.chapter === ch)) {
        const unlocked = D.unlocked(progress, m.id), done = !!progress.completed[m.id];
        const b = button(`${String(m.id).padStart(2, '0')}  ${m.title}`, () => { selected = m.id; journal(); }, selected === m.id ? 'selected' : '');
        b.disabled = !unlocked; b.setAttribute('aria-current', selected === m.id ? 'step' : 'false');
        b.append(el('span', done ? 'COMPLETE' : unlocked ? 'AVAILABLE' : 'LOCKED')); list.append(b);
      }
    }
    const m = D.missions[selected - 1], detail = el('article', null, 'uw-detail');
    const image = el('img'); image.src = `map-previews/${m.map}.jpg`; image.alt = `${m.title} operation area`; image.onerror = () => { image.src = 'map-previews/urban.jpg'; image.onerror = null; };
    detail.append(image, el('small', `CHAPTER ${m.chapter} / ${D.chapters[m.chapter - 1]} / ${m.map.replace(/_/g, ' ').toUpperCase()}`), el('h2', m.title), el('p', m.briefing));
    const contact = D.characters[m.contact];
    detail.append(el('p', `${contact.name} / ${contact.role}`, 'uw-contact'));
    detail.append(el('h3', 'Operation'), el('p', m.stages.filter(s => s.kind !== 'choice').map(s => s.text).join(' / ')));
    detail.append(el('h3', 'Optional objective'), el('p', 'Bring Jax home without a knockdown. +20 REP.'));
    const actions = el('div', null, 'uw-actions');
    if (progress.checkpoint?.mission === m.id) actions.append(button('Resume Checkpoint', () => launch(m.id, true), 'uw-primary'));
    actions.append(button(progress.completed[m.id] ? 'Replay Mission' : 'Start Mission', () => launch(m.id), 'uw-primary'));
    detail.append(actions, el('p', '90 REP on first completion / reputation cannot be farmed by replaying', 'uw-muted'));
    if (progress.endings.length) detail.append(el('p', 'Endings: ' + progress.endings.map(k => D.endings[k].title).join(' / '), 'uw-ending-list'));
    detail.append(el('h3', 'Your standing'));
    const effects = D.consequences(progress);
    detail.append(el('p', `Allies ${effects.trust} / Evidence ${effects.evidence} / Strays loyalty ${effects.loyalty}`));
    const nextRank = D.ranks[D.ranks.indexOf(D.rank(progress)) + 1];
    if (nextRank) detail.append(el('p', `Next: ${nextRank.name} / ${nextRank.rep} REP / finish mission ${nextRank.gate}`, 'uw-muted'));
    detail.append(el('small', 'DEVICE SAVE / ' + (api.account() || 'GUEST'), 'uw-muted'));
    layout.append(list, detail); panel.append(layout); focus();
  }
  function dialogue(lines, done, heading = '') {
    if (!lines.length) { done(); return; }
    show('dialogue');
    const m = run.mission;
    const image = el('img', null, 'uw-dialogue-backdrop'); image.src = `map-previews/${m.map}.jpg`; image.alt = m.title; panel.append(image);
    const content = el('div', null, 'uw-dialogue');
    content.append(el('small', heading || `MISSION ${m.id} / ${m.title}`));
    let index = 0;
    const portrait = el('img', null, 'uw-portrait');
    const speaker = el('h2'), role = el('small'), text = el('p');
    const next = button('Continue', () => { if (++index >= lines.length) done(); else render(); }, 'uw-primary');
    const skip = button('Skip Conversation', done, 'uw-secondary');
    const render = () => { const [id, line] = lines[index], c = D.characters[id] || D.characters.Player;
      portrait.src = api.portrait(id); portrait.alt = c.name;
      speaker.textContent = c.name; speaker.style.color = c.color; role.textContent = c.role; text.textContent = line; };
    content.append(portrait, speaker, role, text, next, skip); panel.append(content); render(); focus();
  }
  function launch(id, checkpoint = false) {
    if (!api) return;
    load(); if (!D.unlocked(progress, id)) return;
    const mission = D.missions[id - 1], stage = checkpoint && progress.checkpoint?.mission === id ? progress.checkpoint.stage : 0;
    api.start(mission);
    run = { mission, stage, status: 'active', elapsed: 0, bonus: !checkpoint, marker: null, channel: 0, timer: 0,
      kills: 0, wave: 0, companionDownAt: 0, phase: 0, routes: api.routes(), stageData: null, collected: 0 };
    api.place(run.routes[0]);
    api.companion('Jax', run.routes[0]);
    hud.hidden = false;
    hud.innerHTML = '<div class="uw-hud-title"></div><strong class="uw-objective"></strong><span class="uw-bearing" aria-label="Objective direction">&#8593;</span><div class="uw-progress"></div><progress class="uw-boss-health" aria-label="Dante health" hidden></progress><div class="uw-radio"></div><small class="uw-save">Checkpoint saved</small><div class="uw-hud-actions"></div>';
    hud.querySelector('.uw-hud-actions').append(button('Interact', interact, 'uw-interact'), button('Journal', pauseMenu, 'uw-secondary'));
    if (stage > 0) beginStage(); else dialogue(mission.intro, beginStage);
  }
  function checkpoint() {
    progress.checkpoint = { mission: run.mission.id, stage: run.stage, choices: { ...progress.choices } }; save();
  }
  function beginStage() {
    if (!run || run.status !== 'active') return;
    if (run.stage >= run.mission.stages.length) { complete(); return; }
    checkpoint(); api.clearEnemies(); clearMarkers();
    run.stageData = { ...run.mission.stages[run.stage] };
    if (run.stageData.kind === 'finale') {
      const ending = D.endings[progress.choices.ending] || D.endings.ghost;
      Object.assign(run.stageData, ending, { text: ending.objective, point: 3 });
      const effects = D.consequences(progress);
      if (progress.choices.ending === 'peace' && effects.evidence >= 1) run.stageData.count = 2;
      if (progress.choices.ending === 'king' && effects.loyalty >= 1) run.stageData.count = 4;
    }
    const s = run.stageData;
    if (s.kind === 'choice') { choose(s); return; }
    run.channel = 0; run.timer = 0; run.kills = 0; run.wave = 0; run.phase = 0; run.zoneHp = 100;
    const point = run.routes[s.point || 0]; run.point = point;
    if (s.kind !== 'combat' && s.kind !== 'boss') markers.push(api.marker(point, s.kind, s));
    if (s.count) api.enemies(Math.min(s.count, 6), point, run.mission.id, s.kind === 'boss');
    panel.hidden = true; pause(false); api.active(true); api.capture(); renderHUD();
  }
  function choose(s) {
    show('choice');
    const content = el('div', null, 'uw-choice');
    content.append(el('small', run.mission.title), el('h2', D.characters[s.speaker].name), el('p', s.text));
    for (const option of s.options) content.append(button(option.label, () => {
      progress.choices[s.key] = option.id; save();
      dialogue([[s.speaker, option.line]], () => { run.stage++; beginStage(); });
    }, 'uw-choice-option'));
    panel.append(content); focus();
  }
  function advance() {
    if (!run || run.status !== 'active') return;
    run.stage++; api.refill(); beginStage();
  }
  function clearMarkers() { for (const marker of markers) api.removeMarker(marker); markers = []; }
  function canInteract() {
    if (!run || paused || run.status !== 'active' || !run.point || run.stageData?.kind !== 'retrieve') return false;
    const p = api.player(); return Math.hypot(p.x - run.point.x, p.z - run.point.z) < 3.5 && Math.abs(p.y - 1.65) < 3;
  }
  function interact() { if (canInteract() && !run.channel) { run.channel = .001; run.channelHp = api.player().hp; } }
  function renderHUD() {
    if (!run || !run.stageData) return;
    const s = run.stageData, p = api.player(), dist = Math.round(Math.hypot(p.x - run.point.x, p.z - run.point.z));
    hud.querySelector('.uw-hud-title').textContent = `${String(run.mission.id).padStart(2, '0')} / ${run.mission.title} / ${D.rank(progress).name}`;
    hud.querySelector('.uw-objective').textContent = s.text;
    hud.querySelector('.uw-progress').textContent = s.kind === 'combat' || s.kind === 'boss' ? `${run.kills}/${s.count} defeated`
      : s.kind === 'defend' ? `${Math.ceil(Math.max(0, s.seconds - run.timer))}s / Zone integrity ${Math.ceil(run.zoneHp)}% / ${dist}m`
      : s.kind === 'retrieve' && run.channel ? `Securing ${Math.min(100, Math.round(run.channel / s.seconds * 100))}%` : `${dist}m to objective`;
    const jax = api.companionState();
    hud.querySelector('.uw-radio').textContent = jax ? `Jax / ${jax.dead ? 'DOWN' : Math.ceil(jax.hp) + ' HP'}${run.mission.protect ? ' / must survive' : ''}` : '';
    const boss = s.kind === 'boss' && api.enemyStates().find(b => b.campaignBoss);
    const bar = hud.querySelector('.uw-boss-health'); bar.hidden = !boss;
    if (boss) {
      bar.max = boss.maxHp; bar.value = Math.max(0, boss.hp);
      hud.querySelector('.uw-progress').textContent = `Dante / ${Math.ceil(boss.hp)} / ${boss.maxHp} HP`;
    }
    hud.querySelector('.uw-bearing').style.transform = `rotate(${api.bearing(run.point)}rad)`;
    hud.querySelector('.uw-interact').hidden = !canInteract();
  }
  function tick(dt) {
    if (!run || paused || run.status !== 'active') return;
    if (!api.inCampaign()) { stop(); return; }
    dt = Math.max(0, Math.min(.1, dt)); run.elapsed += dt;
    const s = run.stageData;
    if (!s || s.kind === 'choice') return;
    const p = api.player();
    if (p.dead || p.hp <= 0) { fail('You were overwhelmed. Your last objective checkpoint is safe.'); return; }
    const jax = api.companionState();
    if (jax?.dead) {
      run.bonus = false;
      if (run.mission.protect || progress.choices.ending === 'ghost' && run.mission.id === 16 && run.stageData.kind === 'escort') { fail('Jax was lost during the operation.'); return; }
      run.companionDownAt += dt;
      if (run.companionDownAt >= 8) { api.reviveCompanion(p); run.companionDownAt = 0; }
    }
    api.follow(dt, s.kind === 'escort' ? run.point : p, s.kind === 'escort');
    const distance = Math.hypot(p.x - run.point.x, p.z - run.point.z);
    const near = distance < 3.5 && Math.abs(p.y - 1.65) < 3;
    const enemies = api.enemyStates();
    if (s.kind === 'combat' || s.kind === 'boss') {
      run.kills = enemies.filter(b => b.dead).length;
      if (s.kind === 'boss') {
        const boss = enemies.find(b => b.campaignBoss);
        const phase = boss && !boss.dead ? boss.hp / boss.maxHp < .33 ? 2 : boss.hp / boss.maxHp < .66 ? 1 : 0 : 0;
        if (phase > run.phase) { run.phase = phase; api.enemies(2, run.point, run.mission.id, false, true); api.radio('Dante called reinforcements. Keep moving.'); }
        if (boss?.dead) { advance(); return; }
      } else if (run.kills >= s.count) { advance(); return; }
    } else if (s.kind === 'reach' && near) { advance(); return; }
    else if (s.kind === 'retrieve' && run.channel) {
      if (!canInteract() || p.hp < run.channelHp) { run.channel = 0; api.radio('Interrupted. Secure the area and try again.'); }
      else { run.channel += dt; if (run.channel >= s.seconds) { advance(); return; } }
    } else if (s.kind === 'defend') {
      if (distance < 12) run.timer += dt;
      const inside = enemies.filter(b => !b.dead && Math.hypot(b.x - run.point.x, b.z - run.point.z) < 7).length;
      if (inside && distance > 12) run.zoneHp -= dt * inside * 4;
      if (run.zoneHp <= 0) { fail('The defense position was overrun.'); return; }
      run.wave += dt;
      if (run.wave >= 13 && enemies.filter(b => !b.dead).length <= 4) { run.wave = 0; api.enemies(2, run.point, run.mission.id, false, true); }
      if (run.timer >= s.seconds) { advance(); return; }
    } else if (s.kind === 'escort') {
      if (near && jax && !jax.dead && Math.hypot(jax.x - run.point.x, jax.z - run.point.z) < 4) { advance(); return; }
    }
    run.hudAt = (run.hudAt || 0) + dt;
    if (run.hudAt >= .15) { run.hudAt = 0; renderHUD(); }
    api.markerTick(markers, dt);
  }
  function death(id) {
    if (!run || run.status !== 'active') return;
    if (id === api.myId()) fail('You were overwhelmed. Your last objective checkpoint is safe.');
  }
  function fail(reason) {
    if (!run || run.status !== 'active') return;
    run.status = 'failed'; run.bonus = false; api.active(false); show('failed'); clearMarkers();
    const content = el('div', null, 'uw-result');
    content.append(el('small', run.mission.title), el('h1', 'Operation Failed'), el('p', reason),
      button('Retry Checkpoint', () => launch(run.mission.id, true), 'uw-primary'),
      button('Restart Mission', () => launch(run.mission.id), 'uw-secondary'), button('Campaign Journal', () => { stop(); open(); }, 'uw-secondary'));
    panel.append(content); focus();
  }
  function complete() {
    const r = run;
    r.status = 'complete'; api.active(false); clearMarkers();
    const rankBefore = D.rank(progress).name, repBefore = D.reputation(progress), previous = progress.completed[r.mission.id];
    progress.completed[r.mission.id] = { bonus: !!(previous?.bonus || r.bonus), seconds: previous ? Math.min(previous.seconds, r.elapsed) : r.elapsed };
    progress.checkpoint = null;
    const ending = r.mission.id === 16 ? progress.choices.ending || 'ghost' : null;
    if (ending && !progress.endings.includes(ending)) progress.endings.push(ending);
    save();
    const lines = [...r.mission.outro, ...(ending ? D.endings[ending].lines : [])];
    dialogue(lines, () => {
      show('complete');
      const content = el('div', null, 'uw-result'), rankAfter = D.rank(progress).name;
      content.append(el('small', ending ? 'CAMPAIGN COMPLETE' : `MISSION ${r.mission.id} COMPLETE`), el('h1', ending ? D.endings[ending].title : r.mission.title));
      const awarded = D.reputation(progress) - repBefore;
      content.append(el('p', awarded ? `+${awarded} REP` : 'Replay complete / no duplicate reputation reward'));
      content.append(el('p', rankBefore !== rankAfter ? `PROMOTED / ${rankAfter}` : `${rankAfter} / ${D.reputation(progress)} REP`));
      if (r.mission.id < 16) content.append(button('Next Mission', () => launch(r.mission.id + 1), 'uw-primary'));
      content.append(button('Campaign Journal', () => { stop(); open(); }, 'uw-secondary'), button('Back to Lobby', () => { stop(); api.lobby(); }, 'uw-secondary'));
      panel.append(content); focus();
    }, ending ? D.endings[ending].title : 'AFTER THE OPERATION');
  }
  function pauseMenu() {
    if (!run || run.status !== 'active') return;
    show('pause');
    const content = el('div', null, 'uw-result');
    content.append(el('small', 'OPERATION PAUSED'), el('h1', run.mission.title), el('p', run.stageData?.text || ''),
      button('Resume', resume, 'uw-primary'), button('Retry Checkpoint', () => launch(run.mission.id, true), 'uw-secondary'),
      button('Save and Leave', () => { checkpoint(); stop(); api.stopWorld(); open(); }, 'uw-secondary'));
    panel.append(content); focus();
  }
  function resume() { panel.hidden = true; pause(false); api.capture(); }
  function stop() {
    clearMarkers(); run = null; paused = false;
    if (panel) panel.hidden = true; if (hud) hud.hidden = true;
  }
  window.PVP_UNDERWORLD = { bind(value) { api = value; initUI(); }, open, launch, tick, death, stop,
    interact, canInteract, pauseMenu, get paused() { return paused; }, get run() { return run; }, get progress() { return progress; },
    data: D };
})();
