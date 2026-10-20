/* Original game implementation. Adapted setting: see docs/BACKROOMS.md (CC BY-SA 3.0). */
(function () {
  'use strict';
  const D=window.BACKROOMS_DATA,T=THREE;
  let root,view,cam,world,menu,hud,readout,prompt,hurt,flash,fill,ambient,water,guide;
  let active=false,paused=false,state=null,save=null,saveKey='',yaw=0,pitch=0,frame=0,clock=0,hudClock=0;
  let materials=[],textures=[],geometries=[],items=[],hazards=[],entities=[],lamps=[],steps=0,keys={},drag=null,sound=null;
  const v=new T.Vector3();
  const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;};
  const button=(label,action,title)=>{const b=node('button',label);b.type='button';b.onclick=action;if(title){b.title=title;b.setAttribute('aria-label',title);}return b;};
  const mat=(color,basic=false,extra={})=>{const m=basic?new T.MeshBasicMaterial({color,...extra}):new T.MeshStandardMaterial({color,roughness:.85,...extra});materials.push(m);return m;};
  const geo=g=>{geometries.push(g);return g;};
  const boxGeo=()=>geo(new T.BoxGeometry(1,1,1));
  let unit;
  function box(x,y,z,w,h,d,m,parent=world){const o=new T.Mesh(unit,m);o.position.set(x,y,z);o.scale.set(w,h,d);parent.add(o);return o;}
  function point(k){const g=state.grid;return {x:(k%g.size+.5)*g.cell,z:(Math.floor(k/g.size)+.5)*g.cell};}
  function cellAt(x,z){const g=state.grid,a=Math.floor(x/g.cell),b=Math.floor(z/g.cell);return a>=0&&b>=0&&a<g.size&&b<g.size?b*g.size+a:-1;}
  function openAt(x,z,r=.3){for(const dx of [-r,r])for(const dz of [-r,r])if(!state.grid.cells[cellAt(x+dx,z+dz)])return false;return true;}
  function move(o,dx,dz){if(openAt(o.x+dx,o.z))o.x+=dx;if(openAt(o.x,o.z+dz))o.z+=dz;}
  function load(){saveKey='pvp_backrooms_v1:'+(currentUser?.username||'guest');try{const s=JSON.parse(localStorage.getItem(saveKey));save={unlocked:Math.max(0,Math.min(9,Number(s?.unlocked)||0)),complete:!!s?.complete};}catch(_){save={unlocked:0,complete:false};}}
  function persist(){try{localStorage.setItem(saveKey,JSON.stringify(save));return true;}catch(_){return false;}}
  function init(){
    if(root)return;
    root=node('section',null);root.id='backrooms';root.hidden=true;root.setAttribute('aria-label','Backrooms');
    menu=node('section',null,'br-menu');menu.hidden=true;menu.setAttribute('role','dialog');menu.setAttribute('aria-modal','true');menu.setAttribute('aria-label','Backrooms journal');root.append(menu);
    hud=node('header',null,'br-top');readout=node('footer',null,'br-bottom');prompt=node('div',null,'br-prompt');hurt=node('div',null,'br-hurt');
    root.append(hud,readout,prompt,node('div',null,'br-cross'),node('div',null,'br-shade'),hurt);document.body.append(root);
    const touch=node('div',null,'br-touch'),pad=node('div',null,'br-pad'),actions=node('div',null,'br-touch-actions');
    for(const [symbol,key,title] of [['\u2191','KeyW','Forward'],['\u2190','KeyA','Left'],['\u2193','KeyS','Back'],['\u2192','KeyD','Right']])pad.append(hold(symbol,key,title));
    actions.append(button('\u270b',interact,'Interact / feel surfaces (F)'),button('\u25c9',toggleFlash,'Flashlight (L)'),hold('\u21e7','Space','Ascend (Space)'),hold('\u21e9','ControlLeft','Crouch / descend (Ctrl)'));
    touch.append(pad,actions);root.append(touch);
    document.addEventListener('keydown',e=>{
      if(!active||e.metaKey||e.altKey)return;
      if(e.ctrlKey&&!['ControlLeft','ControlRight','KeyW','KeyA','KeyS','KeyD','Space','KeyC'].includes(e.code))return;
      if(e.code==='Tab'){
        if(menu.hidden){e.preventDefault();e.stopImmediatePropagation();journal();}
        else{const focusable=[...menu.querySelectorAll('button:not(:disabled),input,a,summary')].filter(n=>n.getClientRects().length),first=focusable[0],last=focusable.at(-1);
          if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
          else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
        return;
      }
      if(!menu.hidden){if(e.code==='Escape'&&state?.status==='active'){e.preventDefault();e.stopImmediatePropagation();resume();}return;}
      if(e.code==='Escape')return;
      e.stopImmediatePropagation();keys[e.code]=true;
      if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
      if(!e.repeat){if(e.code==='KeyF')interact();if(e.code==='KeyL')toggleFlash();}
    },true);
    document.addEventListener('keyup',e=>{if(active){keys[e.code]=false;if(e.code!=='Escape')e.stopImmediatePropagation();}},true);
    document.addEventListener('mousemove',e=>{if(active&&!paused&&view&&document.pointerLockElement===view.domElement)look(e.movementX,e.movementY);});
    window.addEventListener('blur',()=>{keys={};drag=null;});
    document.addEventListener('visibilitychange',()=>{if(active&&document.hidden&&state?.status==='active')journal();});
    window.addEventListener('resize',resize);
  }
  function hold(symbol,key,title){const b=button(symbol,()=>{},title);b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[key]=true;};for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>keys[key]=false);return b;}
  function look(dx,dy){yaw-=dx*.0024;pitch=Math.max(-1.4,Math.min(1.4,pitch-dy*.0024));}
  function capture(){if(!view||paused)return;try{const p=view.domElement.requestPointerLock?.();p?.catch?.(()=>{});}catch(_){}audio();}
  function audio(){
    if(sound){sound.ctx.resume().catch(()=>{});return;}
    try{const ctx=new (window.AudioContext||window.webkitAudioContext)(),gain=ctx.createGain(),filter=ctx.createBiquadFilter(),buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),a=buffer.getChannelData(0),rng=D.random(77);
      for(let i=0;i<a.length;i++)a[i]=(rng()-.5)*.5;
      const noise=ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;filter.type='lowpass';filter.frequency.value=180;gain.gain.value=0;noise.connect(filter);filter.connect(gain);gain.connect(ctx.destination);noise.start();sound={ctx,gain,filter};
    }catch(_){}
  }
  function tone(freq=180,duration=.12,volume=.035){if(!sound)return;const c=sound.ctx,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(freq,c.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(25,freq*.45),c.currentTime+duration);g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+duration);}
  function resize(){if(!view)return;view.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();}
  function open(){
    teardownMatchWorld();init();load();active=true;paused=true;root.hidden=false;
    try{view=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});view.setPixelRatio(Math.min(devicePixelRatio,1.25));view.outputColorSpace=T.SRGBColorSpace;view.domElement.className='br-world';root.prepend(view.domElement);
      cam=new T.PerspectiveCamera(72,innerWidth/innerHeight,.07,230);resize();
      view.domElement.addEventListener('click',capture);
      view.domElement.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'){drag={id:e.pointerId,x:e.clientX,y:e.clientY};view.domElement.setPointerCapture(e.pointerId);audio();}});
      view.domElement.addEventListener('pointermove',e=>{if(drag?.id===e.pointerId&&!paused){look(e.clientX-drag.x,e.clientY-drag.y);drag.x=e.clientX;drag.y=e.clientY;}});
      for(const ev of ['pointerup','pointercancel'])view.domElement.addEventListener(ev,()=>drag=null);
      journal();startLoop();
    }catch(e){stop();throw e;}
  }
  function panel(title,text){paused=true;keys={};drag=null;if(document.pointerLockElement===view?.domElement)document.exitPointerLock();menu.hidden=false;menu.replaceChildren(node('small','EXPEDITION / DEVICE SAVE'),node('h1',title));if(text)menu.append(node('p',text));menu.scrollTop=0;if(sound)sound.gain.gain.value=0;}
  function journal(){
    panel('The Backrooms',state?.status==='active'?`Level ${state.level.id} / ${state.level.name}`:'Ten levels beneath reality.');
    const actions=node('div',null,'br-actions');if(state?.status==='active')actions.append(button('Resume',resume));
    actions.append(button('Continue expedition',()=>launch(save.unlocked)),button('Return to modes',()=>{stop();openModeMenu();}));menu.append(actions);
    const label=node('label'),check=node('input');check.type='checkbox';check.checked=!!state?.assistance;check.onchange=()=>{if(state)state.assistance=check.checked;root.dataset.assistance=check.checked?'yes':'no';};label.append(check,document.createTextNode(' Route assistance'));menu.append(label);
    const list=node('div',null,'br-floor-list');for(const l of D.levels){const b=button('',()=>launch(l.id));b.disabled=l.id>save.unlocked;b.append(node('b',String(l.id).padStart(2,'0')));const text=node('span',l.name);text.append(node('small',b.disabled?'Undiscovered':l.id<save.unlocked?'Traversed':'Checkpoint'));b.append(text);list.append(b);}menu.append(list);
    const credits=node('div',null,'br-credits');credits.append(node('p','Original playable adaptation of the Backrooms Wiki. Objectives, distances and the sequential route are game-specific.'));
    const details=node('details'),summary=node('summary','Setting credits / CC BY-SA 3.0');details.append(summary);
    for(const l of D.levels){const p=node('div'),a=node('a',`Level ${l.id}: ${l.name}`);a.href=l.source;a.target='_blank';a.rel='noopener';p.append(a,document.createTextNode(' - '+l.author));details.append(p);}
    const license=node('a','Creative Commons Attribution-ShareAlike 3.0');license.href='https://creativecommons.org/licenses/by-sa/3.0/';license.target='_blank';license.rel='noopener';details.append(license);credits.append(details);menu.append(credits);menu.querySelector('button')?.focus();
  }
  function resume(){if(state?.status!=='active')return;menu.hidden=true;paused=false;capture();}
  function clean(){
    const gs=new Set(geometries),ms=new Set(materials);if(world)world.traverse(o=>{if(o.geometry)gs.add(o.geometry);});for(const g of gs)g.dispose();for(const m of ms)m.dispose();for(const t of textures)t.dispose();
    geometries=[];materials=[];textures=[];items=[];hazards=[];entities=[];lamps=[];world=null;water=null;guide=null;
  }
  function stop(){
    active=false;paused=false;keys={};drag=null;state=null;
    if(document.pointerLockElement===view?.domElement)document.exitPointerLock();
    clean();if(view){view.dispose();view.forceContextLoss();view.domElement.remove();view=null;}
    if(sound){sound.ctx.close().catch(()=>{});sound=null;}if(root)root.hidden=true;
  }
  function texture(kind){
    const c=document.createElement('canvas');c.width=c.height=128;const a=c.getContext('2d'),rng=D.random(671+state.level.id*19+kind.length);
    const base=kind==='wall'?state.level.wall:kind==='ceiling'?0xa7aaa1:state.level.floor;a.fillStyle='#'+base.toString(16).padStart(6,'0');a.fillRect(0,0,128,128);
    for(let i=0;i<2400;i++){a.fillStyle=`rgba(${rng()>.5?'255,255,255':'0,0,0'},${.02+rng()*.09})`;a.fillRect(rng()*128,rng()*128,kind==='floor'?1:2,1);}
    const t=state.level.theme;
    if(kind==='wall'&&['yellow','hotel'].includes(t)){a.strokeStyle=t==='yellow'?'#8e875850':'#ba986570';a.lineWidth=1;for(let x=8;x<128;x+=16){a.beginPath();a.moveTo(x,0);for(let y=0;y<=128;y+=8)a.lineTo(x+Math.sin(y*.22)*3,y);a.stroke();}a.fillStyle='#4b482529';for(let i=0;i<8;i++){a.beginPath();a.ellipse(rng()*128,105+rng()*23,12,8,0,0,7);a.fill();}}
    else if(kind==='wall'&&['electric','pipes'].includes(t)){a.strokeStyle='#2b252285';a.lineWidth=2;for(let y=0;y<128;y+=16){a.beginPath();a.moveTo(0,y);a.lineTo(128,y);a.stroke();for(let x=(y%32?16:0);x<128;x+=32)a.strokeRect(x,y,32,16);}}
    else if(kind==='ceiling'){a.strokeStyle='#555c57';a.lineWidth=2;a.strokeRect(0,0,128,128);a.strokeRect(0,0,64,64);a.strokeRect(64,64,64,64);}
    else if(kind==='floor'&&['warehouse','office','electric'].includes(t)){a.strokeStyle='#18292740';a.strokeRect(0,0,128,128);}
    const tex=new T.CanvasTexture(c);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=Math.min(4,view.capabilities.getMaxAnisotropy());textures.push(tex);return tex;
  }
  function label(text,color='#c9d4c5',bg='#18211e'){
    const c=document.createElement('canvas');c.width=256;c.height=80;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,256,80);ctx.strokeStyle=color;ctx.strokeRect(4,4,248,72);ctx.fillStyle=color;ctx.font='bold 23px monospace';ctx.textAlign='center';ctx.fillText(text,128,49,238);
    const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;textures.push(t);const m=mat(0xffffff,true,{map:t,side:T.DoubleSide});return m;
  }
  function launch(id){
    if(!active||!view||!save||!Number.isInteger(id)||id<0||id>save.unlocked||id>9)return false;
    clean();const level=D.levels[id],grid=D.generate(id),assistance=root.dataset.assistance==='yes';
    state={level,grid,hp:100,stamina:100,air:100,battery:100,flash:true,done:0,status:'active',elapsed:0,assistance,tactile:0,warning:'',warningUntil:0,lastHurt:-10,visited:new Set(),yVel:0};
    world=new T.Scene();world.background=new T.Color(level.fog);world.fog=new T.FogExp2(level.fog,id===6?.32:id===7?.018:id===9?.035:.023);unit=boxGeo();
    const wallTex=texture('wall'),floorTex=texture('floor'),ceilingTex=texture('ceiling');floorTex.repeat.set(grid.size*1.8,grid.size*1.8);ceilingTex.repeat.set(grid.size,grid.size);
    const wm=mat(0xffffff,false,{map:wallTex}),fm=mat(0xffffff,false,{map:floorTex,roughness:[1,7,9].includes(id)?.3:.95}),cm=mat(id===7?0x32454b:0xffffff,false,{map:ceilingTex});
    const extent=grid.size*grid.cell;
    box(extent/2,id===7?-18.15:-.15,extent/2,extent,.3,extent,fm);
    if(id!==9)box(extent/2,level.height+.12,extent/2,extent,.24,extent,cm);
    const blocked=Array.from(grid.cells.keys()).filter(k=>!grid.cells[k]&&(id!==9||k%grid.size===0||k%grid.size===grid.size-1||k<grid.size||k>=grid.size*(grid.size-1)));
    const wallHeight=id===9?2.5:level.height;
    const walls=new T.InstancedMesh(unit,id===9?mat(0x243e31):wm,blocked.length),matrix=new T.Matrix4();
    blocked.forEach((k,i)=>{const p=point(k);matrix.compose(new T.Vector3(p.x,wallHeight/2,p.z),new T.Quaternion(),new T.Vector3(grid.cell,wallHeight,grid.cell));walls.setMatrixAt(i,matrix);});world.add(walls);
    if(id===8){
      const rocks=new T.InstancedMesh(geo(new T.DodecahedronGeometry(1,0)),wm,blocked.length),rng=D.random(833);
      blocked.forEach((k,i)=>{const p=point(k);matrix.compose(new T.Vector3(p.x,2.1,p.z),new T.Quaternion().setFromEuler(new T.Euler(rng(),rng(),rng())),new T.Vector3(2.2,2.7,2.2));rocks.setMatrixAt(i,matrix);});world.add(rocks);
    }
    ambient=new T.HemisphereLight(level.light,0x26312c,level.ambient);world.add(ambient);
    const sun=new T.DirectionalLight(level.light,id===6?0:.45);sun.position.set(18,40,8);world.add(sun);
    fill=new T.PointLight(level.light,id===6?0:.8,16,2);world.add(fill);
    flash=new T.SpotLight(0xe5eecc,3.5,24,.58,.65,1.5);flash.target=new T.Object3D();world.add(flash,flash.target);
    decorate();
    grid.tasks.forEach((k,i)=>addItem(k,level.tasks[i],'task',i));addItem(grid.exit,level.exit,'exit');
    const supplyCells=grid.spawnCells.filter((k,i)=>i%19===7).slice(0,8);if(id!==0&&id!==6)for(const k of supplyCells)if(!grid.tasks.includes(k))addItem(k,'Almond water','supply');
    addEntities();
    const p=point(grid.start);cam.position.set(p.x,id===7?3.85:1.65,p.z);yaw=0;pitch=0;clock=0;hudClock=0;steps=0;keys={};
    const next=point(D.neighbors(grid,grid.start)[0]);yaw=Math.atan2(-(next.x-p.x),-(next.z-p.z));cam.rotation.set(0,yaw,0,'YXZ');
    guide=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:0xaddbcc,transparent:true,opacity:.5}));materials.push(guide.material);world.add(guide);
    menu.hidden=true;paused=false;notice(level.note,14);drawHUD();capture();view.render(world,cam);return true;
  }
  function decorate(){
    const {grid:g,level:l}=state,rng=D.random(23+l.id),metal=mat(0x59615c,false,{metalness:.55,roughness:.4}),trim=mat(l.id===5?0xbd9a56:0x666754),lampMat=mat(l.light,true),dark=mat(0x16211c);
    let lit=0;
    for(let k=0;k<g.cells.length;k++)if(g.cells[k]){
      const p=point(k),x=k%g.size,z=Math.floor(k/g.size),n=D.neighbors(g,k),index=x*7+z*11;
      if(l.id===9){
        box(p.x,.012,p.z,g.cell,.025,g.cell,mat(index%2?0x283135:0x303739,false,{roughness:.35}));
        if(index%5===0){box(p.x+1.8,2.7,p.z+2.1,.12,5.4,.12,metal);box(p.x+1.5,5.3,p.z+2.1,.8,.15,.3,lampMat);}
      }else if(l.id!==6&&l.id!==7&&index%4===0){
        if(l.id===8){
          const stone=new T.Mesh(geo(new T.ConeGeometry(.6,1.7,7)),metal);stone.position.set(p.x+1.35,l.height-.5,p.z);stone.rotation.z=Math.PI;world.add(stone);
        }else{
          box(p.x,l.height-.07,p.z,1.4,.12,l.id===5?.6:.45,metal);box(p.x,l.height-.14,p.z,1.28,.025,l.id===5?.5:.32,lampMat);
          if(lit++<7){const light=new T.PointLight(l.light,1.4,13,2);light.position.set(p.x,l.height-.4,p.z);world.add(light);lamps.push(light);}
        }
      }
      if(([2,3].includes(l.id)||l.id===5&&g.dist[k]>g.dist[g.exit]*.65)&&index%3===0){
        for(const off of [-1.25,1.25]){const pipe=new T.Mesh(geo(new T.CylinderGeometry(.1,.1,g.cell,8)),metal);pipe.rotation.x=Math.PI/2;pipe.position.set(p.x+off,l.height-.45,p.z);world.add(pipe);}
      }
      if(k===g.start||k===g.exit||g.tasks.includes(k))continue;
      if(l.id===0&&index%9===0){box(p.x+1.25,l.height/2,p.z,.5,l.height,.5,wmForPillar());}
      if(l.id===1&&index%11===0){box(p.x+1.15,.4,p.z,.7,.8,.8,trim);box(p.x+1.15,.82,p.z,.6,.04,.7,metal);}
      if(l.id===3&&index%9===0){box(p.x+1.2,1.1,p.z,.6,2.2,1.1,metal);box(p.x+.88,1.5,p.z,.025,.5,.7,mat(0xb58b43,true));}
      if(l.id===4&&index%11===0){box(p.x+1.12,.8,p.z,.9,.08,1.4,trim);box(p.x+1.12,.4,p.z,.1,.8,.9,metal);}
      if(l.id===4&&index%13===0&&!g.cells[k+1]){box(p.x+1.62,1.8,p.z,.035,1.5,1.8,dark);box(p.x+1.59,1.8,p.z,.025,.045,1.9,trim);}
      if(l.id===5&&index%3===0&&!g.cells[k+1]){
        const door=box(p.x+1.65,1.25,p.z,.05,2.5,1.25,mat(0x442b26));box(p.x+1.6,2.13,p.z,.025,.25,.55,label(String(100+index)));door.userData.hotel=true;
        box(p.x+1.6,.36,p.z,.16,.15,1.4,trim);
      }
      if(l.id===8&&index%6===0){const rock=new T.Mesh(geo(new T.DodecahedronGeometry(.9,0)),metal);rock.position.set(p.x+1.4,.5,p.z);rock.scale.set(.8,1.5,1.1);world.add(rock);}
      if([2,3,8].includes(l.id)&&index%17===0&&g.dist[k]>5){
        const kind=l.id===2?'steam':l.id===3?'surge':'pool',hm=mat(kind==='pool'?0x24432b:0xcf5a26,true,{transparent:true,opacity:.25});
        const mesh=box(p.x,.025,p.z,kind==='pool'?1.6:g.cell-.6,.04,kind==='pool'?1.6:g.cell-.6,hm);hazards.push({k,kind,mesh,phase:rng()*7});
        if(kind==='steam')box(p.x+1.25,.2,p.z,.4,.4,.5,metal);
      }
      if(l.id===1&&index%15===0){const puddle=box(p.x,.019,p.z,2,.015,1.1,mat(0x68807b,false,{metalness:.55,roughness:.1,transparent:true,opacity:.45}));puddle.rotation.y=rng();}
    }
    if(l.id===7){
      const extent=g.size*g.cell;
      const ripple=document.createElement('canvas');ripple.width=ripple.height=128;const ctx=ripple.getContext('2d');ctx.fillStyle='#1a5863';ctx.fillRect(0,0,128,128);ctx.strokeStyle='#80bdc5';ctx.lineWidth=1;
      for(let y=0;y<128;y+=12){ctx.beginPath();for(let x=0;x<=128;x+=2)ctx.lineTo(x,y+Math.sin(x*.098+y)*3);ctx.stroke();}
      const ripples=new T.CanvasTexture(ripple);ripples.wrapS=ripples.wrapT=T.RepeatWrapping;ripples.repeat.set(20,20);ripples.colorSpace=T.SRGBColorSpace;textures.push(ripples);
      water=box(extent/2,1,extent/2,extent-.5,.025,extent-.5,mat(0x76b3ba,false,{map:ripples,transparent:true,opacity:.47,metalness:.4,roughness:.18,side:T.DoubleSide}));
      const p=point(g.start);box(p.x,1.1,p.z,3.3,2.2,3.3,mat(0x55574e));box(p.x,3,p.z-1.65,3.3,3.8,.18,metal);box(p.x-1.65,3,p.z,.18,3.8,3.3,metal);
      box(p.x,4.6,p.z,3.5,.2,3.5,metal);box(p.x,3,p.z-1.5,1.5,.5,.1,label('ENTRANCE'));
      const mound=new T.Mesh(geo(new T.ConeGeometry(6,4,9)),metal),at=point(g.exit);mound.position.set(at.x,-18,at.z);world.add(mound);
    }
    if(l.id===9){
      const houses=mat(0x72818b),roof=mat(0x252c36),glass=mat(0x060a10);
      for(let z=2;z<g.size-3;z+=4)for(let x=2;x<g.size-3;x+=4){const cx=(x+1.5)*g.cell,cz=(z+1.5)*g.cell;
        box(cx,2.9,cz,15,5.8,15,houses);const top=new T.Mesh(geo(new T.ConeGeometry(11,4,4)),roof);top.position.set(cx,7,cz);top.rotation.y=Math.PI/4;world.add(top);
        for(const off of [-3,3]){box(cx+off,3,cz+7.51,1.7,1.6,.05,glass);box(cx+off,3,cz-7.51,1.7,1.6,.05,glass);}box(cx,1.3,cz+7.52,1.7,2.6,.07,mat(0x453c36));
      }
    }
    function wmForPillar(){return mat(l.wall,false,{map:textures[0]});}
  }
  function addItem(k,name,kind,index=0){
    const p=point(k),g=new T.Group();g.position.set(p.x,state.level.id===7?(kind==='task'?2.3:kind==='exit'?-17.8:1):0,p.z);world.add(g);
    const color=kind==='exit'?0xb2dcc7:kind==='supply'?0x9fc6b5:0xe5bb6d,base=mat(0x414e48,false,{metalness:.3}),glow=mat(color,true);
    if(kind==='supply'){const bottle=new T.Mesh(geo(new T.CylinderGeometry(.13,.15,.43,9)),base);bottle.position.y=.45;g.add(bottle);box(0,.55,0,.28,.13,.28,glow,g);}
    else if(kind==='exit'){
      box(0,1.3,0,1.8,2.6,.18,mat(state.level.id===0?0xaca16c:0x101c19),g);box(0,2.65,0,1.9,.16,.25,glow,g);box(0,2.1,.11,1.3,.42,.03,label(state.level.id===0?'?':'EXIT'),g);
      if(state.level.id===8)g.rotation.x=-Math.PI/2;
    }else if(/valve/i.test(name)){
      box(0,.7,0,.23,1.4,.3,base,g);const wheel=new T.Mesh(geo(new T.TorusGeometry(.35,.055,6,16)),glow);wheel.position.set(0,1.3,.1);g.add(wheel);
      for(let i=0;i<3;i++){const spoke=box(0,1.3,.1,.65,.045,.05,glow,g);spoke.rotation.z=i*Math.PI/3;}
    }else if(/crate/i.test(name)){box(0,.45,0,1.25,.9,.85,base,g);box(0,.92,0,1.3,.05,.9,glow,g);}
    else if(/sign/i.test(name)){box(0,1,0,.09,2,.09,base,g);box(0,2,0,1.6,.45,.08,label('FIELD >'),g);}
    else if(/cylinder/i.test(name)){const cylinder=new T.Mesh(geo(new T.CylinderGeometry(.22,.22,.9,12)),glow);cylinder.position.y=.5;g.add(cylinder);}
    else{box(0,.8,0,.8,1.6,.25,base,g);box(0,1.25,.15,.5,.35,.04,glow,g);box(0,1.65,.16,1.5,.36,.03,label(name.toUpperCase()),g);}
    items.push({k,name,kind,index,mesh:g,done:false});
  }
  function addEntities(){
    const {level:l,grid:g}=state;
    for(let i=0;i<l.count;i++){
      const k=g.spawnCells[Math.floor(g.spawnCells.length*(.5+i*.11))%g.spawnCells.length],p=point(k),body=new T.Group(),black=mat(l.id===8?0x272e22:0x0c1013,false,{roughness:.55}),eye=mat(l.id===7?0x69a69b:0xf1d4ba,true);
      let type=l.id===5?'moth':l.id===7?'leviathan':l.id===8?'spider':l.id===9?'watcher':'stalker';
      if(type==='spider'){
        const shell=new T.Mesh(geo(new T.SphereGeometry(.46,10,6)),black);shell.scale.set(1,.6,1.3);shell.position.y=.4;body.add(shell);
        for(let j=0;j<8;j++){const leg=box((j<4?-1:1)*.6,.3,(j%4-.5)*.3,.95,.07,.08,black,body);leg.rotation.z=(j<4?1:-1)*.3;leg.rotation.y=(j%4-1.5)*.3;}
      }else if(type==='moth'){
        box(0,1.3,0,.2,.6,.3,black,body);for(const x of [-1,1]){const wing=box(x*.55,1.3,0,1,.7,.06,mat(0x725e51),body);wing.rotation.z=x*.4;}
      }else if(type==='leviathan'){
        const shell=new T.Mesh(geo(new T.SphereGeometry(2,12,8)),black);shell.scale.set(1,.6,3.5);body.add(shell);body.position.y=-.5;
      }else{
        box(0,1.4,0,.5,1,.28,black,body);box(0,2.07,0,.34,.4,.3,black,body);
        for(const s of [-1,1]){box(s*.19,.5,0,.13,1,.14,black,body);const arm=box(s*.44,1.3,0,.1,1.3,.1,black,body);arm.rotation.z=s*.2;}
      }
      for(const x of [-.1,.1])box(x,type==='spider'?.5:type==='leviathan'?0:1.95,type==='leviathan'?-5.5:-.18,.055,.04,.035,eye,body);
      body.position.x=p.x;body.position.z=p.z;world.add(body);entities.push({k,x:p.x,z:p.z,mesh:body,type,cooldown:0,stun:0,target:k,route:[],pathAt:0});
    }
  }
  function notice(text,seconds=4){state.warning=text;state.warningUntil=state.elapsed+seconds;}
  function nearest(){
    let best=null,dist=2.6;
    for(const item of items)if(!item.done){const p=point(item.k),d=Math.hypot(p.x-cam.position.x,p.z-cam.position.z);
      if(d<dist&&Math.abs(cam.position.y-(item.mesh.position.y+1.2))<2.6&&lineClear(cam.position,p)){dist=d;best=item;}}
    return best;
  }
  function lineClear(a,b){const d=Math.hypot(b.x-a.x,b.z-a.z);for(let t=.35;t<d;t+=.35)if(!openAt(a.x+(b.x-a.x)*t/d,a.z+(b.z-a.z)*t/d,.02))return false;return true;}
  function interact(){
    if(!active||paused||state?.status!=='active')return;audio();
    const item=nearest();
    if(!item){if(state.level.id===6){state.tactile=2.5;tone(45,.08,.015);notice('Cold concrete. The passage continues.',3);}return;}
    if(item.kind==='exit'){
      if(state.done<state.level.tasks.length){notice('The route is not ready. '+(state.level.tasks.length-state.done)+' remaining.',3);tone(90);return;}
      if(state.level.id===7&&cam.position.y>-15){notice('The cave entrance is below the surface.');return;}
      finish();return;
    }
    item.done=true;item.mesh.visible=false;tone(420);
    if(item.kind==='supply'){state.hp=Math.min(100,state.hp+30);state.battery=Math.min(100,state.battery+35);notice('Almond water / +30 health / +35 battery');}
    else{state.done++;notice(item.name+' secured');if(state.level.id===4){state.hp=100;state.battery=100;}if(state.level.id===7)state.air=100;
      if(state.level.id===3)hazards.slice(0,state.done).forEach(h=>h.disabled=true);}
    drawHUD();
  }
  function toggleFlash(){if(!state||paused)return;if(state.level.id===6){notice('The flashlight produces no light here. Feel the passage.',4);return;}state.flash=!state.flash;}
  function finish(){
    state.status='complete';const id=state.level.id;save.unlocked=Math.max(save.unlocked,Math.min(9,id+1));if(id===9)save.complete=true;const saved=persist();
    panel(id===9?'The field beyond':'Level '+id+' traversed',id===9?'For the first time in hours, the air moves. You reached the end of this expedition. The Backrooms have not ended.':'A passage opens. Somewhere behind you, the sound changes.');
    if(!saved)menu.append(node('p','Device storage is unavailable. Keep this session open to retain your checkpoint.'));
    const actions=node('div',null,'br-actions');if(id<9)actions.append(button('Enter Level '+(id+1),()=>launch(id+1)));actions.append(button('Expedition journal',journal));menu.append(actions);menu.querySelector('button')?.focus();
  }
  function damage(amount){if(state.status!=='active')return;state.hp=Math.max(0,state.hp-amount);state.lastHurt=state.elapsed;if(state.hp>0)return;
    state.status='dead';panel('Lost in the Backrooms','Your floor checkpoint is intact.');const actions=node('div',null,'br-actions');actions.append(button('Retry Level '+state.level.id,()=>launch(state.level.id)),button('Expedition journal',journal));menu.append(actions);menu.querySelector('button')?.focus();}
  function path(from,to){const g=state.grid,d=D.distances(g,to),out=[];let k=from;
    if(k<0||d[k]<0)return out;while(k!==to&&out.length<g.cells.length){const n=D.neighbors(g,k).find(n=>d[n]===d[k]-1);if(n==null)break;out.push(n);k=n;}return out;}
  function entityTick(e,dt){
    e.cooldown=Math.max(0,e.cooldown-dt);e.stun=Math.max(0,e.stun-dt);
    const d=Math.hypot(e.x-cam.position.x,e.z-cam.position.z),l=state.level.id;
    const blacked=l===1&&Math.sin(state.elapsed*.24)>.75;
    const detects=state.elapsed>5&&(e.type==='moth'?state.flash&&d<26:e.type==='leviathan'?cam.position.y<.7&&d<28:(d<8||keys.ShiftLeft&&d<25||lineClear(e,cam.position)&&d<19));
    const hunting=detects&&(l!==1||blacked);
    if(e.stun<=0){
      if(state.elapsed>e.pathAt){e.pathAt=state.elapsed+.8;e.target=hunting?cellAt(cam.position.x,cam.position.z):e.target;
        if(!hunting&&(!e.route.length||Math.random()<.1))e.target=state.grid.spawnCells[Math.floor(Math.random()*state.grid.spawnCells.length)];
        e.route=path(cellAt(e.x,e.z),e.target);
      }
      if(e.route.length){const p=point(e.route[0]),distance=Math.hypot(p.x-e.x,p.z-e.z),speed=hunting?(e.type==='spider'?3.9:e.type==='leviathan'?3:3.6):1.1;
        const step=Math.min(distance,speed*dt);if(distance>.01)move(e,(p.x-e.x)/distance*step,(p.z-e.z)/distance*step);if(distance<.35)e.route.shift();}
    }
    e.mesh.position.x=e.x;e.mesh.position.z=e.z;e.mesh.rotation.y=Math.atan2(-(cam.position.x-e.x),-(cam.position.z-e.z));
    if(e.type==='moth'){e.mesh.position.y=Math.sin(state.elapsed*3)*.2;for(let i=1;i<3;i++)e.mesh.children[i].rotation.y=Math.sin(state.elapsed*12)*.7;}
    if(e.type==='leviathan')e.mesh.position.y+=((hunting?cam.position.y-1:-2)-e.mesh.position.y)*Math.min(1,dt*.6);
    const closeHeight=e.type!=='leviathan'||Math.abs(e.mesh.position.y-cam.position.y)<3;
    if(hunting&&closeHeight&&d<(e.type==='leviathan'?3:1.2)&&e.cooldown<=0){damage(e.type==='leviathan'?35:18);e.cooldown=1.4;notice(e.type==='leviathan'?'Something brushes beneath you.':'Keep moving.',2);tone(48,.3,.06);}
  }
  function drawHUD(){
    if(!state)return;const l=state.level;
    hud.replaceChildren();const heading=node('div');heading.append(node('div','LEVEL '+String(l.id).padStart(2,'0'),'br-level'),node('h2',l.name,'br-name'),node('div',state.done<l.tasks.length?`${state.done}/${l.tasks.length} / ${l.tasks.filter((_,i)=>!items.find(t=>t.kind==='task'&&t.index===i)?.done).join(' / ')}`:l.exit,'br-objective'));
    const actions=node('div',null,'br-top-actions');actions.append(button('\u25c9',toggleFlash,'Flashlight (L)'),button('\u270b',interact,'Interact / feel surfaces (F)'),button('\u2630',journal,'Expedition journal (Tab)'));hud.append(heading,actions);
    readout.replaceChildren();const meters=node('div',null,'br-meters');
    for(const [label,value] of [['Health',state.hp],['Stamina',state.stamina],[l.id===7?'Air':'Battery',l.id===7?state.air:state.battery]]){const e=node('label',label),meter=node('meter');meter.min=0;meter.max=100;meter.value=value;meter.setAttribute('aria-label',label);e.append(meter);meters.append(e);}readout.append(meters);
    if(state.warningUntil>state.elapsed)readout.append(node('div',state.warning));
    if(!document.pointerLockElement&&!matchMedia('(pointer:coarse)').matches)readout.append(button('Return to view',capture));
  }
  function tick(dt){
    if(!active||!world||!state||paused)return;
    dt=Math.min(.05,Math.max(0,dt));state.elapsed+=dt;clock+=dt;frame++;
    const l=state.level,g=state.grid,crouch=keys.ControlLeft||keys.KeyC,sprint=keys.ShiftLeft&&state.stamina>0&&!crouch;
    let x=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0),z=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0),moving=!!(x||z);
    const length=Math.hypot(x,z)||1,speed=l.id===7?4.2:crouch?1.8:sprint?6:3.6;
    x/=length;z/=length;move(cam.position,(Math.cos(yaw)*x-Math.sin(yaw)*z)*speed*dt,(-Math.sin(yaw)*x-Math.cos(yaw)*z)*speed*dt);
    state.stamina=Math.max(0,Math.min(100,state.stamina+(sprint&&moving?-21:16)*dt));
    if(l.id===7){
      const start=point(g.start),onPlatform=Math.hypot(cam.position.x-start.x,cam.position.z-start.z)<1.65;
      cam.position.y=Math.max(-16.35,Math.min(4,cam.position.y+((keys.Space?1:0)-(crouch?1:0))*3*dt));
      if(onPlatform)cam.position.y=Math.max(3.85,cam.position.y);else if(!keys.Space&&!crouch&&cam.position.y>1.45)cam.position.y=Math.max(1.45,cam.position.y-dt*2);
      state.air=Math.max(0,Math.min(100,state.air+(cam.position.y<.9?-3.5:25)*dt));if(state.air<=0)damage(12*dt);
    }else{const target=crouch?1.05:1.65;cam.position.y+=(target-cam.position.y)*Math.min(1,dt*12);}
    cam.rotation.set(pitch,yaw+(moving?Math.sin(clock*9)*.002:0),0,'YXZ');
    state.visited.add(cellAt(cam.position.x,cam.position.z));
    if(moving){steps+=dt*speed;if(steps>2.5){steps=0;tone(l.id===7?75:95,.055,crouch?.006:.018);}}
    fill.position.copy(cam.position);flash.position.copy(cam.position);cam.getWorldDirection(v);flash.target.position.copy(cam.position).add(v);
    const enabled=state.flash&&state.battery>0&&l.id!==6;
    flash.intensity=enabled?3.5:0;if(enabled)state.battery=Math.max(0,state.battery-dt*.12);fill.intensity=l.id===6?0:l.id===7?.65:.8;
    if(water){water.material.map.offset.set(state.elapsed*.008,state.elapsed*.004);world.fog.density=cam.position.y<.9?.045:.018;}
    const blackout=l.id===1&&Math.sin(state.elapsed*.24)>.75;ambient.intensity=blackout?.04:l.ambient;
    for(const lamp of lamps)lamp.intensity=blackout?.03:1.4;
    if(l.id===0){const exit=items.find(i=>i.kind==='exit');if(exit)exit.mesh.visible=state.elapsed%2.4>.12;}
    for(const h of hazards){const phase=(state.elapsed+h.phase)%7,warning=phase>3.2&&phase<4.8,danger=!h.disabled&&(h.kind==='pool'||phase>=4.8);
      h.mesh.material.opacity=h.disabled?.05:danger?.7:warning?.45:.12;h.mesh.material.color.setHex(h.disabled?0x6e9d80:h.kind==='pool'?0x234b29:danger?0xf06c31:warning?0xe5b953:0x64765d);
      if(danger&&cellAt(cam.position.x,cam.position.z)===h.k){damage((h.kind==='steam'?24:h.kind==='surge'?36:16)*dt);if(h.kind!=='pool')notice(h.kind==='steam'?'Scalding steam':'Live circuit',1);}}
    for(const e of entities)entityTick(e,dt);
    state.tactile=Math.max(0,state.tactile-dt);
    const target=items.find(i=>i.kind==='task'&&!i.done)||items.find(i=>i.kind==='exit');
    if((state.assistance||l.id===6&&state.tactile>0)&&target&&frame%8===0){
      const route=path(cellAt(cam.position.x,cam.position.z),target.k);let points=[new T.Vector3(cam.position.x,.07,cam.position.z),...route.map(k=>{const p=point(k);return new T.Vector3(p.x,.07,p.z);})];
      if(l.id===6&&!state.assistance&&points.length>1){const direction=points[1].clone().sub(points[0]);direction.setLength(Math.min(direction.length(),2));points=[points[0],points[0].clone().add(direction)];}
      guide.geometry.dispose();guide.geometry=new T.BufferGeometry().setFromPoints(points);
    }
    guide.visible=state.assistance||l.id===6&&state.tactile>0;
    if(l.id===6&&!state.assistance){guide.material.color.setHex(0x83958b);guide.material.opacity=.35;guide.geometry.setDrawRange(0,Math.min(4,guide.geometry.attributes.position?.count||0));}
    else{guide.material.opacity=.5;guide.geometry.setDrawRange(0,Infinity);}
    const item=nearest();prompt.textContent=item?(item.kind==='exit'&&state.done<l.tasks.length?'Route incomplete':item.name):l.id===6&&state.tactile>0?'Feeling the passage':'';
    hurt.style.opacity=String(Math.max(0,1-(state.elapsed-state.lastHurt)*2));
    if(sound){sound.gain.gain.value=l.id===6?0:l.id===7?.035:.018;sound.filter.frequency.value=l.id===2?450:l.id===7?100:180;}
    hudClock+=dt;if(hudClock>.25){hudClock=0;drawHUD();}
    if(state.status!=='active'||paused)return;
    // One capped render loop; the ordinary PvP renderer is suspended while this mode owns the screen.
    if(clock>=1/45){clock%=1/45;view.render(world,cam);}
  }
  window.PVP_BACKROOMS={open,stop,launch,tick,interact,journal,resume,get active(){return active;},get state(){return state;},get camera(){return cam;},get renderer(){return view;},get entities(){return entities;},get items(){return items;},get hazards(){return hazards;},data:D};
})();
