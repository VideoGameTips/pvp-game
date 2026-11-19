(() => {
  'use strict';
  const tau = Math.PI * 2;
  const limit = (x, lo=0, hi=1) => Math.max(lo, Math.min(hi, x));
  const ease = x => { x=limit(x); return x*x*(3-2*x); };

  function tendril(T, points, radius, segments=24) {
    return new T.TubeGeometry(new T.CatmullRomCurve3(points),segments,radius,6,false);
  }

  // A ridged, tapered petal with a sculpted cross-section instead of a flat billboard.
  function petal(T, length, width, arch) {
    const vertices=[], indices=[];
    for(let i=0;i<=12;i++){
      const u=i/12, w=width*(.05+.95*Math.pow(Math.sin(Math.PI*u),.74));
      for(const x of [-1,-.65,0,.65,1])vertices.push(x*w,Math.sin(Math.PI*u)*(arch+(1-Math.abs(x))*.008),-u*length);
    }
    for(let i=0;i<12;i++)for(let j=0;j<4;j++){
      const a=i*5+j;indices.push(a,a+5,a+1,a+1,a+5,a+6);
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
  }

  window.PVP_HUNGRY_GARDEN = function (T,k) {
    const { box, mesh, node, mat, grip, lifecycle }=k;
    const g=new T.Group();
    const bark=mat(0x282719,.05,.86), moss=mat(0x546b2d,.05,.72), green=mat(0x81943d,.09,.56);
    const skin=new T.MeshStandardMaterial({color:0x981e4a,roughness:.48,side:T.DoubleSide});
    const pink=skin.clone();pink.color.setHex(0xc44c6b);
    const lime=skin.clone();lime.color.setHex(0xa5ac64);
    const gold=mat(0xffce71,.15,.47), tooth=mat(0xe4c78c,.02,.62), throat=mat(0x290e24,.13,.48);
    const vector=(x,y,z)=>new T.Vector3(x,y,z);
    box(g,bark,.082,.063,.235,0,-.028,.044);
    grip(g,bark,.047,.103);grip(g,moss,.036,-.120);
    const bud=node(g,'garden-bud',0,.012,.114);
    mesh(bud,'garden-nectar-heart',new T.IcosahedronGeometry(.049,2),gold,0,0,-.079).scale.set(1,.91,1.6);
    const budGeo=petal(T,.192,.057,.023);
    const petals=Array.from({length:7},(_,i)=>{
      const a=tau*i/7, base=node(bud,'garden-petal-base',Math.sin(a)*.037,Math.cos(a)*.037,0);
      base.rotation.z=-a;
      const p=node(base,'garden-petal-'+i);
      mesh(p,'garden-petal-blade',budGeo,i%2?skin:pink);
      const vein=tendril(T,[vector(0,.001,0),vector(0,.020,-.045),vector(0,.032,-.101),vector(0,.003,-.177)],.0015,12);
      mesh(p,'garden-petal-vein',vein,lime);
      return p;
    });
    const stamen=node(g,'garden-stamen',0,.011,-.108);
    mesh(stamen,'garden-calyx',new T.SphereGeometry(.062,12,10),moss).scale.set(1,1,.7);
    const jawGeo=petal(T,.054,.026,.012), thornGeo=new T.ConeGeometry(.0048,.021,6), fangGeo=new T.ConeGeometry(.0023,.010,5);
    const stems=Array.from({length:6},(_,i)=>{
      const stalk=node(stamen,'garden-stalk-'+i);
      const coords=[vector(0,0,0),vector(.012,.006,-.058),vector(.015,.016,-.120),vector(.006,.008,-.187),vector(0,0,-.228)];
      mesh(stalk,'garden-stem',tendril(T,coords,.012,19),i%2?green:moss);
      for(let j=0;j<7;j++){
        const a=i*1.7+j*2.4, z=-.026-j*.027;
        const thorn=mesh(stalk,'garden-thorn',thornGeo,j%3?gold:throat,.012*Math.cos(a)+.009,.015*Math.sin(a)+.008,z);
        thorn.quaternion.setFromUnitVectors(vector(0,1,0),vector(Math.cos(a),Math.sin(a),.46).normalize());
      }
      const mouth=node(stalk,'garden-mouth-'+i,0,0,-.225);
      mesh(mouth,'garden-throat',new T.SphereGeometry(.021,10,8),throat,0,0,-.016).scale.set(1,.64,1.15);
      const jaws=[-1,1].map(s=>{
        const j=node(mouth,'garden-jaw',0,s*.004,0);
        const leaf=mesh(j,'garden-lip',jawGeo,i%2?skin:pink);leaf.scale.y=s;
        for(const x of [-.015,.015])for(let n=0;n<2;n++){
          const f=mesh(j,'garden-fang',fangGeo,tooth,x*(1-n*.33),-s*.001,-.022-n*.010);f.rotation.z=s>0?Math.PI:0;
        }
        return j;
      });
      return {stalk,jaws};
    });
    const podGeo=new T.IcosahedronGeometry(.0134,1), burstGeo=new T.TetrahedronGeometry(.0045,0);
    const belt=node(g,'garden-seed-belt',.057,-.039,.117), podCount=15;
    const pods=Array.from({length:podCount},(_,i)=>{
      const s=i/(podCount-1), x=.022+.049*Math.sin(s*Math.PI),y=-.041*Math.sin(s*Math.PI),z=-s*.218;
      const p=node(belt,'garden-seed-pod-'+i,x,y,z);
      const hull=mesh(p,'garden-seed-shell',podGeo,i%3?gold:green);hull.scale.set(.68,.82,1.26);
      const pieces=Array.from({length:4},()=>mesh(p,'garden-seed-shard',burstGeo,gold));
      if(i<14)box(belt,moss,.007,.007,.020,x,y,z-.007);
      return {p,hull,pieces,burst:-Infinity};
    });
    const roots=Array.from({length:4},(_,i)=>{
      const a=i*tau/4, pts=Array.from({length:13},(_,j)=>{
        const u=j/12, angle=a+u*5.7;
        return vector(Math.cos(angle)*(.037+.029*Math.sin(u*Math.PI)),Math.sin(angle)*.041,-u*.29);
      });
      return mesh(g,'garden-reload-root',tendril(T,pts,.0065,24),i%2?green:moss,0,-.025,.132);
    });
    let count=0, spin=0, warm=0, previous=0, lastAmmo=null, nextFocus=0;
    const lean=vector(0,0,0), desired=vector(0,0,0);
    g._mech=null;g._ownsReloadProps=true;
    return lifecycle(g,[0,.012,-.387],(t,age,reload,inspect,aim)=>{
      if(t===0){count=spin=warm=previous=nextFocus=0;lastAmmo=null;lean.set(0,0,0);desired.set(0,0,0);pods.forEach(p=>{p.burst=-Infinity;});}
      const dt=Math.min(.1,Math.max(0,t-previous));previous=t;
      const live=age>=0&&age<.15, look=inspect<0?0:k.arc(inspect), service=reload<0?0:k.arc(reload);
      warm+=(Number(live)-warm)*(1-Math.exp(-dt*(live?12:4)));
      spin=(spin+dt*(warm*20+look*2))%tau;
      if(t>=nextFocus){nextFocus=t+.15;desired.set(0,0,0);if(!live&&!aim&&reload<0&&inspect<0)k.gardenFocus(g,desired);}
      lean.lerp(desired,1-Math.exp(-dt*3));
      const opening=Math.max(warm,.63*look,.48*service);
      petals.forEach((p,i)=>{p.rotation.x=-.24+opening*1.38+.025*Math.sin(t*4+i);});
      stems.forEach(({stalk,jaws},i)=>{
        const a=tau*i/6+spin, r=.040+warm*.004+look*.026;
        stalk.position.set(Math.sin(a)*r,Math.cos(a)*r,0);
        const idle=(1-warm)*(1-(aim?1:0));
        stalk.rotation.set(lean.y*.37*idle+.062*Math.cos(a+t*4)*idle,-lean.x*.43*idle+.10*Math.sin(a)*look,-a);
        const active=(count+5)%6===i&&live?(1-ease(age/.087)):0;
        const chatter=warm*.30*Math.pow(.5+.5*Math.sin(t*47-i*2),3);
        const bite=.10+active*.69+chatter+.25*look;
        jaws[0].rotation.x=-bite;jaws[1].rotation.x=bite;
      });
      const magazine=k.gardenAmmo(g), ammo=magazine?.rounds??180, max=magazine?.capacity??180;
      const full=Math.ceil(limit(ammo/max)*podCount);
      if(lastAmmo!==null && full<lastAmmo && reload<0)for(let i=full;i<lastAmmo;i++)pods[i].burst=t;
      lastAmmo=full;
      const growing=reload<0?full:Math.max(full,Math.ceil((magazine?.incoming??max)/max*podCount*ease((reload-.25)/.61)));
      pods.forEach(({p,hull,pieces,burst},i)=>{
        const u=(t-burst)/.26;p.visible=i<growing||u<1;
        hull.visible=i<growing;
        const swell=reload>=0&&i>=full?.15+.85*limit((reload-.25)*23-i*.67):1;
        hull.scale.set(.68*swell,.82*swell,1.26*swell);
        pieces.forEach((m,j)=>{
          m.visible=u<1&&u>=0;
          if(m.visible){const a=tau*j/4; m.position.set(Math.cos(a)*u*.037,Math.sin(a)*u*.031,-u*.020);m.rotation.set(u*4+j,u*7,0);m.scale.setScalar(1-u*.90);}
        });
      });
      roots.forEach((m,i)=>{
        const growth=reload<0?0:ease((reload-i*.03)/.48)*(1-ease((reload-.73)/.26));
        m.visible=growth>.02;m.geometry.setDrawRange(0,Math.floor(growth*24)*36);
      });
    },.019,()=>{count=(count+1)%6;});
  };

  window.PVP_GARDEN_VINES = function (T,origin) {
    const g=new T.Group();g.name='garden-elimination-vines';g.position.copy(origin);
    const stem=new T.MeshStandardMaterial({color:0x57702e,roughness:.77,transparent:true,depthWrite:false});
    const edge=new T.MeshStandardMaterial({color:0xb98d4a,roughness:.66,transparent:true,depthWrite:false});
    const cone=new T.ConeGeometry(.053,.22,5);
    const vines=Array.from({length:6},(_,i)=>{
      const points=Array.from({length:20},(_,j)=>{
        const u=j/19, a=i*tau/6+2.2*u, r=.77-.48*u+.15*Math.sin(u*7+i);
        return new T.Vector3(Math.cos(a)*r,2.04*u+Math.sin(u*Math.PI)*.1,Math.sin(a)*r);
      });
      const vine=new T.Mesh(tendril(T,points,.054,24),stem);g.add(vine);
      const spines=points.filter((p,j)=>j%3===1).map((p,j)=>{
        const s=new T.Mesh(cone,edge);s.position.copy(p);s.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(p.x,.28,p.z).normalize());g.add(s);
        return {s,at:(j*3+1)/19};
      });
      return {vine,spines};
    });
    function pose(age){
      const wilt=ease((age-.42)/.63);stem.opacity=1-wilt;edge.opacity=1-wilt;
      g.scale.y=1-.58*wilt;
      vines.forEach(({vine,spines},i)=>{
        const grow=ease((age-i*.012)/.31);
        vine.geometry.setDrawRange(0,Math.floor(grow*24)*36);
        spines.forEach(({s,at})=>{s.visible=grow>at; if(s.visible)s.scale.setScalar(ease((grow-at)/.17)*(1-wilt*.65));});
      });
    }
    function dispose(){vines.forEach(({vine})=>vine.geometry.dispose());cone.dispose();stem.dispose();edge.dispose();}
    pose(0);return {g,pose,dispose};
  };
})();
