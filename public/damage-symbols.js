(function (root) {
  'use strict';
  const white = '#f2f5fa', red = '#ff6775', orange = '#ffb348', blue = '#82d6ff', violet = '#caafff', gold = '#ffda69';
  const shapes = {
    hit: '<path d="m16 1 2.6 9-2.6 3-2.6-3Zm15 15-9 2.6-3-2.6 3-2.6ZM16 31l-2.6-9 2.6-3 2.6 3ZM1 16l9-2.6 3 2.6-3 2.6Zm4-11 8 4-2 4Zm22 0-4 8-4-2Zm0 22-8-4 2-4ZM5 27l4-8 4 2Z" fill="currentColor" stroke="none"/>',
    heavy: '<path d="m16 1 3 9 9-6-5 10 9 2-10 4 5 10-10-6-4 8-2-10-10 3 6-8-7-5 11 1Z"/>',
    head: '<circle cx="16" cy="16" r="11"/><path d="M16 1v8m0 14v8M1 16h8m14 0h8"/><circle cx="16" cy="16" r="1.7" fill="currentColor"/>',
    skull: '<path d="M5 14C5 1 27 1 27 14q0 8-7 9v6h-8v-6q-7-1-7-9Z" fill="currentColor"/><path d="m9 13 5 2-2 4-3-1Zm14 0-5 2 2 4 3-1Zm-7 5-2 4h4Z" fill="#171a21" stroke="none"/><path d="M15 25v5m3-5v5" stroke="#171a21"/>',
    slash: '<path d="m15 2-5 13h4L2 30l6-16H4Zm11 0-5 13h4L13 30l6-16h-4Zm6 7-3 11h3L23 31l3-13h-3Z" fill="currentColor" stroke="none"/>',
    swords: '<path d="m3 2 7 3 19 23-3 3L5 10Zm26 0-7 3L3 28l3 3L27 10Z" fill="currentColor"/><path d="m2 21 9 9m10-28 9 9"/>',
    bullet: '<path d="M12 10h12l7 6-7 6H12ZM3 10l6 2M1 16h8m-6 6 6-2" fill="currentColor"/>',
    ricochet: '<path d="m2 26 12-11 6 5L29 3m-8 1 8-1 1 9M2 30h20"/><path d="m8 24-2-7m9 9 5 1"/>',
    reflection: '<path d="M4 12A12 12 0 0 1 26 8l3 5h-9M28 20A12 12 0 0 1 6 24l-3-5h9"/><path d="M29 4v9M3 28v-9"/>',
    pierce: '<path d="M2 11h9v10H2Zm15-7v24m5-17h3l6 5-6 5h-3M1 6h8m-8 20h8"/>',
    explosion: '<path d="m2 29 7-7-6-4 9 1-2-14 7 12L24 3l-2 16 9-4-7 9 5 5Z"/>',
    blast: '<path d="M5 29h22l-5-6c12 0 9-15 1-13 0-12-14-10-14-2-10-2-12 12-3 14l6 1Z"/><path d="m11 24 5-9 5 9"/>',
    shockwave: '<ellipse cx="16" cy="17" rx="14" ry="4"/><path d="m16 1-3 11m3 19 3-10M5 7l5 5m17 15-5-5M27 7l-5 5M5 27l5-5"/>',
    fire: '<path d="M18 1c3 10-9 10-6 17 4 0 6-6 7-8 2 6 10 9 8 15-3 10-22 7-22-3 0-6 5-9 6-14 0 9 4 8 7-7Z" fill="currentColor"/><path d="M17 18c0 6-5 6-4 10 6 3 10-3 4-10Z" fill="#fff2b6" stroke="none"/>',
    frost: '<path d="M16 1v30M3 8l26 16M3 24 29 8M11 4l5 5 5-5M11 28l5-5 5 5M3 14l7-2V5M29 18l-7 2v7M3 18l7 2v7M29 14l-7-2V5"/>',
    electric: '<path d="M20 1 3 19h12l-3 12 17-20H17Z" fill="currentColor"/>',
    radiation: '<circle cx="16" cy="16" r="3" fill="currentColor"/><path d="M13 10 7 2Q0 6 1 14h10Zm9 4h9Q32 6 25 2l-6 8ZM13 21l-5 8q8 6 16 0l-5-8Z" fill="currentColor"/>',
    vortex: '<path d="M17 16c-2-3 4-7 8-4s4 12-5 16C1 36-6 9 11 3c19-7 27 15 14 21C9 31 0 11 14 8c12-3 15 11 6 13-8 2-10-7-5-8"/>',
    poison: '<circle cx="16" cy="17" r="5"/><path d="M13 13C3 14 0 6 8 2 3 10 9 11 13 9m6 4C29 14 32 6 24 2c5 8-1 9-5 7m-3 13C8 30 3 26 3 21c2 5 8 1 9-2m8 0c1 3 7 7 9 2 0 5-5 9-13 1"/>',
    bleed: '<path d="M16 1C13 9 4 16 5 22c1 12 21 12 22 0C28 16 19 9 16 1Z"/><path d="M10 20q-2 6 4 7"/>',
    shield: '<path d="m16 2 12 4-2 13q-3 7-10 11Q9 26 6 19L4 6Z"/><path d="m18 7-7 10h6l-2 8 7-12h-6Z" fill="currentColor"/>',
    chain: '<path d="m13 8 4-4c8-6 15 2 9 9l-5 5m-8 6-4 4c-8 6-15-2-9-9l5-5m4 8L22 9"/>',
    blind: '<path d="M2 16q14-19 28 0-14 19-28 0Z"/><circle cx="16" cy="16" r="6"/><path d="M2 30 30 2" stroke-width="4"/>',
    stun: '<path d="M17 17c-8 3-10-9-2-10 12-3 18 14 7 20C5 38-7 14 6 5"/>',
    air: '<path d="M14 27 8 15 2 7l11 4 3 12 3-12L30 7l-6 8-6 12m-7-6L3 17m18 4 8-4"/>',
    up: '<path d="m16 1-12 14 9-2v18h6V13l9 2Z" fill="currentColor"/>',
    slam: '<path d="M16 1v21m-7-7 7 7 7-7M2 30l5-13 5 10 4-3 5 3 5-10 4 13" />',
    dash: '<circle cx="23" cy="4" r="3" fill="currentColor"/><path d="m10 13 9-5 7 9h5M20 10l-5 11-9 9m9-9 10 5-2 6M1 8h9M1 15h6m-6 7h6"/>',
    longshot: '<circle cx="16" cy="16" r="10"/><path d="M16 1v8m0 14v8M1 16h8m14 0h8M2 6l4 4m24-4-4 4"/><circle cx="16" cy="16" r="2"/>',
    charged: '<path d="m22 3 1 8 8 2-7 5 1 9-7-6-8 5 3-9-6-6 9-1Z" fill="currentColor"/><path d="M1 23l8-5m-5 13 8-7"/>',
    trap: '<path d="M2 14q0 15 14 15t14-15M2 14l5 7 4-7 5 7 5-7 5 7 4-7M5 11l3-7 4 6 4-8 4 8 4-6 3 7"/>',
    mine: '<ellipse cx="16" cy="19" rx="14" ry="7"/><ellipse cx="16" cy="16" rx="14" ry="7"/><path d="M12 8V4h8v4"/>',
    tripwire: '<path d="M4 3v26m24-26v26M4 10l24 12M4 22l24-12M1 29h7m17 0h6"/><circle cx="4" cy="3" r="2"/><circle cx="28" cy="3" r="2"/>',
    spikes: '<path d="m1 29 4-15 4 15 5-27 5 27 4-20 3 20 4-12 2 12Z"/>',
    turret: '<path d="M3 11h25v9H3Zm6 9-5 10m17-10 6 10M28 13h4M12 7V3h9v4M3 25h24"/>',
    drone: '<ellipse cx="5" cy="5" rx="5" ry="3"/><ellipse cx="27" cy="5" rx="5" ry="3"/><ellipse cx="5" cy="27" rx="5" ry="3"/><ellipse cx="27" cy="27" rx="5" ry="3"/><path d="m5 5 22 22M5 27 27 5"/><rect x="10" y="10" width="12" height="12"/>',
    sensor: '<circle cx="16" cy="16" r="3" fill="currentColor"/><path d="M9 9q-7 7 0 14m14-14q7 7 0 14M5 4q-12 12 0 24M27 4q12 12 0 24M16 2v6m-3-2 3-4 3 4"/>',
    beacon: '<path d="M10 21h12l4 9H6ZM16 7v11M8 8q-5 5 0 10m16-10q5 5 0 10M4 4q-9 10 0 18M28 4q9 10 0 18"/><circle cx="16" cy="5" r="2"/>',
    heal: '<circle cx="16" cy="16" r="14"/><path d="M13 7h6v6h6v6h-6v6h-6v-6H7v-6h6Z" fill="currentColor"/>',
    supply: '<path d="m2 8 14-6 14 6v17l-14 5-14-5Zm0 0 14 6 14-6M16 14v16M10 5l14 6v8"/>',
    crown: '<path d="m2 8 6 6L16 2l8 12 6-6-4 18H6ZM6 30h20" fill="currentColor"/>',
    downShield: '<path d="m16 2 12 4-2 13q-3 7-10 11Q9 26 6 19L4 6Z"/><path d="M16 8v14m-5-5 5 5 5-5"/>',
  };
  const groups = [
    ['Direct damage', [
      ['hit','Hit','hit',white],['light','Light Hit','hit',white],['heavy','Heavy Hit','heavy',white],
      ['head','Headshot','head',red],['critical','Critical','head',orange],['slash','Slash','slash',red],
      ['meleeKill','Melee Kill','swords',red],['bullet','Bullet','bullet',blue],['ricochet','Ricochet','ricochet',white],
      ['reflection','Reflection','reflection',violet],['pierce','Pierce','pierce',white],
    ]],
    ['Explosive & area damage', [
      ['explosion','Explosion','explosion',orange],['blast','Blast','blast',orange],['shockwave','Shockwave','shockwave',gold],
      ['fire','Fire','fire',orange],['incendiary','Incendiary','explosion',orange],['frost','Frost','frost',blue],
      ['electric','Electric','electric',gold],['emp','EMP','heavy',blue],['radiation','Radiation','radiation',gold],
      ['vortex','Vortex','vortex',violet],['blackHole','Black Hole','vortex','#df75ff'],
    ]],
    ['Status effects', [
      ['poison','Poison','poison','#b7ec75'],['bleed','Bleed','bleed',red],['toxin','Toxin','skull','#d796dd'],
      ['burning','Burning','fire',orange],['frozen','Frozen','frost',blue],['armorBreak','Armor Break','shield',blue],
      ['disarm','Disarm','chain',white],['blind','Blind','blind',white],['stun','Stun','stun',violet],
      ['weaken','Weaken','downShield',white],['marked','Marked','head',red],
    ]],
    ['Special hits', [
      ['air','Airshot','up',white],['slam','Ground Slam','slam',white],['dash','Dash Hit','dash',white],
      ['longshot','Longshot','longshot',white],['burst','Burst','heavy',red],['multi','Multi-Hit','slash',white],
      ['combo','Combo',null,white],['weakPoint','Weak Point','head',red],['chain','Chain','chain',white],
      ['charged','Charged','charged',gold],['penetrating','Penetrating','pierce',white],
    ]],
    ['Traps & utilities', [
      ['trap','Trap','trap',red],['mine','Land Mine','mine',white],['tripwire','Tripwire','tripwire',red],
      ['spikes','Spikes','spikes',white],['turret','Turret','turret',white],['drone','Drone','drone',white],
      ['sensor','Sensor','sensor',violet],['beacon','Beacon','beacon',red],['shield','Shield','shield',blue],
      ['heal','Heal','heal','#b7ec75'],['supply','Supply','supply',orange],
    ]],
    ['Eliminations', [
      ['kill','Elimination','skull',red],['headKill','Headshot Kill','head',red],['meleeElim','Melee Kill','swords',red],
      ['explosionKill','Explosion Kill','explosion',orange],['burnKill','Burn Kill','fire',orange],
      ['electricKill','Electric Kill','electric',gold],['airKill','Air Kill','air',white],
      ['longshotKill','Longshot Kill','longshot',red],['double','Double Kill',null,gold],
      ['triple','Triple Kill',null,gold],['rampage','Rampage','crown',gold],
    ]],
  ];
  const catalog = Object.fromEntries(groups.flatMap(([group, items]) => items.map(([id,label,shape,color]) => [id,{id,label,shape,color,group}])));
  const svg = id => {
    const def = catalog[id] || catalog.hit;
    const text = {combo:'\u00d73',double:'\u00d72',triple:'\u00d73'}[id];
    let art = text ? '<text x="16" y="24" fill="currentColor" stroke="none" text-anchor="middle" font-size="25" font-weight="900">' + text + '</text>' : shapes[def.shape];
    if (id === 'light') art = '<path d="m16 2 3 10-3 4-3-4ZM2 22l9-4 2 5-4 3Zm28 0-9-4-2 5 4 3Z" fill="currentColor"/>';
    if (id === 'marked') art += '<path d="M28 16v14m-4-5 4 5 4-5"/>';
    if (id === 'armorBreak') art = shapes.shield + '<path d="m16 2-5 10 8 3-8 13" stroke="#10151c" stroke-width="3"/>';
    if (['headKill','longshotKill','airKill','explosionKill'].includes(id)) {
      art += '<g transform="translate(9 9) scale(.44)">' + shapes.skull + '</g>';
    }
    return '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">' + art + '</svg>';
  };
  function kind(meta = {}, damage = 0, head = false, lethal = false, count = 1) {
    if (lethal) {
      if (head) return 'headKill';
      if (meta.melee) return 'meleeElim';
      if (['fire','burning','incendiary'].includes(meta.kind)) return 'burnKill';
      if (['explosion','blast','mine'].includes(meta.kind)) return 'explosionKill';
      if (meta.kind === 'electric') return 'electricKill';
      if (meta.airborne) return 'airKill';
      if (meta.longRange) return 'longshotKill';
      return 'kill';
    }
    if (meta.shield) return 'shield';
    if (meta.reflected) return 'reflection';
    if (head) return 'head';
    if (meta.critical) return 'critical';
    if (meta.ricochet) return 'ricochet';
    if (meta.pierced) return 'pierce';
    if (catalog[meta.kind]) return meta.kind;
    if (meta.airborne) return 'air';
    if (meta.longRange) return 'longshot';
    if (count > 1) return 'multi';
    return damage >= 150 ? 'heavy' : damage < 25 ? 'light' : 'hit';
  }
  function look(total, head, lethal, meta = {}, count = 1, equal = false, first = total) {
    const id = kind(meta,total,head,lethal,count), def = catalog[id];
    const n = Math.max(0, Math.round(total)), unit = Math.max(0, Math.round(first));
    const text = equal && count > 1 && !lethal ? unit + '\u00d7' + count : n + (head ? '!' : '');
    let secondary = meta.reflected && id !== 'reflection' ? 'reflection'
      : meta.ricochet && id !== 'ricochet' ? 'ricochet'
      : meta.airborne && !['air','airKill'].includes(id) ? 'air'
      : meta.longRange && !['longshot','longshotKill'].includes(id) ? 'longshot' : null;
    return {kind:id, secondary, text, color:def.color, label:def.label + ': ' + n + ' damage' + (count > 1 ? ', ' + count + ' hits' : '')};
  }
  function paint(el, style) {
    el.innerHTML = '<span class="ds-icon">' + svg(style.kind) + '</span><span class="ds-value">' + style.text +
      '</span>' + (style.secondary ? '<span class="ds-icon ds-secondary" style="color:' + catalog[style.secondary].color + '">' + svg(style.secondary) + '</span>' : '');
    el.dataset.damageKind = style.kind;
    el.setAttribute('aria-label', style.label);
    el.style.color = style.color;
  }
  const api = {catalog,groups,kind,look,paint,svg};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PVP_DAMAGE_SYMBOLS = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
