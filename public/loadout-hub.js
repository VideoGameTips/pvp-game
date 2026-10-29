(function () {
  'use strict';
  const slots = ['primary', 'secondary', 'melee', 'support'];
  const labels = ['Primary', 'Secondary', 'Melee', 'Utility'];
  let step = 0;
  function selectedItems() {
    return [WEAPONS[selectedPrimaryIdx], WEAPONS[selectedSecondaryIdx], MELEE_ITEMS[selectedMeleeIdx], SUPPORT_ITEMS[selectedSupportIdx]];
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
    const cards = [...screen.querySelectorAll('#loadout-' + slots[step] + '-list .loadout-card')];
    for (const card of cards) {
      card.hidden = !card.textContent.toLowerCase().includes(query) || (tier !== 'all' && card.dataset.weaponTier !== tier);
      card.setAttribute('aria-pressed', String(card.classList.contains('selected')));
    }
    const count = cards.filter(c => !c.hidden).length;
    screen.querySelector('#loadout-count').textContent = count + (count === 1 ? ' weapon' : ' weapons');
    screen.querySelector('#loadout-prev').disabled = step === 0;
    const next = screen.querySelector('#loadout-next');
    next.hidden = step === 3;
    next.textContent = 'Next: ' + (labels[step + 1] || '') + ' \u2192';
    let empty = screen.querySelector('.lh-empty');
    if (!empty) { empty = document.createElement('p'); empty.className = 'lh-empty'; screen.querySelector('#loadout-cols').appendChild(empty); }
    empty.hidden = count !== 0; empty.textContent = 'No matching weapons';
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
      card.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); } };
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
  window.PVP_LOADOUT_HUB = { mount };
})();
