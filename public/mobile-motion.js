/* BTMEDYA Mobil Motion V10.1 · approved repair 2026-10-05
   Real-field video rail + mobile intro reliability + hero source bridge. */
(()=>{
  const heroStory=document.getElementById('heroStoryVideo');
  if(heroStory&&!heroStory.dataset.srcMobile&&heroStory.dataset.mobile) heroStory.dataset.srcMobile=heroStory.dataset.mobile;

  function addSahadan(){
    if(document.getElementById('sahadan-video-haberler')) return;
    const cards=document.getElementById('storyCards'); if(!cards)return;
    const rail=document.createElement('section'); rail.id='sahadan-video-haberler'; rail.className='sahadan-video-rail';
    rail.innerHTML=`<div class="sahadan-video-head"><div><p class="kicker">02.1 / SAHA VİDEO</p><h3>SAHADAN <span>HABERLER.</span></h3></div><p>BTMEDYA arşivindeki gerçek saha görüntüleri, ilgili haber başlığı ve kaynak bağlantısıyla birlikte gösterilir. Temsili görsel kullanılmaz.</p></div><div class="sahadan-video-grid">
      <article><a href="/haberler/balikesir-in-en-kalabalik-pazari/"><div class="sahadan-video-media"><video controls playsinline preload="metadata" poster="/assets/haber-kapak/balikesir-in-en-kalabalik-pazari.webp"><source src="/assets/sosyal/balikesir-in-en-kalabalik-pazari-dikey.mp4" type="video/mp4"></video><span>GERÇEK ÇEKİM</span></div><div class="sahadan-video-copy"><small>YEREL · PAZAR · 04 EKİM 2024</small><h4>Balıkesir'in En Kalabalık Pazarı</h4><p>Cuma Pazarı'ndan gerçek saha görüntüsü.</p><b>Haberi aç ↗</b></div></a></article>
      <article><a href="/haberler/balikesir-pazarinda-canli-helva-sovu/"><div class="sahadan-video-media"><video controls playsinline preload="metadata" poster="/assets/haber-kapak/balikesir-pazarinda-canli-helva-sovu.webp"><source src="/assets/sosyal/balikesir-pazarinda-canli-helva-sovu-dikey.mp4" type="video/mp4"></video><span>GERÇEK ÇEKİM</span></div><div class="sahadan-video-copy"><small>GASTRONOMİ · VİDEO · 02 MAYIS 2024</small><h4>Balıkesir Pazarında Canlı Helva Şovu</h4><p>Gerçek görüntülü saha haberi.</p><b>Haberi aç ↗</b></div></a></article>
      <article><a href="/haberler/el-emegi-yorganlar-artik-isitmiyor/"><div class="sahadan-video-media"><video controls playsinline preload="metadata" poster="/assets/haber-kapak/el-emegi-yorganlar-artik-isitmiyor.webp"><source src="/assets/sosyal/el-emegi-yorganlar-artik-isitmiyor-dikey.mp4" type="video/mp4"></video><span>GERÇEK ÇEKİM</span></div><div class="sahadan-video-copy"><small>KÜLTÜR · ZANAAT · 19 AĞUSTOS 2024</small><h4>El Emeği Yorganlar Artık Isıtmıyor</h4><p>Balıkesir Mobilyacılar Çarşısı'ndan saha hikâyesi.</p><b>Haberi aç ↗</b></div></a></article>
    </div>`;
    cards.parentNode.insertBefore(rail,cards);
    const css=document.createElement('style'); css.id='btmedya-sahadan-video-style'; css.textContent=`.sahadan-video-rail{margin:40px 0;padding:24px;border:1px solid rgba(255,255,255,.12);border-radius:20px;background:rgba(255,255,255,.025)}.sahadan-video-head{display:grid;grid-template-columns:1fr .8fr;gap:20px;margin-bottom:18px}.sahadan-video-head h3{font-size:clamp(28px,4vw,52px);margin:.1em 0}.sahadan-video-head h3 span{color:var(--cin-cyan,#64e4ff)}.sahadan-video-head p{color:var(--cin-muted,#9eacbb);line-height:1.6}.sahadan-video-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.sahadan-video-grid article{border:1px solid rgba(255,255,255,.1);border-radius:14px;overflow:hidden;background:#080b10}.sahadan-video-grid a{display:block;color:inherit;text-decoration:none}.sahadan-video-media{position:relative;background:#000;aspect-ratio:9/16;overflow:hidden}.sahadan-video-media video{display:block;width:100%;height:100%;object-fit:contain;background:#000}.sahadan-video-media span{position:absolute;left:10px;top:10px;padding:5px 7px;background:rgba(0,0,0,.78);font:700 10px/1.1 ui-monospace,monospace}.sahadan-video-copy{padding:15px}.sahadan-video-copy small{display:block;opacity:.62;font-size:9px;letter-spacing:.08em}.sahadan-video-copy h4{margin:7px 0 5px;font-size:18px;line-height:1.12}.sahadan-video-copy p{margin:0 0 11px;color:var(--cin-muted,#9eacbb);font-size:12px;line-height:1.5}@media(max-width:760px){.sahadan-video-rail{margin-inline:0;padding:18px}.sahadan-video-head{display:block}.sahadan-video-head>p{margin-top:10px}.sahadan-video-grid{grid-template-columns:1fr}.sahadan-video-media{max-height:72svh}}`;
    document.head.appendChild(css);
    const ld=[
      ['Balıkesir\'in En Kalabalık Pazarı','2024-10-04T09:00:00+03:00','/assets/haber-kapak/balikesir-in-en-kalabalik-pazari.webp','/assets/sosyal/balikesir-in-en-kalabalik-pazari-dikey.mp4'],
      ['Balıkesir Pazarında Canlı Helva Şovu','2024-05-02T09:00:00+03:00','/assets/haber-kapak/balikesir-pazarinda-canli-helva-sovu.webp','/assets/sosyal/balikesir-pazarinda-canli-helva-sovu-dikey.mp4'],
      ['El Emeği Yorganlar Artık Isıtmıyor','2024-08-19T09:00:00+03:00','/assets/haber-kapak/el-emegi-yorganlar-artik-isitmiyor.webp','/assets/sosyal/el-emegi-yorganlar-artik-isitmiyor-dikey.mp4']
    ].map(x=>({'@type':'VideoObject',name:x[0],uploadDate:x[1],thumbnailUrl:'https://btmedya.com.tr'+x[2],contentUrl:'https://btmedya.com.tr'+x[3],creator:{'@type':'Organization',name:'BTMEDYA',url:'https://btmedya.com.tr/'}}));
    const sc=document.createElement('script'); sc.type='application/ld+json'; sc.id='btmedya-sahadan-video-schema'; sc.textContent=JSON.stringify({'@context':'https://schema.org','@graph':ld}); document.head.appendChild(sc);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',addSahadan,{once:true}); else addSahadan();

  const root=document.querySelector('.cinematic-hero'); if(!root||innerWidth>720)return;
  const box=root.querySelector('[data-mfilm]'), video=box&&box.querySelector('video'); if(!video)return;
  const label=box.querySelector('[data-mfilm-etiket]'), playBtn=box.querySelector('[data-mfilm-oynat]'), soundBtn=box.querySelector('[data-mfilm-ses]');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches, DEFAULT='/assets/media/web/giris-filmi.mp4';
  let visible=true, stopped=false, source=DEFAULT;
  const sound=()=>{if(!soundBtn)return;soundBtn.setAttribute('aria-pressed',String(!video.muted));soundBtn.setAttribute('aria-label',video.muted?'Sesi aç':'Sesi kapat');soundBtn.textContent=video.muted?'🔇 Sesi aç':'🔊 Sesi kapat'};
  const load=()=>{if(video.src)return;video.preload='auto';video.muted=true;video.playsInline=true;video.src=source;video.load()};
  const start=()=>{if(stopped||!visible||document.hidden)return;load();const p=video.play();if(p)p.catch(()=>{})};
  playBtn&&playBtn.addEventListener('click',()=>{stopped=false;if(video.ended)video.currentTime=0;start()});
  soundBtn&&soundBtn.addEventListener('click',()=>{video.muted=!video.muted;sound();if(!video.paused)start()});
  video.addEventListener('play',()=>{if(playBtn)playBtn.hidden=true;box.classList.add('mfilm-oynuyor')});
  video.addEventListener('pause',()=>box.classList.remove('mfilm-oynuyor'));
  video.addEventListener('ended',()=>{if(playBtn){playBtn.hidden=false;playBtn.textContent='↺ Yeniden izle'}});
  if('IntersectionObserver' in window)new IntersectionObserver(es=>es.forEach(e=>{visible=e.isIntersecting;if(visible&&!reduced)start();else if(!visible)video.pause()}),{threshold:.15}).observe(video);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();else if(!reduced)start()});
  if(label)label.textContent='GERÇEK ÇEKİM · BTMEDYA ARŞİVİ'; sound();
  setTimeout(()=>{if(!reduced&&!document.hidden){video.muted=true;start()}},100);
})();
