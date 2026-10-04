/* BTMEDYA CONTENT GROWTH V3 · 2026-10-02
   Editorial content layer: clearer audience paths, richer formats, source-first publishing and conversion.
   No invented news, metrics or client claims.
*/
(function(){
  const ready=()=>{
    if(document.documentElement.dataset.btContentGrowth==='3') return;
    const hero=document.querySelector('.cinematic-hero');
    if(!hero) return;
    document.documentElement.dataset.btContentGrowth='3';
    const section=document.createElement('section');
    section.className='bt-content-growth';
    section.id='btmedya-content-map';
    section.setAttribute('aria-labelledby','bt-content-title');
    section.innerHTML=`
      <div class="bt-content-inner">
        <div class="bt-content-kicker">BTMEDYA / İÇERİK OMURGASI V3</div>
        <div class="bt-content-intro">
          <div><h2 id="bt-content-title">SAHADAN<br><span>YAYINA.</span></h2><div class="bt-content-tags" aria-label="BTMEDYA içerik türleri"><span>HABER</span><span>VİDEO</span><span>STÜDYO</span><span>SOSYAL</span><span>AI LAB</span></div></div>
          <p>BTMEDYA; gerçek saha görüntüsünü, editoryal bağlamı, görsel anlatıyı ve yeni nesil üretim araçlarını tek bir yayın zincirinde buluşturur. Okur haberini, müşteri üretimini ve AI deneyini aynı vitrinde görür; üretim yöntemi ve içerik türü açıkça ayrılır.</p>
        </div>
        <div class="bt-content-audience" aria-label="Ziyaretçi yolları">
          <a href="/haberler/"><span>OKUR</span><strong>Bugün ne oldu?</strong><small>Balıkesir gündemi, saha haberleri, röportajlar ve kaynaklı dosyalar.</small><b>HABER AKIŞI ↗</b></a>
          <a href="/hizmetler/"><span>MARKA</span><strong>İşimi nasıl anlatırım?</strong><small>Çekim, kısa video, tanıtım, reklam, sosyal medya ve sürekli içerik üretimi.</small><b>HİZMETLER ↗</b></a>
          <a href="/ai-lab/"><span>ÜRETİCİ</span><strong>Yeni ne deneyebiliriz?</strong><small>AI video, görsel, otomasyon ve etkileşimli dijital deneyimler, açık etiketle.</small><b>AI LAB ↗</b></a>
        </div>
        <div class="bt-content-grid">
          <article><span>01 / HABER</span><h3>Sahadan Şehre</h3><p>Balıkesir ve çevresinden gündem, yerel gelişmeler, röportajlar ve video haberler. Kaynak, tarih, görüntü ve haber künyesi görünür tutulur.</p><a href="/haberler/">Haber akışına git ↗</a></article>
          <article><span>02 / DOSYA</span><h3>Bir konunun peşine düş</h3><p>Tek haberlik akışın ötesinde; belge, saha görüntüsü, insan hikâyesi ve bağlamı aynı dosyada buluşturan araştırma formatı.</p><a href="/kaynak-masasi/">Kaynak Masası ↗</a></article>
          <article><span>03 / KENT</span><h3>Balıkesir'in hafızası</h3><p>İlçeler, mahalleler, ulaşım, ekonomi, kültür, üretim ve gündelik hayat için zaman içinde büyüyen yerel arşiv.</p><a href="/arsiv/">Kent arşivine git ↗</a></article>
          <article><span>04 / SAHA</span><h3>Görüntü konuşsun</h3><p>Gerçek çekim, röportaj, kamera arkası ve saha notları. Arşiv görüntüsü ile yeni çekim birbirinden ayrılarak gösterilir.</p><a href="/haberler/">Saha içeriklerini gör ↗</a></article>
          <article><span>05 / STUDIO</span><h3>Fikirden filme</h3><p>Düğün klibi, tanıtım filmi, marka filmi, reklam, Siyah Oda, belgesel ve kısa film için çekimden kurguya üretim.</p><a href="/video-produksiyon/">Studio hizmetleri ↗</a></article>
          <article><span>06 / SOSYAL</span><h3>Tek çekim, çoklu yayın</h3><p>Uzun video, Reels, Shorts, TikTok, kapak, başlık, açıklama ve yayın planını platforma göre uyarlayan içerik sistemi.</p><a href="/sosyal-medya/">Sosyal medya sistemi ↗</a></article>
          <article><span>07 / MARKA</span><h3>Markanın hikâyesi</h3><p>Kurumsal tanıtım, ürün anlatımı, kampanya, reklam ve düzenli içerik üretimi için proje veya aylık yayın modeli.</p><a href="/vaka-calismalari/">Vaka çalışmalarını gör ↗</a></article>
          <article class="is-ai"><span>08 / AI LAB</span><h3>Deneysel üretim, açık etiket</h3><p>AI video, görsel, otomasyon ve etkileşimli deneyimler. Yapay üretim gerçek haber ve gerçek saha arşiviyle karıştırılmaz.</p><a href="/ai-lab/">AI LAB'ı keşfet ↗</a></article>
          <article><span>09 / BLACK ROOM</span><h3>Sohbetten seriye</h3><p>İki kişilik stüdyo sohbeti, röportaj, uzman görüşü ve YouTube serileri için kayıt, kurgu, kısa klip ve yayın akışı.</p><a href="/video-produksiyon/">Podcast üretimini incele ↗</a></article>
          <article class="is-commercial"><span>10 / DAĞITIM</span><h3>İçerik → yayın → ölçüm</h3><p>İçeriği yalnızca üretmek değil; doğru kanala taşımak, performansı izlemek ve sonraki üretimi ölçülebilir verilerle geliştirmek.</p><a href="/sosyal-medya/">Yayın sistemini gör ↗</a></article>
          <article><span>11 / PORTFÖY</span><h3>Gerçek işi göster</h3><p>Haber, prodüksiyon, reklam, kısa film ve AI LAB üretimlerini türüne göre ayıran portföy yaklaşımı.</p><a href="/#gercek-isler">Gerçek işleri gör ↗</a></article>
          <article><span>12 / BRİEF</span><h3>İhtiyacı netleştir</h3><p>İşletmenizi, yayın hedefinizi ve teslim ihtiyacınızı anlatın. Uygun üretim yolunu birlikte belirleyelim.</p><a href="/iletisim/">Proje başlat ↗</a></article>
        </div>
        <div class="bt-content-formats">
          <div class="bt-content-formats-head"><span>BTMEDYA / YAYIN FORMATLARI</span><p>Aynı hikâye farklı kanallarda farklı biçimde anlatılır.</p></div>
          <div class="bt-content-format-list">
            <div><strong>HABER</strong><small>Başlık · spot · kaynak · saha · güncelleme</small></div>
            <div><strong>VİDEO</strong><small>Kapak · kısa başlık · açıklama · bölüm · klip</small></div>
            <div><strong>SOSYAL</strong><small>Reels · Shorts · TikTok · hikâye · carousel</small></div>
            <div><strong>MARKA</strong><small>Tanıtım · reklam · ürün · kampanya · vaka</small></div>
          </div>
        </div>
        <div class="bt-content-standard" aria-label="BTMEDYA editoryal standardı">
          <div><span>01</span><strong>KAYNAK</strong><small>İddianın kaynağı mümkün olduğunca birincil belgeyle gösterilir.</small></div>
          <div><span>02</span><strong>SAHA</strong><small>Görüntü, çekim tarihi ve arşiv niteliği korunur.</small></div>
          <div><span>03</span><strong>BAĞLAM</strong><small>Haber yalnızca başlık değildir; tarih ve konu çerçevesi görünürdür.</small></div>
          <div><span>04</span><strong>ETİKET</strong><small>AI, arşiv, temsilî görsel ve ticari içerik açıkça ayrılır.</small></div>
        </div>
        <div class="bt-content-process" aria-label="BTMEDYA üretim akışı"><span>FİKİR</span><b>→</b><span>KAYNAK / SAHA</span><b>→</b><span>ÜRETİM</span><b>→</b><span>KURGU</span><b>→</b><span>YAYIN</span><b>→</b><span>ÖLÇÜM</span></div>
      </div>`;
    hero.insertAdjacentElement('afterend',section);
    const cta=document.createElement('aside');
    cta.className='bt-content-cta';
    cta.innerHTML='<div><strong>Bir haberiniz, markanız veya projeniz var mı?</strong><span>İhtiyacı birlikte netleştirelim. Haber, prodüksiyon, sosyal medya, Black Room veya AI LAB için doğru içerik akışını seçelim.</span></div><div class="bt-content-cta-actions"><a href="/iletisim/">PROJEYİ ANLAT ↗</a><a href="/hizmetler/">HİZMETLER ↗</a></div>';
    const firstMain=document.querySelector('main');
    if(firstMain) firstMain.appendChild(cta); else section.insertAdjacentElement('afterend',cta);
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ready,{once:true}); else ready();
})();
