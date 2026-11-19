(() => {
  'use strict';

  const tau = Math.PI * 2;
  const catalog = [];
  const looks = {};
  const patterns = {};
  function add(id, name, rarity, c, metal, rough, pat, options = {}) {
    const [body, accent] = c;
    const sw = c.slice(0, 2).map(color => '#' + color.toString(16).padStart(6, '0'));
    catalog.push({ id, name, rarity, body, accent, sw });
    looks[id] = { pat, c, metal, rough, noSwap: true, ...options };
  }
  function fill(g, color, n) { g.fillStyle = color; g.fillRect(0, 0, n, n); }
  function line(g, points, color, width = 1, close = false) {
    g.beginPath();
    points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
    if (close) g.closePath();
    g.strokeStyle = color; g.lineWidth = width; g.stroke();
  }
  function polygon(g, points, color) {
    g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
    g.closePath(); g.fillStyle = color; g.fill();
  }
  function grain(g, n, rnd, count, dark, light) {
    for (let i = 0; i < count; i++) {
      g.fillStyle = rnd() < .55 ? dark : light;
      g.fillRect(rnd() * n, rnd() * n, .5 + rnd() * 2, .5 + rnd());
    }
  }

  add('monarch', 'Monarch', 'legendary', [0x0a1538, 0x286fdf], .24, .29, 'monarchWing', { foil: 'monarch' });
  patterns.monarchWing = (g, n, c, rnd) => {
    const wash = g.createLinearGradient(0, 0, n, n);
    wash.addColorStop(0, '#142854'); wash.addColorStop(.44, c[1]); wash.addColorStop(1, c[0]); fill(g, wash, n);
    for (let y = -3; y < n; y += 4) for (let x = -4; x < n; x += 4) {
      g.fillStyle = rnd() < .5 ? 'rgba(133,205,255,.25)' : 'rgba(3,8,35,.28)';
      g.beginPath(); g.ellipse(x + (y % 8) / 2, y, 1.1, 2.6, -.56, 0, tau); g.fill();
    }
    const origin = [-15, 246];
    for (const [x, y] of [[48,-6],[119,-8],[205,-4],[264,42],[264,124],[260,215]]) {
      g.beginPath(); g.moveTo(...origin); g.bezierCurveTo(x * .46, 149, x * .81 - 25, y + 55, x, y);
      g.strokeStyle = '#070c20'; g.lineWidth = 4; g.stroke();
      g.strokeStyle = '#131a38'; g.lineWidth = 1.1; g.stroke();
    }
    g.beginPath(); g.moveTo(19, -5); g.bezierCurveTo(136, 47, 182, 131, 260, 254);
    g.strokeStyle = '#080e22'; g.lineWidth = 7; g.stroke();
    for (let i = 0; i < 21; i++) {
      const t = i / 20, x = 37 + Math.sin(t * 1.25) * 229, y = t * t * 233;
      g.fillStyle = i % 3 ? '#7ebbe8' : '#d3e8fc'; g.beginPath(); g.ellipse(x, y + 8, 2, 3.7, -.65, 0, tau); g.fill();
    }
  };

  add('undertow', 'Undertow', 'epic', [0xf1e1bc, 0x1d3868], .08, .48, 'woodcutWaves');
  patterns.woodcutWaves = (g, n, c, rnd) => {
    fill(g, c[0], n);
    for (const [x, y, scale] of [[-50,65,.83],[75,64,.96],[203,71,.88],[-70,166,1.05],[75,176,1.05],[216,170,.93],[-32,255,.87],[104,260,1.03],[225,267,1]]) {
      g.save(); g.translate(x, y); g.scale(scale, scale);
      g.beginPath(); g.moveTo(-54, 29); g.bezierCurveTo(-16, 8, -14, -39, 32, -43);
      g.bezierCurveTo(64, -53, 70, -15, 46, -10); g.bezierCurveTo(55, -29, 28, -35, 23, -13);
      g.bezierCurveTo(17, 6, 62, 15, 79, 30); g.lineTo(77, 48); g.lineTo(-66, 48); g.closePath();
      g.fillStyle = c[1]; g.fill(); g.strokeStyle = '#162648'; g.lineWidth = 1.8; g.stroke();
      for (let i = 0; i < 9; i++) {
        g.beginPath(); g.moveTo(-64 + i * 1.6, 45); g.bezierCurveTo(-4 + i * 3, 9 + i * 3, -5 + i * 2, -48 + i * 6, 44 + i * 3, -39 + i * 8);
        g.strokeStyle = i % 3 ? '#6883a8' : '#c0c4bb'; g.lineWidth = .85; g.stroke();
      }
      for (let i = 0; i < 27; i++) {
        const t = rnd() * Math.PI, r = 24 + rnd() * 18;
        const px = 32 + Math.cos(t) * r, py = -12 - Math.sin(t) * r;
        line(g, [[px - 1,py + 2],[px,py],[px + 2.8,py - 1.6]], c[0], .75);
      }
      g.restore();
    }
    grain(g, n, rnd, 1700, 'rgba(32,27,24,.09)', 'rgba(255,254,225,.15)');
  };

  add('marbleheart', 'Marbleheart', 'epic', [0xf9f6f4, 0xc49181], .10, .17, 'marbleRose');
  patterns.marbleRose = (g, n, c, rnd) => {
    fill(g, c[0], n);
    for (let i = 0; i < 44; i++) {
      const x = rnd() * n, y = rnd() * n, r = 18 + rnd() * 44;
      const fog = g.createRadialGradient(x,y,0,x,y,r);
      fog.addColorStop(0,'rgba(127,133,147,.17)'); fog.addColorStop(1,'rgba(127,133,147,0)');
      g.fillStyle = fog; g.fillRect(x-r,y-r,r*2,r*2);
    }
    for (let i = -3; i < 7; i++) {
      const main = [];
      for (let x = -12; x <= n + 18; x += 7) {
        main.push([x, i * 62 + x * .59 + 12 * Math.sin(x * .037 + i) + 7 * Math.sin(x * .091 - i) + (rnd()-.5)*8]);
      }
      line(g, main, 'rgba(122,132,144,.12)', 8); line(g, main, '#aba8ac', 1.1);
      for (let j = 4; j < main.length - 5; j += 5) {
        const [x,y] = main[j], d = 11 + rnd() * 20;
        line(g, [[x,y],[x+8,y-d*.48],[x+17,y-d*.65],[x+25,y-d]], '#bcb9bd', .75);
        if ((i+j)%4 === 0) line(g, main.slice(j,j+4), c[1], 1.25);
      }
    }
  };

  add('opalescent', 'Opalescent', 'legendary', [0xf3f2ec, 0x82dabc], .12, .19, 'opalFlecks', { foil: 'opal' });
  patterns.opalFlecks = (g, n, c, rnd) => {
    const glaze = g.createLinearGradient(0,n,n,0);
    glaze.addColorStop(0,'#cacae3'); glaze.addColorStop(.3,c[0]); glaze.addColorStop(.74,'#e3e9ea'); glaze.addColorStop(1,'#fff4ee'); fill(g,glaze,n);
    const pearl = [c[1], '#f0a599', '#bea7f1', '#6eacfa', '#e5e8fa'];
    for (let i = 0; i < 235; i++) {
      const x = rnd()*n, y = rnd()*n, r = 2 + rnd()*13, a = rnd()*tau;
      const points = Array.from({length: 5}, (_,j) => {
        const b = a + j*tau/5, d = r*(.45+rnd()*.55);
        return [x+Math.cos(b)*d,y+Math.sin(b)*d*.62];
      });
      const flash = g.createLinearGradient(x-r,y-r,x+r,y+r);
      flash.addColorStop(0, '#ffffff00'); flash.addColorStop(.45, pearl[i%pearl.length]); flash.addColorStop(1, '#ffffff00');
      g.globalAlpha = .28 + rnd()*.54; polygon(g,points,flash);
    }
    g.globalAlpha = 1;
    grain(g,n,rnd,760,'rgba(56,69,103,.08)','rgba(255,255,255,.65)');
  };

  for (const [id, name, colors, number, team] of [
    ['pole_position','Pole Position / Apex',[0xb31f2e,0xf7eee0,0x261b26],'07','APEX'],
    ['pole_position_slipstream','Pole Position / Slipstream',[0x1656a6,0xffb737,0x101b30],'24','SLIPSTREAM'],
    ['pole_position_endurance','Pole Position / Endurance',[0x13796e,0xf5d8a5,0x102a33],'63','ENDURANCE'],
  ]) add(id, name, 'rare', colors, .22, .37, 'raceLivery', { number, team });
  patterns.raceLivery = (g, n, c, rnd, look) => {
    fill(g,c[0],n);
    for (const start of [-160,96,352]) {
      polygon(g,[[start,0],[start+91,0],[start-44,n],[start-135,n]],c[2]);
      polygon(g,[[start+6,0],[start+23,0],[start-112,n],[start-129,n]],c[1]);
      polygon(g,[[start+77,0],[start+82,0],[start-53,n],[start-58,n]],c[1]);
    }
    for (const [x,y] of [[11,16],[140,139]]) {
      g.fillStyle = c[2]; g.fillRect(x,y,100,70);
      g.fillStyle = c[1]; g.fillRect(x+3,y+3,94,64);
      g.fillStyle = c[2]; g.font = 'italic 900 49px sans-serif'; g.fillText(look.number,x+12,y+53);
      g.font = '800 10px sans-serif'; g.fillText(look.team,x+7,y+64,86);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if ((i+j)%2) g.fillRect(x+76+i*5,y+8+j*5,5,5);
    }
    for (const [x,y,label] of [[124,38,'VECTOR OIL'],[34,140,'SLATE TIRES'],[13,223,'GRIP LAB'],[142,244,'PIT WORKS']]) {
      g.font = 'italic 900 13px sans-serif'; g.strokeStyle = c[2]; g.lineWidth = 2;
      g.strokeText(label,x,y); g.fillStyle = c[1]; g.fillText(label,x,y);
    }
    grain(g,n,rnd,1800,'rgba(18,14,22,.23)','rgba(242,228,204,.29)');
    for (let i = 0; i < 28; i++) {
      const x = rnd()*n, y = rnd()*n; line(g,[[x,y],[x+2+rnd()*8,y-1]],'rgba(224,214,199,.42)',.8);
    }
  };

  add('carbon_weave', 'Carbon Weave', 'rare', [0x20242b,0xb69555], .53, .26, 'goldTwill', { foil: 'twill' });
  patterns.goldTwill = (g, n, c, rnd) => {
    fill(g,c[0],n);
    const size = 8;
    for (let y = 0; y < n; y += size) for (let x = 0; x < n; x += size) {
      const v = ((x/size - y/size + n/size) % 4) < 2, gold = rnd() < .043;
      const l = v ? g.createLinearGradient(x,y,x+size,y) : g.createLinearGradient(x,y,x,y+size);
      l.addColorStop(0,'#101217'); l.addColorStop(.32,gold ? '#ad8845' : v ? '#4a505a' : '#343840');
      l.addColorStop(.57,gold ? '#5a452b' : '#30353e'); l.addColorStop(1,'#15191d');
      g.fillStyle = l; g.fillRect(x,y,size,size);
      for (let k = 1; k < size; k += 2) line(g,v ? [[x+k,y],[x+k,y+size]] : [[x,y+k],[x+size,y+k]],'rgba(9,12,17,.36)',.48);
    }
  };

  add('lost_expedition', 'Lost Expedition', 'epic', [0xd5b783,0x594431], .02, .64, 'parchmentChart');
  patterns.parchmentChart = (g, n, c, rnd) => {
    fill(g,c[0],n);
    for (let i = 0; i < 130; i++) {
      const x = rnd()*n, y = rnd()*n, r = 5+rnd()*33;
      const stain = g.createRadialGradient(x,y,0,x,y,r);
      stain.addColorStop(0,i%2 ? '#744b2b33' : '#fff3cd62'); stain.addColorStop(1,'#a2763900');
      g.fillStyle = stain; g.fillRect(x-r,y-r,r*2,r*2);
    }
    for (let p = 12; p < n; p += 32) {
      line(g,[[p,0],[p,n]],'#775b422e',.7); line(g,[[0,p],[n,p]],'#775b422e',.7);
    }
    for (const [x,y,rx,ry] of [[31,36,58,56],[234,202,57,68],[87,184,25,41],[166,98,20,27],[216,82,10,13]]) {
      const coast = Array.from({length: 46},(_,i) => {
        const a = i*tau/46, r = .83+Math.sin(a*5)*.16+rnd()*.24;
        return [x+Math.cos(a)*rx*r,y+Math.sin(a)*ry*r];
      });
      polygon(g,coast,'#977a4c3b'); line(g,coast,c[1],1.2,true);
      line(g, coast.map(([px,py]) => [x+(px-x)*.90,y+(py-y)*.90]), '#7d664c91',.6,true);
    }
    for (const [x,y,r] of [[55,119,21],[191,45,18]]) {
      g.beginPath(); g.arc(x,y,r*.72,0,tau); g.strokeStyle=c[1]; g.lineWidth=.9; g.stroke();
      for (let i=0;i<8;i++) {
        const a = i*tau/8, d = i%2 ? .59 : 1;
        const tip = [x+Math.cos(a)*r*d,y+Math.sin(a)*r*d];
        const edge = [x+Math.cos(a+1.57)*4,y+Math.sin(a+1.57)*4];
        polygon(g,[[x,y],tip,edge],c[1]); line(g,[[x,y],tip,[2*x-edge[0],2*y-edge[1]]],c[1],.65);
      }
      g.fillStyle=c[1]; g.font='italic 9px serif'; g.fillText('N',x-3,y-r-3);
    }
    g.strokeStyle=c[1]; g.lineWidth=1.25; g.beginPath(); g.moveTo(123,155);
    g.bezierCurveTo(124,137,147,137,145,155); g.bezierCurveTo(141,176,159,174,161,158);
    g.bezierCurveTo(161,145,176,147,181,139); g.lineTo(176,148); g.lineTo(186,148); g.stroke();
    for (let i=0;i<5;i++) line(g,[[123+i*13,171],[127+i*13,169],[131+i*13,171]], '#785438', .75);
    g.fillStyle=c[1]; g.font='italic 9px serif';
    for (const [x,y,label] of [[77,54,"37\u00b0 18' N"],[106,124,'Here be leviathans'],[31,218,'Cinder Shoals'],[110,239,"61\u00b0 04' W"],[163,116,'North Reach']]) g.fillText(label,x,y);
    grain(g,n,rnd,1300,'#45302026','#fff5d535');
  };

  add('prism_shift', 'Prism Shift', 'legendary', [0xe884b2,0x958dea], .44, .19, 'dichroicFacets', { foil: 'prism' });
  patterns.dichroicFacets = (g, n, c, rnd) => {
    fill(g,c[0],n);
    const shades = [c[0], '#f1c280', '#aa8cbb', '#6caacd', c[1], '#d09dc8'];
    const pts = Array.from({length: 10}, (_,y) => Array.from({length: 10}, (_,x) => [x*35-24+(rnd()-.5)*29,y*35-23+(rnd()-.5)*29]));
    for (let y=0;y<9;y++) for (let x=0;x<9;x++) {
      const a=pts[y][x],b=pts[y][x+1],d=pts[y+1][x],e=pts[y+1][x+1];
      for (const p of [[a,b,e],[a,e,d]]) {
        const f=g.createLinearGradient(...p[0],...p[2]);
        f.addColorStop(0,shades[Math.floor(rnd()*shades.length)]); f.addColorStop(1,shades[Math.floor(rnd()*shades.length)]);
        polygon(g,p,f); line(g,p,'#ffefd556',.52,true);
      }
    }
  };

  add('verdigris', 'Verdigris', 'epic', [0xbf7650,0x388d82], .60, .36, 'weatheredCopper');
  patterns.weatheredCopper = (g, n, c, rnd) => {
    const copper=g.createLinearGradient(0,0,n,n);
    copper.addColorStop(0,'#6c3e32'); copper.addColorStop(.22,c[0]); copper.addColorStop(.38,'#e2a071');
    copper.addColorStop(.68,'#a95e40'); copper.addColorStop(.86,'#dc9567'); copper.addColorStop(1,'#6c3e32'); fill(g,copper,n);
    for (let i=0;i<4700;i++) {
      const x=rnd()*n,y=rnd()*n;
      const seam = Math.abs(y-127-Math.sin(x*.034)*14), edge = Math.min(x,y,n-x,n-y,seam*.78);
      if (edge<9+rnd()*30 || rnd()<.05) {
        g.fillStyle=[c[1],'#28675c','#58aa95','#814632','#91baa1'][i%5];
        g.globalAlpha=.16+rnd()*.57;
        const w=1+rnd()*8,h=1+rnd()*6;
        polygon(g,[[x,y-h*.3],[x+w*.63,y],[x+w,y+h*.72],[x+w*.27,y+h],[x-w*.28,y+h*.44]],g.fillStyle);
      }
    }
    g.globalAlpha=1;
    grain(g,n,rnd,2000,'#53282035','#ffbc8c36');
    for(let i=0;i<62;i++) {
      const x=rnd()*n,y=rnd()*n; line(g,[[x,y],[x+3+rnd()*13,y+2]],'#faad7758',.7);
    }
  };

  add('arcade_fever', 'Arcade Fever', 'epic', [0x211434,0xff50ae], .08, .67, 'arcadeCarpet');
  patterns.arcadeCarpet = (g, n, c, rnd) => {
    fill(g,c[0],n);
    grain(g,n,rnd,3100,'#08091566','#6e4d863d');
    const neon=[c[1],'#48e1cf','#fae455','#9e7bf9','#f58062'];
    for(let row=0;row<7;row++) for(let col=0;col<7;col++) {
      const x=col*39+8+rnd()*18,y=row*39+6+rnd()*21,k=(row*7+col)%5;
      g.save(); g.translate(x,y); g.rotate((rnd()-.5)*2.7);
      const color=neon[Math.floor(rnd()*neon.length)];
      if(k===0) line(g,[[-12,9],[-7,-7],[-2,4],[4,-9],[11,5]],color,2.2);
      else if(k===1) { g.beginPath(); g.moveTo(-11,7); g.bezierCurveTo(-16,-11,6,-11,1,0); g.bezierCurveTo(-2,11,15,7,12,-5); g.strokeStyle=color; g.lineWidth=2.4; g.stroke(); }
      else if(k===2) { line(g,[[-10,8],[2,-10],[10,6]],color,1.7,true); line(g,[[-5,6],[3,-4],[10,8]],'#faacde80',.7); }
      else if(k===3) polygon(g,Array.from({length:10},(_,i) => {const a=i*tau/10,r=i%2?3.7:10;return [Math.sin(a)*r,-Math.cos(a)*r];}),color);
      else { line(g,[[-8,0],[8,0]],color,1.5); line(g,[[0,-8],[0,8]],color,1.5); }
      g.restore();
    }
    grain(g,n,rnd,200,'#9364bc94','#d2b3e0a5');
  };

  add('breaking_news', 'Breaking News', 'epic', [0xe9e6df,0x292828], .02, .63, 'newsprint');
  patterns.newsprint = (g, n, c, rnd) => {
    fill(g,'#c0bcb4',n);
    const copy = ['Arena officials reported no change.', 'Critics blame an unlikely bounce.', 'The record remains under review.', 'Queue times held steady all week.'];
    function clip(x,y,a,title,lines,picture) {
      g.save(); g.translate(x,y); g.rotate(a);
      const paper=Array.from({length:17},(_,i) => [i*7,-rnd()*4]);
      for(let i=16;i>=0;i--) paper.push([i*7,83+rnd()*5]);
      g.shadowColor='#33312f77'; g.shadowBlur=3; g.shadowOffsetY=2;
      polygon(g,paper,c[0]); g.shadowColor='transparent';
      g.fillStyle=c[1]; g.font='bold 7px Georgia, serif'; g.fillText(title,4,9,104);
      line(g,[[4,12],[108,12]],c[1],.85);
      g.font='900 10px Georgia, serif'; lines.forEach((t,i) => g.fillText(t,4,23+i*10,104));
      const top=18+lines.length*10;
      if(picture) for(let py=top;py<80;py+=2) for(let px=5;px<48;px+=2) {
        const inPortrait=Math.hypot((px-24)*.95,(py-61)*1.1)<16 || (py>71 && Math.abs(px-25)<19);
        g.beginPath(); g.arc(px,py,(inPortrait ? .70 : .27)+rnd()*.47,0,tau); g.fill();
      }
      g.font='3.8px Georgia, serif';
      for(let py=top+4;py<82;py+=4.7) {
        if(!picture) g.fillText(copy[Math.floor(rnd()*copy.length)],4,py,49);
        g.fillText(copy[Math.floor(rnd()*copy.length)],56,py,51);
      }
      g.restore();
    }
    clip(-18,-14,-.17,'THE ARENA REGISTER',['OVERTIME RETURNS'],true);
    clip(92,-12,.18,'METRO SPORTS',['NO HITMARKER IN SIGHT'],false);
    clip(166,48,.25,'THE EVENING ROUND',['BOT WINS REMATCH'],true);
    clip(-36,109,-.18,'ARENA WEEKLY',['TRADE DEAL COLLAPSES'],false);
    clip(63,67,-.12,'THE DAILY RESPAWN',['LOCAL MAN LOSES 37','RANKED MATCHES,','BLAMES CROSSHAIR'],true);
    clip(143,169,.18,'THE ARENA REGISTER',['OBJECTIVE STILL EMPTY'],true);
    clip(4,196,-.17,'LAST ROUND EDITION',['MORE AT RESPAWN'],true);
    clip(48,148,.14,'ARENA CLASSIFIEDS',['ONE OWNER. NO RECOIL.'],false);
    grain(g,n,rnd,790,'#22222228','#ffffff38');
  };

  function prestige(id, name, requirement, colors, metal, rough, paint, unavailable = false) {
    const key = 'prestige_' + id;
    add(key, name, 'legendary', colors, metal, rough, key);
    Object.assign(catalog.at(-1), { prestige: requirement, unavailable });
    patterns[key] = paint;
  }
  prestige('untouchable', 'Untouchable', 'Win 25 ranked PvP matches in a row.', [0xeeeae3,0x202228], .05, .78, (g,n,c,rnd) => {
    fill(g,c[0],n);
    for (let i=0;i<25;i++) {
      line(g,[[16+i*9,34],[7+i*9,222]],i===24 ? '#bd9040' : c[1], i===24 ? 3 : 2);
    }
    grain(g,n,rnd,1100,'#2927230c','#ffffff19');
  });
  prestige('against_all_odds', 'Against All Odds', 'Win a real 1v5 clutch. Requires a five-player elimination mode.', [0x282b30,0xc4cbd2], .34, .43, (g,n,c,rnd) => {
    fill(g,c[0],n);
    grain(g,n,rnd,2100,'#12141739','#eef3ff12');
    for (let i=0;i<5;i++) {
      const x=29+i*38, color=i===4 ? '#e4b656' : c[1];
      polygon(g,[[x-13,224],[x+9,164],[x+46,48],[x+59,33],[x+24,158],[x+8,190]],color);
      line(g,[[x+7,179],[x+51,44]],i===4 ? '#fff0bd' : '#f6f8fa',1);
    }
  }, true);
  prestige('legends_mark', "Legend's Mark", 'Reach Legend rank.', [0x181d29,0xd9bc79], .45, .25, (g,n,c,rnd) => {
    fill(g,c[0],n);
    for (let y=0;y<n;y+=16) line(g,[[0,y],[n,y]],'#c9bd8e19',.8);
    for (const y of [64,192]) for (const x of [64,192]) {
      line(g,[[x,y-33],[x+27,y-20],[x+27,y+12],[x,y+35],[x-27,y+12],[x-27,y-20]],c[1],1.6,true);
      polygon(g,[[x-19,y-12],[x-10,y-5],[x,y-18],[x+10,y-5],[x+19,y-12],[x+14,y+9],[x-14,y+9]],c[1]);
      line(g,[[x-12,y+15],[x+12,y+15]],c[1]);
    }
    grain(g,n,rnd,900,'#00000012','#fffdf216');
  });
  prestige('deadeye', 'Deadeye', 'Land 1,000 PvP headshot eliminations with one weapon.', [0x172825,0xdab17d], .20, .46, (g,n,c) => {
    fill(g,c[0],n);
    for (const [x,y] of [[64,64],[192,192],[-64,192],[192,-64]]) {
      for (const r of [18,31,50,72]) {
        g.beginPath(); g.arc(x,y,r,0,tau); g.strokeStyle=r===18 ? c[1] : '#769587'; g.lineWidth=r===18 ? 2 : 1; g.stroke();
      }
      for (let i=0;i<8;i++) {
        const a=i*tau/8, u=Math.cos(a),v=Math.sin(a);
        line(g,[[x+u*35,y+v*35],[x+u*62,y+v*62]],c[1]);
      }
      polygon(g,[[x,y-5],[x+5,y],[x,y+5],[x-5,y]],'#f1c48c');
    }
  });
  prestige('first_hundred', 'The First Hundred', 'Earn one of the first 100 Legend places.', [0x16364b,0xb7e2db], .32, .38, (g,n,c) => {
    fill(g,c[0],n);
    for (let y=0;y<10;y++) for (let x=0;x<10;x++) {
      const px=12+x*25.6,py=12+y*25.6,r=(x===9 && y===9) ? 6 : 3;
      polygon(g,[[px,py-r],[px+r,py],[px,py+r],[px-r,py]],r===6 ? '#f7dd94' : c[1]);
    }
    for (const x of [0,128,256]) line(g,[[x,0],[x,n]],'#a6c5cb55',1);
  });
  prestige('worldbreaker', 'Worldbreaker', 'Finish a ranked season at #1.', [0xf7f5ed,0xb68d42], .32, .23, (g,n,c) => {
    const pearl = g.createLinearGradient(0,0,n,n);
    pearl.addColorStop(0,'#e5dfd8'); pearl.addColorStop(.52,c[0]); pearl.addColorStop(1,'#dddedc'); fill(g,pearl,n);
    for (const x of [0,128,256]) {
      line(g,[[x,0],[x+42,n]],c[1],2);
      line(g,[[x+4,0],[x+46,n]],'#c7a35d80',1);
    }
    for (const [x,y] of [[64,64],[192,192]]) {
      const frame=[[x,y-34],[x+38,y-19],[x+32,y+22],[x,y+37],[x-32,y+22],[x-38,y-19]];
      polygon(g,frame,c[0]); line(g,frame,c[1],2,true);
      g.fillStyle='#6c512d'; g.textAlign='center'; g.textBaseline='middle'; g.font='900 39px sans-serif'; g.fillText('#1',x,y+2);
    }
  });

  window.PVP_COLLECTION_WRAPS = { catalog, looks, patterns };
})();
