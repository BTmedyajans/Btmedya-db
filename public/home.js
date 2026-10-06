    const last = focusable[focusable.length - 1];
    if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  if (!reduced) {
    if (hover) d.body.classList.add('parallax-ready');
    /* ---------- PORTFÖY: YouTube kanalındaki gerçek işler ----------
     Veri public/data/youtube-portfoy.json dosyasından okunur; izlenme ve
     süre kanaldan alınmış sabit değerlerdir, uydurma yoktur. Önizleme
     yalnızca tıklamayla açılır: sayfa açılışında 14 iframe yüklemek hem
     mobil veriyi hem de ilk boyama süresini gereksiz yere harcar. */
  const sayi = n => Number(n || 0).toLocaleString('tr-TR');

  const portfoyKarti = (x) => {
    const b = esc(x.baslik || '');
    return '<article class="portfoy-kart" data-kategori="' + esc(x.kategori || '') + '" data-niyetler="' + esc((x.niyetler || []).join('|')) + '">' +
      '<button class="portfoy-oynat" type="button" data-video="' + esc(x.id || '') + '"' +
      ' aria-label="' + b + ' — önizlemeyi oynat">' +
      '<img class="portfoy-kapak" loading="lazy" decoding="async" src="' + esc(x.kapak || '') + '" alt="' + b + '">' +
      '<span class="portfoy-rozet" aria-hidden="true"></span>' +
      '<span class="portfoy-sure">' + esc(x.sure || '') + '</span></button>' +
      '<div class="portfoy-metin"><h3>' + b + '</h3>' +
      '<p>' + sayi(x.izlenme) + ' izlenme · ' + esc(String(x.tarih || '').slice(0, 4)) + '</p>' +
      '<a href="https://www.youtube.com/watch?v=' + encodeURIComponent(x.id || '') + '"' +
      ' target="_blank" rel="noopener">YouTube’da aç ↗</a></div></article>';
  };

  const loadPortfoy = async () => {
    const grid = d.getElementById('portfoyGrid');
    if (!grid) return;
    const filtre = d.getElementById('portfoyFiltre');
    const kanalKutu = d.getElementById('portfoyKanal');
    let veri;
    try {
      const r = await fetch('/data/youtube-portfoy.json?v=20261007-1', {headers:{accept:'application/json','cache-control':'no-cache'}});
      if (!r.ok) throw new Error('HTTP ' + r.status);
      veri = await r.json();
    } catch (err) {
      grid.innerHTML = '<div class="portfoy-bos">Portföy şu anda okunamadı. Kanal yine açık: ' +
        '<a href="https://www.youtube.com/@BTmedyaAjans" target="_blank" rel="noopener">YouTube ↗</a></div>';
      return;
    }
    const isler = Array.isArray(veri.isler) ? veri.isler : [];
    if (!isler.length) { grid.innerHTML = '<div class="portfoy-bos">Portföy kaydı yok.</div>'; return; }

    const k = veri.kanal || {};
    if (kanalKutu && k.ad) {
      kanalKutu.innerHTML =
        '<span><b>' + sayi(k.abone) + '</b>abone</span>' +
        '<span><b>' + sayi(k.izlenme) + '</b>toplam izlenme</span>' +
        '<span><b>' + sayi(k.video) + '</b>video</span>' +
        '<span class="portfoy-kanal-ad">' + esc(k.ad) + ' · YouTube</span>';
    }

    grid.innerHTML = isler.map(portfoyKarti).join('');
    grid.setAttribute('aria-busy','false');

    if (filtre) {
      const kategoriler = [{ad:'', etiket:'TÜMÜ'}].concat(
        (veri.kategoriler || []).filter(c => isler.some(x => x.kategori === c.ad)));
      const niyetler = [
        ['dugun','DÜĞÜN'],
        ['nisan','NİŞAN'],
        ['kina','KINA'],
        ['gelin-alimi','GELİN ALIMI'],
        ['etkinlik','ETKİNLİK'],
        ['firma','FİRMA'],
        ['tanitim','TANITIM']
      ];
      filtre.innerHTML =
        '<div class="portfoy-filtre-grup"><span class="portfoy-filtre-label">TÜR</span>' +
        kategoriler.map((c, i) =>
          '<button class="portfoy-sekme' + (i === 0 ? ' secili' : '') + '" type="button"' +
          ' aria-pressed="' + (i === 0) + '" data-kategori="' + esc(c.ad) + '">' + esc(c.etiket) + '</button>'
        ).join('') +
        '</div>' +
        '<div class="portfoy-filtre-grup"><span class="portfoy-filtre-label">HİZMET NİYETİ</span>' +
        niyetler.map(([ad,label]) =>
          '<button class="portfoy-sekme portfoy-niyet" type="button" aria-pressed="false" data-niyet="' + esc(ad) + '">' + esc(label) + '</button>'
        ).join('') +
        '</div>';

      const kartlar = [...grid.querySelectorAll('.portfoy-kart')];
      const bosMesaji = msg => {
        let box=grid.querySelector('.portfoy-bos-filtre');
        if(!box){ box=d.createElement('div'); box.className='portfoy-bos portfoy-bos-filtre'; grid.appendChild(box); }
        box.innerHTML='<strong>' + esc(msg) + '</strong><span>Arşive yeni gerçek çekim eklendiğinde bu filtre otomatik güncellenir.</span>';
      };
      const gizleBosMesaji = () => grid.querySelector('.portfoy-bos-filtre')?.remove();
      const uygula = ({kategori='',niyet=''}={}) => {
        let visible=0;
        kartlar.forEach(kart=>{
          const katOk=!kategori || kart.dataset.kategori===kategori;
          const niyetler=String(kart.dataset.niyetler||'').split('|').filter(Boolean);
          const niyetOk=!niyet || niyetler.includes(niyet);
          const show=katOk&&niyetOk;
          kart.hidden=!show;
          if(show)visible++;
        });
        gizleBosMesaji();
        if(!visible && (kategori || niyet)){
          const labels={dugun:'düğün videosu',nisan:'nişan çekimi',kina:'kına çekimi','gelin-alimi':'gelin alımı',etkinlik:'etkinlik çekimi',firma:'firma/işletme tanıtımı',tanitim:'tanıtım filmi'};
          bosMesaji('Bu hizmet niyeti için doğrulanmış BTMEDYA portföy kaydı henüz yok: ' + esc(labels[niyet]||niyet||kategori) + '.');
        }
      };
      const kategoriButtons=[...filtre.querySelectorAll('[data-kategori]')];
      const niyetButtons=[...filtre.querySelectorAll('[data-niyet]')];
      const urlParams=new URLSearchParams(location.search);
      const urlKategori=urlParams.get('kategori')||'';
      const urlNiyet=urlParams.get('niyet')||'';

      const seciliGoster = (selector, target) => {
        filtre.querySelectorAll(selector).forEach(x=>{
          const active=x===target;
          x.classList.toggle('secili',active);
          x.setAttribute('aria-pressed',String(active));
        });
      };
      if(urlNiyet){
        const hedef=niyetButtons.find(x=>x.dataset.niyet===urlNiyet);
        if(hedef){seciliGoster('[data-niyet]',hedef);seciliGoster('[data-kategori]','');uygula({niyet:urlNiyet});}
        else uygula({niyet:urlNiyet});
      }else if(urlKategori){
        const hedef=kategoriButtons.find(x=>x.dataset.kategori===urlKategori);
        if(hedef){seciliGoster('[data-kategori]',hedef);uygula({kategori:urlKategori});}
        else uygula({kategori:urlKategori});
      }else{
        uygula({});
      }

      filtre.addEventListener('click', e => {
        const b=e.target.closest('.portfoy-sekme');
        if(!b)return;
        if(b.dataset.niyet){
          seciliGoster('[data-niyet]',b);
          seciliGoster('[data-kategori]',kategoriButtons[0]||null);
          uygula({niyet:b.dataset.niyet});
          return;
        }
        const sec=b.dataset.kategori||'';
        seciliGoster('[data-kategori]',b);
        niyetButtons.forEach(x=>{x.classList.remove('secili');x.setAttribute('aria-pressed','false');});
        uygula({kategori:sec});
      });
    }

    /* Tıklanan kartın kapağı yerine gömülü oynatıcı gelir. Kart başına en
       fazla bir iframe açılır; youtube-nocookie CSP'de zaten izinli. */
    grid.addEventListener('click', e => {
      const b = e.target.closest('.portfoy-oynat');
      if (!b) return;
      const id = b.dataset.video;
      if (!id) return;
      const cerceve = d.createElement('iframe');
      cerceve.className = 'portfoy-cerceve';
      cerceve.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) +
        '?autoplay=1&rel=0&modestbranding=1';
      cerceve.title = b.getAttribute('aria-label') || 'BTMEDYA portföy videosu';
      cerceve.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture';
      cerceve.setAttribute('allowfullscreen', '');
      cerceve.loading = 'lazy';
      b.replaceWith(cerceve);