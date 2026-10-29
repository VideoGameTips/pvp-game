(function(root){
  const bundles=[
    {id:'pitiful',name:'Field Kit',items:['ak20','revolver','bat'],skins:['ak20_ak47_wood']},
    {id:'starter_pro',name:'Burst Operator',items:['burst','revolver','knife'],skins:['burst_m4a1']},
    {id:'heavy_duty',name:'Heavy Duty',items:['rpd','minigun','sledge'],skins:['rpd_m249']},
    {id:'wwii',name:'WWII Arsenal',items:['mp40','m1_garand','mauser'],skins:['mp40_cyberpunk']},
    {id:'sniper_pack',name:'Long Watch',items:['srx','pistol','knife'],skins:['srx_dragunov']},
    {id:'run_n_gun',name:'Run & Gun',items:['vector','machine_pistol','knife'],skins:['vector_mp5']},
    {id:'shotgun_pack',name:'Breach Team',items:['sg8','shorty','bat'],skins:['sg8_remington870']},
    {id:'archery',name:'Silent Flight',items:['crossbow','boombow','knife'],skins:['knife_butterfly']},
    {id:'frostbite',name:'Frostbite',items:['freeze_gun','cyroclasm','knife'],skins:['freeze_hyperslush']},
    {id:'storm',name:'Storm Chasers',items:['storm_bloom','taser','ak20'],skins:['ak20_cyberpunk']},
    {id:'knight',name:'Knight Shift',items:['katana','sabre','shorty'],skins:['katana_sakura']},
    {id:'demolition',name:'Demolition',items:['grenade_launcher','rpg','sledge'],skins:['grenade_launcher_mgl']},
    {id:'scifi',name:'Deep Space',items:['railgun','continuum','taser'],skins:['railgun_constellation']},
    {id:'pizza_party',name:'Pizza Party',items:['shorty','pistol','baguette'],skins:['shorty_pizza']},
    {id:'soda_rush',name:'Soda Rush',items:['machine_pistol','p90','bat'],skins:['machine_pistol_soda']},
    {id:'breakfast',name:'Breakfast Club',items:['sg8','revolver','frying_pan'],skins:['sg8_waffle']},
    // Four packs the 26 → 16 rebuild left behind (#77). Every one is made only
    // of live weapons — unlike the seven it correctly retired, which were full
    // of archived content (cosmic_p2w was 18 of 19). Converted by the rebuild's
    // own rules rather than re-invented: drop the support item, keep
    // weapon+weapon+melee, and take a skin from one of the pack's own weapons.
    //
    // The skin has to come from GEN1_SKIN_IDS / GEN2_SKIN_IDS — server.js:602
    // refuses to boot otherwise — which is why these are not the obvious
    // choices: `paintball_gumball` and `lever_winchester94` exist as model
    // skins but are not sellable in a bundle.
    {id:'retro',name:'Retro Pack',items:['paintball','laser_pointer','baguette'],skins:['paintball_moldy_green']},
    {id:'marksman',name:'Marksman',items:['lever','hand_cannon','knife'],skins:['knife_singularity']},
    {id:'stealth',name:'Stealth Ops',items:['air_rifle','throwing_knives','knife'],skins:['knife_hyperspace']},
    {id:'kitchen',name:'Kitchen Catastrophe',items:['paintball','baguette','frying_pan'],skins:['frying_pan_pizza_cutter']},
    // `mortar` keeps its identity — two indirect-fire weapons — and loses the
    // hand cannon, which was the least of the three and a pistol besides. None
    // of mortar_rifle / grenade_launcher / hand_cannon can carry a bundle skin,
    // so the melee slot every other pack has is what lets this one have a skin
    // at all; combat_axe came back out of the archive in this same fortnight.
    {id:'mortar',name:'Mortar Squad',items:['mortar_rifle','grenade_launcher','combat_axe'],skins:['combat_axe_frost']},
    // `chaos` stays retired, and this is a decision, not an oversight. It was
    // paintball + confetti_cannon + baguette + rubber_duck: the pack IS the two
    // joke SUPPORT items, and support items are the one thing the rebuilt shape
    // does not take. Anything buildable from what is left would be a different
    // pack wearing the name — paintball and baguette alone are two thirds of
    // `kitchen`. Its four items all remain individually purchasable.
  ];
  // Free starter gear adds no cost; cosmetics add a flat premium to the discounted weapons.
  const price=(b,costs,free)=>Math.ceil(b.items.reduce((sum,id)=>sum+(free?.has(id)?0:(costs[id]||0)),0)*.82)+b.skins.length*300;
  const tiers={
    normal:{name:'Normal',color:'#9faebc',min:100,max:1800},
    prime:{name:'Prime',color:'#55c9ef',min:2500,max:12000},
    exclusive:{name:'Exclusive',color:'#e4b65d',min:15000,max:60000},
    p2w:{name:'Straight Pay to Win',color:'#f46f82',min:75000,max:300000},
  };
  const tierGroups={
    prime:['p90','vector','burst','srx','lever','rpd','rpg','bazooka','crossbow','flamethrower','grenade_launcher','freeze_gun','boombow','m1_garand','mortar_rifle','air_rifle','hand_cannon','gatecrasher','akimbo','frost_blaster','auto_revolver','sawed_off','machine_revolver','katana','sledge','spear','chainsaw','combat_axe','fire_axe','nunchucks','riot_shield','twin_knife','satchel','sticky_charge','adrenaline','land_mine','emp_grenade','tesla_coil','mini_turret','guardian_drone','hologram','magnet_mine','healing_pulse','teleport_beacon','cloak','berserker_serum','drone_strike','hunter_drone','heal_gun','vampire_syringe'],
    exclusive:['minigun','chain_gun','railgun','cyroclasm','storm_bloom','continuum','gunslinger','lightsabre','scythe','chain_hammer','grapple_hook','blink_pearl','glitch_cube','lancer','nano_shield'],
    p2w:['javelin_launcher','event_horizon','storm_core','abs_zero','solar_lance','quantum_repeater','magnetar','nebula_mortar','prism_engine','void_harvester','pulse_needle','phase_blade','gravity_hammer','volt_whip','nano_swarm','warp_beacon','stasis_mine','specter_drone','quantum_barrier','black_hole_seed','orbital_strike','titan_hammer','vampire_blade'],
  };
  const restricted=new Set(['hellfire','omega_pistol','m4a1_arena','gau19','mk44','xm7','barrett','m134','hkmp7','p90_spec','desert_eagle','m1911','glock18','five_seven','karambit','bayonet','tomahawk','ots04','garrote','c4','claymore','stun_grenade','thermite','predator_uav','care_package','tac_nuke']);
  const tierById=Object.fromEntries(Object.entries(tierGroups).flatMap(([tier,ids])=>ids.map(id=>[id,tier])));
  function category(id,item={}) {
    if(restricted.has(id)||item.adminItem||item.prototype||item.ddayOnly||item.modeOnly)return 'exclusive';
    return tierById[id] || 'normal';
  }
  // Final donut prices, not multiplier inputs. Shared by the display and purchase authority.
  const weaponPrices={
    mp40:700,paintball:450,revolver:350,shorty:500,cycler:650,throwing_knives:700,taser:1000,
    machine_pistol:1100,traffic_cone:300,cream_pie:250,dart_gun:600,laser_pointer:200,
    snub_revolver:400,duelist_pistol:1200,mauser:750,nail_gun:600,slingshot:300,
    bat:200,sabre:600,baguette:150,knife:1400,crowbar:300,screwdriver:100,
    umbrella:450,yoyo:900,shock_baton:1400,tennis_racket:350,golf_club:600,
    stim:250,smoke:200,molotov:500,air_grenade:400,air_blaster:1200,ammo_fountain:800,
    confetti_cannon:150,rubber_duck:100,bounce_pad:700,tripwire:700,hamburger:350,acid_grenade:900,bee_jar:1000,
    p90:4200,vector:5000,burst:3500,srx:6500,lever:4000,rpd:6000,rpg:8500,bazooka:10000,
    crossbow:3000,flamethrower:5500,grenade_launcher:7500,freeze_gun:6000,boombow:4500,
    m1_garand:3800,mortar_rifle:7000,air_rifle:3200,hand_cannon:4000,gatecrasher:9000,
    akimbo:5000,frost_blaster:6500,auto_revolver:5000,sawed_off:3800,machine_revolver:4500,
    katana:8000,sledge:5000,spear:3000,chainsaw:11000,combat_axe:6500,fire_axe:5000,
    nunchucks:3500,riot_shield:7500,twin_knife:6000,satchel:5500,sticky_charge:4000,
    adrenaline:4500,land_mine:3500,emp_grenade:3000,tesla_coil:6500,mini_turret:8000,
    guardian_drone:8500,hologram:3000,magnet_mine:4000,heal_gun:5000,
    minigun:20000,chain_gun:18000,railgun:28000,cyroclasm:24000,storm_bloom:32000,
    continuum:26000,gunslinger:22000,lightsabre:36000,scythe:18000,chain_hammer:20000,
    grapple_hook:16000,blink_pearl:15000,glitch_cube:24000,nano_shield:30000,
    javelin_launcher:225000,black_hole_seed:90000,orbital_strike:150000,titan_hammer:100000,vampire_blade:85000,
  };
  function rebalance(costs,free) {
    for(const id of Object.keys(costs)) {
      if(free.has(id)){costs[id]=0;continue;}
      const tier=category(id),band=tiers[tier],factor={normal:.6,prime:2,exclusive:7,p2w:1}[tier];
      costs[id]=weaponPrices[id] ?? Math.max(band.min,Math.min(band.max,Math.round(costs[id]*factor/50)*50));
    }
  }
  const catalog={bundles,price,tiers,category,rebalance,exclusiveSkins:['shorty_pizza','machine_pistol_soda','sg8_waffle']};
  if(typeof module!=='undefined' && module.exports)module.exports=catalog;
  else root.PVP_SHOP_CATALOG=catalog;
})(typeof globalThis!=='undefined'?globalThis:this);
