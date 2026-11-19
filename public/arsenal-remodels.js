// Cosmetic geometry only. The game owns shot origins, grip, ADS and damage.
const arsenalRemodels = (() => {
  const metal = (c, r = .38) => gpFinish(c, r, .66, 'steel');
  const tint = c => new THREE.MeshBasicMaterial({color:c});
  const ice = c => new THREE.MeshPhysicalMaterial({color:c,opacity:.82,transparent:true,roughness:.23,metalness:.24,flatShading:true});
  function gun(y,z,kick) {
    const g=new THREE.Group();
    const f=makeMuzzleFlash();f.position.set(0,y,z);g.add(f);
    g._flash=f;g._kickZ=kick;g._greebled=g._handDetailed=g._blended=true;
    g.position.set(.12,-.1,-.25);
    return g;
  }
  function dragonsMaw() {
    const g=gun(.014,-.300,.004), iron=metal(0x423b43), bronze=metal(0xa9744c), fang=metal(0xddbc8b), dark=GUN_MATS.inner();
    gpOpenMuzzle(g,.018,.011,.072,0,.014,-.247,iron,dark);
    gpCyl(g,dark,.019,.019,.24,12,0,.014,-.076);
    for (const s of [-1,1]) {
      gpPlate(g,iron,[[-.302,.036],[-.278,.049],[-.228,.042],[-.197,.022],[-.234,.020],[-.280,.026]],.012,s*.018);
      gpPlate(g,bronze,[[-.300,-.003],[-.264,-.013],[-.218,-.003],[-.197,.015],[-.237,.010],[-.282,.006]],.009,s*.017);
      for(let i=0;i<3;i++) gpCyl(g,fang,0,.004,.010,4,s*.016,.023,-.285+i*.015,Math.PI);
      gpBox(g,tint(0xc44527),.002,.006,.011,s*.025,.033,-.233);
      for(let i=0;i<6;i++){
        const z=-.186+i*.035;
        gpPlate(g,i%2?iron:bronze,[[z-.016,.014],[z-.008,.036],[z+.022,.028],[z+.015,.008],[z-.008,-.008]],.009,s*.019);
      }
    }
    for(let i=0;i<6;i++) gpCyl(g,i%2?bronze:iron,.039-i*.003,.041-i*.003,.029,8,0,.019+i*.012,.061+i*.025);
    gpPlate(g,GUN_MATS.grip(),[[.047,-.006],[.084,-.027],[.074,-.098],[.047,-.106],[.030,-.043]],.033);
    gpBox(g,iron,.026,.044,.028,0,-.025,-.110,-.23);
    return g;
  }
  function deadeye() {
    const g=gun(.012,-.172,.022), iron=metal(0x48424b), bronze=metal(0xa77a52), dark=GUN_MATS.inner();
    gpOpenMuzzle(g,.007,.0036,.118,0,.012,-.095,iron,dark);
    for(const s of [-1,1]){
      gpPlate(g,iron,[[-.167,.022],[-.153,.030],[-.052,.027],[-.035,.018],[-.055,.010],[-.149,.008]],.006,s*.011);
      gpPlate(g,s<0?iron:bronze,[[.014,-.011],[.026,.030],[.053,.033],[.072,.001],[.052,-.015]],.006,s*.012);
      gpContouredPart(g,GUN_MATS.wood(),[[.055,-.020],[.070,-.035],[.071,-.075],[.058,-.086],[.047,-.074],[.042,-.036]],.006,s*.011,.004);
    }
    gpPlate(g,iron,[[.029,-.009],[.064,-.009],[.080,-.074],[.067,-.096],[.046,-.094],[.030,-.038]],.021);
    gpBox(g,bronze,.027,.008,.024,0,-.088,.064,.24);
    gpBox(g,iron,.022,.005,.066,0,.038,.004);
    gpBox(g,iron,.024,.018,.019,0,.022,-.039);
    gpBox(g,dark,.010,.006,.008,0,.043,.041);
    gpBox(g,bronze,.003,.007,.004,0,.032,-.156);
    gpBox(g,tint(0x842e34),.002,.004,.010,-.016,.023,.035);
    const guard=new THREE.Mesh(new THREE.TorusGeometry(.015,.0023,5,12,Math.PI*1.15),iron);
    guard.rotation.set(0,Math.PI/2,-.38);guard.position.set(0,-.012,.024);g.add(guard);
    gpBox(g,bronze,.004,.012,.004,0,-.007,.025,.25);
    const yoke=new THREE.Group();yoke.name='deadeye-yoke';yoke.position.set(-.010,-.006,-.010);g.add(yoke);
    gpBox(yoke,bronze,.010,.007,.033,0,0,.005);
    const cage=gpPart(yoke,'main',()=>{
      const rim=bronze.clone();rim.side=THREE.DoubleSide;
      for(const z of [-.018,.020]){
        const ring=new THREE.Mesh(new THREE.RingGeometry(.014,.020,6),rim);
        ring.position.set(.010,.018,z);yoke.add(ring);
      }
      for(let i=0;i<6;i++){
        const a=i*Math.PI/3,c=Math.cos(a),s=Math.sin(a);
        gpOpenMuzzle(yoke,.0048,.0029,.035,.010+c*.012,.018+s*.012,.001,iron,dark);
        gpBox(yoke,bronze,.0026,.0026,.037,.010+c*.019,.018+s*.019,.001);
      }
    },{x:.010,y:.018,z:.001});
    cage._chambers=6;g._parts={main:cage};
    const hammer=gpPart(g,'hammer',()=>gpPlate(g,bronze,[[.045,.024],[.053,.050],[.062,.051],[.071,.044],[.061,.040],[.059,.024]],.008),
      {x:0,y:.027,z:.053});
    let fireAt=-Infinity;
    g._onFire=()=>{fireAt=performance.now();};
    g._calm=()=>{yoke.rotation.z=0;hammer.rotation.x=0;cage.rotation.z=cage._spin||0;fireAt=-Infinity;};
    g._tick=()=>{
      const t=g._reloadStart&&g._reloadDur?(Date.now()-g._reloadStart)/g._reloadDur:-1;
      const loading=!g._inspectMode&&t>=0&&t<1;
      yoke.rotation.z=loading?1.3*_eqSm((t-.12)/.22)*(1-_eqSm((t-.74)/.20)):0;
      cage.rotation.z=(cage._spin||0)+(loading?Math.PI*2*_eqSm((t-.33)/.40):0);
      hammer.rotation.x=-.54*Math.max(0,1-(performance.now()-fireAt)/155);
    };
    return g;
  }
  function permafrost() {
    const g=gun(.034,-.250,.006), iron=metal(0x40576c), crystal=ice(0x78cae8), dark=GUN_MATS.inner();
    gpPlate(g,iron,[[-.254,.023],[-.107,.021],[-.062,.002],[.055,.005],[.099,.017],[.175,.010],[.169,-.035],
      [.088,-.033],[.045,-.022],[.024,-.091],[.000,-.086],[.010,-.019],[-.236,-.010]],.030);
    for(const s of [-1,1]){
      gpBox(g,iron,.006,.008,.282,s*.010,.027,-.092);
      const limb=gpPlate(g,crystal,[[-.010,0],[.053,.017],[.122,.009],[.184,-.012],[.157,-.028],[.072,-.012],[.023,-.018]],.016);
      limb.rotation.y=s*Math.PI/2;limb.position.set(0,.024,-.230);
      gpBox(g,iron,.069,.013,.025,s*.036,.018,-.229,0,s*.20);
      gpBox(g,dark,.185,.002,.002,s*.089,.031,-.134,0,s*.32);
    }
    gpBox(g,dark,.008,.003,.28,0,.026,-.091);
    gpCyl(g,iron,.003,.003,.167,7,0,.034,-.139);
    gpCyl(g,crystal,0,.007,.026,5,0,.034,-.232);
    gpCyl(g,crystal,.018,.017,.011,6,0,-.034,-.003);
    gpOptic(g,0,.060,.010,.075,.012,.038);
    g.userData.iconView=[.78,.56,.30];
    return g;
  }
  function thunderclap() {
    const g=gun(.008,-.392,.020), steel=metal(0x616a75), dark=GUN_MATS.inner(), blue=tint(0x389cde);
    gpPlate(g,steel,[[-.085,-.015],[-.076,.035],[.125,.038],[.159,.015],[.147,-.026],[.079,-.036],[-.050,-.025]],.035);
    gpPlate(g,steel,[[.135,-.006],[.313,.019],[.335,-.002],[.324,-.051],[.283,-.041],[.244,-.017],[.170,-.040],[.140,-.032]],.034);
    gpBox(g,dark,.041,.047,.009,0,-.016,.338,.14);
    gpOpenMuzzle(g,.008,.004,.157,0,.008,-.311,steel,dark);
    for(const s of [-1,1]){
      gpPlate(g,steel,[[-.269,.014],[-.242,.035],[-.077,.035],[-.044,.007],[-.064,-.021],[-.230,-.019]],.008,s*.018);
      gpBox(g,dark,.003,.011,.159,s*.022,.010,-.162);
      gpBox(g,blue,.002,.003,.140,s*.024,.010,-.162);
      for(let i=0;i<5;i++) gpBox(g,steel,.004,.015,.007,s*.025,.011,-.220+i*.026,.28);
    }
    gpPart(g,'main',()=>gpBox(g,steel,.011,.010,.037,.023,.017,.030)).userData.chargingHandle=true;
    gpBox(g,steel,.022,.014,.021,0,.043,.124);
    gpBox(g,steel,.014,.036,.018,0,.027,-.360);
    gpBox(g,dark,.003,.014,.004,0,.046,-.360);
    return g;
  }
  function eventHorizon() {
    const g=gun(.006,-.576,.036), iron=metal(0x4d485d), dark=GUN_MATS.inner(), violet=tint(0x925eca);
    gpPlate(g,iron,[[.020,-.025],[.055,.036],[.170,.041],[.204,.020],[.202,-.016],[.153,-.035],[.079,-.026],[.041,-.061]],.042);
    gpBox(g,dark,.040,.048,.012,0,.008,.205);
    gpPlate(g,dark,[[.032,-.029],[.057,-.050],[.060,-.111],[.035,-.136],[.014,-.104],[.010,-.045]],.030);
    for(const s of [-1,1]){
      for(const y of [-.020,.031]) gpBox(g,iron,.010,.008,.220,s*.021,y,-.094);
      gpBox(g,iron,.009,.043,.016,s*.021,.004,-.192,.33);
      gpBox(g,iron,.009,.043,.016,s*.021,.004,.003,-.33);
      gpBox(g,violet,.002,.003,.047,s*.022,.018,.143);
    }
    const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.021,0),violet);
    core.scale.z=2;core.position.set(0,.006,-.094);g.add(core);
    gpOpenMuzzle(g,.012,.007,.402,0,.006,-.369,iron,dark,true);
    for(let i=0;i<7;i++){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.023+(i%2)*.006,.003,6,8),i%2?iron:dark);
      ring.position.set(0,.006,-.208-i*.051);g.add(ring);
    }
    gpOptic(g,0,.082,-.070,.230,.016,.051,true);
    gpPart(g,'main',()=>gpBox(g,iron,.041,.012,.013,.038,.025,.14)).userData.chargingHandle=true;
    gpPart(g,'magazine',()=>gpPlate(g,dark,[[.096,-.028],[.151,-.034],[.148,-.100],[.099,-.097]],.030),{x:0,y:-.025,z:.125});
    g.userData.iconView=[.91,.29,.21];
    return g;
  }
  function ironBehemoth() {
    const g=gun(.004,-.348,.006), iron=metal(0x59605d), brass=metal(0x987751), dark=GUN_MATS.inner();
    gpPlate(g,iron,[[-.075,-.024],[-.065,.039],[.094,.046],[.126,.026],[.111,-.027],[.046,-.048],[-.049,-.038]],.071);
    const rotor=new THREE.Group();rotor.position.set(0,.004,-.190);g.add(rotor);
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;
      gpOpenMuzzle(rotor,.0088,.005,.298,.024*Math.cos(a),.024*Math.sin(a),-.004,iron,dark);
    }
    for(const z of [-.102,.070,.128]) gpCyl(rotor,brass,.034,.034,.011,6,0,0,z);
    g._barrelCluster=rotor;g._spinRate=10;
    for(const s of [-1,1]){
      gpPlate(g,iron,[[-.292,.017],[-.269,.036],[-.071,.036],[-.052,.010],[-.086,-.013],[-.268,-.013]],.006,s*.033);
      for(let i=0;i<4;i++) gpBox(g,dark,.0015,.006,.017,s*.037,.018,-.247+i*.037,.3);
      gpCyl(g,brass,.024,.024,.011,10,s*.039,.006,.023,0,Math.PI/2);
      gpCyl(g,dark,.015,.015,.014,8,s*.041,.006,.023,0,Math.PI/2);
      gpBox(g,iron,.008,.008,.073,s*.031,.010,.143);
      gpBox(g,dark,.014,.057,.018,s*.031,-.019,.181,.22);
    }
    gpCyl(g,iron,.028,.030,.046,8,-.020,.003,.104);
    gpBox(g,brass,.070,.010,.014,0,.010,.184);
    addBeltAndCover(g,{topY:.040,trayZ:.040,coverW:.060,coverLen:.085,beltZ:.070,drop:.140,side:1});
    return g;
  }
  function glassFang() {
    const g=new THREE.Group(), silver=metal(0x93adbe), dark=GUN_MATS.grip();
    gpPlate(g,ice(0x83d5cf),[[.058,-.007],[.058,.008],[-.029,.011],[-.050,.005],[-.074,.011],[-.106,.012],
      [-.124,.006],[-.145,.012],[-.178,.013],[-.195,.007],[-.222,.012],[-.247,.011],[-.266,.006],
      [-.297,.012],[-.331,.013],[-.358,.006],[-.316,-.006],[-.191,-.009],[-.057,-.011]],.009);
    gpPlate(g,tint(0xbce7db),[[.054,-.007],[-.191,-.009],[-.316,-.006],[-.357,.006],[-.320,-.002],[-.191,-.005],[.054,-.004]],.011);
    const guard=gpCyl(g,silver,.039,.039,.008,6,0,0,.060);
    guard.scale.set(1,1,.69);guard.rotateY(.34);
    gpCyl(g,dark,.012,.012,.156,6,0,0,.146);
    for(let i=0;i<5;i++) gpCyl(g,silver,.013,.013,.006,6,0,0,.084+i*.027);
    gpCyl(g,silver,.015,.011,.013,6,0,0,.222);
    g.position.set(.10,-.12,-.20);
    return g;
  }
  function boneHead(radius) {
    const ball=new THREE.Group(), iron=metal(0x514953), ivory=metal(0xb9ad9b);
    ball.add(new THREE.Mesh(new THREE.IcosahedronGeometry(radius*.72,0),iron));
    for(let i=0;i<6;i++){
      const rib=new THREE.Group(), r=radius;rib.rotation.z=i*Math.PI/3;ball.add(rib);
      gpPlate(rib,ivory,[[-r*.62,r*.45],[-r*.47,r*.98],[-r*.24,r*1.12],[-r*.09,r*.84],[r*.17,r*.80],
        [r*.36,r*1.03],[r*.57,r*.92],[r*.67,r*.45],[r*.28,r*.53],[-r*.18,r*.57]],r*.48);
    }
    return ball;
  }
  function bonebreaker() {
    const g=new THREE.Group(), iron=metal(0x57525a), grip=GUN_MATS.grip();
    gpCyl(g,iron,.024,.028,.432,8,0,0,0);
    gpCyl(g,grip,.034,.034,.18,8,0,0,.110);
    for(const z of [-.203,-.125,-.047,.027,.194,.211]) gpCyl(g,iron,.038,.038,.016,6,0,0,z);
    g._chainAnchor=new THREE.Vector3(0,0,-.22);g._cableStyle='bonebreaker';
    g._chain=makeChainMaulCable(22,.018,.12,g._cableStyle);
    poseChainMaulCable(g._chain,g._chainAnchor,new THREE.Vector3(-.12,-.28,-.88),.04);
    g.add(g._chain);g.position.set(.14,-.12,-.30);
    return g;
  }
  return {dragonsMaw,deadeye,permafrost,thunderclap,eventHorizon,ironBehemoth,glassFang,boneHead,bonebreaker};
})();
