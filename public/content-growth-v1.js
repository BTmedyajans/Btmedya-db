/* BTMEDYA CONTENT GROWTH V1 · 2026-10-02
   Editorial content layer: richer positioning, service clarity and conversion paths.
   No invented news or metrics.
*/
(function(){
  const ready=()=>{
    if(document.documentElement.dataset.btContentGrowth==='1') return;
    const hero=document.querySelector('.cinematic-hero');
    if(!hero) return;
    document.documentElement.dataset.btContentGrowth='1';
    const section=document.createElement('section');
    section.className='bt-content-growth';
    section.id='btmedya-content-map';
    section.setAttribute('aria-labelledby','bt-content-title');
    section.innerHTML=`
      <div class="bt-content-inner">
        <div class="bt-content-kicker">BTMEDYA / İÇERİK OMURGASI</div>
        <div class="bt-content-intro">
          <div><h2 id="bt-content-title">HABERDEN HİKÂYEYE.<br><span>HİKÂYEDEN YAYINA.</span></h2></div>
          <p>BTMEDYA; sahadaki gerçek görüntüyü, güçlü anlatıyı ve yeni nesil üretim araçlarını aynı yayın zincirinde buluşturur. Haber ayrı bir editoryal alan, AI LAB ise açıkça etiketlenmiş deneysel üretim alanıdır.</p>
        </div>
        <div class="bt-content-grid">
          <article><span>01 / HABER</span><h3>Sahadan Şehre</h3><p>Balıkesir ve çevresinden gündem, yerel gelişmeler, röportajlar ve video haberler. Kaynak, tarih ve çekim bilgisi görünür tutulur.</p><a href="/haberler/">Haber akışına git ↗</a></article>
          <article><span>02 / ÖZEL DOSYA</span><h3>Bir konunun peşine düş</h3><p>Tek haberlik gündem yerine bağlam, saha görüntüsü, insan hikâyesi ve belgeyi bir araya getiren derinlikli içerikler.</p><a href="/kaynak-masasi/">Kaynak Masası ↗</a></article>
          <article><span>03 / STUDIO</span><h3>Fikirden filme</h3><p>Düğün klibi, tanıtım filmi, marka filmi, reklam, sosyal içerik, Siyah Oda, belgesel ve kısa film için çekimden kurguya üretim.</p><a href="/video-produksiyon/">Studio hizmetleri ↗</a></article>
          <article><span>04 / SOSYAL</span><h3>İçerikten yayına</h3><p>Platforma göre uyarlanan kısa video, kapak, metin, yayın planı ve performans takibi. İçerik tek kez üretilip çoklu kanalda değerlendirilebilir.</p><a href="/sosyal-medya/">Sosyal medya sistemi ↗</a></article>
          <article class="is-ai"><span>05 / AI LAB</span><h3>Deneysel üretim, açık etiket</h3><p>AI video, görsel, otomasyon ve etkileşimli deneyimler. Gerçek çekim ile yapay üretim birbirine karıştırılmaz, üretim yöntemi açıkça belirtilir.</p><a href="/ai-lab/">AI LAB'ı keşfet ↗</a></article>
          <article class="is-commercial"><span>06 / MARKALAR</span><h3>İçeriği işe dönüştür</h3><p>Marka hikâyesi, kampanya, reklam, sosyal medya ve sürekli içerik üretimi için ihtiyaca göre proje veya düzenli yayın modeli.</p><a href="/iletisim/">Proje anlat ↗</a></article>
        </div>
        <div class="bt-content-process" aria-label="BTMEDYA üretim akışı">
          <span>FİKİR</span><b>→</b><span>SAHA / ÜRETİM</span><b>→</b><span>KURGU</span><b>→</b><span>YAYIN</span><b>→</b><span>ÖLÇÜM</span>
        </div>
      </div>`;
    hero.insertAdjacentElement('afterend',section);
    const cta=document.createElement('aside');
    cta.className='bt-content-cta';
    cta.innerHTML='<strong>Bir haberiniz, markanız veya projeniz var mı?</strong><span>İhtiyacı birlikte netleştirelim. Haber, prodüksiyon, sosyal medya veya AI LAB için doğru akışı seçelim.</span><a href="/iletisim/">PROJEYİ ANLAT ↗</a>';
    const firstMain=document.querySelector('main');
    if(firstMain) firstMain.appendChild(cta); else section.insertAdjacentElement('afterend',cta);
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ready,{once:true}); else ready();
})();
