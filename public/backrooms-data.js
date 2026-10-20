/* Level concepts adapted from the Backrooms Wiki, CC BY-SA 3.0.
 * Per-level attribution and game adaptation notes: docs/BACKROOMS.md. */
(function (root) {
  'use strict';
  const levels = [
    { name:'Threshold', author:'DivineAtlas, DrAkimoto, RobertGoerman', theme:'yellow', wall:0xc9bc78, floor:0x827956, light:0xffefbd, fog:0x79704d, height:3.2, ambient:.85, count:0, tasks:[], exit:'Flickering wall', note:'The carpet is damp. The lights never stop. Somewhere, the wallpaper is flickering.' },
    { name:'Habitable Zone', author:'Praetor3005, DivineAtlas', theme:'warehouse', wall:0x7f8582, floor:0x555e5c, light:0xddeee5, fog:0x333d3b, height:5.4, ambient:.5, count:2, tasks:['Supply crate','Supply crate'], exit:'Maintenance door', note:'Search the supply crates. When the lights fail, keep your distance from the dark figures.' },
    { name:'Abandoned Utility Halls', author:'Greggita Mahayfaio', theme:'pipes', wall:0x817366, floor:0x4f4b42, light:0xffb675, fog:0x392a20, height:3.1, ambient:.45, count:2, tasks:['Pressure valve','Pressure valve','Pressure valve'], exit:'Service hatch', note:'Release three pressure valves. Steam hisses before it burns; wait for the pipes to cool.' },
    { name:'Electrical Station', author:'Natedagreat563', theme:'electric', wall:0x896a57, floor:0x454d49, light:0xb7e1c9, fog:0x263330, height:3.8, ambient:.4, count:3, tasks:['Breaker A','Breaker B','Breaker C'], exit:'Service elevator', note:'Isolate three circuits. Red floor plates warn of a surge. Running attracts the patrols.' },
    { name:'Abandoned Office', author:'u/M654zy', theme:'office', wall:0xc4d0cb, floor:0x657b7b, light:0xe5f5ff, fog:0x8b9e9e, height:3.3, ambient:1.1, count:0, tasks:['Route document'], exit:'Hotel stairwell', note:'A quiet place to recover. Find the route document. Trust the blacked-out windows, not the bright ones.' },
    { name:'Terror Hotel', author:'Stretchsterz; original Discord13; contributions ratscrapz', theme:'hotel', wall:0x6b2536, floor:0x492735, light:0xffd08a, fog:0x21141c, height:4.4, ambient:.55, count:3, tasks:['Brass key','Boiler valve'], exit:'Boiler stairwell', note:'Find the brass key and release the boiler. The moths are attracted to your flashlight.' },
    { name:'Lights Out', author:'Bart0nius', theme:'dark', wall:0x202124, floor:0x17191b, light:0x222222, fog:0x000000, height:3, ambient:0, count:0, tasks:[], exit:'Descending stairs', note:'Your flashlight does not work here. Feel the walls and the floor. The hand symbol traces nearby surfaces without creating light.' },
    { name:'Thalassophobia', author:'Bart0nius', theme:'ocean', wall:0x263b41, floor:0x152e36, light:0x77b7c8, fog:0x06242e, height:15, ambient:.6, count:1, tasks:['Diving cylinder'], exit:'Submerged cave', note:'Take the cylinder from the entrance room. Dive beneath the ocean to find a cave. Surface to refill your air; something large moves below.' },
    { name:'Cave Systems', author:'C-Graph, kai4C', theme:'cave', wall:0x6e7171, floor:0x444d47, light:0xc5d7b5, fog:0x151d19, height:4.5, ambient:.18, count:4, tasks:['Trail tag','Trail tag','Trail tag'], exit:'Unstable floor', note:'Recover three trail tags. Avoid the dark pools and keep moving when you hear the spiders.' },
    { name:'The Suburbs', author:'Stretchsterz; original Bart0nius', theme:'suburbs', wall:0x657780, floor:0x273a36, light:0xb4c6ee, fog:0x101823, height:12, ambient:.4, count:3, tasks:['Street sign','Street sign','Street sign'], exit:'Field gate', note:'Read the street signs and reach the field gate. Fog hides the things patrolling these empty roads.' }
  ].map((l,id)=>({...l,id,source:'https://backrooms-wiki.wikidot.com/level-'+id}));
  function random(seed) { let s=seed>>>0; return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;}; }
  function distances(grid,start) {
    const d=new Int16Array(grid.size*grid.size).fill(-1),q=[start];d[start]=0;
    for(let i=0;i<q.length;i++)for(const n of neighbors(grid,q[i]))if(d[n]<0){d[n]=d[q[i]]+1;q.push(n);}
    return d;
  }
  function neighbors(g,k) {
    const x=k%g.size,z=Math.floor(k/g.size),out=[];
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=z+dz,n=b*g.size+a;if(a>=0&&b>=0&&a<g.size&&b<g.size&&g.cells[n])out.push(n);}
    return out;
  }
  function generate(id) {
    const size=19,cell=id===9?5:3.6,rng=random(71923+id*137),cells=new Uint8Array(size*size);
    const carve=(x,z)=>{if(x>0&&z>0&&x<size-1&&z<size-1)cells[z*size+x]=1;};
    const stack=[[1,1]];carve(1,1);
    while(stack.length){const [x,z]=stack[stack.length-1],dirs=[[2,0],[-2,0],[0,2],[0,-2]].filter(([dx,dz])=>x+dx>0&&z+dz>0&&x+dx<size-1&&z+dz<size-1&&!cells[(z+dz)*size+x+dx]);
      if(!dirs.length){stack.pop();continue;}const [dx,dz]=dirs[Math.floor(rng()*dirs.length)];carve(x+dx/2,z+dz/2);carve(x+dx,z+dz);stack.push([x+dx,z+dz]);}
    if([0,1,4,5,8].includes(id))for(let r=0;r<12;r++){const x=1+Math.floor(rng()*7)*2,z=1+Math.floor(rng()*7)*2;for(let dx=0;dx<3;dx++)for(let dz=0;dz<3;dz++)carve(x+dx,z+dz);}
    if(id===7)for(let z=1;z<size-1;z++)for(let x=1;x<size-1;x++)carve(x,z);
    if(id===9){cells.fill(0);for(let z=1;z<size-1;z++)for(let x=1;x<size-1;x++)if(x%4===1||z%4===1)carve(x,z);}
    const g={size,cell,cells,start:id===9?size*5+5:size+1};g.dist=distances(g,g.start);
    const reachable=Array.from(cells.keys()).filter(k=>g.dist[k]>=0).sort((a,b)=>g.dist[a]-g.dist[b]);
    g.exit=reachable[reachable.length-1];g.tasks=[];
    for(let i=0;i<levels[id].tasks.length;i++){
      const target=g.dist[g.exit]*(.22+i*.2),picks=reachable.filter(k=>k!==g.exit&&k!==g.start&&!g.tasks.includes(k));
      picks.sort((a,b)=>Math.abs(g.dist[a]-target)-Math.abs(g.dist[b]-target));g.tasks.push(picks[0]);
    }
    if(id===7)g.tasks=[g.start];
    g.spawnCells=reachable.filter(k=>g.dist[k]>10&&!g.tasks.includes(k)&&k!==g.exit);
    return g;
  }
  const data={levels,random,generate,distances,neighbors};root.BACKROOMS_DATA=data;
  if(typeof module!=='undefined')module.exports=data;
})(typeof window!=='undefined'?window:globalThis);
