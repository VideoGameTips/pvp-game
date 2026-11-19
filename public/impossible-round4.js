(() => {
  'use strict';
  window.PVP_IMPOSSIBLE_ROUND4 = function (T, k) {
    const { box, cyl, plate, open, part, ads, node, mesh, mat, basic, sight, grip, lifecycle, arc, smooth, clamp, mix } = k;
    const tau = Math.PI * 2, tour = p => p < 0 ? 0 : arc(p);

    function nullspace() {
      const g = new T.Group(), frame = mat(0x27333d,.32,.34), enamel = mat(0xd8ded3,.17,.32), black = mat(0x0d151c,.1,.61), amber = basic(0xf4ab51);
      function body(root) {
        const stock = node(root,'nullspace-stock'), hand = node(root,'nullspace-grip'), nose = node(root,'nullspace-barrel');
        plate(stock,frame,[[.027,.023],[.142,.030],[.163,.015],[.160,-.026],[.132,-.038],[.057,-.037],[.031,-.020]],.052);
        box(stock,black,.054,.049,.009,0,-.001,.162);
        part(stock,'magazine',()=>{
          box(stock,frame,.043,.014,.093,0,.037,.081);
          for(let i=0;i<7;i++)box(stock,enamel,.028,.004,.004,0,.045,.046+i*.011);
        },{x:0,y:.037,z:.081});
        plate(hand,frame,[[-.062,.006],[.028,.006],[.030,-.014],[.013,-.028],[-.004,-.063],[-.050,-.061],[-.065,-.038]],.042);
        plate(hand,black,[[-.047,-.026],[.005,-.023],[-.009,-.050],[-.043,-.055],[-.054,-.041]],.043);
        for(let i=0;i<5;i++)box(hand,enamel,.043,.002,.003,0,-.051+i*.005,-.024+i*.002);
        box(hand,amber,.004,.015,.005,0,-.019,-.042,.22);
        plate(nose,frame,[[-.214,.006],[-.182,.033],[-.063,.034],[-.049,.018],[-.055,-.005],[-.081,-.010],[-.101,-.042],[-.151,-.049],[-.177,-.026]],.046);
        for(const s of [-1,1]){
          plate(stock,enamel,[[.042,.023],[.133,.023],[.146,.011],[.124,.004],[.068,.006]],.002,s*.027);
          plate(nose,enamel,[[-.202,.006],[-.176,.027],[-.093,.023],[-.078,.011],[-.112,.007]],.002,s*.024);
          box(stock,amber,.002,.004,.022,s*.028,-.010,.097);
          for(let i=0;i<4;i++)box(nose,black,.002,.004,.008,s*.025,-.010,-.121-i*.014,.25);
          box(nose,enamel,.004,.030,.012,s*.017,.052,-.107);
        }
        open(nose,.012,.005,.025,0,.009,-.226,enamel,black);
        box(nose,enamel,.037,.004,.015,0,.068,-.107);
        box(nose,frame,.043,.007,.025,0,.034,-.107);
        box(nose,amber,.004,.004,.005,0,.052,-.177);
        return {root,stock,hand,nose};
      }
      const a = body(node(g,'nullspace-original')), b = body(node(g,'nullspace-twin'));
      g._parts={magazine:a.stock._parts.magazine}; g._parts.magazine.userData.topMagazine=true;
      g._anchorOverride={mag:{x:0,y:.037,z:.081},front:{x:0,y:-.032,z:-.146}};
      sight(g,-.107,-.177,.052);
      function pose(t,age,reload,inspect,aim){
        const split=tour(inspect), gap=(1-split)*smooth((age-.034)/.11), wave=Math.sin(t*4)*.005*gap*(aim?.25:1);
        for(const [i,p] of [a,b].entries()){
          const s=i?1:-1;
          p.root.position.set(s*.052*split,s*.065*split,s*.012*split);
          p.stock.position.set(0,.013*gap+wave,.036*gap);
          p.hand.position.set(-.006*gap,-.044*gap-wave,0);
          p.nose.position.set(0,0,-.039*gap);
          p.stock.rotation.x=.073*gap;
        }
        b.root.visible=split>.015;
        g._flash?.position.set(0,.009,-.239-.039*gap);
      }
      return lifecycle(g,[0,.009,-.239],pose,.017,()=>pose(0,0,-1,-1,ads()));
    }

    function leviathan() {
      const g = new T.Group(), bone = mat(0xdbcfb1,.06,.59), moss = mat(0x526864,.11,.51), deep = mat(0x17242a,.18,.55), fang = mat(0xf2e0ba,.12,.42), eye = basic(0x77e9cd);
      const links=Array.from({length:11},(_,i)=>{
        const v=node(g,'leviathan-vertebra-'+i), size=.53+.54*Math.sin((i+1)*Math.PI/13);
        mesh(v,'leviathan-joint',new T.IcosahedronGeometry(.024,0),moss).scale.set(size,.68*size,.78);
        plate(v,bone,[[-.026,.006],[-.010,.024],[.016,.030],[.025,.007],[.008,-.013],[-.019,-.010]],.038*size);
        plate(v,fang,[[-.014,.018],[.008,.023],[.030,.054*size],[.008,.045*size]],.007);
        for(const s of [-1,1])if(i>1){
          const rib=node(v,'leviathan-rib',s*.024*size,0,0); rib.rotation.z=s*.53;
          plate(rib,bone,[[-.022,.007],[.007,.014],[.022,-.018*size],[.005,-.037*size],[-.020,-.031*size],[-.003,-.021*size]],.008);
          box(v,eye,.002,.003,.009,s*.020*size,.008,-.005);
        }
        return v;
      });
      const skull=node(g,'leviathan-skull'), jaw=node(skull,'leviathan-jaw');
      plate(skull,bone,[[-.067,.012],[-.051,.047],[-.022,.063],[.025,.051],[.052,.029],[.038,.006],[-.028,.009]],.048);
      plate(jaw,moss,[[-.065,-.025],[-.032,-.021],[.020,-.008],[.039,.005],[.046,-.004],[.018,-.030],[-.028,-.036]],.039);
      for(const s of [-1,1]){
        plate(skull,deep,[[-.041,.025],[-.019,.049],[.012,.041],[-.009,.019]],.003,s*.025);
        plate(skull,eye,[[-.035,.029],[-.017,.041],[-.002,.039],[-.014,.027]],.001,s*.027);
        plate(skull,bone,[[.010,.044],[.039,.053],[.071,.062],[.043,.028]],.008,s*.024);
        for(let i=0;i<4;i++){
          const z=-.053+i*.015;
          plate(skull,fang,[[z-.004,.016],[z+.008,.016],[z+.004,-.008]],.006,s*.018);
          plate(jaw,fang,[[z-.004,-.022],[z+.004,-.006],[z+.009,-.023]],.005,s*.019);
        }
      }
      open(skull,.018,.011,.026,0,.002,-.053,moss,deep);
      grip(g,deep,.034,.043);
      plate(g,moss,[[.010,-.020],[.074,-.023],[.086,-.043],[.029,-.047]],.031);
      g._anchorOverride={front:{x:0,y:-.013,z:-.116}};
      sight(g,.028,-.261,.070);
      const spine=[...links,skull];
      function pose(t,age,reload,inspect,aim){
        const swim=tour(inspect), a=inspect*tau*1.4;
        spine.forEach((v,i)=>{
          const u=i/11, phase=a+u*5.2, h=(age-i*.025)/.049, pulse=Math.exp(-h*h);
          v.position.set(Math.sin(phase)*(.045+u*.081)*swim,.014+Math.sin(t*2.6+i*.51)*.004*(aim?.1:1)+Math.cos(phase)*.072*swim,
            (i===11?-.321:.232-i*.049)+Math.sin(u*tau)*.024*pulse+.049*swim);
          v.rotation.set(.73*Math.sin(phase)*swim+.29*pulse,.88*Math.cos(phase)*swim,.25*Math.sin(phase)*swim);
        });
        jaw.rotation.x=-.43*(1-smooth(age/.25))-.36*swim;
      }
      return lifecycle(g,[0,.016,-.389],pose,.04,()=>pose(0,0,-1,-1,ads()));
    }

    function crownOfThorns() {
      const g = new T.Group(), frame = mat(0x211c28,.36,.37), gold = mat(0xca9844,.54,.27), bright = mat(0xf4cd7c,.41,.28), leather = mat(0x422538,.1,.59);
      const red=new T.MeshStandardMaterial({color:0xff2c4b,emissive:0xb71030,emissiveIntensity:.64,metalness:.34,roughness:.29});
      plate(g,frame,[[.033,.035],[.081,.033],[.087,.010],[.075,-.023],[.029,-.021],[.018,-.005],[.024,.018]],.036);
      plate(g,frame,[[-.068,.051],[.026,.055],[.044,.040],[.030,.031],[-.069,.034]],.019);
      plate(g,frame,[[-.074,-.022],[.024,-.026],[.034,-.041],[-.075,-.038]],.016);
      grip(g,leather,.031,.059);
      for(const s of [-1,1])plate(g,gold,[[.043,-.032],[.073,-.045],[.103,-.093],[.083,-.103],[.066,-.059]],.002,s*.017);
      cyl(g,frame,.011,.013,.102,8,0,.016,-.107);open(g,.014,.006,.018,0,.016,-.163,gold,frame);
      for(const z of [-.151,-.098,.065])box(g,bright,.020,.006,.009,0,.035,z);
      box(g,gold,.006,.012,.009,0,.041,-.152);
      const root=node(g,'thorns-empty-chamber',0,.009,-.013);
      const thorns=Array.from({length:6},(_,i)=>{
        const thorn=node(root,'thorn-'+i);
        plate(thorn,gold,[[.032,-.009],[.035,.004],[.017,.019],[-.013,.018],[-.043,.008],[-.067,-.010],[-.028,-.001],[-.003,-.009]],.010);
        plate(thorn,bright,[[.032,.005],[.014,.016],[-.019,.015],[-.057,-.006],[-.013,.004]],.011);
        return {thorn,facets:thorn.children.map(m=>[m,m.material])};
      });
      let index=-1;
      sight(g,.065,-.152,.043);
      function pose(t,age,reload,inspect,aim){
        const bloom=tour(reload), display=tour(inspect), hit=1-smooth((age-.070)/.13), phase=(Math.PI/2-index*tau/6)*hit+t*.28*(1-hit);
        thorns.forEach(({thorn,facets},i)=>{
          const a=phase+i*tau/6, draw=i===index?hit:0, r=(.032+.038*bloom+.023*display)*(1-.82*draw);
          thorn.position.set(Math.cos(a)*r,Math.sin(a)*r,-.029*draw+.018*bloom);
          thorn.rotation.set(.73*bloom+.29*display,0,a-Math.PI/2);
          for(const [m,rest] of facets)m.material=draw>.18?red:rest;
        });
      }
      return lifecycle(g,[0,.016,-.174],pose,.029,()=>{index=(index+1)%6;pose(0,0,-1,-1,ads());});
    }

    function afterimage() {
      const g=new T.Group(), steel=mat(0x354353,.48,.33), nickel=mat(0xc4d7dc,.39,.31), walnut=mat(0x6c4539,.15,.53), black=mat(0x141b23,.20,.56);
      const ghost=color=>new T.MeshStandardMaterial({color,transparent:true,opacity:.65,depthWrite:false,roughness:.40,metalness:.13});
      function action(parent, metal, wood, isGhost){
        box(parent,metal,.034,.052,.145,0,.010,.045);
        plate(parent,wood,[[.107,-.021],[.148,.016],[.257,.018],[.288,-.003],[.280,-.065],[.173,-.068],[.132,-.049]],.038);
        plate(parent,wood,[[-.158,-.022],[-.143,.025],[-.036,.021],[-.033,-.015],[-.050,-.025]],.038);
        const lever=node(parent,'afterimage-lever',0,-.017,.066), profile=[[-.040,.004],[.052,.006],[.083,-.021],[.057,-.051],[-.020,-.046],[-.044,-.021]];
        for(let i=0;i<profile.length;i++){
          const [z,y]=profile[i],[zz,yy]=profile[(i+1)%profile.length];
          box(lever,metal,.008,.005,Math.hypot(zz-z,yy-y)+.003,0,(y+yy)/2,(z+zz)/2,-Math.atan2(yy-y,zz-z));
        }
        const bolt=box(parent,isGhost?metal:nickel,.037,.012,.052,0,.028,.027); bolt.name='afterimage-bolt';
        if(!isGhost){
          box(parent,black,.041,.054,.011,0,-.026,.286);
          for(const s of [-1,1])box(parent,nickel,.002,.007,.105,s*.018,.020,.047);
          box(parent,nickel,.020,.008,.017,0,.041,.083);
          cyl(parent,black,.007,.007,.234,12,0,-.005,-.168);
        }
        return {lever,bolt};
      }
      function barrel(parent,name,m){
        const b=node(parent,name);cyl(b,m,.009,.010,.284,8,0,.018,-.202);open(b,.011,.004,.025,0,.018,-.352,m,m);
        box(b,m,.007,.009,.010,0,.033,-.331);return b;
      }
      const main=action(g,steel,walnut,false);barrel(g,'afterimage-centre-barrel',nickel);
      const echoes=[0x64e5db,0xe5a8f5].map((color,i)=>{
        const p=node(g,'afterimage-phase-'+i), group=node(p,'afterimage-action-'+i), material=ghost(color);
        barrel(p,'afterimage-echo-barrel-'+i,material);
        return {p,group,material,...action(group,material,material,true)};
      });
      sight(g,.083,-.331,.038);
      function pose(t,age,reload,inspect,aim){
        const show=tour(inspect), merge=smooth((age-.074)/.18), cycle=Math.sin(Math.PI*clamp((age-.12)/.36));
        main.lever.rotation.x=-.63*cycle-.58*show;main.bolt.position.z=.027+.027*cycle+.021*show;
        echoes.forEach(({p,group,material,lever,bolt},i)=>{
          const side=i?1:-1, spacing=merge*(aim?.26:1);
          p.visible=merge>.06||show>.02;group.visible=show>.06;
          p.position.set(side*(.027*spacing+.042*show),side*(.016*spacing+.094*show),side*(.013*merge+.020*show));
          material.opacity=(i?.59:.67)*Math.max(merge,show);
          lever.rotation.x=i?-1.21:0;bolt.position.z=i?.079:.027;
        });
      }
      return lifecycle(g,[0,.018,-.365],pose,.031,()=>pose(0,0,-1,-1,ads()));
    }

    function hollowKing() {
      const g=new T.Group(), black=mat(0x252430,.34,.43), gold=mat(0xc9a35b,.49,.29), edge=mat(0xf4d797,.36,.31), violet=mat(0x73517f,.31,.39);
      cyl(g,black,.008,.009,.494,8,0,0,.065);
      for(const z of [-.151,-.108,-.053,-.004,.056,.108,.276])cyl(g,gold,.010,.010,.010,6,0,0,z);
      cyl(g,gold,.005,.011,.032,6,0,0,.312);
      const crown=node(g,'hollow-king-crown',0,0,-.217);
      const points=Array.from({length:6},(_,i)=>{
        const p=node(crown,'hollow-king-point-'+i), len=i===1?.114:(i===0||i===2?.087:.065);
        plate(p,gold,[[.021,-.012],[.021,.009],[.003,.021],[-len*.51,.017],[-len,.001],[-len*.56,-.006],[-.003,-.017]],.009);
        plate(p,edge,[[.019,.008],[-len*.48,.018],[-len,.001],[-len*.39,.003]],.010);
        plate(p,violet,[[.010,.006],[-.004,.014],[-.016,.005],[-.004,0]],.011);
        return p;
      });
      let raised=0,swing=-Infinity;
      function pose(fold){
        crown.position.set(.034*raised,.168*raised,-.217+.110*raised+.009*fold);
        crown.rotation.set(-.47*raised,.32*raised,.55*raised);
        points.forEach((p,i)=>{
          const a=i*tau/6,r=.038*(1-.94*fold);
          p.position.set(Math.cos(a)*r,Math.sin(a)*r,0);p.rotation.set(.19*(1-fold),0,a-Math.PI/2);
        });
      }
      g._onSwing=()=>{swing=performance.now()/1000;raised=0;pose(1);};
      g._tick=(dt,now,inEquip)=>{if(!inEquip)pose(1-smooth((now-swing-.11)/.14));};
      g._calm=g._itemInspectEnd=()=>{raised=0;swing=-Infinity;pose(0);};
      g._itemInspectFrame=t=>{raised=arc(t);pose(0);};
      g._itemInspectKind='hollowKing';g.position.set(.10,-.12,-.20);g._calm();return g;
    }

    function glassCathedral() {
      const g=new T.Group(), lead=mat(0x25313e,.43,.35), stone=mat(0xa5a1a5,.23,.45), gold=mat(0xf0c98b,.43,.32), dark=mat(0x342444,.21,.45);
      const glass=[0x60d0d8,0x3568a3,0xa071c2,0xf2ba69,0xad536b,0x48b08d,0x352141].map(color=>new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.20,roughness:.24,side:T.DoubleSide}));
      plate(g,lead,[[.072,-.016],[.139,.034],[.277,.038],[.321,.020],[.312,-.052],[.189,-.061],[.120,-.032]],.037);
      for(const s of [-1,1])plate(g,stone,[[.125,-.020],[.172,.019],[.276,.024],[.298,.008],[.275,-.018],[.160,-.033]],.002,s*.020);
      grip(g,dark,.031,.061);
      plate(g,lead,[[-.390,.002],[-.351,.026],[-.042,.028],[.075,.016],[.068,-.030],[-.103,-.038],[-.266,-.024],[-.369,-.014]],.032);
      cyl(g,lead,.009,.009,.161,12,0,.012,-.411);open(g,.014,.006,.027,0,.012,-.490,stone,lead);
      part(g,'magazine',()=>{box(g,dark,.028,.063,.052,0,-.053,-.022);box(g,gold,.030,.004,.054,0,-.083,-.022);},{x:0,y:-.026,z:-.022});
      for(const z of [-.114,.054])box(g,stone,.027,.031,.016,0,.044,z);
      cyl(g,dark,.017,.017,.182,12,0,.067,-.032);
      open(g,.023,.013,.019,0,.067,-.132,stone,lead);open(g,.021,.013,.018,0,.067,.061,stone,lead);
      cyl(g,gold,.008,.008,.017,8,0,.091,-.024,0);
      const win=node(g,'cathedral-window',.020,.112,-.130), panels=[];
      win.rotation.y=Math.PI/2;
      function geometry(points,scale=1){
        const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x*scale,y*scale):s.moveTo(x*scale,y*scale));s.closePath();return new T.ShapeGeometry(s);
      }
      function tile(points,color){
        const i=panels.length, cx=points.reduce((s,p)=>s+p[0],0)/points.length, cy=points.reduce((s,p)=>s+p[1],0)/points.length;
        const p=node(win,'cathedral-pane-'+i), edges=points.map(([x,y])=>[x-cx,y-cy]);
        mesh(p,'cathedral-glass',geometry(edges,.97),glass[color]);
        edges.forEach(([x,y],j)=>{
          const [xx,yy]=edges[(j+1)%edges.length];box(p,lead,Math.hypot(xx-x,yy-y),.0021,.0025,(x+xx)/2,(y+yy)/2,0,0,0,Math.atan2(yy-y,xx-x));
        });
        panels.push({p,cx,cy});
      }
      const xs=[-.085,-.054,-.031,.031,.054,.085], ys=[-.09,-.059,-.025,.008,.042,.071];
      for(let r=0;r<ys.length-1;r++)for(let c=0;c<xs.length-1;c++){
        const a=[xs[c],ys[r]],b=[xs[c+1],ys[r]],d=[xs[c],ys[r+1]],e=[xs[c+1],ys[r+1]];
        if(c===2 && r<4)tile([a,b,e,d],r===3?3:6);
        else {tile([a,b,e],(r+c*2+1)%6);tile([a,e,d],(r*2+c*3+2)%6);}
      }
      for(let i=0;i<5;i++)tile([[xs[i],.071],[xs[i+1],.071],[0,.150]],[1,2,3,4,5][i]);
      const figure=node(win,'cathedral-figure',0,0,.003);
      mesh(figure,'cathedral-hooded-figure',geometry([[-.029,-.085],[.029,-.085],[.017,-.034],[.012,-.011],[.018,.006],[.011,.027],[0,.037],[-.011,.027],[-.018,.006],[-.012,-.011],[-.017,-.034]]),glass[6]);
      box(figure,gold,.017,.003,.003,0,.006,.002);box(figure,gold,.002,.060,.003,0,-.049,.002);
      sight(g,.061,-.132,.067);
      function pose(t,age,reload,inspect,aim){
        const show=tour(inspect), scatter=Math.sin(Math.PI*clamp((age+.035)/.27))*(aim?.58:1);
        figure.visible=show>.82;figure.scale.setScalar(Math.max(.001,smooth((show-.82)/.18)));
        panels.forEach(({p,cx,cy},i)=>{
          const side=i%2?-1:1, row=Math.floor(i/2), z=.247-row*.022, y=-.110+(row%3-1)*.011;
          p.position.set(mix(z,cx,show)+Math.sin(i*2.45)*.066*scatter,mix(y,cy,show)+Math.cos(i*2.1)*.083*scatter,
            mix(side*.023-.020,0,show)+side*.066*scatter);
          p.rotation.set(Math.sin(i)*.8*scatter,(1-show)*side*.05+Math.cos(i)*1.8*scatter,(1-show)*(i%3-1)*.48+Math.sin(i*2)*1.5*scatter);
          p.scale.setScalar(mix(.70,1,show));
        });
      }
      return lifecycle(g,[0,.012,-.504],pose,.036,()=>pose(0,0,-1,-1,ads()));
    }

    return { nullspace, leviathan, crownOfThorns, afterimage, hollowKing, glassCathedral };
  };
})();
