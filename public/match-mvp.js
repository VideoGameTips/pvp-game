(() => {
  'use strict';

  const tally = n => Number.isSafeInteger(n) && n >= 0 ? n : 0;
  function snapshot(row) {
    if (!row || typeof row.id !== 'string' || !row.id || row.id.length > 128 || typeof row.name !== 'string') return null;
    const name = row.name.trim().slice(0, 64);
    if (!name) return null;
    const isBot = row.isBot === true;
    const rank = !isBot && Number.isInteger(row.rank) && row.rank >= 0 && row.rank < 12 ? row.rank : null;
    const weaponId = typeof row.weaponId === 'string' && /^[a-z0-9_]{1,48}$/.test(row.weaponId) ? row.weaponId : null;
    return { id: row.id, name, isBot, rank, weaponId, kills: tally(row.kills), deaths: tally(row.deaths) };
  }

  function pick(roster, winner, scores, deaths) {
    if (winner !== 'ally' && winner !== 'enemy') return null;
    let best = null;
    for (const player of roster) {
      if (player.team !== winner) continue;
      const row = snapshot({ ...player, kills: scores[player.id], deaths: deaths[player.id] });
      if (!row) continue;
      if (!best || row.kills > best.kills || (row.kills === best.kills &&
          (row.deaths < best.deaths || (row.deaths === best.deaths && row.id < best.id)))) best = row;
    }
    return best;
  }

  function kd(kills, deaths) {
    return deaths ? (kills / deaths).toFixed(2) : kills ? '\u221e' : '0.00';
  }

  function render(screen, mvp, options = {}) {
    const panel = screen?.querySelector('#match-mvp');
    if (!panel) return;
    screen.classList.toggle('has-mvp', !!mvp);
    panel.hidden = !mvp;
    const emblem = panel.querySelector('.mvp-emblem');
    const image = panel.querySelector('.mvp-weapon img');
    emblem.replaceChildren();
    image.removeAttribute('src');
    image.hidden = true;
    if (!mvp) return;

    const put = (id, text) => { panel.querySelector('#mvp-' + id).textContent = text; };
    put('team', options.won ? 'YOUR TEAM' : 'OPPOSING TEAM');
    put('name', mvp.name);
    put('kills', mvp.kills);
    put('deaths', mvp.deaths);
    put('kd', kd(mvp.kills, mvp.deaths));
    const ratio = panel.querySelector('#mvp-kd');
    if (mvp.kills && !mvp.deaths) ratio.setAttribute('aria-label', 'Undefeated: no deaths');
    else ratio.removeAttribute('aria-label');
    const rankName = mvp.rank == null ? '' : options.rankNames?.[mvp.rank];
    const badge = rankName && options.badge?.(mvp.rank, 120);
    emblem.classList.toggle('mvp-unranked', !badge);
    emblem.dataset.bot = mvp.isBot ? 'true' : 'false';
    if (badge) emblem.appendChild(badge);
    put('rank', mvp.isBot ? 'BOT' : rankName || 'UNRANKED');

    const weapon = options.weaponName?.(mvp.weaponId);
    put('weapon-name', weapon || 'Not recorded');
    const url = weapon && options.weaponIcon?.(mvp.weaponId);
    if (url) { image.src = url; image.hidden = false; }
    panel.classList.toggle('mvp-no-weapon-art', !url);
  }

  const api = { pick, snapshot, kd, render };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else window.PVP_MATCH_MVP = api;
})();
