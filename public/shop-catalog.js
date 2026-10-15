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
  const catalog={bundles,price,exclusiveSkins:['shorty_pizza','machine_pistol_soda','sg8_waffle']};
  if(typeof module!=='undefined' && module.exports)module.exports=catalog;
  else root.PVP_SHOP_CATALOG=catalog;
})(typeof globalThis!=='undefined'?globalThis:this);
