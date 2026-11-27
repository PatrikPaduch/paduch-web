// Rangjelvények: a rangletra/index.html-ből átvéve (epikus aura, lendületes szárnyak)
/* ================= segédek ================= */
let UID=0;
const lin=(id,c)=>`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[2]}"/><stop offset=".5" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[0]}"/></linearGradient>`;
const rad=(id,c)=>`<radialGradient id="${id}" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="${c[0]}"/><stop offset=".45" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></radialGradient>`;
const glowG=(id,col)=>`<radialGradient id="${id}"><stop offset="0" stop-color="${col}" stop-opacity=".9"/><stop offset=".5" stop-color="${col}" stop-opacity=".3"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>`;
function star(cx,cy,R,r,n=5){const p=[];for(let i=0;i<n*2;i++){const a=-Math.PI/2+i*Math.PI/n,rr=i%2?r:R;p.push((cx+rr*Math.cos(a)).toFixed(1)+','+(cy+rr*Math.sin(a)).toFixed(1));}return p.join(' ');}
function rays(color,op,anim){
  let s='';for(let i=0;i<12;i++){const a=i*Math.PI/6,w=.07;
    s+=`<path d="M50 46 L${(50+47*Math.cos(a-w)).toFixed(1)} ${(46+47*Math.sin(a-w)).toFixed(1)} L${(50+47*Math.cos(a+w)).toFixed(1)} ${(46+47*Math.sin(a+w)).toFixed(1)} Z" fill="${color}" opacity="${op}"/>`;}
  return `<g>${s}${anim?`<animateTransform attributeName="transform" type="rotate" from="0 50 46" to="360 50 46" dur="22s" repeatCount="indefinite"/>`:''}</g>`;
}
/* ---- szárnyak: egyenként rajzolt tollakból, a szárnytőből legyezőszerűen ---- */
let WSTYLE='iv';   // a user választása: lendületes ív
const WSHAPES={
  toll:(L,w)=>`M0 0 C${L*.25} ${-w*1.35} ${L*.7} ${-w*1.1} ${L} 0 C${L*.72} ${w*.85} ${L*.28} ${w*1.05} 0 0 Z`,
  penge:(L,w)=>`M0 ${-w*.9} L${L*.78} ${-w*.8} L${L} 0 L${L*.72} ${w*.9} L0 ${w*.9} Z`,
  iv:(L,w)=>`M0 ${-w} C${L*.35} ${-w*2.3} ${L*.8} ${-w*1.5} ${L} ${-w*.1} C${L*.75} ${w*.35} ${L*.4} ${w*.9} 0 ${w} Z`
};
/* Felépítés (bal szárny, a szárnytő a 0,0 pontban): egy íves szárnycsont fut felfelé-kifelé,
   arról lógnak le a nagy evezőtollak lefelé-kifelé (a csúcs felé egyre hosszabbak),
   a csont mentén egy sor rövid fedőtoll, legfelül pedig fényes élvonal. */
function wingSet(id,mc,rx,ry,sc,lvl){
  const kind=WSTYLE,shape=WSHAPES[kind],f2=v=>v.toFixed(1);
  const P2=[-25,-35],C=[-3,-31];                      // szárnycsont: kvadratikus Bézier 0,0 -> C -> P2
  const arm=t=>[2*(1-t)*t*C[0]+t*t*P2[0],2*(1-t)*t*C[1]+t*t*P2[1]];
  const n=(kind==='iv'?4:5)+Math.min(lvl,2)+(lvl>=3?1:0);
  const w=kind==='iv'?4.6:kind==='penge'?3.2:3.5;
  let prim='',cov='';
  for(let i=n-1;i>=0;i--){ // a csúcstól a tő felé, így a belső toll takarja a külsőt
    const t=.14+.86*i/(n-1),[x,y]=arm(t),a=100+42*t,L=(12+19*Math.pow(t,.9))*(1+lvl*.05);
    prim+=`<g transform="translate(${f2(x)} ${f2(y)}) rotate(${f2(a)})"><path d="${shape(L,w)}" fill="url(#${id}m)" stroke="${mc[0]}" stroke-width=".8" stroke-linejoin="round"/>`+
      (kind==='toll'?`<line x1="2" y1="0" x2="${f2(L*.86)}" y2="0" stroke="${mc[0]}" stroke-width=".55" opacity=".5"/>`:'')+`</g>`;
  }
  const m=n+1;
  for(let i=m-1;i>=0;i--){
    const t=.04+.9*i/(m-1),[x,y]=arm(t),a=118+42*t,L=kind==='iv'?9:8;
    cov+=`<g transform="translate(${f2(x)} ${f2(y)}) rotate(${f2(a)})"><path d="${shape(L,w*.8)}" fill="url(#${id}h)" stroke="${mc[0]}" stroke-width=".7" stroke-linejoin="round"/></g>`;
  }
  const edge=`M0 0 Q${C[0]} ${C[1]} ${P2[0]} ${P2[1]}`;
  const bone=`<path d="${edge}" fill="none" stroke="${mc[0]}" stroke-width="5.2" stroke-linecap="round"/><path d="${edge}" fill="none" stroke="url(#${id}m)" stroke-width="3.6" stroke-linecap="round"/>`+
    `<path d="${edge}" fill="none" stroke="${lvl>=2?`url(#${id}r)`:mc[2]}" stroke-width="1.1" stroke-linecap="round" opacity=".9" transform="translate(-.6 -.9)"/>`+
    (lvl>=1?`<circle cx="${P2[0]}" cy="${P2[1]}" r="2.6" fill="url(#${id}g)" stroke="${mc[0]}" stroke-width=".6"/>`:'');
  const one=`<g transform="translate(${rx} ${ry}) scale(${sc})">${prim}${cov}${bone}</g>`;
  return `<g>${one}</g><g transform="translate(100 0) scale(-1 1)">${one}</g>`;
}
const svg=(size,inner,defs,glow,label)=>`<svg viewBox="0 0 100 100" width="${size}" height="${size}" style="overflow:visible;${glow?`filter:drop-shadow(0 0 ${size>70?10:4}px ${glow})`:''}" aria-label="${label}"><defs>${defs}</defs>${inner}</svg>`;

const M={bronze:['#5e2c12','#b8693a','#f6c493'],silver:['#5f6a7b','#b9c3cf','#ffffff'],gold:['#6e4900','#d9a520','#fff2a8'],fire:['#5e1800','#e2561a','#ffd98a'],ice:['#16435e','#6fd3f5','#f2fdff']};
const G={amber:['#fff0b8','#f0a020','#6e3c00'],sapphire:['#d6eaff','#2f74e8','#0a2462'],emerald:['#d0ffe5','#1fb866','#044d27'],ruby:['#ffd6dc','#e0213f','#55000f'],amethyst:['#f2dcff','#9b3fe0','#36095a'],diamond:['#ffffff','#9fe9ff','#2a7fa8'],onyx:['#a8a6c0','#2a2838','#050508'],sun:['#fffbe0','#ffc61a','#9a5600']};

/* fam: 0 csillag, 1 korona, 4 szárnyas korona, 2 drágakő-szárny, 3 legenda · lvl: díszítettség 0..3 */
const TIERS=[
 {name:'Bronz csillag',fam:0,lvl:0,m:'bronze',aura:'#ff9a5a'},
 {name:'Ezüst csillag',fam:0,lvl:1,m:'silver',glow:'#cfe4ff'},
 {name:'Arany csillag',fam:0,lvl:2,m:'gold',glow:'#ffcc33'},
 {name:'Bronz korona',fam:1,lvl:0,m:'bronze',g:'amber',aura:'#ff8a2a'},
 {name:'Ezüst korona',fam:1,lvl:1,m:'silver',g:'sapphire',aura:'#6fb8ff'},
 {name:'Arany korona',fam:1,lvl:2,m:'gold',g:'emerald',glow:'#ffcc33'},
 {name:'Bronz szárnyas csillag',fam:5,lvl:0,m:'bronze',g:'amber',glow:'#ff9a5a'},
 {name:'Ezüst szárnyas csillag',fam:5,lvl:1,m:'silver',g:'sapphire',glow:'#7fc0ff'},
 {name:'Arany szárnyas csillag',fam:5,lvl:2,m:'gold',g:'emerald',glow:'#ffcc33'},
 {name:'Bronz szárnyas korona',fam:4,lvl:0,m:'bronze',g:'amber',glow:'#ff9a5a'},
 {name:'Ezüst szárnyas korona',fam:4,lvl:1,m:'silver',g:'sapphire',glow:'#7fc0ff'},
 {name:'Arany szárnyas korona',fam:4,lvl:2,m:'gold',g:'ruby',glow:'#ffcc33'}
];
const LATER=[
 {name:'Zafír szárny',fam:2,lvl:0,m:'silver',g:'sapphire',glow:'#3b8cff'},
 {name:'Smaragd szárny',fam:2,lvl:1,m:'silver',g:'emerald',glow:'#22d37a'},
 {name:'Rubin szárny',fam:2,lvl:2,m:'silver',g:'ruby',glow:'#ff3355'},
 {name:'Ónix szárny',fam:2,lvl:2,m:'silver',g:'onyx',glow:'#8a80c0'},
 {name:'Ametiszt szárny',fam:2,lvl:3,m:'silver',g:'amethyst',glow:'#b45cff'},
 {name:'Főnix',fam:3,lvl:1,m:'fire',g:'ruby',glow:'#ff7a1a'},
 {name:'Gyémánt',fam:3,lvl:2,m:'ice',g:'diamond',glow:'#6fe3ff'},
 {name:'Legenda',fam:3,lvl:3,m:'gold',g:'sun',glow:'#ffe066'}
];
const FAMS=[{name:'Csillagok',fam:0},{name:'Koronák',fam:1},{name:'Szárnyas csillagok',fam:5},{name:'Szárnyas koronák',fam:4}];
const STEPS=TIERS.length*5;

/* ================= rajz ================= */
function crownA(id,mc,gc){
  return `<path d="M20 66 L15 29 L33 46 L50 18 L67 46 L85 29 L80 66 Z" fill="url(#${id}m)" stroke="${mc[0]}" stroke-width="2" stroke-linejoin="round"/><path d="M27 60 L25 41 L35 50 L50 30 L65 50 L75 41 L73 60 Z" fill="url(#${id}h)" opacity=".35"/><rect x="17" y="61" width="66" height="13" rx="3" fill="url(#${id}m)" stroke="${mc[0]}" stroke-width="2"/>`+
    [34,50,66].map(x=>`<circle cx="${x}" cy="67.5" r="3.8" fill="url(#${id}g)" stroke="${gc[2]}"/>`).join('')+
    [[15,29],[50,18],[85,29]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4.6" fill="url(#${id}g)" stroke="${gc[2]}"/>`).join('')+
    `<circle cx="50" cy="49" r="7" fill="url(#${id}g)" stroke="${gc[2]}"/><ellipse cx="47.5" cy="46.5" rx="2.2" ry="1.4" fill="#fff" opacity=".8"/>`;
}
const gemA=(id,gc,r)=>`<circle cx="50" cy="46" r="${r+5.5}" fill="url(#${id}r)" stroke="#4a3200" stroke-width="1.4"/><circle cx="50" cy="46" r="${r}" fill="url(#${id}g)" stroke="${gc[2]}"/><ellipse cx="${50-r*.38}" cy="${46-r*.45}" rx="${r*.32}" ry="${r*.2}" fill="#fff" opacity=".75"/>`;

function art(tr,id){
  const mc=M[tr.m],gc=G[tr.g||'amber'],L=tr.lvl;let b='';
  if(tr.fam===0){
    if(L>=1)b+=rays(mc[2],.24+L*.04);
    if(L>=1)b+=`<circle cx="50" cy="46" r="29" fill="#0c1324" stroke="url(#${id}m)" stroke-width="3"/>`;
    b+=`<polygon points="${star(50,46,35,14.5)}" fill="url(#${id}m)" stroke="${mc[0]}" stroke-width="2" stroke-linejoin="round"/><polygon points="${star(50,46,19,8)}" fill="url(#${id}h)" opacity=".55"/>`;
    if(L>=2)b+=`<polygon points="${star(15,66,9,4)}" fill="url(#${id}m)" stroke="${mc[0]}"/><polygon points="${star(85,66,9,4)}" fill="url(#${id}m)" stroke="${mc[0]}"/>`;
  }else if(tr.fam===1){
    if(L>=2)b+=rays(mc[2],.25);
    if(L>=1)b+=`<circle cx="50" cy="46" r="33" fill="#0c1324" stroke="url(#${id}m)" stroke-width="3"/>`;
    b+=crownA(id,mc,gc);
  }else if(tr.fam===5){
    if(L>=2)b+=rays(mc[2],.3,true);
    b+=wingSet(id,mc,38,58,.95,L);
    if(L>=1)b+=`<circle cx="50" cy="50" r="19" fill="#0c1324" stroke="url(#${id}m)" stroke-width="2.6"/>`;
    b+=`<polygon points="${star(50,50,25,10.5)}" fill="url(#${id}m)" stroke="${mc[0]}" stroke-width="1.8" stroke-linejoin="round"/><polygon points="${star(50,50,13.5,5.7)}" fill="url(#${id}h)" opacity=".55"/>`;
    if(L>=2)b+=`<circle cx="50" cy="50" r="3.6" fill="url(#${id}g)" stroke="${gc[2]}" stroke-width=".6"/>`;
  }else if(tr.fam===4){
    if(L>=2)b+=rays(gc[1],.3,true);
    b+=wingSet(id,mc,36,60,1,L);
    b+=`<g transform="translate(50 52) scale(.62) translate(-50 -46)">${crownA(id,mc,gc)}</g>`;
    if(L>=2)b+=`<polygon points="${star(50,22,5.5,2.3)}" fill="#fff8d0"/>`;
  }else if(tr.fam===2){
    if(L>=2)b+=rays(gc[1],.22);
    b+=wingSet(id,mc,39,48,1,L)+gemA(id,gc,10.5);
  }else{
    if(L>=2)b+=rays(gc[1],L===3?.35:.25,L===3);
    if(L===3)b+=`<circle cx="50" cy="46" r="27" fill="none" stroke="url(#${id}r)" stroke-width="2" opacity=".8"/>`;
    b+=wingSet(id,mc,39,48,1.05,3)+gemA(id,gc,11)+`<polygon points="${star(50,46,7.5,3.2)}" fill="#fff" opacity=".85"/>`;
    if(L>=1)b+=`<path d="M38 30 L35 16 L44 23 L50 11 L56 23 L65 16 L62 30 Z" fill="url(#${id}r)" stroke="#4a3200" stroke-width="1.3" stroke-linejoin="round"/>`;
  }
  return b;
}

const FLAME="M50 -9 C58 4 63 13 59 26 C56 22 53 20 50 18 C47 20 44 22 41 26 C37 13 42 4 50 -9 Z";
function aura(tr,id,c){
  const L=tr.lvl;let b='';
  if(tr.fam===0){
    b+=`<circle cx="50" cy="46" r="34" fill="url(#${id}au)" opacity="${.4+L*.12}"><animate attributeName="r" values="30;${38+L*2};30" dur="2.6s" repeatCount="indefinite"/></circle>`;
    if(L>=2)for(let i=0;i<4;i++){const a=i*90;b+=`<g><circle cx="50" cy="10" r="1.7" fill="#fff"/><animateTransform attributeName="transform" type="rotate" from="${a} 50 46" to="${a+360} 50 46" dur="4s" repeatCount="indefinite"/></g>`;}
  }else if(tr.fam===1){
    b+=`<circle cx="50" cy="46" r="40" fill="url(#${id}au)" opacity=".45"/>`;
    const n=5+L*2;
    for(let i=0;i<n;i++){const a=-75+i*150/(n-1),dur=(0.7+(i%3)*.23).toFixed(2);
      b+=`<g transform="rotate(${a.toFixed(1)} 50 46)"><path d="${FLAME}" fill="url(#${id}fl)" opacity=".8"><animate attributeName="opacity" values=".45;1;.6;.95;.45" dur="${dur}s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="0 2;0 -2;0 1;0 2" dur="${dur}s" repeatCount="indefinite"/></path></g>`;}
  }else if(tr.fam===4||tr.fam===5){
    b+=`<circle cx="50" cy="46" r="46" fill="url(#${id}au)" opacity="${.35+L*.1}"><animate attributeName="opacity" values="${.3+L*.1};${.55+L*.1};${.3+L*.1}" dur="3s" repeatCount="indefinite"/></circle>`;
    if(L>=1)b+=`<circle cx="50" cy="46" r="47" fill="none" stroke="${c}" stroke-width="1.4" stroke-dasharray="3 10" stroke-linecap="round" opacity=".7"><animateTransform attributeName="transform" type="rotate" from="0 50 46" to="360 50 46" dur="14s" repeatCount="indefinite"/></circle>`;
    if(L>=2)for(let q=0;q<4;q++){const a=q*90;b+=`<g><circle cx="50" cy="-2" r="1.9" fill="#fff"/><animateTransform attributeName="transform" type="rotate" from="${a} 50 46" to="${a+360} 50 46" dur="6s" repeatCount="indefinite"/></g>`;}
  }else if(tr.fam===2){
    b+=`<circle cx="50" cy="46" r="44" fill="url(#${id}au)" opacity=".5"/>`;
    [[40,'4 9',8,1],[44,'14 22',11,-1],[36,'2 6',5,1],[47,'26 18',14,-1]].slice(0,2+Math.min(L,2)).forEach(([r,da,dur,dir])=>{
      b+=`<circle cx="50" cy="46" r="${r}" fill="none" stroke="${c}" stroke-width="2" stroke-dasharray="${da}" stroke-linecap="round" opacity=".9"><animateTransform attributeName="transform" type="rotate" from="0 50 46" to="${360*dir} 50 46" dur="${dur}s" repeatCount="indefinite"/></circle>`;});
    if(tr.fam===4&&L>=2)for(let q=0;q<3;q++){const a=q*120;b+=`<g><circle cx="50" cy="0" r="2" fill="#fff"/><animateTransform attributeName="transform" type="rotate" from="${a} 50 46" to="${a+360} 50 46" dur="5s" repeatCount="indefinite"/></g>`;}
  }else{
    b+=`<circle cx="50" cy="46" r="48" fill="url(#${id}au)" opacity=".6"><animate attributeName="opacity" values=".4;.75;.4" dur="3s" repeatCount="indefinite"/></circle>`;
    for(let j=0;j<2+L;j++){const r=34+j*4.5,dur=4+j*2,dir=j%2?-1:1;let dots='';
      for(let q=0;q<3;q++){const a=q*2*Math.PI/3+j;dots+=`<circle cx="${(50+r*Math.cos(a)).toFixed(1)}" cy="${(46+r*Math.sin(a)).toFixed(1)}" r="${2.4-j*.3}" fill="#fff"/>`;}
      b+=`<g>${dots}<animateTransform attributeName="transform" type="rotate" from="0 50 46" to="${360*dir} 50 46" dur="${dur}s" repeatCount="indefinite"/></g>`;}
  }
  return b;
}
function pips(d,c){let s='';for(let i=0;i<5;i++){const x=50+(i-2)*10,y=93,on=i<d;s+=`<path d="M${x} ${y-4.2} L${x+3.6} ${y} L${x} ${y+4.2} L${x-3.6} ${y} Z" fill="${on?'#ffd54a':'#1a2235'}" stroke="${on?'#7a5a00':'#3b4660'}"/>`;}return s;}
function emblem(tr,d,size){
  const id='u'+(UID++),mc=M[tr.m],gc=G[tr.g||'amber'],c=tr.glow||tr.aura,rm=M[tr.m==='ice'?'ice':'gold'];
  const defs=lin(id+'m',mc)+lin(id+'h',[mc[1],mc[2],'#ffffff'])+rad(id+'g',gc)+lin(id+'r',rm)+glowG(id+'au',c)+
    `<linearGradient id="${id}fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity="0"/><stop offset=".45" stop-color="${c}" stop-opacity=".9"/><stop offset="1" stop-color="#fff6d0" stop-opacity=".95"/></linearGradient>`;
  return svg(size,aura(tr,id,c)+art(tr,id)+(d?pips(d):''),defs,c,tr.name+(d?' '+d:''));
}


export { emblem, TIERS, LATER, FAMS, STEPS };
