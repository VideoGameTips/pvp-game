'use strict';

const IDS = Object.freeze({
  untouchable: 'prestige_untouchable', clutch: 'prestige_against_all_odds', legend: 'prestige_legends_mark',
  deadeye: 'prestige_deadeye', first: 'prestige_first_hundred', worldbreaker: 'prestige_worldbreaker',
});
const idSet = new Set(Object.values(IDS));
const isPrestigeWrap = id => idSet.has(id);
const ownsPrestigeWrap = (u, id) => id !== IDS.clutch && !!u?.skinInventory?.includes(id);

function grant(u, id) {
  if (!u || u.isAdmin || !isPrestigeWrap(id) || id === IDS.clutch || ownsPrestigeWrap(u, id)) return false;
  if (!Array.isArray(u.skinInventory)) u.skinInventory = [];
  u.skinInventory.push(id);
  return true;
}

function recordRankResult(u, users, result, previousPeak, legendAt) {
  if (u.isAdmin) return [];
  const earned = [], award = id => { if (grant(u, id)) earned.push(id); };
  const r = u.rank;
  r.prestigeWins = result === 'win' ? (r.prestigeWins || 0) + 1 : 0;
  if (r.prestigeWins >= 25) award(IDS.untouchable);
  if (r.peak >= legendAt) {
    award(IDS.legend);
    // Older peaks reserve their places; there is no historical promotion order to hand them numbered awards retroactively.
    if (!(previousPeak >= legendAt) && Object.values(users).filter(entry => !entry.isAdmin && entry.rank?.peak >= legendAt).length <= 100) award(IDS.first);
  }
  return earned;
}

function recordHeadshot(u, weapon) {
  if (u.isAdmin || ownsPrestigeWrap(u, IDS.deadeye)) return false;
  const counts = u.prestigeHeadshots ||= {};
  counts[weapon] = (Object.hasOwn(counts, weapon) ? counts[weapon] : 0) + 1;
  return counts[weapon] >= 1000 && grant(u, IDS.deadeye);
}

function ladderRows(users) {
  return Object.entries(users).filter(([, u]) => u.rank?.games > 0 && !u.isAdmin)
    .sort(([a, x], [b, y]) => y.rank.points - x.rank.points || y.rank.wins - x.rank.wins || y.rank.games - x.rank.games || a.localeCompare(b, 'en'));
}

module.exports = { IDS, grant, isPrestigeWrap, ownsPrestigeWrap, recordRankResult, recordHeadshot, ladderRows };
