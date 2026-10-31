(()=>{
const d=document;
const yaTrack=d.getElementById('rev-cards');
const vkTrack=d.getElementById('rev-vk-cards');

const clip=(t,n=300)=>{
  t=(t||'').replace(/\s+/g,' ').trim();
  if(t.length<=n)return t;
  return t.slice(0,n).replace(/\s+\S*$/,'')+'…';
};
const stars=n=>'★★★★★'.slice(0,Math.max(0,Math.min(5,n|0)));
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const card=(r,srcLabel,href)=>{
  const el=d.createElement('article');
  el.className='rev-card';
  const rating=r.rating||r.stars||5;
  const author=r.author||r.name||'';
  el.innerHTML=
    `<div class="rev-card__top"><span class="rev-card__stars" aria-label="${rating} из 5">${stars(rating)}</span>`+
    `<a class="rev-card__src" href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(srcLabel)}</a></div>`+
    `<p class="rev-card__text">${escapeHtml(clip(r.text))}</p>`+
    `<div class="rev-card__meta"><span class="rev-card__name">${escapeHtml(author)}</span>`+
    `<span class="rev-card__date">${escapeHtml(r.date||'')}</span></div>`;
  return el;
};

const wireNav=(scroller,prevSel,nextSel)=>{
  const prev=d.querySelector(prevSel);
  const next=d.querySelector(nextSel);
  if(!prev||!next||!scroller)return;
  const step=()=>Math.max(280, Math.floor(scroller.clientWidth*0.85));
  const sync=()=>{
    const max=scroller.scrollWidth-scroller.clientWidth-4;
    prev.disabled=scroller.scrollLeft<=4;
    next.disabled=scroller.scrollLeft>=max;
  };
  prev.onclick=()=>scroller.scrollBy({left:-step(),behavior:'smooth'});
  next.onclick=()=>scroller.scrollBy({left:step(),behavior:'smooth'});
  scroller.addEventListener('scroll',sync,{passive:true});
  addEventListener('resize',sync);
  sync();
};

(async()=>{
  if(yaTrack){
    let data=[];
    try{
      const res=await fetch('data/yandex-reviews.json',{credentials:'same-origin'});
      if(res.ok) data=await res.json();
    }catch(e){}
    if(Array.isArray(data)&&data.length){
      yaTrack.replaceChildren();
      data.slice(0,8).forEach(r=>yaTrack.appendChild(card(r,'Яндекс Карты',r.url||'https://yandex.ru/maps/org/vr_lounge/5361992713/reviews/')));
      wireNav(yaTrack,'[data-rev-prev]','[data-rev-next]');
    }else{
      yaTrack.innerHTML='<p class="small"><a href="https://yandex.ru/maps/org/vr_lounge/5361992713/reviews/">Отзывы на Яндекс Картах →</a></p>';
    }
  }

  if(vkTrack){
    try{
      const res=await fetch('data/vk-reviews.json',{credentials:'same-origin'});
      if(!res.ok)return;
      const payload=await res.json();
      const list=Array.isArray(payload)?payload:(payload.reviews||[]);
      const withText=list.filter(r=>(r.text||'').trim().length>0).slice(0,6);
      if(!withText.length)return;
      vkTrack.replaceChildren();
      withText.forEach(r=>vkTrack.appendChild(card(r,'ВКонтакте',payload.meta&&payload.meta.source||'https://vk.com/reviews-227237589')));
    }catch(e){}
  }
})();
})();
