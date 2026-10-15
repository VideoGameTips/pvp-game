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
  ];
  // Free starter gear adds no cost; cosmetics add a flat premium to the discounted weapons.
  const price=(b,costs,free)=>Math.ceil(b.items.reduce((sum,id)=>sum+(free?.has(id)?0:(costs[id]||0)),0)*.82)+b.skins.length*300;
  const catalog={bundles,price,exclusiveSkins:['shorty_pizza','machine_pistol_soda','sg8_waffle']};
  if(typeof module!=='undefined' && module.exports)module.exports=catalog;
  else root.PVP_SHOP_CATALOG=catalog;
})(typeof globalThis!=='undefined'?globalThis:this);
