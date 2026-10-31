(()=>{const d=document,rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
const trap=(el,closeFn)=>{const prev=d.activeElement;d.body.classList.add('lock');el.hidden=false;el.querySelector('[data-close]').focus();
  const key=e=>{if(e.key==='Escape')closeFn();if(e.key==='Tab'){const f=[...el.querySelectorAll('button,a[href],iframe')].filter(x=>!x.hidden&&x.offsetParent);if(!f.length)return;const a=f[0],z=f[f.length-1];if(e.shiftKey&&d.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&d.activeElement===z){e.preventDefault();a.focus()}}};
  d.addEventListener('keydown',key);return()=>{d.removeEventListener('keydown',key);el.hidden=true;d.body.classList.remove('lock');prev&&prev.focus()}};
/* lightbox: gallery holidays + zone albums */
const lb=d.getElementById('lb');
if(lb){const img=lb.querySelector('img'),cap=lb.querySelector('figcaption'),cnt=lb.querySelector('.lb__count');
 let i=0,release=null,cache={},slides=[],title='';
 const pre=k=>{if(!slides.length)return;k=(k+slides.length)%slides.length;const h=slides[k].src;if(!cache[h]){cache[h]=new Image();cache[h].src=h}};
 const show=k=>{if(!slides.length)return;i=(k+slides.length)%slides.length;const s=slides[i];img.src=s.src;img.alt=s.alt||'';cap.textContent=s.alt||'';cnt.textContent=(title?title+' · ':'')+(i+1)+' / '+slides.length;pre(i+1);pre(i-1)};
 const close=()=>{release&&release();release=null;d.removeEventListener('keydown',arrows)};
 const arrows=e=>{if(e.key==='ArrowRight')show(i+1);if(e.key==='ArrowLeft')show(i-1)};
 const open=(list,start,t)=>{slides=list;title=t||'';show(start||0);if(!release){release=trap(lb,close);d.addEventListener('keydown',arrows)}};
 const gias=[...d.querySelectorAll('[data-lightbox] .gi')];
 const holiday=gias.map(a=>({src:a.getAttribute('href'),alt:(a.querySelector('img')||{}).alt||''}));
 gias.forEach((a,k)=>a.addEventListener('click',e=>{e.preventDefault();open(holiday,k,'')}));
 lb.querySelector('.lb__nav--prev').onclick=()=>show(i-1);lb.querySelector('.lb__nav--next').onclick=()=>show(i+1);
 lb.querySelector('[data-close]').onclick=close;lb.addEventListener('click',e=>{if(e.target===lb||e.target.classList.contains('lb__stage'))close()});
 let x0=null,y0=0;const st=lb.querySelector('.lb__stage');
 st.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;y0=e.touches[0].clientY},{passive:true});
 st.addEventListener('touchmove',e=>{if(x0===null)return;const dx=e.touches[0].clientX-x0;if(!rm)img.style.transform=`translateX(${dx}px)`},{passive:true});
 st.addEventListener('touchend',e=>{if(x0===null)return;const dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;img.style.transform='';if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy))show(i+(dx<0?1:-1));else if(dy>120)close();x0=null});
 /* zones → same lightbox */
 const Z=window.VR_ZONE_GALLERIES||{};
 d.querySelectorAll('.zone[data-zone]').forEach(el=>{
  const openZ=()=>{const g=Z[el.dataset.zone];if(!g||!g.items||!g.items.length)return;open(g.items,0,g.title||'')};
  el.addEventListener('click',openZ);
  el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openZ()}});
 });
}
/* player */
const pl=d.querySelector('.pl');if(pl){const au=pl.querySelector('audio'),btns=[...pl.querySelectorAll('.tl button')],root=d.getElementById('songs'),
 scrub=pl.querySelector('.pl__scrub'),vizBars=[...pl.querySelectorAll('.pl__viz i')],cov=pl.querySelector('.pl__cover'),
 tt=pl.querySelector('.pl__title'),ar=pl.querySelector('.pl__artist'),cur=pl.querySelector('[data-t=cur]'),dur=pl.querySelector('[data-t=dur]'),pb=pl.querySelector('[data-act=play]');
 let n=0,loaded=false,dragging=false,vizId=0,actx,analyser,srcNode,liveEq=false,freqBuf;
 const DEF_C='img/covers/default.webp',slug=s=>s.replace(/^audio\//,'').replace(/\.mp3$/i,''),coverFor=b=>b.dataset.cover||('img/covers/'+slug(b.dataset.src)+'.webp');
 au.crossOrigin='anonymous';
 btns.forEach(b=>{b.dataset.cover=coverFor(b)});
 const fmt=s=>isFinite(s)?Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'):'0:00';
 const setSeekUI=v=>{const p=Math.max(0,Math.min(1000,v|0));scrub.style.setProperty('--pct',p/10);scrub.setAttribute('aria-valuenow',String(p))};
 const seekFromX=x=>{const r=scrub.querySelector('.pl__scrub-rail').getBoundingClientRect();return Math.max(0,Math.min(1000,(x-r.left)/Math.max(r.width,1)*1000))};
 const applySeek=v=>{if(!au.duration)return;setSeekUI(v);au.currentTime=v/1000*au.duration};
 const setCover=b=>{const u=coverFor(b);if(cov.getAttribute('src')!==u)cov.setAttribute('src',u);cov.onerror=()=>{cov.onerror=null;cov.setAttribute('src',DEF_C)}};
 const load=k=>{n=(k+btns.length)%btns.length;const b=btns[n],src=b.dataset.src;loaded=true;if(au.getAttribute('src')!==src)au.src=src;btns.forEach(x=>x.setAttribute('aria-current',x===b));tt.textContent=b.querySelector('b').textContent;ar.textContent=b.querySelector('.tl__t span').textContent;setCover(b)};
 btns[0].setAttribute('aria-current','true');setCover(btns[0]);
 const wireEq=()=>{if(rm||liveEq||srcNode)return;try{actx=actx||new(window.AudioContext||window.webkitAudioContext)();srcNode=actx.createMediaElementSource(au);analyser=actx.createAnalyser();analyser.fftSize=256;analyser.minDecibels=-85;analyser.maxDecibels=-12;analyser.smoothingTimeConstant=.62;srcNode.connect(analyser);analyser.connect(actx.destination);freqBuf=new Uint8Array(analyser.frequencyBinCount);liveEq=true}catch(e){liveEq=false}};
 const clearEqLive=()=>{pl.classList.remove('pl--eq-live');vizBars.forEach(el=>{el.style.transform=''});pl.querySelectorAll('.tl__eq i').forEach(el=>{el.style.transform=''})};
 const barScale=(v,min)=>{const t=Math.min(1,Math.pow(v/255,0.72)*1.35);return(min+t*(1-min)).toFixed(3)};
 const startViz=()=>{cancelAnimationFrame(vizId);if(au.paused)return;vizId=requestAnimationFrame(vizTick)};
 const vizTick=()=>{if(au.paused){vizId=0;return}if(liveEq&&analyser&&freqBuf){analyser.getByteFrequencyData(freqBuf);let sum=0,max=0;const step=Math.max(1,Math.floor(freqBuf.length*.6/vizBars.length));
  for(let i=0;i<freqBuf.length;i++){sum+=freqBuf[i];if(freqBuf[i]>max)max=freqBuf[i]}
  if(max>52&&sum>48){pl.classList.add('pl--eq-live');vizBars.forEach((el,i)=>{el.style.transform='scaleY('+barScale(freqBuf[i*step+1],0.2)+')'});const eq=pl.querySelector('[aria-current=true] .tl__eq');if(eq)[...eq.children].forEach((el,i)=>{el.style.transform='scaleY('+barScale(freqBuf[(i+1)*12+4],0.25)+')'})}
  else clearEqLive()}else clearEqLive();vizId=requestAnimationFrame(vizTick)};
 const play=async()=>{wireEq();if(actx&&actx.state==='suspended')await actx.resume();if(!loaded)load(n);try{await au.play()}catch(e){}startViz()};
 pb.onclick=()=>au.paused?play():au.pause();
 pl.querySelector('[data-act=next]').onclick=()=>{load(n+1);play()};pl.querySelector('[data-act=prev]').onclick=()=>{if(au.currentTime>3){au.currentTime=0}else{load(n-1)}play()};
 btns.forEach((b,k)=>b.onclick=()=>{if(k===n&&loaded){au.paused?play():au.pause()}else{load(k);play()}});
 au.onplay=()=>{root.classList.add('playing');pb.setAttribute('aria-label','Пауза');startViz()};
 au.onpause=()=>{root.classList.remove('playing');pb.setAttribute('aria-label','Слушать');cancelAnimationFrame(vizId);vizId=0;clearEqLive()};
 au.onended=()=>{load(n+1);play()};au.onloadedmetadata=()=>dur.textContent=fmt(au.duration);
 au.ontimeupdate=()=>{cur.textContent=fmt(au.currentTime);if(!dragging&&au.duration)setSeekUI(au.currentTime/au.duration*1000)};
 scrub.onpointerdown=e=>{dragging=true;pl.classList.add('pl--scrubbing');scrub.setPointerCapture(e.pointerId);applySeek(seekFromX(e.clientX))};
 scrub.onpointermove=e=>{if(!dragging)return;applySeek(seekFromX(e.clientX))};
 const endDrag=()=>{dragging=false;pl.classList.remove('pl--scrubbing')};
 scrub.onpointerup=endDrag;scrub.onpointercancel=endDrag;
 scrub.onkeydown=e=>{if(!au.duration)return;const v=+(scrub.getAttribute('aria-valuenow')||0);if(e.key==='ArrowRight'||e.key==='ArrowUp'){e.preventDefault();applySeek(v+15)}if(e.key==='ArrowLeft'||e.key==='ArrowDown'){e.preventDefault();applySeek(v-15)}if(e.key==='Home'){e.preventDefault();applySeek(0)}if(e.key==='End'){e.preventDefault();applySeek(1000)}};
}
/* videos */
const vlist=window.VR_VIDEOS||[],esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
if(vlist.length){const rv=d.querySelector('.vrow--v'),rh=d.querySelector('.vrow--h'),cnt={all:vlist.length};
 vlist.forEach(v=>{cnt[v.cat]=(cnt[v.cat]||0)+1;(v.o==='v'?rv:rh).insertAdjacentHTML('beforeend',`<button type="button" class="vc vc--${v.o}" data-cat="${v.cat}" data-type="${v.type}" data-id="${v.id}" data-hash="${v.hash||''}" data-o="${v.o}" data-title="${esc(v.title)}"><img src="img/video-posters/${v.id}.webp" alt="" loading="lazy" decoding="async"><span class="vc__play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span><span class="vc__t">${esc(v.title)}</span></button>`)});
 d.querySelectorAll('.vtabs .vt').forEach(b=>{const s=b.querySelector('span'),n=cnt[b.dataset.f]||0;if(s)s.textContent=n;b.hidden=!n})}
const vm=d.getElementById('vm');if(vm){const cards=[...d.querySelectorAll('.vc')],frame=vm.querySelector('.vm__frame'),box=vm.querySelector('.vm__player'),t=vm.querySelector('.vm__t'),fb=vm.querySelector('.vm__fb a');let release=null;
 /* всегда vkvideo.ru: vk.com/video_ext с cloud IP часто отдаёт 418 */
 const url=c=>{const oid='-227237589',id=c.dataset.id,h=c.dataset.hash;return`https://vkvideo.ru/video_ext.php?oid=${oid}&id=${id}&hd=2&autoplay=1${h?'&hash='+h:''}`};
 const close=()=>{box.innerHTML='';box.classList.remove('vm__player--on');frame&&frame.classList.remove('vm__frame--on');release&&release();release=null};
 [...cards,...d.querySelectorAll('[data-vplay]')].forEach(c=>c.addEventListener('click',()=>{
   if(release)close();
   vm.classList.toggle('vm--v',c.dataset.o==='v');t.textContent=c.dataset.title;
   fb.href=`https://vk.com/${c.dataset.type==='clip'?'clip':'video'}-227237589_${c.dataset.id}`;
   box.innerHTML=`<iframe src="${url(c)}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock" allowfullscreen title="${c.dataset.title}"></iframe>`;
   box.classList.add('vm__player--on');frame&&frame.classList.add('vm__frame--on');
   release=trap(vm,close)}));
 vm.querySelector('[data-close]').onclick=close;vm.addEventListener('click',e=>{if(e.target===vm)close()});
 const tabs=[...d.querySelectorAll('.vtabs .vt')],rows=[...d.querySelectorAll('.vrow')],heads=[...d.querySelectorAll('.vrow__h')];
 tabs.forEach(b=>b.onclick=()=>{tabs.forEach(x=>x.setAttribute('aria-pressed',x===b));const f=b.dataset.f;
   cards.forEach(c=>c.hidden=!(f==='all'||c.dataset.cat===f));rows.forEach((r,k)=>{const any=[...r.children].some(c=>!c.hidden);r.hidden=!any;heads[k].hidden=!any;r.scrollLeft=0})});
}
})();
/* map: 2GIS primary, Yandex secondary; iframe only when near viewport */
(()=>{const d=document,m=d.getElementById('map');if(!m)return;const c=m.querySelector('.map__cfg').dataset,fr=m.querySelector('.map__frame'),tabs=[...m.querySelectorAll('[data-map]')];
 const gis=()=>{const f=d.createElement('iframe');f.src=c.src;f.title='VR Lounge на карте 2ГИС';f.loading='lazy';return f};
 const show=k=>{tabs.forEach(t=>t.setAttribute('aria-pressed',t.dataset.map===k));const old=fr.querySelector('iframe');old&&old.remove();
   fr.appendChild(k==='ya'?d.getElementById('map-ya').content.firstElementChild.cloneNode(true):gis())};
 tabs.forEach(t=>t.onclick=()=>show(t.dataset.map));
 if('IntersectionObserver'in window){const io=new IntersectionObserver(e=>{if(e[0].isIntersecting){show('2gis');io.disconnect()}},{rootMargin:'400px'});io.observe(m)}else show('2gis');
})();

/* mobile: hide the sticky callbar while the hero CTA is on screen (no duplicate buttons) */
(()=>{const c=document.querySelector('.hero .cta');if(!c||!('IntersectionObserver' in window))return;
 new IntersectionObserver(([e])=>document.documentElement.classList.toggle('hero-cta-vis',e.isIntersecting),{threshold:.25}).observe(c)})();
