/* booking bottom sheet: all [data-book] CTAs open it; tel/wa href stays as no-JS fallback */
(()=>{const d=document,bs=d.getElementById('bs');if(!bs)return;
const box=bs.querySelector('.bs__box'),ctx=bs.querySelector('.bs__ctx'),rm=matchMedia('(prefers-reduced-motion: reduce)');
let prev=null,open=false,t=null;
const focusables=()=>[...bs.querySelectorAll('a[href],button')].filter(x=>x.offsetParent);
const key=e=>{if(e.key==='Escape'){e.preventDefault();close()}else if(e.key==='Tab'){const f=focusables(),a=f[0],z=f[f.length-1];if(e.shiftKey&&d.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&d.activeElement===z){e.preventDefault();a.focus()}}};
function show(label){clearTimeout(t);prev=d.activeElement;ctx.hidden=!label;ctx.textContent=label?'Вы выбрали: '+label:'';
  bs.hidden=false;box.style.transform='';d.body.classList.add('lock');requestAnimationFrame(()=>requestAnimationFrame(()=>bs.classList.add('is-open')));
  open=true;d.addEventListener('keydown',key);setTimeout(()=>bs.querySelector('.bs__call').focus({preventScroll:true}),rm.matches?0:60)}
function close(){if(!open)return;open=false;bs.classList.remove('is-open');d.removeEventListener('keydown',key);box.style.transform='';
  const fin=()=>{bs.hidden=true;d.body.classList.remove('lock');prev&&prev.focus&&prev.focus({preventScroll:true})};
  rm.matches?fin():(t=setTimeout(fin,320))}
d.addEventListener('click',e=>{const a=e.target.closest('[data-book]');if(!a||e.metaKey||e.ctrlKey)return;e.preventDefault();show(a.dataset.book||'')});
bs.querySelectorAll('[data-bs-close]').forEach(x=>x.addEventListener('click',close));
/* links inside: close after the tap so returning to the page is clean */
bs.querySelectorAll('.bs__call,.bs__opt').forEach(a=>a.addEventListener('click',()=>setTimeout(close,400)));
/* swipe down to close (grab handle / header area or anywhere when sheet isn't scrolled) */
let y0=null,dy=0;
box.addEventListener('touchstart',e=>{if(box.scrollTop>0)return;y0=e.touches[0].clientY;dy=0;box.style.transition='none'},{passive:true});
box.addEventListener('touchmove',e=>{if(y0===null)return;dy=Math.max(0,e.touches[0].clientY-y0);box.style.transform=dy?`translateY(${dy}px)`:''},{passive:true});
box.addEventListener('touchend',()=>{if(y0===null)return;box.style.transition='';const h=box.offsetHeight;y0=null;if(dy>Math.min(120,h*.25))close();else box.style.transform='';dy=0});
})();
