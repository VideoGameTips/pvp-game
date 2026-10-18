(function (root) {
  'use strict';
  const characters = {
    Marcus: { name: 'Marcus Kane', role: 'Leader of the Strays', color: '#e3b76f', skin: 'default' },
    Jax: { name: 'Jax Moreno', role: 'Your partner', color: '#75d6bf', skin: 'default' },
    Dante: { name: 'Dante Cross', role: 'Second-in-command', color: '#ed7988', skin: 'default' },
    Maya: { name: 'Maya Chen', role: 'Mechanic and quartermaster', color: '#99c6f0', skin: 'recruit' },
    Player: { name: 'Recruit #47', role: 'The newest Stray', color: '#ffffff', skin: 'default' }
  };
  const combat = (text, count, point = 1) => ({ kind: 'combat', text, count, point });
  const retrieve = (text, point, seconds = 2, prop = 'terminal') => ({ kind: 'retrieve', text, point, seconds, prop });
  const reach = (text, point) => ({ kind: 'reach', text, point });
  const defend = (text, seconds, count, point = 1) => ({ kind: 'defend', text, seconds, count, point });
  const escort = (text, point, count = 3) => ({ kind: 'escort', text, point, count });
  const choice = (key, speaker, text, options) => ({ kind: 'choice', key, speaker, text, options });
  const missions = [
    { id: 1, title: 'New Blood', chapter: 1, map: 'urban', contact: 'Marcus', companion: 'Jax',
      briefing: 'Earn a place in the Strays. Jax will show you the neighborhood.',
      intro: [['Marcus', "So you are the new kid. Ever been in a fight?"], ['Player', 'A few. Won some.'], ['Marcus', 'At least you are honest. Jax, show the rookie our training corner.'], ['Jax', 'Stay close. The Serpents have been testing our streets.']],
      stages: [reach('Meet Jax at the training corner', 1), combat('Drive the Red Serpent scouts out', 3, 1), retrieve('Recover the Strays radio', 2), reach('Return to the garage', 0)],
      outro: [['Jax', 'You watched my back. That matters more than the shooting.'], ['Marcus', 'You have a bed and a job tomorrow. Do not make me regret it.']] },
    { id: 2, title: 'Small Favors', chapter: 1, map: 'warehouse', contact: 'Maya', companion: 'Jax',
      briefing: 'Find Maya\'s stolen supplies before the Serpents move them.',
      intro: [['Maya', 'Three supply cases. Tools, medicine, spare parts. Not treasure.'], ['Jax', 'Around here those are the same thing.']],
      stages: [combat('Clear the loading bay', 4), retrieve('Secure the medicine case', 1, 2, 'cargo'), retrieve('Secure the tool case', 2, 2, 'cargo'), retrieve('Secure the spare parts', 3, 2, 'cargo'), reach('Extract with the supplies', 0)],
      outro: [['Maya', 'All three? You even brought my socket wrench back. Keep that up and I might learn your name.']] },
    { id: 3, title: 'Wrong Neighborhood', chapter: 1, map: 'cyber', contact: 'Dante', companion: 'Jax',
      briefing: 'A simple delivery becomes an escape through Serpent territory.',
      intro: [['Dante', 'Drop the package. No detours. No questions.'], ['Jax', 'These are not our colors on the walls. Get ready to run.']],
      stages: [retrieve('Check the abandoned drop', 1), combat('Break through the ambush', 5, 1), reach('Reach the alley exit', 3), defend('Hold for Jax\'s escape route', 25, 4, 3), reach('Get out together', 0)],
      outro: [['Jax', 'Dante said that route was clear.'], ['Player', 'Then somebody forgot to tell the Serpents.']] },
    { id: 4, title: 'Hold the Line', chapter: 1, map: 'blank', contact: 'Marcus', companion: 'Jax',
      briefing: 'The Red Serpents hit home. Keep the Strays\' radio station online.',
      intro: [['Marcus', 'They are at our doors. Hold the neighborhood.'], ['Maya', 'That radio is the only way the wounded can call us. Keep them off it.']],
      stages: [reach('Take position at the radio station', 1), defend('Defend the radio station', 45, 6, 1), combat('Clear the remaining attackers', 4, 2), retrieve('Call medical transport', 1, 4)],
      outro: [['Marcus', 'You held when people with years here ran. You are a Runner now.'], ['Jax', 'Dinner is on me. Assuming the kitchen is still standing.']] },
    { id: 5, title: 'Moving Up', chapter: 2, map: 'train', contact: 'Marcus', companion: 'Jax', protect: true,
      briefing: 'Get Jax and a valuable contact across the rail yard alive.',
      intro: [['Marcus', 'Jax has our contact. Bring them through the yard.'], ['Jax', 'I will move when you are nearby. Do not sprint off and leave me in a crossfire.']],
      stages: [escort('Escort Jax to the service crossing', 1, 4), combat('Clear the rail checkpoint', 5, 2), escort('Bring Jax to the extraction point', 3, 3)],
      outro: [['Jax', 'We should do an easier job next time.'], ['Player', 'You said that last time.'], ['Jax', 'And I was right last time.']] },
    { id: 6, title: 'Dockside Trouble', chapter: 2, map: 'big_harbor', contact: 'Maya', companion: 'Jax',
      briefing: 'Recover stolen cargo from the harbor and trace its destination.',
      intro: [['Maya', 'Our containers have Strays paint under those fresh labels.'], ['Jax', 'Watch the quay edges. Nobody is paying us to swim.']],
      stages: [combat('Secure the dock entrance', 5), retrieve('Recover the cargo manifest', 1), retrieve('Tag the stolen container', 2, 4), defend('Cover the cargo pickup', 35, 5, 2), reach('Return to extraction', 0)],
      outro: [['Maya', 'Someone gave them our container numbers before they shipped. This was not random.']] },
    { id: 7, title: 'No Witnesses', chapter: 2, map: 'sewer', contact: 'Dante', companion: 'Jax',
      briefing: 'A captured Stray knows who arranged the stolen shipment.',
      intro: [['Dante', 'Get the ledger. Leave nothing that can point back to us.'], ['Jax', 'There is a person down there, not just a ledger. We bring them home.']],
      stages: [combat('Reach the holding area', 5), retrieve('Release the captured Stray', 2, 4, 'prisoner'), choice('witness', 'Jax', 'We can save the witness or recover the original ledger before the pumps start.', [
        { id: 'save', label: 'Get the witness out', line: 'Nobody gets left behind.', trust: 1 },
        { id: 'ledger', label: 'Secure the original ledger', line: 'We need proof that survives an accusation.', evidence: 1 }
      ]), escort('Escort Jax out', 0, 4)],
      outro: [['Jax', 'Dante called twice asking about the ledger. Not once about the prisoner.']] },
    { id: 8, title: 'Broken Deal', chapter: 2, map: 'refinery', contact: 'Marcus', companion: 'Jax',
      briefing: 'Meet a buyer at the refinery. The exits are already being watched.',
      intro: [['Marcus', 'Close this deal and the industrial district is ours.'], ['Jax', 'Those floodlights were not on the plan. We have company.']],
      stages: [reach('Reach the exchange', 1), combat('Survive the first ambush', 6, 1), retrieve('Open the emergency gate', 2, 5), defend('Cover the withdrawal', 40, 6, 2), reach('Escape the refinery', 0)],
      outro: [['Marcus', 'They knew our time, our route, everything.'], ['Dante', 'Someone close to the operation talked.'], ['Jax', 'Careful who you are looking at.']] },
    { id: 9, title: 'Inside Job', chapter: 3, map: 'lockdown', contact: 'Maya', companion: 'Jax',
      briefing: 'Search a seized security station for the source of the leak.',
      intro: [['Maya', 'Dante\'s access card appears on a door he swears he never used.'], ['Jax', 'Let us find the recording before we accuse anybody.']],
      stages: [combat('Secure the security office', 5), retrieve('Copy the door access logs', 1, 5), retrieve('Recover the camera backup', 2, 5), choice('proof', 'Maya', 'The backup has Dante meeting a Serpent courier. Where does the copy go?', [
        { id: 'copy', label: 'Keep an independent copy', line: 'Two copies. Two different hiding places.', evidence: 1 },
        { id: 'marcus', label: 'Send it straight to Marcus', line: 'He deserves to hear it from us.', loyalty: 1 }
      ]), reach('Leave through the service exit', 0)],
      outro: [['Marcus', 'You are taking charge of a crew. Enforcer. Find me the truth.'], ['Maya', 'And remember: access to evidence is not the same as control of it.']] },
    { id: 10, title: 'False Friends', chapter: 3, map: 'urban', contact: 'Jax', companion: 'Jax', protect: true,
      briefing: 'Protect Jax while the Strays\' own patrols ask dangerous questions.',
      intro: [['Jax', 'Somebody searched my room. They left my money and took my notes.'], ['Player', 'Then we do not go back there.']],
      stages: [escort('Get Jax to the safe corner', 1, 5), defend('Protect Jax while Maya clears a route', 40, 6, 1), escort('Reach Maya\'s pickup', 3, 4)],
      outro: [['Jax', 'Whatever they say about you next, I was there. I know what happened.']] },
    { id: 11, title: 'Set Up', chapter: 3, map: 'warehouse', contact: 'Dante', companion: 'Jax',
      briefing: 'A summons from Marcus turns into an arrest order.',
      intro: [['Dante', 'We found the payments. Your name is on them.'], ['Player', 'You put it there.'], ['Marcus', 'Put down the weapon. Now.'], ['Jax', 'Side door. Move!']],
      stages: [retrieve('Cut the warehouse alarm', 1, 3), combat('Break the arrest cordon', 6, 1), retrieve('Recover your confiscated evidence', 2, 4), reach('Escape the warehouse', 3)],
      outro: [['Marcus', 'Run and you prove him right!'], ['Player', 'Stay and I never get to prove him wrong.']] },
    { id: 12, title: 'Exile', chapter: 3, map: 'forest', contact: 'Maya', companion: 'Jax',
      briefing: 'Evade pursuers and reach Maya\'s hidden workshop.',
      intro: [['Maya', 'They shut off your old radio. Use this frequency.'], ['Jax', 'You were right about an easier job. This is not it.']],
      stages: [reach('Reach the first forest shelter', 1), defend('Survive the pursuit', 40, 6, 1), retrieve('Disable the tracking transmitter', 2, 5), reach('Find Maya\'s workshop', 3)],
      outro: [['Maya', 'Dante is selling territory, not just secrets. Your name was the price of keeping Marcus distracted.']] },
    { id: 13, title: 'Old Connections', chapter: 4, map: 'cyber', contact: 'Maya', companion: 'Jax',
      briefing: 'Win back former allies. Give them a reason to risk trusting you.',
      intro: [['Maya', 'People remember who brought medicine and who brought threats. Start there.'], ['Jax', 'We are not asking them to follow a rank. Just us.']],
      stages: [retrieve('Deliver supplies to the first contact', 1, 3, 'contact'), combat('Stop the Serpent collection squad', 5, 1), retrieve('Meet the second contact', 2, 3, 'contact'), choice('allies', 'Jax', 'They will help, but they want to know what we are building.', [
        { id: 'people', label: 'A neighborhood that protects its people', line: 'No more disposable recruits.', trust: 1 },
        { id: 'territory', label: 'A stronger Strays organization', line: 'A crew nobody can push around.', loyalty: 1 }
      ]), reach('Rally at the extraction point', 0)],
      outro: [['Maya', 'They are coming. Not because Marcus ordered it. Because you asked.']] },
    { id: 14, title: 'Taking Back', chapter: 4, map: 'big_arena', contact: 'Jax', companion: 'Jax',
      briefing: 'Reclaim the Strays\' territory without becoming another Dante.',
      intro: [['Jax', 'Three blocks, one transmitter. Take that and everyone hears our side.'], ['Maya', 'Your old crew is listening. Make the next thing they hear count.']],
      stages: [combat('Take the outer checkpoint', 6), retrieve('Raise the Strays signal', 1, 5), defend('Hold the reclaimed block', 45, 6, 1), retrieve('Secure the neighborhood transmitter', 2, 5)],
      outro: [['Jax', 'Lieutenant. I think that is what they are calling you now.'], ['Player', 'Tell them to call for help if they need it. That is enough.']] },
    { id: 15, title: 'The Reckoning', chapter: 4, map: 'doomsday', contact: 'Marcus', companion: 'Jax',
      briefing: 'Confront Marcus with the truth before Dante\'s forces arrive.',
      intro: [['Marcus', 'I gave you a place.'], ['Player', 'You gave Dante my name and never asked for proof.'], ['Marcus', 'Then show me something he cannot explain away.']],
      stages: [combat('Break through Dante\'s advance guard', 6), retrieve('Broadcast the recovered evidence', 1, 6), choice('marcus', 'Marcus', 'I trusted the wrong man. What happens to the Strays now?', [
        { id: 'spare', label: 'Stand down. Help us end this.', line: 'You can still do one thing right.', trust: 1 },
        { id: 'remove', label: 'You are finished leading us.', line: 'You do not get to decide who is expendable anymore.', loyalty: 1 }
      ]), defend('Hold until the broadcast finishes', 40, 6, 1)],
      outro: [['Maya', 'The city heard you. Dante heard you too.'], ['Jax', 'One last job. Then we decide what comes after.']] },
    { id: 16, title: 'The Last Stray', chapter: 4, map: 'super_arena', contact: 'Dante', companion: 'Jax',
      briefing: 'Face Dante. Decide whether Greyhaven needs a king, a peace, or one less ghost.',
      intro: [['Dante', 'You are nothing. I built this gang.'], ['Player', 'And you destroyed it.'], ['Jax', 'Your call. What are we fighting for?']],
      stages: [choice('ending', 'Player', 'When Dante falls, what happens next?', [
        { id: 'king', label: 'The King: take control of the Strays', line: 'Nobody sells our streets again.' },
        { id: 'peace', label: 'The Peacemaker: force a ceasefire', line: 'We end the cycle. Not just the man.' },
        { id: 'ghost', label: 'The Ghost: get your people out', line: 'We do not owe this city our lives.' }
      ]), combat('Clear Dante\'s personal guard', 6), { kind: 'boss', text: 'Defeat Dante Cross', point: 2, count: 1 },
      { kind: 'finale', point: 3, text: 'Finish what you started' }],
      outro: [['Dante', 'You think this changes anything?'], ['Player', 'It changes who gets to choose.']] }
  ];
  const endings = {
    king: { title: 'The King', objective: 'Hold your ground until the remaining crews stand down', kind: 'defend', seconds: 35, count: 6,
      lines: [['Jax', 'They are waiting for your first order.'], ['Player', 'Open the doors. Get the wounded inside.'], ['Maya', 'Underboss was the last rank somebody else could give you. What you become now is on you.']] },
    peace: { title: 'The Peacemaker', objective: 'Send the ceasefire terms from the transmitter', kind: 'retrieve', seconds: 8, count: 4,
      lines: [['Marcus', 'You cannot make them forgive us.'], ['Player', 'No. But we can stop giving them new reasons not to.'], ['Jax', 'The first quiet night in Greyhaven. I could get used to it.']] },
    ghost: { title: 'The Ghost', objective: 'Bring Jax to the last extraction point', kind: 'escort', count: 5,
      lines: [['Maya', 'I wiped the plates. The road is clear.'], ['Jax', 'Any regrets?'], ['Player', 'Ask me when we find somewhere that serves breakfast.']] }
  };
  const ranks = [
    { name: 'Recruit', rep: 0, gate: 0 }, { name: 'Runner', rep: 100, gate: 4 },
    { name: 'Soldier', rep: 250, gate: 8 }, { name: 'Enforcer', rep: 500, gate: 9 },
    { name: 'Lieutenant', rep: 800, gate: 14 }, { name: 'Underboss', rep: 1200, gate: 15 }
  ];
  function fresh() { return { version: 1, completed: {}, choices: {}, endings: [], checkpoint: null }; }
  function sanitize(raw) {
    const p = fresh();
    if (!raw || raw.version !== 1) return p;
    for (const m of missions) {
      if (m.id > 1 && !p.completed[m.id - 1]) break;
      const r = raw.completed?.[m.id];
      if (r && typeof r === 'object') p.completed[m.id] = { bonus: r.bonus === true, seconds: Math.max(0, Math.min(86400, Number(r.seconds) || 0)) };
    }
    for (const m of missions) for (const s of m.stages) if (s.kind === 'choice' && s.options.some(o => o.id === raw.choices?.[s.key])) p.choices[s.key] = raw.choices[s.key];
    p.endings = Object.keys(endings).filter(k => p.completed[16] && Array.isArray(raw.endings) && raw.endings.includes(k));
    const c = raw.checkpoint, m = c && missions.find(m => m.id === c.mission);
    if (m && (m.id === 1 || p.completed[m.id - 1]) && Number.isInteger(c.stage) && c.stage >= 0 && c.stage < m.stages.length) {
      p.checkpoint = { mission: m.id, stage: c.stage, choices: { ...p.choices } };
    }
    return p;
  }
  function reputation(p) { return Object.values(p.completed).reduce((n, r) => n + 90 + (r.bonus ? 20 : 0), 0); }
  function rank(p) { const rep = reputation(p); return ranks.filter(r => rep >= r.rep && (!r.gate || p.completed[r.gate])).at(-1); }
  function unlocked(p, id) { return id === 1 || !!p.completed[id - 1]; }
  function consequences(p) {
    const out = { trust: 0, evidence: 0, loyalty: 0 };
    for (const m of missions) for (const s of m.stages) if (s.kind === 'choice') {
      const o = s.options.find(o => o.id === p.choices[s.key]);
      if (o) for (const k of Object.keys(out)) out[k] += o[k] || 0;
    }
    return out;
  }
  const data = { characters, missions, endings, ranks, fresh, sanitize, reputation, rank, unlocked, consequences,
    chapters: ['Street Rat', 'Making a Name', 'Blood and Betrayal', 'King of Greyhaven'] };
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.UNDERWORLD_DATA = data;
})(typeof window === 'undefined' ? globalThis : window);
