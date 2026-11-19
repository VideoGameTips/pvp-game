(() => {
  'use strict';
  window.PVP_IMPOSSIBLE_ROUND5 = function (T, k) {
    const { box, cyl, plate, open, node, mesh, mat, basic, grip, lifecycle, arc, smooth, mix, environment } = k;
    const tau=Math.PI*2, tour=p=>p<0?0:arc(p);
    const steel=()=>mat(0x596879,.63,.32), black=()=>mat(0x181f29,.36,.46), light=()=>basic(0x64ddff);
    const ring=(g,name,m,r,w,x,y,z)=>mesh(g,name,new T.TorusGeometry(r,w,6,24),m,x,y,z);
    function custom(g) { g._mech=null; g._ownsReloadProps=true; }
    function scope(g,m,a,z=-.01) {
      for(const d of [-.053,.050])box(g,m,.027,.031,.02,0,.046,z+d);
      open(g,.018,.012,.131,0,.068,z,m,a);
      open(g,.023,.015,.027,0,.068,z-.066,a,m);
      open(g,.020,.013,.020,0,.068,z+.062,a,m);
      cyl(g,new T.MeshStandardMaterial({color:0x6a9fae,transparent:true,opacity:.28,depthWrite:false}),.012,.012,.001,20,0,.068,z+.068);
    }
    function label(g, name, value, width, height, x,y,z) {
      const c=document.createElement('canvas');c.width=192;c.height=80;
      const p=c.getContext('2d');p.fillStyle='#0a1822';p.fillRect(0,0,192,80);
      p.strokeStyle='#47b5cb';p.lineWidth=3;p.strokeRect(4,4,184,72);
      p.fillStyle='#c3eff1';p.font='bold 22px monospace';p.fillText(name,12,31,164);
      p.font='16px monospace';p.fillStyle='#74d5dc';p.fillText(value,12,56,164);
      const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
      const m=mesh(g,'militech-diagnostic',new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}),x,y,z);
      m.rotation.y=Math.PI/2;return m;
    }

    function railbreaker() {
      const g=new T.Group(), alloy=steel(), dark=black(), navy=mat(0x364857,.62,.34), coil=mat(0x9a7257,.69,.32), lit=light();
      plate(g,navy,[[.113,.025],[.272,.025],[.297,.009],[.286,-.051],[.259,-.055],[.203,-.025],[.121,-.028]],.040);
      box(g,dark,.044,.067,.014,0,-.018,.291);
      grip(g,dark,.036,.073);scope(g,dark,alloy);
      box(g,navy,.052,.055,.207,0,.005,.017);
      for(const s of [-1,1])box(g,alloy,.004,.012,.096,s*.026,.013,.041);
      const accelerator=node(g,'railbreaker-accelerator',0,.012,-.225);
      open(accelerator,.010,.0052,.477,0,0,-.035,dark,alloy);
      for(let i=0;i<13;i++)ring(accelerator,'induction-coil',i%3?coil:lit,.016,.0021,0,0,-.202+i*.028);
      const rails=[-1,1].map((s)=>{
        const r=node(g,'railbreaker-rail');
        plate(r,navy,[[-.217,.007],[-.186,.020],[.104,.020],[.163,.012],[.155,-.020],[-.200,-.017]],.021);
        box(r,alloy,.018,.004,.349,0,.021,-.028);
        box(r,lit,.003,.003,.273,-s*.010,.001,-.039);
        for(let i=0;i<6;i++)box(r,dark,.003,.008,.010,s*.011,.005,-.147+i*.041,.34);
        return r;
      });
      const clamps=[-1,1].map(s=>{const p=node(g,'railbreaker-load-clamp');box(p,alloy,.013,.012,.033);box(p,lit,.004,.005,.015,-s*.008,0,0);return p;});
      const slug=node(g,'railbreaker-tungsten');cyl(slug,alloy,.006,.006,.033,12,0,0,0);cyl(slug,coil,.0015,.006,.012,12,0,0,-.020);
      const blue=basic(0x83dfff), white=basic(0xe2fcff);
      const bolts=Array.from({length:7},(_,i)=>mesh(g,'railbreaker-arc',new T.BoxGeometry(1,1,1),i%2?blue:white));
      const a=new T.Vector3(),b=new T.Vector3(),delta=new T.Vector3(),axis=new T.Vector3(1,0,0);
      let locked=false;
      custom(g);
      return lifecycle(g,[0,.012,-.496],(t,age,reload,inspect,aim)=>{
        if(t===0&&age===Infinity)locked=false;
        const shot=locked?0:age;locked=false;
        const discharge=shot>=0&&shot<.12, recoil=shot<.055?0:smooth((shot-.055)/.046)*(1-smooth((shot-.103)/.24));
        const clampIn=shot>=0&&shot<.075?1-smooth(shot/.075):0;
        const r=tour(reload), look=tour(inspect), gap=.034-.013*clampIn+.025*recoil+.045*look+.019*r;
        rails.forEach((p,i)=>{const s=i?1:-1;p.position.set(s*gap,.012+(aim?0:.002*Math.sin(t*3+i)), -.232+.021*recoil);p.rotation.y=s*.14*look;});
        const service=reload<0?0:smooth((reload-.26)/.46);
        slug.visible=reload>.12&&reload<.78;slug.position.set(.054*(1-service),.047-.034*service,.088-.151*service);
        clamps.forEach((p,i)=>{p.visible=slug.visible; p.position.copy(slug.position);p.position.x+=(i?1:-1)*(.012+.014*(1-r));});
        for(let i=0;i<bolts.length;i++){
          const p=bolts[i];p.visible=discharge;if(!discharge)continue;
          const point=j=>a.set(mix(-gap+.006,gap-.006,j/7),.014+.014*Math.sin(j*2.9+i*.12+t*80),-.319+.024*Math.sin(j*2.1+t*100));
          point(i);b.copy(a);point(i+1);delta.subVectors(a,b);
          p.position.copy(a).lerp(b,.5);p.scale.set(delta.length(),i%2?.0018:.0012,.0019);p.quaternion.setFromUnitVectors(axis,delta.normalize());
        }
      },.026,()=>{locked=true;rails.forEach((p,i)=>{p.position.x=(i?1:-1)*.021;});});
    }

    function phantom() {
      const g=new T.Group(), frame=black(), brace=steel(), inner=mat(0x644d3e,.66,.39), lit=basic(0x91d8c9);
      const camo=[['#938471','#b5a184','#d0b995','#6c6251'],['#4f6169','#33434c','#78878a','#272e3a'],['#4f583b','#2d3d32','#70775a','#262f24']].map((colors,index)=>{
        const c=document.createElement('canvas');c.width=128;c.height=64;const p=c.getContext('2d');
        p.fillStyle=colors[0];p.fillRect(0,0,128,64);
        for(let i=0;i<42;i++){
          const x=(i*61+index*29)%128,y=(i*41+7)%64,l=7+i*13%26;
          p.fillStyle=colors[1+i%3];p.fillRect(x,y,l,5+i%9);p.fillRect(x+4,y-4,l*.6,5);p.fillRect(x-3,y+5,l*.5,6);
        }
        const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.magFilter=T.NearestFilter;
        return new T.MeshStandardMaterial({map:tex,roughness:.68,metalness:.13});
      });
      plate(g,brace,[[.092,.025],[.257,.028],[.278,.015],[.269,-.045],[.247,-.051],[.134,-.026]],.034);
      box(g,frame,.039,.070,.012,0,-.011,.272);grip(g,frame,.035,.071);
      box(g,frame,.039,.042,.180,0,.009,.008);box(g,inner,.043,.011,.096,0,.022,-.016);
      box(g,frame,.034,.028,.093,0,.009,-.124);
      open(g,.010,.005,.173,0,.009,-.200,brace,frame);open(g,.015,.007,.018,0,.009,-.288,frame,inner);
      for(const x of [-.007,.007])box(g,brace,.004,.012,.011,x,.041,.092);
      box(g,frame,.007,.021,.014,0,.033,-.248);box(g,lit,.003,.005,.006,0,.045,-.249);
      const mag=node(g,'phantom-magazine',0,-.023,-.024);
      plate(mag,frame,[[-.040,0],[.019,0],[.010,-.036],[-.022,-.076],[-.057,-.087],[-.069,-.072],[-.041,-.042]],.032);
      for(let i=0;i<5;i++)box(mag,brace,.034,.0025,.025,0,-.024-i*.010,-.022-i*.006);
      const panels=Array.from({length:6},(_,i)=>{
        const p=node(g,'phantom-camo-panel'), shell=plate(p,camo[1],[[-.040,.009],[-.027,.017],[.035,.016],[.044,.006],[.030,-.018],[-.031,-.015]],.007);
        const { position, uv }=shell.geometry.attributes;
        for(let j=0;j<uv.count;j++)uv.setXY(j,(position.getZ(j)+.044)/.088,(position.getY(j)+.020)/.039);
        box(p,frame,.008,.004,.064,0,.016,0);
        box(p,lit,.010,.002,.016,0,-.009,.021);
        return {p,shell};
      });
      const expo=label(g,'PHANTOM','ADAPTIVE PATTERN',.113,.048,.054,.071,-.018);
      custom(g);
      return lifecycle(g,[0,.009,-.305],(t,age,reload,inspect,aim)=>{
        const view=tour(inspect), r=tour(reload), fail=age>=0&&age<.17?1-smooth(age/.17):0;
        const mode=inspect>=0?Math.min(2,Math.floor(inspect*3)):(environment()+(Math.floor(t/3.8)%4===3?1:0))%3;
        mag.position.y=-.023-(reload<0?0:.091*arc(reload));
        mag.rotation.x=reload<0?0:.35*r;
        expo.visible=view>.5;
        panels.forEach(({p,shell},i)=>{
          const side=i%2?1:-1,j=i>>1;
          p.position.set(side*(.026+.025*r+.026*view+.031*fail),.008+(aim?0:.002*Math.sin(t*2+i))+.012*view-.011*fail,.060-j*.074+.016*r);
          p.rotation.set(fail*.48,side*(.32*r+.29*fail),side*.16*r);
          shell.material=fail>.24?brace:camo[mode];
          p.visible=fail<.70 || i%3===1;
        });
      },.020,()=>{});
    }

    function ironTempest() {
      const g=new T.Group(), m=steel(), dark=black(), oxide=mat(0x5d4a43,.46,.44), cyan=light();
      plate(g,oxide,[[-.090,.048],[.099,.054],[.157,.040],[.164,-.034],[.119,-.059],[-.067,-.054]],.111);
      box(g,dark,.117,.022,.181,0,.039,.035);box(g,m,.105,.021,.115,0,-.061,.071);
      grip(g,dark,.043,.082);grip(g,oxide,.041,-.091);
      for(const side of [-1,1]){
        for(let i=0;i<6;i++)box(g,dark,.005,.026,.009,side*.056,.004,-.057+i*.020,.25);
        box(g,cyan,.003,.006,.084,side*.060,.026,.055);
      }
      const drive=node(g,'tempest-magnetic-stator',0,.007,-.102);
      ring(drive,'tempest-ring',m,.046,.004,0,0,0);
      for(let i=0;i<6;i++){
        const a=tau*i/6;
        const p=box(drive,cyan,.013,.008,.014,Math.sin(a)*.040,Math.cos(a)*.040,0);p.rotation.z=-a;
      }
      const barrels=Array.from({length:6},(_,i)=>{
        const p=node(g,'tempest-barrel-'+i);
        cyl(p,m,.0075,.0075,.262,12,0,0,-.139);
        open(p,.010,.0041,.044,0,0,-.269,dark,m);
        for(const z of [-.022,-.044,-.072])cyl(p,oxide,.013,.013,.008,10,0,0,z);
        box(p,cyan,.0022,.003,.051,0,.011,-.057);return p;
      });
      const hubs=Array.from({length:6},(_,i)=>{const p=node(g,'tempest-stabilizer');cyl(p,oxide,.014,.014,.018,10,0,0,0);ring(p,'stabilizer-field',cyan,.013,.0016,0,0,-.013);return p;});
      let warm=0,spin=0,prior=0;
      custom(g);
      return lifecycle(g,[0,.007,-.432],(t,age,reload,inspect)=>{
        if(t===0){warm=spin=prior=0;}
        const dt=Math.min(.08,Math.max(0,t-prior));prior=t;
        warm+=(Number(age<.28)-warm)*Math.min(1,dt*(age<.28?4:2.2));
        spin=(spin+dt*(.40+23*warm))%tau;
        const sync=smooth(warm/.65), view=tour(inspect);
        barrels.forEach((p,i)=>{
          const a=spin+tau*i/6+(1-sync)*warm*.95*Math.sin(t*9+i*1.34);
          const r=.036+.041*view+(1-sync)*warm*.008*Math.sin(t*10+i);
          p.position.set(Math.sin(a)*r,.007+Math.cos(a)*r,-.137-.012*view+.007*warm*Math.sin(t*12+i)*(1-sync));
          p.rotation.set(Math.cos(a)*.11*view,-Math.sin(a)*.11*view,-a+t*warm*(1-sync));
          hubs[i].visible=view>.13;hubs[i].position.set(Math.sin(a)*(.019+.012*view),.007+Math.cos(a)*(.019+.012*view),-.179-.033*view);
        });
      },.013,()=>{});
    }

    function blackbox() {
      const g=new T.Group(), dark=black(), alloy=steel(), ceramic=mat(0x253858,.41,.34), brass=mat(0xa79262,.68,.27), lit=light();
      grip(g,dark,.041,.029);
      plate(g,alloy,[[-.033,.030],[.020,.044],[.071,.020],[.068,-.028],[.028,-.038],[-.022,-.024]],.037);
      plate(g,ceramic,[[-.151,.038],[-.119,.041],[-.080,.038],[-.055,.033],[-.057,.026],[-.137,.027],[-.148,.021]],.025);
      box(g,dark,.030,.009,.143,0,-.027,-.048);
      box(g,alloy,.024,.016,.019,0,-.018,-.110);
      open(g,.015,.007,.134,0,.024,-.176,ceramic,dark);
      box(g,alloy,.039,.006,.123,0,.040,-.167);
      box(g,dark,.016,.012,.011,0,.048,-.214);box(g,lit,.004,.003,.006,0,.055,-.215);
      box(g,dark,.032,.015,.012,0,.048,.021);
      const drum=node(g,'blackbox-cylinder',0,.005,-.061);
      cyl(drum,alloy,.008,.008,.059,12,0,0,0);
      ring(drum,'blackbox-stabilizer',lit,.012,.0022,0,0,-.021);
      ring(drum,'blackbox-stabilizer',lit,.012,.0022,0,0,.021);
      const chambers=Array.from({length:6},(_,i)=>{
        const p=node(drum,'blackbox-cell-'+i);
        box(p,ceramic,.014,.014,.049);box(p,brass,.011,.011,.006,0,0,.025);
        open(p,.006,.0034,.009,0,0,-.024,alloy,dark);box(p,lit,.006,.002,.021,0,.008,.001);return p;
      });
      const diag=label(g,'BLACKBOX','06 CELLS / READY',.109,.045,.043,.082,-.035);
      let index=0,current=0;
      custom(g);
      return lifecycle(g,[0,.024,-.252],(t,age,reload,inspect)=>{
        if(t===0&&age===Infinity) index=current=0;
        const r=tour(reload), view=tour(inspect);
        current=mix(current,index,.40);if(Math.abs(current-index)<.001)current=index;
        drum.position.set(.023*r,.005+.081*r+.011*view,-.061+.016*r);
        drum.rotation.x=.38*r;
        diag.visible=view>.22;diag.position.y=.066+.037*view;
        chambers.forEach((p,i)=>{
          const a=tau*(i+current+(reload<0?0:smooth(reload)*6))/6;
          const radius=.019+.010*r+.005*view;
          p.position.set(radius*Math.sin(a),radius*Math.cos(a),0);p.rotation.z=-a;
        });
      },.027,()=>{index++;if(index>12){index-=12;current-=12;}});
    }

    function ghostLance() {
      const g=new T.Group(), cer=mat(0xc9c9ba,.29,.39), dark=black(), m=steel(), blue=light();
      plate(g,dark,[[-.175,-.034],[-.160,.022],[.044,.042],[.127,.025],[.116,-.054],[-.100,-.062]],.088);
      box(g,m,.096,.016,.142,0,-.053,-.042);grip(g,dark,.044,.020);grip(g,m,.036,-.113);
      box(g,m,.069,.043,.071,0,.004,.119);box(g,blue,.046,.014,.002,0,.012,.155);
      const tube=node(g,'ghost-lance-launch-tube',0,.053,-.080);
      cyl(tube,m,.026,.026,.129,20,0,.009,0,0);
      for(const y of [-.051,.059,.075])ring(tube,'ghost-lance-suspension',y===.059?blue:dark,.028,.0028,0,y,0).rotation.x=Math.PI/2;
      const missile=node(tube,'ghost-lance-next-missile');
      cyl(missile,dark,.013,.013,.078,10,0,0,0,0);
      cyl(missile,cer,.002,.013,.033,10,0,.055,0,0);
      ring(missile,'missile-band',blue,.013,.0018,0,-.004,0).rotation.x=Math.PI/2;
      const plates=Array.from({length:4},(_,i)=>{
        const p=node(g,'ghost-lance-armor-'+i);
        plate(p,cer,[[-.033,.036],[-.027,.073],[.024,.078],[.034,.058],[.030,-.065],[-.031,-.065]],.013);
        box(p,dark,.016,.013,.063,0,.021,0);box(p,blue,.017,.004,.055,0,.016,0);
        for(let j=0;j<3;j++)box(p,m,.016,.004,.055,0,-.014-j*.011,0);
        return p;
      });
      const hud=node(g,'ghost-lance-reticle');
      const bars=basic(0x81faff);
      ring(hud,'ghost-lance-reticle-ring',bars,.043,.0016,0,0,0);
      for(const sign of [-1,1]){box(hud,bars,.020,.002,.001,sign*.040,0,0);box(hud,bars,.002,.016,.001,0,sign*.040,0);}
      box(hud,bars,.002,.002,.001);hud.rotation.y=Math.PI/2;
      let launch=false;
      custom(g);
      lifecycle(g,[0,.145,-.080],(t,age,reload,inspect,aim)=>{
        if(t===0&&age===Infinity)launch=false;
        const kick=launch?1:(age>=0&&age<.50?1-smooth(age/.50):0);launch=false;
        const view=tour(inspect), r=reload<0?0:smooth(reload/.20)*(1-smooth((reload-.61)/.35));
        plates.forEach((p,i)=>{const a=tau*(i+.5)/4,radius=.042+.045*kick+.028*r+.019*view;
          p.position.set(Math.cos(a)*radius,.054, -.080+Math.sin(a)*radius);p.rotation.set(0,-a,0);p.rotateZ((kick*.57+r*.23+view*.21)*(i<2?1:-1));});
        tube.position.y=.053+(aim?0:.0025*Math.sin(t*2.8));
        missile.visible=kick<.30 && (reload<0 ? (k.ammo(g)??1)>0 : reload>.32);
        missile.position.y=.025-(reload<0?0:.089*(1-smooth((reload-.32)/.45)));
        hud.visible=view>.16;hud.position.set(.088,.081+Math.sin(inspect*tau)*.031,.115-inspect*.32);hud.rotation.z=t*.42;
      },.014,()=>{launch=true;});
      g._javelinLaunchPose=g._onFire;
      return g;
    }

    function zeroRecoil() {
      const g=new T.Group(), pale=mat(0xa2a8af,.42,.36), dark=black(), hazard=mat(0xb99148,.36,.42), cyan=light();
      plate(g,dark,[[-.191,.021],[-.181,.039],[.152,.039],[.163,.019],[.160,-.035],[.064,-.033],[.032,-.059],[-.044,-.056],[-.084,-.030],[-.170,-.021]],.057);
      box(g,pale,.060,.014,.143,0,-.024,.080);box(g,pale,.062,.048,.011,0,-.006,.161);
      plate(g,pale,[[-.176,.028],[-.119,.035],[-.047,.030],[-.057,.013],[-.161,.006]],.063);
      open(g,.012,.005,.056,0,.009,-.192,pale,dark);
      for(const x of [-.016,.016])box(g,pale,.004,.027,.012,x,.050,-.122);
      box(g,pale,.036,.004,.015,0,.063,-.122);box(g,cyan,.004,.005,.007,0,.046,-.159);
      const mag=node(g,'zero-recoil-top-mag',0,.036,.032);
      box(mag,hazard,.036,.016,.152);box(mag,dark,.038,.004,.145,0,.009,0);
      for(let i=0;i<9;i++)box(mag,pale,.030,.0025,.004,0,.012,-.062+i*.014);
      const slides=[-1,1].map((s)=>{
        const p=node(g,'zero-recoil-counterweight');
        plate(p,pale,[[-.075,.007],[-.054,.018],[.053,.018],[.074,.009],[.060,-.013],[-.062,-.013]],.017);
        box(p,hazard,.019,.005,.049,0,.015,.008);box(p,cyan,.0028,.004,.070,s*.0095,.001,-.010);
        box(p,dark,.020,.013,.017,0,0,.055);return p;
      });
      const diag=label(g,'COMPENSATOR','CYCLING / PASS',.111,.045,.066,.083,.017);
      custom(g);
      return lifecycle(g,[0,.009,-.223],(t,age,reload,inspect,aim)=>{
        const r=tour(reload), view=tour(inspect), pulse=age>=0&&age<.24?Math.cos(age*48)*Math.exp(-age*15):0;
        mag.position.set(0,.036+.064*r,.032+.063*r);
        mag.rotation.x=.19*r;
        diag.visible=view>.24;diag.position.y=.067+.035*view;
        slides.forEach((p,i)=>{const s=i?1:-1;
          p.position.set(s*(.043+.037*r+.014*view),.001+(aim?0:.002*Math.sin(t*4+i)),.024+.041*pulse+.033*view*Math.sin(inspect*3*tau+i));
          p.rotation.y=s*(.46*r+.15*view*Math.sin(t*8+i));});
      },.017,()=>{});
    }

    return { railbreaker, phantom, ironTempest, blackbox, ghostLance, zeroRecoil };
  };
})();
