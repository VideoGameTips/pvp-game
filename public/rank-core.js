// 🏆 RANKED: the rating maths, shared by the server (which owns every rating) and the client (which only draws them).
//
// A player has ONE number, their rating in points. The ladder is read off it: every 100 points is a division (the sheet's "0 to 100 RR"), three divisions
// (III, II, I) make a rank, and there are twelve ranks, Copper to Legend. Legend has no divisions: it is everything from 3,300 up, and its RR just keeps counting.
//
//   Copper III 0 .. Copper I 99 = 0..299 · Bronze 300.. · Silver 600.. · Gold 900.. · Platinum 1200.. · Amethyst 1500.. · Sapphire 1800.. · Obsidian 2100..
//   Diamond 2400.. · Master 2700.. · Grandmaster 3000..3299 · Legend 3300+
//
// The exchange is ZERO-SUM Elo: whatever the winners gain, the losers lose, exactly (every point comes out of someone else's rating, so the average rating of everyone
// never moves). The size of it comes from how likely the result was: beating someone much better pays a lot and costs them a lot; beating someone much worse pays almost
// nothing. A team's rating is the average of its players, and every winner gets the same amount (each loser the same amount back). Matches repeated against the same
// people in a day are scaled down for BOTH sides, which keeps the sum at zero while making farming a friend worthless.
(function (root) {
  const RANKS = ['Copper', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Amethyst', 'Sapphire', 'Obsidian', 'Diamond', 'Master', 'Grandmaster', 'Legend'];
  const DIVISION_POINTS = 100;                 // RR per division
  const LEGEND_AT = 11 * 3 * DIVISION_POINTS;  // 3,300: where Legend starts
  const START_POINTS = 600;                    // a new player: Silver III, 0 RR
  const K = 40;                                // the most one game can move a rating: a win over an equal pays 20
  const SCALE = 400;                           // four ranks apart = ten to one

  // Where a rating sits on the ladder.
  function tierOf(points) {
    const p = Math.max(0, Math.floor(points));
    if (p >= LEGEND_AT) return { rank: 11, name: 'Legend', division: null, rr: p - LEGEND_AT, tier: 33, toNext: null, label: 'Legend ' + (p - LEGEND_AT) + ' RR' };
    const tier = Math.floor(p / DIVISION_POINTS), rank = Math.floor(tier / 3), division = 3 - (tier % 3), rr = p % DIVISION_POINTS;
    return { rank, name: RANKS[rank], division, rr, tier, toNext: DIVISION_POINTS - rr, label: RANKS[rank] + ' ' + ['', 'I', 'II', 'III'][division] + ' · ' + rr + ' RR' };
  }
  const expected = (mine, theirs) => 1 / (1 + Math.pow(10, (theirs - mine) / SCALE));
  const average = list => list.reduce((a, b) => a + b, 0) / Math.max(1, list.length);
  // The same people meeting again within a day pay less, for both sides: 0 earlier meetings = full, then 100%, 75%, 50%, never below 25%.
  const FARM = [1, 1, 0.75, 0.5, 0.25];
  const farmScale = earlier => FARM[Math.min(FARM.length - 1, Math.max(0, earlier | 0))];

  // Settle one match. teamA / teamB: [{ id, points }], the same size. winner: 'A', 'B' or 'draw'. earlier: how many times these players already met today.
  // Returns [{ id, before, after, delta }]: every member of the winning team gets +d, every member of the losing team -d (a draw: the lower-rated side gains).
  function settle(teamA, teamB, winner, earlier = 0) {
    if (!teamA.length || teamA.length !== teamB.length) return [];
    const ra = average(teamA.map(p => p.points)), rb = average(teamB.map(p => p.points));
    const score = winner === 'A' ? 1 : winner === 'B' ? 0 : 0.5;
    let d = Math.round(K * (score - expected(ra, rb)) * farmScale(earlier));            // what team A gains (negative: loses) and team B gives back
    if (winner === 'A' && d < 1) d = 1;                                                 // a win always pays at least a point...
    if (winner === 'B' && d > -1) d = -1;                                               // ...and a loss always costs one
    const out = [];
    for (const p of teamA) out.push({ id: p.id, before: p.points, after: p.points + d, delta: d });
    for (const p of teamB) out.push({ id: p.id, before: p.points, after: p.points - d, delta: -d });
    return out;
  }
  // How far apart two ratings may be to be put in the same match, widening the longer someone has waited (so nobody waits forever).
  const matchWindow = waitedMs => Math.min(900, 200 + Math.floor(waitedMs / 1000) * 40);

  const api = { RANKS, DIVISION_POINTS, LEGEND_AT, START_POINTS, K, SCALE, tierOf, expected, settle, farmScale, matchWindow };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PVP_RANK = api;
})(typeof window !== 'undefined' ? window : this);
