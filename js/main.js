(()=>{const d=document,h=d.documentElement;h.classList.add('js');
const rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
// ticker duplicate for seamless loop
const t=d.querySelector('.ticker');if(t&&!rm){t.innerHTML+=t.innerHTML;[...t.children].slice(t.children.length/2).forEach(li=>li.setAttribute('aria-hidden','true'))}
// tabs
const tabs=[...d.querySelectorAll('[role=tab]')];const sel=b=>{tabs.forEach(x=>{const on=x===b;x.setAttribute('aria-selected',on);x.tabIndex=on?0:-1;d.getElementById(x.getAttribute('aria-controls')).hidden=!on&&innerWidth<=700})};
tabs.forEach(b=>b.addEventListener('click',()=>sel(b)));const we=[0,6].includes(new Date().getDay());sel(tabs[we?1:0]);addEventListener('resize',()=>sel(tabs.find(x=>x.getAttribute('aria-selected')==='true')));
// reveal
if(!rm&&'IntersectionObserver'in window){const els=d.querySelectorAll('.sec__head,.zone,.ptable,.hall,.pack,.song,.faq details,.final__in,.player,.revwrap');els.forEach(e=>e.classList.add('rv'));const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px'});els.forEach(e=>io.observe(e))}
// hero tilt (one main motion)
const m=d.querySelector('[data-tilt]');if(m&&!rm&&matchMedia('(pointer:fine)').matches){addEventListener('pointermove',e=>{const x=e.clientX/innerWidth-.5,y=e.clientY/innerHeight-.5;m.style.transform=`perspective(1200px) rotateY(${x*6}deg) rotateX(${-y*5}deg)`},{passive:true})}
})();
