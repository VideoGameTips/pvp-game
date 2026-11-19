(() => {
  'use strict';

  window.PVP_IMPOSSIBLE_SKINS = function (T, kit) {
    const { box, cyl, open, plate, flash, ads } = kit, TAU = Math.PI * 2;
    const mix = (a,b,t) => a + (b-a)*t;
    const clamp = t => Math.max(0, Math.min(1,t));
    const smooth = t => (t=clamp(t), t*t*(3-2*t));
    const arc = u => smooth(Math.min(u/.24,(1-u)/.22));
    const mat = (color, metalness=.18, roughness=.47) => new T.MeshStandardMaterial({ color, metalness, roughness });
    const basic = color => new T.MeshBasicMaterial({ color });
    function node(parent, name, x=0, y=0, z=0) {
      const g = new T.Group(); g.name=name; g.position.set(x,y,z); parent.add(g); return g;
    }
    function mesh(parent, name, geo, material, x=0, y=0, z=0) {
      const m = new T.Mesh(geo,material); m.name=name; m.position.set(x,y,z); parent.add(m); return m;
    }
    function ring(parent, name, material, radius, wire, x,y,z, tilt=0, slice=TAU) {
      const m=mesh(parent,name,new T.TorusGeometry(radius,wire,6,42,slice),material,x,y,z);
      m.rotation.y=tilt; return m;
    }
    function grip(g,m,depth=.034,z=0) {
      plate(g,m,[[z-.021,-.026],[z+.026,-.028],[z+.052,-.108],[z+.017,-.124],[z-.010,-.067]],depth,0);
    }
    function sight(g, rear, front, height) {
      g._sightLine={space:g,rear:new T.Vector3(0,height,rear),front:new T.Vector3(0,height,front)};
    }
    function lifecycle(g, muzzle, pose, kick=.022, onFire=null) {
      const fx=flash(); fx.position.set(...muzzle); g.add(fx);
      g._flash=fx; g._kickZ=kick; g._greebled=g._handDetailed=g._blended=true;
      let shot=-Infinity, time=0;
      g._shotPose=()=>{ if (!onFire) shot=performance.now()/1000; return fx; };
      if (onFire) g._onFire=()=>{ shot=performance.now()/1000; onFire(); };
      g._calm=()=>{time=0;shot=-Infinity;pose(0,Infinity,-1,-1,false);};
      g._tick=(dt,now,assembling)=>{
        if(assembling)return;
        time+=dt;
        const p=g._reloadStart && g._reloadDur ? (Date.now()-g._reloadStart)/g._reloadDur : -1;
        const active=p>=0 && p<1;
        pose(time,now-shot,active && !g._inspectMode?p:-1,active && g._inspectMode?p:-1,ads() && !g._inspectMode);
      };
      g._calm(); return g;
    }

    function frequency() {
      const g=new T.Group(), black=mat(0x15181f,.56,.34), pale=mat(0xa9b0bb,.43,.36), cold=mat(0x536978,.48,.34);
      const lens=new T.MeshStandardMaterial({color:0x739ca4,transparent:true,opacity:.3,roughness:.16,metalness:.35});
      const canvas=document.createElement('canvas'); canvas.width=64; canvas.height=32;
      const ctx=canvas.getContext('2d'), noise=ctx.createImageData(64,32), tex=new T.CanvasTexture(canvas);
      tex.colorSpace=T.SRGBColorSpace; tex.magFilter=T.NearestFilter;
      const screens=new T.MeshBasicMaterial({map:tex,color:0xcde2eb});
      const body=box(g,black,.050,.055,.201,0,.008,.021); body.name='frequency-receiver';
      box(g,pale,.051,.008,.188,0,.031,.018);
      plate(g,cold,[[.111,.028],[.275,.031],[.296,.021],[.296,-.040],[.279,-.044],[.205,-.020],[.119,-.031]],.033,0);
      box(g,black,.037,.058,.014,0,-.008,.300);
      grip(g,black,.036,.072);
      kit.part(g,'magazine',()=>box(g,cold,.032,.075,.058,0,-.051,-.037,.16),{x:0,y:-.024,z:-.037});
      box(g,black,.039,.038,.145,0,.008,-.141);
      for(const z of [-.068,.053])box(g,pale,.024,.031,.018,0,.049,z);
      const optic=node(g,'frequency-optic',0,.068,-.013);
      open(optic,.0175,.012,.149,0,0,0,black,cold);
      for(const z of [-.073,.073]){
        open(optic,.023,.016,.018,0,0,z,pale,black);
        cyl(optic,lens,.0155,.0155,.002,18,0,0,z);
      }
      sight(g,.060,-.086,.068);
      const slabs=[];
      for(let i=0;i<5;i++){
        const z=-.225-i*.048, piece=node(g,'frequency-static-segment',0,.012,z);
        box(piece,black,.033-i*.001,.034-i*.002,.032);
        for(const sign of [-1,1]){
          const panel=mesh(piece,'static-screen',new T.PlaneGeometry(.029,.022),screens,sign*(.0168-i*.0005),0,0);
          panel.rotation.y=sign*Math.PI/2;
        }
        mesh(piece,'static-strip',new T.PlaneGeometry(.023,.03),screens,0,.0171-i*.001,0).rotation.x=-Math.PI/2;
        slabs.push({piece,z});
      }
      const tip=node(g,'frequency-muzzle',0,.012,-.480);
      open(tip,.013,.006,.036,0,0,0,pale,black);
      const fragments=Array.from({length:21},(_,i)=>{
        const b=box(g,screens,.004+(i%5)*.003,.0025,.010+(i%3)*.008,0,0,0);b.name='frequency-scramble'; return b;
      });
      const grayscale=[basic(0x101013),basic(0xd8d9de)], paint=[];
      g.traverse(m=>{if(m.isMesh && !fragments.includes(m))paint.push({m,k:m.material===pale||m.material===screens?1:0});});
      let lastFrame=-1, previousMono=false;
      return lifecycle(g,[0,.012,-.502],(t,age,reload,inspect,aim)=>{
        const burst=age>=0&&age<.11, scramble=inspect>=0?arc(inspect):0;
        if(burst!==previousMono){
          for(const p of paint){
            if(burst){p.stock=p.m.material;p.m.material=grayscale[p.k];}
            else if(p.m.material===grayscale[p.k])p.m.material=p.stock;
          }
          previousMono=burst;
        }
        const frame=Math.floor(t*(scramble>.2?14:9));
        if(frame!==lastFrame){
          lastFrame=frame; let s=(frame+1)*7247;
          for(let i=0;i<noise.data.length;i+=4){s=(Math.imul(s,1664525)+1013904223)|0;const j=(i/256)|0;
            const k=((s>>>25)+((j+(frame%11))%11===0?58:15))*(i%8?1:1.24);
            noise.data[i]=k;noise.data[i+1]=k;noise.data[i+2]=k;noise.data[i+3]=255;
          }
          ctx.putImageData(noise,0,0);tex.needsUpdate=true;
        }
        for(let i=0;i<slabs.length;i++){
          const {piece,z}=slabs[i];
          piece.visible=aim || burst || ((Math.floor(t*6)+i*23)%63!==0 && !(scramble>.6&&(frame+i)%5===0));
          piece.position.set((aim?0:(.001+scramble*.048)*Math.sin(t*3+i*3)),.012+(aim?0:(.001+scramble*.042)*Math.cos(t*3+i)),z+scramble*.026*Math.sin(frame+i));
          piece.rotation.set(scramble*.72*Math.sin(i+t*3),scramble*.74*Math.cos(i+t*2),0);
        }
        for(let i=0;i<fragments.length;i++){
          const f=fragments[i];f.visible=scramble>.17;
          if(f.visible)f.position.set(.083*scramble*Math.sin(frame*.85+i*2),.028+scramble*.085*Math.cos(frame*.42+i*7),.24-(i%11)*.066+scramble*.029*Math.sin(frame+i));
        }
      },.028);
    }

    function hourglass() {
      const g=new T.Group(), dark=mat(0x292138,.65,.34), blue=mat(0x264d5a,.36,.33), gold=mat(0xe4af56,.72,.27);
      const sand=basic(0xffdc83), spark=basic(0xfff8cf);
      const glass=new T.MeshPhysicalMaterial({color:0xb1eff7,opacity:.22,transparent:true,depthWrite:false,side:T.DoubleSide,roughness:.16,metalness:.16});
      box(g,dark,.047,.034,.113,0,-.010,.007); grip(g,blue,.042,.027);
      box(g,gold,.046,.011,.038,0,-.107,.044,.19);
      kit.part(g,'magazine',()=>box(g,dark,.046,.015,.050,0,-.126,.046,.19),{x:0,y:-.080,z:.035});
      box(g,blue,.058,.017,.169,0,-.025,-.125);
      for(const sign of [-1,1]){
        const ps=[[sign*.028,.022,-.098],[sign*.044,.033,-.147],[sign*.049,.043,-.205],[sign*.029,.039,-.273],[sign*.014,.022,-.287]].map(p=>new T.Vector3(...p));
        const curve=new T.CatmullRomCurve3(ps);
        mesh(g,'hourglass-barrel-rail',new T.TubeGeometry(curve,24,.009,7,false),dark);
        mesh(g,'hourglass-rail-inlay',new T.TubeGeometry(new T.CatmullRomCurve3(ps.map(p=>p.clone().add(new T.Vector3(sign*.007,.004,0)))),24,.0025,6,false),gold);
      }
      open(g,.015,.008,.026,0,.026,-.296,blue,dark);
      for(const p of [[0,.058,.022],[0,.058,-.286]])box(g,gold,.010,.013,.012,...p);
      sight(g,.022,-.286,.064);
      const chamber=node(g,'hourglass-chamber',0,.024,-.065);
      const profile=[[.026,-.040],[.029,-.036],[.027,-.027],[.019,-.017],[.008,-.005],[.005,0],[.008,.005],[.019,.017],[.027,.027],[.029,.036],[.026,.04]].map(p=>new T.Vector2(...p));
      mesh(chamber,'hourglass-glass',new T.LatheGeometry(profile,28),glass);
      for(const y of [-.042,.042]){
        ring(chamber,'hourglass-hoop',gold,.030,.0025,0,y,0).rotation.x=Math.PI/2;
        ring(chamber,'hourglass-inlay',blue,.025,.0023,0,y,0).rotation.x=Math.PI/2;
      }
      const grainGeo=new T.IcosahedronGeometry(.00175,0);
      const grains=Array.from({length:60},(_,i)=>mesh(chamber,'hourglass-grain',grainGeo,i%7===0?spark:sand));
      const stops=Array.from({length:12},(_,i)=>{
        const a=i*TAU/12;return box(g,gold,.003,.003,.003,Math.cos(a)*.039,.025+Math.sin(a)*.039,-.064);
      });
      const orbit=ring(g,'hourglass-gyroscope',gold,.043,.00115,0,.025,-.065,Math.PI/2); orbit.rotation.z=.39;
      let flow=0;
      return lifecycle(g,[0,.026,-.316],(t,age,reload,inspect,aim)=>{
        const service=reload<0?0:smooth((reload-.22)/.63), galaxy=inspect<0?0:arc(inspect);
        if(t===0 || age>=.14)flow=t;
        const flip=service*TAU;
        chamber.rotation.set(flip,galaxy*.72,galaxy*.30+(!aim&&reload<0?Math.sin(t*1.7)*.07:0));
        chamber.position.y=.024-.021*(aim?1:0)+.040*galaxy;
        orbit.visible=!aim;orbit.rotation.z=.39+galaxy*t;
        orbit.position.y=chamber.position.y;
        stops.forEach(s=>{s.visible=!aim && galaxy<.4;});
        for(let i=0;i<grains.length;i++){
          const k=(flow*(.28+(i%5)*.025)+i*.61803)%1, y=mix(-.034,.034,k);
          const r=(.003+.020*Math.pow(Math.abs(k*2-1),.77))*(.25+(i%11)*.068), a=i*2.39996+flow*(i%2?.6:-.44);
          const b=i*.245+flow*2.5, d=.005+(i%23)*.0019+(i%2)*.006;
          grains[i].position.set(mix(Math.cos(a)*r,Math.cos(b)*d,galaxy),mix(y,Math.sin(b)*d*.42+Math.sin(i*3)*.004,galaxy),mix(Math.sin(a)*r,Math.sin(b)*d,galaxy));
        }
      },.03);
    }

    function kingdom() {
      const g=new T.Group(), card=mat(0xf3e2b8,.02,.75), tea=mat(0xb98b58,.03,.78), red=mat(0x9b3d46,.08,.62), ink=mat(0x524450,.06,.7), gold=mat(0xe5b969,.25,.46);
      const keep=node(g,'kingdom-keep',0,.009,.021);
      box(keep,card,.060,.052,.188);box(keep,red,.063,.007,.179,0,.026,.009);
      for(const side of [-1,1])for(let i=0;i<3;i++)box(keep,i===1?red:tea,.0026,.0036,.174,side*.031,-.009+i*.010,.008);
      const fore=node(g,'kingdom-folded-chassis',0,.010,-.115);
      box(fore,card,.044,.037,.110);box(fore,red,.045,.004,.109,0,.015,0);
      grip(g,ink,.036,.073);
      plate(g,tea,[[.113,.026],[.250,.036],[.269,.023],[.273,-.035],[.230,-.037],[.123,-.021]],.031,0);
      box(g,card,.036,.048,.008,0,-.009,.269);
      kit.part(g,'magazine',()=>{
        plate(g,tea,[[-.070,-.022],[-.022,-.026],[-.034,-.069],[-.071,-.104],[-.100,-.092],[-.080,-.065]],.031,0);
        for(let i=0;i<5;i++)box(g,red,.032,.0025,.024,0,-.043-i*.009,-.051-i*.006);
      },{x:0,y:-.02,z:-.052});
      const scroll=node(g,'kingdom-scroll',0,.008,-.203);
      open(scroll,.022,.008,.185,0,0,0,card,tea);
      open(scroll,.026,.011,.018,0,0,-.080,tea,ink);
      open(scroll,.023,.0095,.014,0,0,.078,red,tea);
      for(let i=0;i<7;i++)ring(scroll,'paper-scroll-edge',i%3?gold:tea,.0224,.00065,0,0,-.052+i*.018).scale.set(1,.955,1);
      const turret=(parent,i)=>{
        const b=node(parent,'kingdom-turret');
        box(b,card,.026,.030,.028,0,.015);
        box(b,tea,.029,.004,.031,0,.028);
        for(const x of [-.009,.009])for(const z of [-.010,.010])box(b,card,.008,.011,.008,x,.036,z);
        for(const side of [-1,1])box(b,ink,.001,.011,.006,side*.0132,.015,0);
        const banner=box(b,i%2?red:gold,.0018,.012,.017,.010,.025,.011);banner.rotation.z=.10;
        return b;
      };
      const towers=Array.from({length:4},(_,i)=>turret(g,i));
      const walls=Array.from({length:4},(_,i)=>{
        const w=node(g,'kingdom-folded-wall');
        box(w,i%2?tea:card,.100,.0019,.032);
        box(w,red,.098,.001,.003,0,.0018,-.013);
        for(let j=0;j<6;j++)box(w,card,.010,.004,.008,-.041+j*.016,.002,-.015);
        return w;
      });
      const gate=node(g,'kingdom-drawbridge',0,.023,-.073);
      box(gate,tea,.036,.005,.045,0,0,-.023);for(const x of [-.016,.016])box(gate,gold,.002,.006,.037,x,.001,-.023);
      box(g,red,.011,.008,.013,0,.045,-.282);sight(g,.092,-.282,.052);
      const pennant=mesh(keep,'kingdom-flag',new T.PlaneGeometry(.033,.020),new T.MeshStandardMaterial({color:0x9b3d46,side:T.DoubleSide}),0,.098,.013);pennant.rotation.y=Math.PI/2;
      const pole=box(keep,gold,.002,.060,.002,0,.082,0.028);
      const scraps=Array.from({length:14},(_,i)=>{
        const b=box(g,i%3?card:red,.005+(i%4)*.006,.0011,.009+(i%5)*.003,0,0,0);b.name='kingdom-paper-fragment';return b;
      });
      return lifecycle(g,[0,.008,-.309],(t,age,reload,inspect,aim)=>{
        const unfolding=inspect>=0?arc(inspect):0;
        keep.scale.z=mix(1,.41,unfolding);keep.position.y=.009+.030*unfolding;
        fore.position.y=.010+.055*unfolding;fore.position.z=-.115+.075*unfolding;
        fore.rotation.x=unfolding*1.5;
        pennant.visible=pole.visible=unfolding>.53;
        pennant.rotation.z=.15*Math.sin(t*7);
        scroll.rotation.x=unfolding*Math.PI*.48;scroll.position.z=-.203+.102*unfolding;
        scroll.position.y=.008+.022*unfolding;
        for(let i=0;i<4;i++){
          const sx=i%2?1:-1, sz=i<2?-1:1, tower=towers[i], wall=walls[i];
          tower.position.set(mix(sx*.016,sx*.073,unfolding),mix(aim?.013:.028,.035,unfolding),mix(-.055+i*.045,sz*.073,unfolding));
          tower.scale.setScalar(mix(aim?.48:.84,1.23,unfolding));
          wall.position.set(mix(sx*.033,i<2?sx*.064:0,unfolding),mix(.027+i*.003+.0025*Math.sin(t*3+i),.051,unfolding),mix(-.075+i*.037,i<2?0:sz*.068,unfolding));
          wall.rotation.set(mix(.08*Math.sin(t*2+i),Math.PI*.5,unfolding),mix(sx*.13,i<2?Math.PI*.5:0,unfolding),0,'YXZ');
          wall.visible=!aim;
        }
        gate.rotation.x=unfolding*1.31;
        for(let i=0;i<scraps.length;i++){
          const f=scraps[i], u=age/.32;f.visible=u>=0&&u<1;
          if(!f.visible)continue;
          const spread=Math.sin(Math.PI*u), a=i*2.39996;
          f.position.set(Math.cos(a)*.11*spread,.025+Math.sin(a)*.079*spread,-.065-i*.013-.052*spread);
          f.rotation.set(a+u*5,2*a-u*8,u*5);f.scale.setScalar(mix(.35,1,spread));
        }
      });
    }

    function falseSun() {
      const g=new T.Group(), ceramic=mat(0xf5e9ce,.12,.35), brass=mat(0xd9a74a,.74,.25), dark=mat(0x27283a,.59,.36), ink=mat(0x675c50,.13,.64);
      g.userData.skipLoadedProp = true;
      const sunMat=new T.MeshStandardMaterial({color:0xffd067,emissive:0xff7c17,emissiveIntensity:.65,roughness:.46});
      open(g,.035,.023,.369,0,.008,-.045,ceramic,dark);
      cyl(g,ceramic,.043,.040,.064,24,0,.008,-.027);
      cyl(g,ceramic,.030,.048,.082,24,0,.008,.198);
      open(g,.048,.034,.023,0,.008,.242,brass,dark);
      for(const z of [-.213,-.169,-.097,-.056,.018,.116,.168])ring(g,'false-sun-engraved-band',z===-.097||z===.116?ink:brass,z===-.056?.043:.0355,.00155,0,.008,z);
      for(let i=0;i<36;i++){
        const a=TAU*i/12, z=-.142+Math.floor(i/12)*.091, r=.0359;
        const tick=box(g,i%3?ink:brass,.0025,.0014,i%3?.010:.017,Math.sin(a)*r,.008+Math.cos(a)*r,z);
        tick.rotation.z=-a;tick.rotation.y=(i%2?1:-1)*.39;
      }
      for(const side of [-1,1]){
        const sigil=ring(g,'false-sun-engraving',ink,.014,.00075,side*.0344,.008,-.099,side*Math.PI/2);
        sigil.scale.y=.75;
        for(let i=0;i<8;i++){
          const a=i*TAU/8;
          box(g,brass,.0015,.0018,.0018,side*.0342,.008+Math.cos(a)*.017,-.099+Math.sin(a)*.022);
        }
      }
      grip(g,dark,.038,.008);grip(g,ink,.029,-.116);
      for(const z of [.070,-.221])box(g,dark,.014,.015,.015,0,.047,z);
      sight(g,.070,-.221,.054);
      const eclipse=node(g,'false-sun-eclipse',0,.008,-.302);
      const goldRing=ring(eclipse,'eclipse-gold-ring',brass,.051,.0045,0,0,0);
      const armillary=ring(eclipse,'eclipse-armillary',brass,.056,.00185,0,0,0,.94,Math.PI*1.56);
      for(let i=0;i<12;i++){
        const a=i*TAU/12;
        const mark=box(eclipse,i%3?dark:brass,.005,i%3?.006:.011,.004,Math.sin(a)*.052,Math.cos(a)*.052,0);mark.rotation.z=-a;
      }
      const moon=mesh(eclipse,'eclipse-moon',new T.IcosahedronGeometry(.036,3),mat(0x12131d,.10,.88),0,0,.021);
      const sun=mesh(eclipse,'eclipse-sun',new T.SphereGeometry(.032,24,16),sunMat,0,0,-.004);
      const corona=ring(eclipse,'eclipse-corona',new T.MeshBasicMaterial({color:0xffcf5c,transparent:true,opacity:0,depthWrite:false}),.041,.0023,0,0,.001);
      return lifecycle(g,[0,.008,-.373],(t,age,reload,inspect,aim)=>{
        const flame=age>=0&&age<.32?1-smooth(age/.32):0, tour=inspect<0?0:arc(inspect);
        const reset=reload<0?0:1-smooth((reload-.16)/.72);
        const a=t*2.9, st=reload<0?0:Math.sin(reset*Math.PI*.55);
        const orbit=.056*tour;
        eclipse.position.y=.008-.030*(aim?1:0)+.053*tour;
        const spacing=.081*Math.max(flame,st);
        moon.position.set(Math.cos(a)*orbit-spacing*.70,Math.sin(a)*orbit+spacing*.22,.021+Math.sin(a)*orbit*.45);
        moon.scale.setScalar(1-.32*flame);
        sun.position.set(-Math.cos(a)*orbit*.65,-Math.sin(a)*orbit*.65,-.004-Math.sin(a)*orbit*.42);
        sun.visible=flame>.015||st>.035||tour>.06;
        sunMat.emissiveIntensity=.48+flame*2.5;
        corona.visible=sun.visible;corona.position.copy(sun.position);corona.material.opacity=.42*flame+.20*tour;
        corona.scale.setScalar(1+.30*flame);
        goldRing.rotation.set(.06+.22*tour,Math.sin(t*1.5)*(.17+.58*tour),0);
        armillary.rotation.set(a*.36,Math.PI*.38+a*.65*tour,a*.51);
      },.036);
    }

    function sixthDimension() {
      const g=new T.Group(), graphite=mat(0x222537,.66,.34), silver=mat(0x9b9fbb,.52,.28);
      const violet=basic(0xb076ff), brass=mat(0xe1ad5e,.52,.32), dark=mat(0x10131c);
      const handle=node(g,'sixth-layer-grip',0,0,.052);
      grip(handle,graphite,.032,-.02);box(handle,silver,.032,.008,.035,0,-.106,.014,.21);
      for(let i=0;i<5;i++) for(const side of [-1,1]) box(handle,dark,.003,.003,.024,side*.016,-.044-i*.007,.005+i*.002);
      const frame=node(g,'sixth-layer-frame',0,0,.016);
      plate(frame,graphite,[[-.067,-.021],[-.045,-.029],[.055,-.025],[.067,.009],[.037,.027],[.029,.007],[-.048,.007]],.034);
      box(frame,silver,.036,.007,.100,0,-.019,-.009);
      for(const side of [-1,1])box(frame,violet,.002,.003,.048,side*.018,-.009,-.003);
      const orbit=node(g,'sixth-layer-orbit',0,.013,-.026);
      const chambers=Array.from({length:6},(_,i)=>{
        const cell=node(orbit,'sixth-chamber-'+i);
        open(cell,.0074,.0045,.034,0,0,0,silver,dark);
        ring(cell,'chamber-band',violet,.0074,.0011,0,0,.008);
        const bullet=node(cell,'sixth-round-'+i);
        cyl(bullet,brass,.0039,.0039,.021,10,0,0,.003);
        cyl(bullet,silver,0,.0039,.010,10,0,0,-.012,-Math.PI/2);
        return {cell,bullet};
      });
      const barrel=node(g,'sixth-layer-barrel',0,.012,-.120);
      open(barrel,.012,.0055,.082,0,0,0,graphite,dark);
      for(const z of [-.033,.027]) open(barrel,.016,.007,.011,0,0,z,silver,dark);
      ring(barrel,'muzzle-band',violet,.012,.0013,0,0,-.041);
      const sights=node(g,'sixth-layer-sights',0,.037,.041);
      box(sights,graphite,.020,.009,.016);
      for(const side of [-1,1])box(sights,violet,.003,.004,.010,side*.007,.006,0);
      const trigger=node(g,'sixth-layer-trigger',0,-.028,.020);
      const guard=ring(trigger,'sixth-guard',silver,.018,.0021,0,-.008,0,Math.PI/2,Math.PI*1.62);
      guard.scale.x=1.15;box(trigger,dark,.006,.013,.007,0,.002,.003,.26);
      const layers=[handle,frame,orbit,barrel,sights,trigger].map(part=>({part,home:part.position.clone()}));
      const chamberRadius=.017;
      let recoilIndex=0;
      g._mech=null;g._ownsReloadProps=true;
      g.position.set(.1,-.1,-.22);
      sight(g,.041,-.154,.043);
      return lifecycle(g,[0,.012,-.172],(t,age,reload,inspect)=>{
        if(t===0&&age===Infinity)recoilIndex=0;
        const spread=reload<0 ? 0 : smooth(reload/.28)*(1-smooth((reload-.74)/.26));
        const tour=inspect<0?0:arc(inspect), orbitAngle=t*.72+recoilIndex*Math.PI/3;
        layers.forEach(({part,home},i)=>{
          const a=i*TAU/6;
          part.position.copy(home).add(new T.Vector3(Math.sin(a)*.069,Math.cos(a+.48)*.087,(i-2.5)*.052).multiplyScalar(tour));
          part.rotation.set(tour*Math.sin(a+t*1.8)*.98,tour*Math.cos(a+t*1.3)*.91,tour*Math.sin(t*2.0+a)*.8);
        });
        barrel.position.z-=Math.max(0,1-age/.085)*.003;
        chambers.forEach(({cell,bullet},i)=>{
          const a=i*TAU/6+orbitAngle, radius=chamberRadius+.039*spread+.016*tour;
          cell.position.set(Math.sin(a)*radius,Math.cos(a)*radius,spread*.018*Math.cos(a*2));
          cell.rotation.set(spread*Math.cos(a)*.54,spread*Math.sin(a)*.54,tour*Math.sin(a)*.62);
          const seat=reload<0?1:smooth((reload-.29-i*.044)/.18);
          bullet.visible=reload<0?i<(kit.ammo(g) ?? 0):seat>0;
          bullet.position.z=.063*(1-seat);
        });
      },.022,()=>{recoilIndex=(recoilIndex+1)%6;});
    }

    function crescentHousing(parent, side, armor, lip) {
      const shape=new T.Shape(), outer=.031, inner=.012, start=-1.54, end=1.54;
      shape.absarc(0,0,outer,start,end,false);
      shape.lineTo(Math.cos(end)*inner,Math.sin(end)*inner);
      shape.absarc(0,0,inner,end,start,true);
      shape.closePath();
      const body=mesh(parent,'paradox-crescent-shell',new T.ExtrudeGeometry(shape,{
        depth:.216,curveSegments:15,bevelEnabled:true,bevelSize:.0025,bevelThickness:.003,bevelSegments:1,
      }),armor,0,0,-.108);
      if(side<0) body.rotation.z=Math.PI;
      for(const z of [-.105,-.044,.049,.104]){
        const rail=ring(parent,'paradox-trim',lip,outer+.0005,.0017,0,0,z,0,end-start);
        rail.rotation.z=start+(side<0?Math.PI:0);
      }
    }
    function twinParadox() {
      const g=new T.Group(), shell=mat(0x34354a,.63,.29), black=mat(0x161823,.45,.53), trim=mat(0xbab9ca,.47,.34);
      const rose=basic(0xff56ae), mint=basic(0x7af6e7);
      box(g,black,.049,.053,.149,0,.007,.045);
      box(g,trim,.047,.006,.124,0,.035,.048);
      for(const side of [-1,1]){
        box(g,shell,.004,.036,.104,side*.026,.008,.036,0,0,side*.12);
        for(let i=0;i<4;i++)box(g,side===1?rose:mint,.003,.003,.006,side*.030,.011,.001+i*.009);
      }
      plate(g,shell,[[.107,.021],[.272,.018],[.291,-.002],[.273,-.055],[.121,-.050],[.100,-.029]],.041);
      box(g,black,.044,.057,.011,0,-.016,.283);
      grip(g,black,.032,.074);
      const pump=kit.part(g,'main',()=>{
        box(g,black,.047,.029,.133,0,-.024,-.130);
        for(let i=0;i<7;i++)box(g,trim,.049,.004,.005,0,-.039,-.188+i*.016);
      });
      const halves=[-1,1].map(side=>{
        const p=node(g,'paradox-housing-'+side), color=side===1?rose:mint;
        p.scale.y=.73;
        crescentHousing(p,side,shell,trim);
        for(let i=0;i<5;i++)box(p,color,.003,.004,.022,side*.034,0,-.074+i*.036);
        return {p,side};
      });
      const seam=ring(g,'paradox-lock-flash',rose,.025,.0021,0,.020,-.351);
      const gap=.023;
      const position=(p,side,rotation,radius,z,tilt=0)=>{
        p.position.set(side*Math.cos(rotation)*radius,.020+side*Math.sin(rotation)*radius,z);
        p.rotation.set(0,side*tilt,rotation);
      };
      const lock=()=>{seam.visible=true;for(const {p,side} of halves) position(p,side,0,0,-.240);};
      g._mech=null;g.position.set(.12,-.1,-.25);
      box(g,trim,.015,.005,.013,0,.038,.020);
      sight(g,.020,-.341,.042);
      return lifecycle(g,[0,.020,-.370],(t,age,reload,inspect)=>{
        const view=inspect<0?0:arc(inspect), spin=inspect<0?0:smooth((inspect-.12)/.73)*TAU;
        const close=age<.034?0:gap*smooth((age-.034)/.063);
        const impact=age>=0?(age<.097?close:gap+.017*Math.sin(Math.PI*smooth((age-.097)/.13))):gap;
        const z=-.240+(age<.23?.026*Math.sin(Math.PI*smooth(age/.23)):0);
        for(const {p,side} of halves)position(p,side,spin,view>0?gap+.068*view:impact+(age<.034?0:.0014*Math.sin(t*3.2)),z,view*.22);
        seam.visible=view===0&&age>=0&&age<.034;
        pump.position.z=age>=.068&&age<.43?.072*Math.sin(Math.PI*smooth((age-.068)/.362)):0;
        if(reload>=0)pump.position.z=.026*Math.sin(reload*Math.PI);
      },.025,lock);
    }

    function axiom() {
      const g=new T.Group(), pearl=mat(0xa9bcc8,.47,.29), graphite=mat(0x222c3d,.48,.36);
      const teal=basic(0x51ffe1), blue=basic(0x6da3ff), amber=basic(0xfcc275);
      plate(g,graphite,[[-.167,-.012],[-.14,.023],[.102,.022],[.171,.005],[.172,-.032],[.079,-.04],[.04,-.031],[-.141,-.035]],.040);
      box(g,pearl,.035,.007,.257,0,.023,-.018);
      box(g,graphite,.039,.051,.015,0,-.012,.166);
      grip(g,graphite,.031,.036);
      box(g,graphite,.031,.043,.038,0,-.039,-.129);
      for(let i=0;i<6;i++)for(const side of [-1,1])box(g,pearl,.002,.006,.004,side*.021,.006,-.100+i*.016,.17);
      kit.optic(g,0,.060,.010,.075,.012,.038);
      sight(g,.045,-.030,.060);
      const rings=[teal,blue,amber].map((color,i)=>{
        const p=node(g,'axiom-ring-'+i), radius=.084+i*.006;
        ring(p,'axiom-rail',pearl,radius,.004,0,0,0);
        ring(p,'axiom-inlay',color,radius+.003,.002,0,0,.001);
        for(let j=0;j<5;j++){
          const a=j*TAU/5+i*.18;
          box(p,graphite,.016,.014,.015,Math.cos(a)*radius,Math.sin(a)*radius,0,0,0,a);
          box(p,color,.009,.003,.002,Math.cos(a)*radius,Math.sin(a)*radius,.008,0,0,a);
        }
        return p;
      });
      const bolt=node(g,'axiom-bolt',0,.034,-.122);
      cyl(bolt,graphite,.0037,.0037,.174,8,0,0,0);
      cyl(bolt,teal,0,.006,.024,8,0,0,-.093,-Math.PI/2);
      const z=-.213, y=.034;
      let aligned=false;
      const align=()=>{
        rings.forEach((p,i)=>{p.position.set(0,y,z+(.019*(i-1)));p.rotation.set(0,0,0);});
        bolt.visible=false;
      };
      const rest=[[.68,.25,.04],[-.72,.70,-.12],[.19,-.88,.32]];
      g._mech=null;g._ownsReloadProps=true;g.position.set(.12,-.1,-.25);
      return lifecycle(g,[0,.034,-.250],(t,age,reload,inspect)=>{
        if(t===0&&age===Infinity)aligned=false;
        if(aligned){align();aligned=false;return;}
        const view=inspect<0?0:arc(inspect), sphere=inspect<0?0:smooth((inspect-.33)/.14)*(1-smooth((inspect-.60)/.17));
        const kick=age<=.12?smooth(age/.12):1;
        const triad=[[0,0,0],[Math.PI/2,0,0],[0,Math.PI/2,0]];
        rings.forEach((p,i)=>{
          const side=i-1, a=t*(.8+i*.38)+i*2.1;
          const orbit=view*(1-sphere);
          p.position.set(Math.sin(a)*orbit*.047,y+Math.cos(a)*orbit*.048,z+side*.028*(1-sphere));
          const natural=rest[i].map((r,j)=>r+(j===2?.28:.10)*Math.sin(a+j)+orbit*Math.sin(a+j*1.4)*1.7);
          p.rotation.set(...natural.map((r,j)=>mix(r,triad[i][j],sphere)*kick));
        });
        bolt.visible=reload<0?age>.22&&(kit.ammo(g) ?? 1)>0:reload>.52;
        bolt.position.z=-.122+(reload>=0?(1-smooth((reload-.51)/.31))*.095:0);
      },.006,()=>{aligned=true;align();});
    }

    function brokenPromise() {
      const g=new T.Group();
      const ivory=new T.MeshPhysicalMaterial({color:0xfff0dc,roughness:.26,clearcoat:.55,clearcoatRoughness:.26});
      const aged=new T.MeshPhysicalMaterial({color:0xdcdaca,roughness:.39,clearcoat:.28});
      const gold=mat(0xb1833e,.63,.39), dark=mat(0x302921,.46,.53), bruise=mat(0x324e71,.15,.42);
      const parts=[];
      const fragment=(name,x,y,z,drift)=> {
        const p=node(g,name,x,y,z);
        parts.push({p,home:p.position.clone(),drift:new T.Vector3(...drift),i:parts.length});
        return p;
      };
      plate(g,dark,[[-.069,-.018],[-.055,-.029],[.051,-.027],[.056,.018],[.038,.029],[.031,-.006],[-.066,-.012]],.029);
      box(g,gold,.030,.004,.088,0,-.018,-.010);
      box(g,ivory,.025,.011,.015,0,.038,.048);
      box(g,bruise,.004,.003,.006,0,.044,.047);
      const guard=ring(g,'promise-guard',gold,.016,.0022,0,-.024,.027,Math.PI/2,Math.PI*1.4);
      guard.scale.x=1.12;
      box(g,dark,.005,.013,.006,0,-.017,.027,.24);
      const frameShards=[
        [[-.059,-.017],[-.046,-.011],[-.020,-.014],[-.028,-.022],[-.049,-.025]],
        [[-.024,-.015],[.022,-.011],[.026,-.021],[.007,-.024],[-.021,-.023]],
        [[.026,-.008],[.033,.025],[.044,.020],[.041,.001],[.049,-.012],[.032,-.020]],
      ];
      for(const side of [-1,1]) for(const [i,points] of frameShards.entries()){
        const z=points[0][0],y=points[0][1];
        const p=fragment('promise-frame-shard',side*.0155,y,z,[side*(.018+i*.008),.008+i*.007,-.013+i*.010]);
        plate(p,i===1?aged:ivory,points.map(([u,v])=>[u-z,v-y]),.0045);
      }

      // Separate beveled pieces sit over the gold inlay, rather than a painted crack texture.
      const rows=[[[.025,-.025],[.05,-.025],[.073,-.026]],
        [[.031,-.045],[.052,-.052],[.081,-.047]],
        [[.042,-.075],[.068,-.07],[.090,-.074]],
        [[.059,-.113],[.077,-.108],[.093,-.103]]];
      const gripOutline=[rows[0][0],rows[0][2],rows[2][2],rows[3][2],rows[3][0],rows[1][0]];
      plate(g,dark,gripOutline,.022);
      for(const side of [-1,1])plate(g,gold,gripOutline,.002,side*.0128);
      for(const side of [-1,1]) for(let row=0;row<3;row++)for(let col=0;col<2;col++){
        const a=rows[row][col],b=rows[row][col+1],c=rows[row+1][col+1],d=rows[row+1][col];
        for(const points of (row+col)%2?[[a,b,d],[b,c,d]]:[[a,b,c],[a,c,d]]){
          const z=points.reduce((v,p)=>v+p[0],0)/3, y=points.reduce((v,p)=>v+p[1],0)/3;
          const j=parts.length;
          const p=fragment('promise-grip-shard',side*.0148,y,z,[side*(.019+j%3*.009),Math.sin(j*4)*.024,.014*Math.cos(j*2)]);
          plate(p,j%6===0?aged:ivory,points.map(([u,v])=>[(u-z)*.86,(v-y)*.86]),.005);
        }
      }

      // Each ceramic barrel section has a through-bore and jagged, separately machined end faces.
      const boundaries=[-.169,-.135,-.098,-.061], count=12;
      const jag=(edge,i)=>.0021*Math.sin(i*TAU/3+edge*.95)+.0014*Math.cos(i*TAU/4-edge);
      for(let k=0;k<3;k++){
        const end=boundaries[k], back=boundaries[k+1], z=(end+back)*.5;
        const p=fragment('promise-barrel-'+k,0,.012,z,[(k-1)*.021,.013+k*.009,-.018+k*.015]);
        const vertices=[], indices=[];
        const radius=.0108+k*.00065;
        for(let face=0;face<2;face++)for(let bore=0;bore<2;bore++)for(let i=0;i<count;i++){
          const a=i*TAU/count, r=bore?.0051:radius+(i%3===0?.0007:0);
          const dz=(face?back-.003:end+.003)-z+jag(k+face,i);
          vertices.push(Math.cos(a)*r,Math.sin(a)*r,dz);
        }
        const quad=(a,b,c,d)=>indices.push(a,b,c,a,c,d);
        const geo=new T.BufferGeometry();
        for(let run=0;run<3;run++){
          const start=indices.length;
          for(let i=0;i<count;i++){
            const j=(i+1)%count;
            if(run===0)quad(i,j,2*count+j,2*count+i);
            if(run===1)quad(count+j,count+i,3*count+i,3*count+j);
            if(run===2){
              quad(j,i,count+i,count+j);
              quad(2*count+i,2*count+j,3*count+j,3*count+i);
            }
          }
          geo.addGroup(start,indices.length-start,run);
        }
        geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
        geo.setIndex(indices);geo.computeVertexNormals();
        mesh(p,'promise-ceramic-sleeve',geo,[ivory,dark,gold]);
        for(const side of [-1,1])box(p,bruise,.0012,.0016,.013,side*radius,.002,.001,0,side*.14);
      }

      const chambers=Array.from({length:6},(_,i)=>{
        const p=node(g,'promise-chamber-'+i), brass=mat(0xcd9e59,.45,.4);
        open(p,.0081,.0042,.032,0,0,0,ivory,dark);
        open(p,.0084,.0042,.005,0,0,.013,gold,dark);
        box(p,bruise,.003,.0011,.018,0,.0082,0,0,0,(i%2?1:-1)*.25);
        const round=cyl(p,brass,.0032,.0032,.011,8,0,0,.009);
        return {p,round};
      });
      const chips=Array.from({length:8},(_,i)=>{
        const p=fragment('promise-drifting-chip',Math.cos(i*2.5)*.03,.025+(i%3)*.009,-.123+i*.024,
          [Math.cos(i*2.5)*.042,.038,-.032*Math.sin(i*3)]);
        const chip=mesh(p,'porcelain-chip',new T.TetrahedronGeometry(.0028+i%3*.001,0),i%4===0?gold:ivory);
        chip.scale.set(.65,1.32,.77);return p;
      });
      const chipSet=new Set(chips);
      let fired=0;
      g._mech=null;g._ownsReloadProps=true;g.position.set(.10,-.10,-.22);
      sight(g,.048,-.153,.043);
      return lifecycle(g,[0,.012,-.172],(t,age,reload,inspect,aim)=>{
        if(t===0&&age===Infinity)fired=0;
        const burst=1-smooth(age/.168), tour=inspect<0?0:arc(inspect);
        for(const {p,home,drift,i} of parts){
          const chip=chipSet.has(p), cycle=.5+.5*Math.sin(t*1.8+i*1.9);
          const spread=burst*(aim?.66:1)+tour*(.45+cycle*.3)+(chip?.36*cycle:0);
          p.position.copy(home).addScaledVector(drift,spread);
          p.rotation.set(spread*Math.sin(i*2)*1.1,spread*Math.cos(i*3)*.83,spread*.79*Math.sin(i));
        }
        for(const [i,{p,round}] of chambers.entries()){
          const a=(i+fired)*TAU/6+t*.63, radius=.017;
          const launch=reload<0?0:smooth((reload-i*.019)/.24);
          const catchAt=.53+i*.052;
          const latch=reload<0?0:smooth((reload-catchAt)/(i===5?.13:.16));
          const scatter=launch*(1-latch), tumble=(reload<0?0:reload)*13+i*1.8;
          const r=radius+scatter*(.035+.012*Math.sin(tumble))+burst*.016+tour*.026;
          p.position.set(Math.cos(a)*r,.013+Math.sin(a)*r,-.032+scatter*(Math.cos(i*2)*.033+Math.sin(tumble)*.015));
          p.rotation.set(scatter*tumble+tour*Math.sin(t+i)*.7,scatter*Math.cos(i*2)*2.8+burst*Math.sin(i)*.3,scatter*Math.sin(tumble)*1.8);
          round.visible=reload<0?i<(kit.ammo(g)??0):reload>.34+i*.029;
          round.position.z=reload<0?.009:.009+(1-smooth((reload-.34-i*.029)/.13))*.036;
        }
      },.022,()=>{fired=(fired+1)%6;});
    }

    const builders = { ...kit, node, mesh, mat, basic, sight, grip, lifecycle, arc, smooth, clamp, mix };
    const round4 = window.PVP_IMPOSSIBLE_ROUND4?.(T, builders);
    const round5 = window.PVP_IMPOSSIBLE_ROUND5?.(T, builders);
    return { frequency, hourglass, kingdom, falseSun, sixthDimension, twinParadox, axiom, brokenPromise, ...round4, ...round5,
      hungryGarden: () => window.PVP_HUNGRY_GARDEN(T,builders) };
  };
})();
