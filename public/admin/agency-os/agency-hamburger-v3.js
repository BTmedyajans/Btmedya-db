/* BTMEDYA Agency OS / Categorized Hamburger v3 */
(()=> {
  const toggle=document.getElementById('adminMenuToggle');
  const menu=document.getElementById('adminMenu');
  const close=document.getElementById('adminMenuClose');
  if(!toggle||!menu||!close)return;
  const setOpen=open=>{
    menu.classList.toggle('open',open);
    menu.setAttribute('aria-hidden',String(!open));
    toggle.setAttribute('aria-expanded',String(open));
    document.body.classList.toggle('menu-open',open);
    if(open) menu.querySelector('a')?.focus();
  };
  toggle.addEventListener('click',()=>setOpen(!menu.classList.contains('open')));
  close.addEventListener('click',()=>setOpen(false));
  menu.addEventListener('click',e=>{if(e.target===menu)setOpen(false)});
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setOpen(false)));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false)});
})();