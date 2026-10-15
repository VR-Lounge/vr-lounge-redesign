(()=>{const d=document,rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
const trap=(el,closeFn)=>{const prev=d.activeElement;d.body.classList.add('lock');el.hidden=false;el.querySelector('[data-close]').focus();
  const key=e=>{if(e.key==='Escape')closeFn();if(e.key==='Tab'){const f=[...el.querySelectorAll('button,a[href],iframe')].filter(x=>!x.hidden&&x.offsetParent);if(!f.length)return;const a=f[0],z=f[f.length-1];if(e.shiftKey&&d.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&d.activeElement===z){e.preventDefault();a.focus()}}};
  d.addEventListener('keydown',key);return()=>{d.removeEventListener('keydown',key);el.hidden=true;d.body.classList.remove('lock');prev&&prev.focus()}};
/* lightbox */
const lb=d.getElementById('lb'),items=[...d.querySelectorAll('[data-lightbox] .gi')];
if(lb&&items.length){const img=lb.querySelector('img'),cap=lb.querySelector('figcaption'),cnt=lb.querySelector('.lb__count');let i=0,release=null,cache={};
 const pre=k=>{k=(k+items.length)%items.length;const h=items[k].getAttribute('href');if(!cache[h]){cache[h]=new Image();cache[h].src=h}};
 const show=k=>{i=(k+items.length)%items.length;const a=items[i];img.src=a.getAttribute('href');img.alt=a.querySelector('img').alt;cap.textContent=a.querySelector('img').alt;cnt.textContent=(i+1)+' / '+items.length;pre(i+1);pre(i-1)};
 const close=()=>{release&&release();release=null;d.removeEventListener('keydown',arrows)};
 const arrows=e=>{if(e.key==='ArrowRight')show(i+1);if(e.key==='ArrowLeft')show(i-1)};
 items.forEach((a,k)=>a.addEventListener('click',e=>{e.preventDefault();show(k);release=trap(lb,close);d.addEventListener('keydown',arrows)}));
 lb.querySelector('.lb__nav--prev').onclick=()=>show(i-1);lb.querySelector('.lb__nav--next').onclick=()=>show(i+1);
 lb.querySelector('[data-close]').onclick=close;lb.addEventListener('click',e=>{if(e.target===lb||e.target.classList.contains('lb__stage'))close()});
 let x0=null,y0=0;const st=lb.querySelector('.lb__stage');
 st.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;y0=e.touches[0].clientY},{passive:true});
 st.addEventListener('touchmove',e=>{if(x0===null)return;const dx=e.touches[0].clientX-x0;if(!rm)img.style.transform=`translateX(${dx}px)`},{passive:true});
 st.addEventListener('touchend',e=>{if(x0===null)return;const dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;img.style.transform='';if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy))show(i+(dx<0?1:-1));else if(dy>120)close();x0=null});
}
/* player */
const pl=d.querySelector('.pl');if(pl){const au=pl.querySelector('audio'),btns=[...pl.querySelectorAll('.tl button')],root=d.getElementById('songs'),seek=pl.querySelector('input'),
 tt=pl.querySelector('.pl__title'),ar=pl.querySelector('.pl__artist'),cur=pl.querySelector('[data-t=cur]'),dur=pl.querySelector('[data-t=dur]'),pb=pl.querySelector('[data-act=play]');let n=0,loaded=false;
 const fmt=s=>isFinite(s)?Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'):'0:00';
 const load=k=>{n=(k+btns.length)%btns.length;const b=btns[n];au.src=b.dataset.src;loaded=true;btns.forEach(x=>x.setAttribute('aria-current',x===b));tt.textContent=b.querySelector('b').textContent;ar.textContent=b.querySelector('.tl__t span').textContent};
 btns[0].setAttribute('aria-current','true');
 const play=()=>{if(!loaded)load(n);au.play().catch(()=>{})};
 pb.onclick=()=>au.paused?play():au.pause();
 pl.querySelector('[data-act=next]').onclick=()=>{load(n+1);play()};pl.querySelector('[data-act=prev]').onclick=()=>{if(au.currentTime>3){au.currentTime=0}else{load(n-1)}play()};
 btns.forEach((b,k)=>b.onclick=()=>{if(k===n&&loaded){au.paused?play():au.pause()}else{load(k);play()}});
 au.onplay=()=>{root.classList.add('playing');pb.setAttribute('aria-label','Пауза')};au.onpause=()=>{root.classList.remove('playing');pb.setAttribute('aria-label','Слушать')};
 au.onended=()=>{load(n+1);play()};au.onloadedmetadata=()=>dur.textContent=fmt(au.duration);
 au.ontimeupdate=()=>{cur.textContent=fmt(au.currentTime);if(au.duration)seek.value=au.currentTime/au.duration*1000};
 seek.oninput=()=>{if(au.duration)au.currentTime=seek.value/1000*au.duration};
}
/* videos */
const vlist=window.VR_VIDEOS||[],esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
if(vlist.length){const rv=d.querySelector('.vrow--v'),rh=d.querySelector('.vrow--h'),cnt={all:vlist.length};
 vlist.forEach(v=>{cnt[v.cat]=(cnt[v.cat]||0)+1;(v.o==='v'?rv:rh).insertAdjacentHTML('beforeend',`<button type="button" class="vc vc--${v.o}" data-cat="${v.cat}" data-type="${v.type}" data-id="${v.id}" data-hash="${v.hash||''}" data-o="${v.o}" data-title="${esc(v.title)}"><img src="img/video-posters/${v.id}.webp" alt="" loading="lazy" decoding="async"><span class="vc__play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span><span class="vc__t">${esc(v.title)}</span></button>`)});
 d.querySelectorAll('.vt').forEach(b=>{const s=b.querySelector('span'),n=cnt[b.dataset.f]||0;if(s)s.textContent=n;b.hidden=!n})}
const vm=d.getElementById('vm');if(vm){const cards=[...d.querySelectorAll('.vc')],box=vm.querySelector('.vm__player'),t=vm.querySelector('.vm__t'),fb=vm.querySelector('.vm__fb a');let release=null;
 const url=c=>{const oid='-227237589',id=c.dataset.id;/* clips too: video_ext is the reliable player for both (clip_ext errors without autoplay) */const h=c.dataset.hash;return`https://${h?'vkvideo.ru':'vk.com'}/video_ext.php?oid=${oid}&id=${id}&hd=2&autoplay=1${h?'&hash='+h:''}`};
 const close=()=>{box.innerHTML='';release&&release();release=null};
 cards.forEach(c=>c.addEventListener('click',()=>{vm.classList.toggle('vm--v',c.dataset.o==='v');t.textContent=c.dataset.title;
   fb.href=`https://vk.com/${c.dataset.type==='clip'?'clip':'video'}-227237589_${c.dataset.id}`;
   box.innerHTML=`<iframe src="${url(c)}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock" allowfullscreen title="${c.dataset.title}"></iframe>`;release=trap(vm,close)}));
 vm.querySelector('[data-close]').onclick=close;vm.addEventListener('click',e=>{if(e.target===vm)close()});
 const tabs=[...d.querySelectorAll('.vt')],rows=[...d.querySelectorAll('.vrow')],heads=[...d.querySelectorAll('.vrow__h')];
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
