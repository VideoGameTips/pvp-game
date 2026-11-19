(function () {
  'use strict';
  const slots = ['primary', 'secondary', 'melee', 'support'];
  const labels = ['Primary', 'Secondary', 'Melee', 'Utility'];
  const maxKits = 12;
  let step = 0;
  function profileKey() {
    const name = currentUser?.username;
    return 'pvp.loadout.v1.' + (name ? 'user.' + name.toLowerCase() : 'guest');
  }
  function readProfile() {
    try {
      const data = JSON.parse(localStorage.getItem(profileKey()));
      return {
        favorites: Array.isArray(data?.favorites) ? data.favorites : [],
        kits: Array.isArray(data?.kits) ? data.kits.filter(k => typeof k?.name === 'string' && ['p','s','m','u'].every(slot => typeof k[slot] === 'string')) : [],
      };
    } catch (_) { return { favorites: [], kits: [] }; }
  }
  function writeProfile(profile) {
    try { localStorage.setItem(profileKey(), JSON.stringify(profile)); return true; }
    catch (_) { return false; }
  }
  function saveKit(rawName, kit) {
    const name = rawName.trim();
    if (!name) return 'Enter a kit name.';
    const profile = readProfile();
    if (profile.kits.some(k => k.name.toLowerCase() === name.toLowerCase())) return 'That kit name is already in use.';
    if (profile.kits.length >= maxKits) return 'Delete a saved kit to make room.';
    profile.kits.push({ ...kit, name });
    return writeProfile(profile) ? '' : 'Could not save this kit on this device.';
  }
  function deleteKit(name) {
    const profile = readProfile();
    profile.kits = profile.kits.filter(k => k.name !== name);
    return writeProfile(profile);
  }
  function selectedItems() {
    const {p,s,m,u}=selectedLoadoutKit();
    return [WEAPONS[p], WEAPONS[s], MELEE_ITEMS[m], SUPPORT_ITEMS[u]];
  }
  function refresh(screen) {
    const items = selectedItems();
    screen.dataset.loadoutStep = slots[step];
    screen.querySelectorAll('#loadout-steps button').forEach((button, i) => {
      button.setAttribute('aria-selected', String(i === step));
      button.tabIndex = i === step ? 0 : -1;
      button.querySelector('.lh-slot-name').textContent = items[i]?.name || 'Choose';
    });
    screen.querySelectorAll('.loadout-col').forEach((col, i) => { col.hidden = i !== step; });
    const query = screen.querySelector('#loadout-search').value.trim().toLowerCase();
    const tier = screen.querySelector('#loadout-tier').value;
    const favorites = new Set(readProfile().favorites);
    const favoritesOnly = screen.querySelector('#loadout-favorites').getAttribute('aria-pressed') === 'true';
    const cards = [...screen.querySelectorAll('#loadout-' + slots[step] + '-list .loadout-card')];
    for (const card of cards) {
      const starred = favorites.has(card.dataset.itemId);
      card.hidden = !card.querySelector('.lc-copy').textContent.toLowerCase().includes(query) ||
        (tier !== 'all' && card.dataset.weaponTier !== tier) || (favoritesOnly && !starred);
      card.setAttribute('aria-pressed', String(card.classList.contains('selected')));
      const star = card.querySelector('.lh-favorite');
      star.setAttribute('aria-pressed', String(starred));
      star.textContent = starred ? '\u2605' : '\u2606';
      star.title = starred ? 'Remove favorite' : 'Add favorite';
    }
    const count = cards.filter(c => !c.hidden).length;
    screen.querySelector('#loadout-count').textContent = count + (count === 1 ? ' weapon' : ' weapons');
    screen.querySelector('#loadout-prev').disabled = step === 0;
    const next = screen.querySelector('#loadout-next');
    next.hidden = step === 3;
    next.textContent = 'Next: ' + (labels[step + 1] || '') + ' \u2192';
    let empty = screen.querySelector('.lh-empty');
    if (!empty) { empty = document.createElement('p'); empty.className = 'lh-empty'; screen.querySelector('#loadout-cols').appendChild(empty); }
    empty.hidden = count !== 0; empty.textContent = favoritesOnly ? 'No matching favorites' : 'No matching weapons';
    hydrateLoadoutPreviews(screen);
  }
  function go(screen, next) {
    step = Math.max(0, Math.min(3, next));
    screen.querySelector('#loadout-search').value = '';
    refresh(screen);
    const list = screen.querySelector('#loadout-' + slots[step] + '-list');
    list.scrollTop = 0;
  }
  function mount(screen) {
    step = 0;
    if(!screen.querySelector('#loadout-tier')) {
      const select=document.createElement('select');select.id='loadout-tier';select.setAttribute('aria-label','Weapon category');
      select.innerHTML='<option value="all">All categories</option>'+Object.entries(PVP_SHOP_CATALOG.tiers).map(([id,t])=>'<option value="'+id+'">'+t.name+'</option>').join('');
      select.onchange=()=>refresh(screen);screen.querySelector('.lh-tools').insertBefore(select,screen.querySelector('#loadout-count'));
    }
    if (!screen.querySelector('#loadout-favorites')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.id = 'loadout-favorites';
      button.textContent = '\u2605';
      button.title = 'Favorites only';
      button.setAttribute('aria-label', 'Favorites only');
      button.setAttribute('aria-pressed', 'false');
      button.onclick = () => {
        button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
        refresh(screen);
      };
      screen.querySelector('.lh-tools').insertBefore(button, screen.querySelector('#loadout-count'));
    }
    screen.querySelector('#loadout-favorites').setAttribute('aria-pressed', 'false');
    screen.querySelector('#best-loadouts-btn').textContent = 'Saved kits';
    screen.querySelector('#loadout-search').value = '';
    const nav = screen.querySelector('#loadout-steps');
    nav.setAttribute('role', 'tablist');
    nav.innerHTML = labels.map((name, i) => `<button type="button" role="tab" aria-controls="loadout-${slots[i]}-list" data-step="${i}"><span class="lh-step-number">${i + 1}</span><span><strong>${name}</strong><span class="lh-slot-name"></span></span></button>`).join('');
    nav.querySelectorAll('button').forEach((button, i) => {
      button.onclick = () => go(screen, i);
      button.onkeydown = e => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault();
        go(screen, e.key === 'Home' ? 0 : e.key === 'End' ? 3 : (i + (e.key === 'ArrowRight' ? 1 : 3)) % 4);
        nav.children[step].focus();
      };
    });
    screen.querySelectorAll('.loadout-col').forEach((col, i) => {
      col.dataset.slot = slots[i];
      const list = col.querySelector('[id$="-list"]'); list.setAttribute('role', 'tabpanel'); list.setAttribute('aria-label', labels[i]);
    });
    screen.querySelectorAll('.loadout-card').forEach(card => {
      card.tabIndex = 0; card.setAttribute('role', 'button');
      card.onkeydown = e => { if (e.target === card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); card.click(); } };
      const star = document.createElement('button');
      star.type = 'button';
      star.className = 'lh-favorite';
      star.setAttribute('aria-label', 'Favorite ' + card.querySelector('.lc-name').textContent.trim());
      star.onclick = e => {
        e.stopPropagation();
        const id = card.dataset.itemId, profile = readProfile(), favorites = new Set(profile.favorites);
        favorites.has(id) ? favorites.delete(id) : favorites.add(id);
        profile.favorites = [...favorites];
        if (!writeProfile(profile)) { showAnnouncement('FAVORITES NOT SAVED', '', '#ffcc88', 1200); return; }
        refresh(screen);
      };
      card.querySelector('.lc-preview').appendChild(star);
    });
    if (!screen._hubBound) {
      screen._hubBound = true;
      screen.querySelector('#loadout-prev').onclick = () => go(screen, step - 1);
      screen.querySelector('#loadout-next').onclick = () => go(screen, step + 1);
      screen.querySelector('#loadout-search').oninput = () => refresh(screen);
      screen.addEventListener('click', e => {
        const card = e.target.closest('.loadout-card');
        if (!card || !card.classList.contains('selected')) return;
        const oldStep = step;
        requestAnimationFrame(() => { go(screen, Math.min(3, oldStep + 1)); });
      });
    }
    refresh(screen);
  }
  window.PVP_LOADOUT_HUB = { mount, saveKit, deleteKit, kits: () => readProfile().kits };
})();
