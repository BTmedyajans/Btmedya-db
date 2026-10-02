/* BTMEDYA CONTENT GROWTH V2 · 2026-10-02
   Editorial content layer: richer positioning, clearer formats, source-first publishing and conversion paths.
   No invented news, metrics or client claims.
*/
(function(){
  const ready=()=>{
    if(document.documentElement.dataset.btContentGrowth==='2') return;
    const hero=document.querySelector('.cinematic-hero');
    if(!hero) return;
    document.documentElement.dataset.btContentGrowth='2';
    const section=document.createElement('section');
    section.className='bt-content-growth';
    section.id='btmedya-content-map';
    section.setAttribute('aria-labelledby','bt-content-title');
    section.innerHTML=`
      <div class="bt-content-inner">
        <div class="bt-content-kicker">BTMEDYA / İÇERİK OMURGASI V2</div>
        <div class="bt-content-intro">
          <div><h2 id="bt-content-title">SAHADAN<br><span>YAYINA.</span></h2></div>
          <p>BTMEDYA; gerçek saha görüntüsünü, editoryal bağlamı, güçlü görsel anlatıyı ve yeni nesil üretim araçlarını tek bir içerik zincirinde buluşturur. Haber ile AI üretimi ayrı tutulur, üretim yöntemi görünür olur.</p>
        </div>
        <div class="bt-content-grid">
          <article><span>01 / HABER</span><h3>Sahadan Şehre</h3><p>Balıkesir ve çevresinden gündem, yerel gelişmeler, röportajlar ve video haberler. Kaynak, tarih ve görüntü bilgisi görünür tutulur.</p><a href="/haberler/">Haber akışına git ↗</a></article>
          <article><span>02 / DOSYA</span><h3>Bir konunun peşine düş</h3><p>Tek haberlik akışın ötesinde; belge, saha görüntüsü, insan hikâyesi ve bağlamı aynı dosyada buluşturan içerikler.</p><a href="/kaynak-masasi/">Kaynak Masası ↗</a></article>
          <article><span>03 / KENT</span><h3>Balıkesir'in hafızası</h3><p>İlçeler, mahalleler, ulaşım, ekonomi, kültür, üretim ve gündelik hayat için zaman içinde büyüyen yerel arşiv.</p><a href="/arsiv/">Kent arşivine git ↗</a></article>
          <article><span>04 / STUDIO</span><h3>Fikirden filme</h3><p>Düğün klibi, tanıtım filmi, marka filmi, reklam, Siyah Oda, belgesel ve kısa film için çekimden kurguya üretim.</p><a href="/video-produksiyon/">Studio hizmetleri ↗</a></article>
          <article><span>05 / SOSYAL</span><h3>Tek çekim, çoklu yayın</h3><p>Uzun video, kısa video, kapak, başlık, açıklama ve yayın planını platforma göre uyarlayan içerik sistemi.</p><a href="/sosyal-medya/">Sosyal medya sistemi ↗</a></article>
          <article><span>06 / MARKA</span><h3>Markanın hikâyesi</h3><p>Kurumsal tanıtım, ürün anlatımı, kampanya, reklam ve sürekli içerik üretimi için proje veya düzenli yayın modeli.</p><a href="/vaka-calismalari/">Vaka çalışmalarını gör ↗</a></article>
          <article class="is-ai"><span>07 / AI LAB</span><h3>Deneysel üretim, açık etiket</h3><p>AI video, görsel, otomasyon ve etkileşimli deneyimler. Gerçek çekim ile yapay üretim birbirine karıştırılmaz.</p><a href="/ai-lab/">AI LAB'ı keşfet ↗</a></article>
          <article><span>08 / BLACK ROOM</span><h3>Sohbetten seriye</h3><p>İki kişilik stüdyo sohbeti, röportaj, uzman görüşü ve YouTube serileri için kayıt, kurgu ve yayın akışı.</p><a href="/video-produksiyon/">Podcast üretimini incele ↗</a></article>
          <article class="is-commercial"><span>09 / İŞE DÖNÜŞEN İÇERİK</span><h3>İçerik → yayın → ölçüm</h3><p>İçeriği yalnızca üretmek değil; doğru kanala taşımak, performansı izlemek ve sonraki üretimi veriye göre geliştirmek.</p><a href="/iletisim/">Proje akışını başlat ↗</a></article>
        </div>
        <div class="bt-content-standard" aria-label="BTMEDYA editoryal standardı">
          <div><span>01</span><strong>KAYNAK</strong><small>İddianın kaynağı görünür.</small></div>
          <div><span>02</span><strong>SAHA</strong><small>Görüntü ve çekim bilgisi korunur.</small></div>
          <div><span>03</span><strong>BAĞLAM</strong><small>Haber yalnızca başlık değildir.</small></div>
          <div><span>04</span><strong>ETİKET</strong><small>AI ve arşiv kullanımı açıkça belirtilir.</small></div>
        </div>
        <div class="bt-content-process" aria-label="BTMEDYA üretim akışı">
          <span>FİKİR</span><b>→</b><span>KAYNAK / SAHA</span><b>→</b><span>ÜRETİM</span><b>→</b><span>KURGU</span><b>→</b><span>YAYIN</span><b>→</b><span>ÖLÇÜM</span>
        </div>
      </div>`;
    hero.insertAdjacentElement('afterend',section);
    const cta=document.createElement('aside');
    cta.className='bt-content-cta';
    cta.innerHTML='<strong>Bir haberiniz, markanız veya projeniz var mı?</strong><span>İhtiyacı birlikte netleştirelim. Haber, prodüksiyon, sosyal medya veya AI LAB için doğru içerik akışını seçelim.</span><a href="/iletisim/">PROJEYİ ANLAT ↗</a>';
    const firstMain=document.querySelector('main');
    if(firstMain) firstMain.appendChild(cta); else section.insertAdjacentElement('afterend',cta);
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ready,{once:true}); else ready();
})();
