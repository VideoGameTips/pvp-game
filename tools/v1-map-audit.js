(() => {
  const issues=[], results=[], pools=Object.fromEntries(['1v1','2v2','3v3','5v5','10v10','ffa5'].map(m=>[m,mapPoolForMode(m)]));
  const saved={map:activeMapName,cols:wallColliders.slice(),eye:window._crouchEye,pos:camera.position.clone(),gimmicks:activeMapGimmicks};
  const ids=V1_MAP_IDS.filter(id=>MAP_GROUPS[id]);
  if(ids.length!==3)issues.push('expected all three V1 maps');
  try {
    for(const id of ids) {
      const g=MAP_GROUPS[id], spec=g.userData.v1Concept, cols=MAP_COLLIDERS[id], sp=MAP_SPAWNS[id];
      const fail=message=>issues.push(id+': '+message);
      activeMapName=id;activeMapGimmicks=MAP_GIMMICKS[id];window._crouchEye=PLAYER_EYE_HEIGHT;
      wallColliders.splice(0,wallColliders.length,...cols);
      if(!g._gridConcept||!spec||!cols.length) {fail('missing graybox');continue;}
      if(Object.values(MAP_GIMMICKS[id]).some(v=>v.length))fail('unexpected gameplay gimmick');
      if(g.children.some(m=>m.visible&&(!m.isMesh||m.material!==CONCEPT_WHITE)))fail('non-white-grid geometry');
      if(g._spawnEntries.length)fail('automatic spawn wall was added');
      if(Object.entries(pools).some(([mode,pool])=>pool.includes(id)!==(mode==='5v5')))fail('incorrect mode eligibility');
      if(ARCHIVED_MAP_IDS.has(id)||effectivePickedMap('5v5',id)!==id||effectivePickedMap('1v1',id)!=='auto')fail('map selection rejects the pack');
      const clear=(x,z,y=0)=>floorExistsAt(x,z)&&!cols.some(c=>c.max.y>y+.65&&c.min.y<y+PLAYER_EYE_HEIGHT+.18&&
        x>c.min.x-.38&&x<c.max.x+.38&&z>c.min.z-.38&&z<c.max.z+.38);
      const stand=(x,z,y=0)=>camera.position.set(x,y+PLAYER_EYE_HEIGHT,z);
      const walk=(x,z,y=null)=>{
        const dir=new THREE.Vector3(x-camera.position.x,0,z-camera.position.z),len=dir.length(),n=Math.ceil(len/.1);
        dir.normalize();
        for(let i=0;i<n;i++) {
          moveWithWalls(dir,len/n);resolveWallCollisions();
          if(y!==null&&Math.abs(getGroundEyeY()-PLAYER_EYE_HEIGHT-y)>.55)return false;
        }
        return Math.hypot(camera.position.x-x,camera.position.z-z)<.22;
      };
      const nav=_botNavGrid(),at=(x,z)=>Math.floor((z-nav.z0)/nav.cell)*nav.W+Math.floor((x-nav.x0)/nav.cell);
      const a=at(0,(sp.ally.z0+sp.ally.z1)/2),b=at(0,(sp.enemy.z0+sp.enemy.z1)/2);
      if(nav.blocked[a]||nav.blocked[b])fail('blocked bot spawn');
      _botNavFill(nav,b);
      if(nav.dist[a]<0)fail('no bot route between spawns');
      for(const side of [-1,1]) {
        const blocked=nav.blocked.slice();
        for(let j=0;j<nav.H;j++)if(Math.abs(nav.z0+(j+.5)*nav.cell)<1.6)
          for(let i=0;i<nav.W;i++)if(side*(nav.x0+(i+.5)*nav.cell)<1.5)blocked[j*nav.W+i]=1;
        const test={...nav,blocked};_botNavFill(test,b);
        if(test.dist[a]<0)fail('missing independent '+(side<0?'west':'east')+' flank');
      }
      for(const [team,s] of Object.entries(sp)) {
        for(let ix=0;ix<=10;ix++)for(let iz=0;iz<=2;iz++)
          if(!clear(s.x0+(s.x1-s.x0)*ix/10,s.z0+(s.z1-s.z0)*iz/2))fail(team+' spawn obstructed');
        const z=(s.z0+s.z1)/2,side=Math.sign(z);
        for(const x of [-4,0,4]) {
          stand(x,z);
          if(!walk(x,z-side*8,0))fail('spawn approach has a wall or detour at '+x);
        }
      }
      const ray=new THREE.Ray(),hit=new THREE.Vector3();
      for(let i=0;i<=10;i++)for(let j=0;j<=10;j++) {
        const a=new THREE.Vector3(sp.ally.x0+i,PLAYER_EYE_HEIGHT,(sp.ally.z0+sp.ally.z1)/2);
        const b=new THREE.Vector3(sp.enemy.x0+j,PLAYER_EYE_HEIGHT,(sp.enemy.z0+sp.enemy.z1)/2);
        const len=ray.direction.subVectors(b,a).length();ray.origin.copy(a);ray.direction.normalize();
        if(!cols.some(c=>ray.intersectBox(c,hit)&&hit.distanceTo(a)<len))fail('unprotected spawn-to-spawn sightline');
      }
      for(const d of spec.doors) {
        const dx=d.axis==='z'?1:0,dz=d.axis==='x'?1:0;
        for(const side of [-1,1]) {
          stand(d.x-dx*side*1.6,d.z-dz*side*1.6);
          if(!walk(d.x+dx*side*1.6,d.z+dz*side*1.6,0))fail('blocked rectangular doorway '+d.x+','+d.z);
        }
      }
      const ramps=MAP_RAMPS[id]||[];
      _botNavFill(nav,b);
      for(const r of ramps) {
        const footX=r.x0-r.ux*.8,footZ=r.z0-r.uz*.8;
        if(!nav.dist.some((v,k)=>v>=0&&Math.hypot(nav.x0+(k%nav.W+.5)*nav.cell-footX,nav.z0+(Math.floor(k/nav.W)+.5)*nav.cell-footZ)<2.5))fail('isolated ramp foot');
        for(const offset of [0,-r.halfW*.6,r.halfW*.6]) {
          stand(footX-r.uz*offset,footZ+r.ux*offset);
          const x=r.x0+r.ux*(r.run+.6)-r.uz*offset,z=r.z0+r.uz*(r.run+.6)+r.ux*offset;
          if(!walk(x,z)||Math.abs(getGroundEyeY()-PLAYER_EYE_HEIGHT-r.rise)>.15)fail('cannot climb ramp '+r.x0+','+r.z0+' offset '+offset);
        }
      }
      for(const p of spec.routes)if(!clear(p.x,p.z,p.y))fail('obstructed route marker '+p.label);
      if(id==='zen_garden')for(const side of [-1,1]) {
        stand(side*19,-30,4.5);
        if(!walk(side*19,30,4.5))fail('balcony route disconnected');
      }
      if(id==='shipbreak') {
        for(const side of [-1,1]) {
          stand(side*15,-27,4.5);
          if(!walk(side*15,27,4.5))fail('cargo-platform route disconnected');
          stand(side*15,-4);
          if(!walk(side*15,4,0))fail('cargo-platform underpass obstructed');
        }
        stand(5.5,4.4,9);
        if(!walk(-5.5,-4.4,9))fail('upper bridge landings disconnected');
      }
      if(id==='reactor') {
        for(const [y,r] of [[4.5,12.5],[9,22]]) {
          const z=y===9?17:r;
          stand(r,z,y);
          for(const [x,d] of [[-r,z],[-r,-z],[r,-z],[r,z]])
            if(!walk(x,d,y))fail('catwalk loop disconnected at height '+y);
        }
        for(const side of [-1,1]) {
          stand(side*12.5,-4);
          if(!walk(side*12.5,4,0))fail('lower ring underpass obstructed');
        }
      }
      results.push({id,dimensions:[spec.length,spec.width],levels:spec.levels,doors:spec.doors.length,ramps:ramps.length,colliders:cols.length});
    }
  } finally {
    activeMapName=saved.map;activeMapGimmicks=saved.gimmicks;window._crouchEye=saved.eye;
    wallColliders.splice(0,wallColliders.length,...saved.cols);camera.position.copy(saved.pos);
  }
  return {issues,results,pools,missing:V1_MAP_IDS.filter(id=>!MAP_GROUPS[id])};
})()
