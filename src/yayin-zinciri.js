/* BTMEDYA günlük yayın zinciri durumu.
   Sabah Masası, kapak üretimi ve doğrudan sosyal yayın birbirinden bağımsız
   zincirlerdir. Social OS, bağlı platformların resmî OAuth/API izinlerini ve
   Cloudflare D1 kuyruk durumunu raporlar. Bu modül yalnızca okur. */
import { sabahAyarlari, sabahRaporu, KATEGORILER, gununKategorileri } from './sabah-masasi.js';
import { ayarlariOku as sosyalAyarlari } from './sosyal-otomasyon.js';

const SAAT = 3600000;
const PLAKA = /^\/assets\/(?:kategori-kapak|paylasim)\/[^/]+$/;

async function uretilmisKapaklar(env) {
  try {
    const r = env.ASSETS && await env.ASSETS.fetch(new Request('https://btmedya.internal/data/haber-kapak-kaynagi.json'));
    return r && r.ok ? new Set(Object.keys(await r.json())) : new Set();
  } catch { return new Set(); }
}

// Sabah Masası yerel şeridi kendi içinde "Yerel" adını taşır; panelde sitedeki adıyla görünür.
function bolumAdlari(liste) { return liste.map(k => ({ anahtar: k.anahtar, ad: k.anahtar === 'balikesir' ? 'Balıkesir' : k.kategori })); }

export async function zincirDurumu(env, simdi = Date.now()) {
  const ayar = await sabahAyarlari(env);
  const rapor = await sabahRaporu(env);
  const sosyal = await sosyalAyarlari(env);
  const secili = KATEGORILER.filter(k => ayar.kategoriler.includes(k.anahtar));
  const gun = Math.floor(simdi / 86400000);
  const halkalar = [];

  // 1) Trend ve kaynak taraması + AI taslak + doğrulama (Sabah Masası).
  const bitis = rapor && Date.parse(rapor.bitis || '') || 0;
  const yas = bitis ? (simdi - bitis) / SAAT : Infinity;
  const secilen = Array.isArray(rapor && rapor.secilen) ? rapor.secilen : [];
  const durumSay = secilen.reduce((m, x) => { m[x.durum] = (m[x.durum] || 0) + 1; return m; }, {});
  halkalar.push({
    anahtar: 'sabah', ad: 'Gündem taraması ve AI taslak', saat: '08:00 TSİ',
    durum: !ayar.etkin ? 'kapali' : yas <= 26 ? (rapor.hatalar && rapor.hatalar.length ? 'uyari' : 'tamam') : 'eksik',
    ozet: !ayar.etkin ? 'Sabah Masası kapalı.'
      : bitis ? `Son çalışma ${new Date(bitis).toISOString().slice(0, 16).replace('T', ' ')} UTC · ${(rapor.trendler || []).length} trend · ${secilen.length} bölüm` +
        (rapor.hatalar && rapor.hatalar.length ? ` · ${rapor.hatalar.length} kaynak hatası` : '')
      : 'Henüz çalışma kaydı yok.',
    ayrinti: durumSay,
    duzelt: '/admin/autopilot/#sabah'
  });

  // 2) Güvenli otomatik yayın: doğrulamadan geçen yayına, kalan taslağa.
  halkalar.push({
    anahtar: 'yayin', ad: 'Doğrulama ve yayın', saat: '08:00 TSİ',
    durum: !ayar.etkin ? 'kapali' : !bitis || yas > 26 ? 'eksik' : !ayar.otomatikYayin ? 'uyari' : 'tamam',
    ozet: bitis ? `${Number(rapor.yayinlanan || 0)} yayında · ${Number(rapor.taslak || 0)} taslak onay bekliyor` +
      (ayar.otomatikYayin ? '' : ' · otomatik yayın kapalı, hepsi onaya düşer') : 'Yayın kaydı yok.',
    duzelt: '/admin/editor/'
  });

  // 3) Haber kapağı: Worker Python çalıştıramaz; kapaklar GitHub Actions'ta
  //    üretilir ve dağıtımla gelir. Son 48 saatte kategori plakasıyla kalan
  //    haber, kapak halkasının geride kaldığını gösterir.
  let bekleyen = [], toplam = 0;
  if (env.DB) {
    const r = await env.DB.prepare(
      "SELECT slug,title,cover_url,published_at FROM news WHERE status='published' AND published_at>=? ORDER BY published_at DESC LIMIT 60"
    ).bind(new Date(simdi - 48 * SAAT).toISOString()).all().catch(() => ({ results: [] }));
    const satir = r.results || [];
    const kapak = await uretilmisKapaklar(env);
    toplam = satir.length;
    bekleyen = satir.filter(n => (!n.cover_url || PLAKA.test(String(n.cover_url))) && !kapak.has(n.slug))
      .map(n => ({ slug: n.slug, baslik: n.title, saat: n.published_at }));
  }
  const enEski = bekleyen.reduce((m, n) => Math.max(m, (simdi - Date.parse(n.saat || 0)) / SAAT), 0);
  halkalar.push({
    anahtar: 'kapak', ad: 'Haber kapağı', saat: '08:40 · 14:40 · 20:40 · 02:40 TSİ',
    // GitHub zamanlaması 1-2 saat gecikebilir; 8 saati geçen bekleyiş kopukluktur.
    durum: !bekleyen.length ? 'tamam' : enEski <= 8 ? 'bekliyor' : 'eksik',
    ozet: `Son 48 saatte ${toplam} haber · ${bekleyen.length} kapak bekliyor`,
    bekleyen: bekleyen.slice(0, 8),
    duzelt: 'https://github.com/BTmedyajans/Btmedya-db/actions/workflows/haber-kapak-otomasyonu.yml'
  });

  // 4) Sosyal kart ve marka şablonu + 5) doğrudan yayın kuyruğu.
  let say = {}, directAccountRows = [], directJobRows = [];
  if (env.DB) {
    const since = new Date(simdi - 72 * SAAT).toISOString();
    const postRows = await env.DB.prepare(
      "SELECT status,COUNT(*) n FROM social_posts WHERE updated_at>=? GROUP BY status"
    ).bind(since).all().catch(() => ({ results: [] }));
    for (const x of postRows.results || []) say[x.status] = Number(x.n || 0);
    const accountRows = await env.DB.prepare(
      "SELECT provider,COUNT(*) n FROM social_direct_connections WHERE workspace_type='agency' AND workspace_id='btmedya' AND status='active' GROUP BY provider"
    ).all().catch(() => ({ results: [] }));
    directAccountRows = accountRows.results || [];
    const jobRows = await env.DB.prepare(
      "SELECT status,COUNT(*) n FROM social_direct_jobs WHERE updated_at>=? GROUP BY status"
    ).bind(since).all().catch(() => ({ results: [] }));
    directJobRows = jobRows.results || [];
  }
  const nativePublisher = String(env.BTMEDYA_SOCIAL_PUBLISHER || "direct").toLowerCase() === "direct";
  const activeAccounts = directAccountRows.reduce((sum, row) => sum + Number(row.n || 0), 0);
  const jobs = Object.fromEntries(directJobRows.map(row => [row.status, Number(row.n || 0)]));
  halkalar.push({
    anahtar: 'sosyal', ad: 'Sosyal kart ve marka şablonu', saat: 'Her yayından sonra',
    durum: !sosyal.aglar.length ? 'eksik' : (say.onayda || 0) > 0 && sosyal.otomatikPlanla ? 'uyari' : 'tamam',
    ozet: `Son 72 saat: ${say.planlandi || 0} planlandı · ${say.yayinlandi || 0} yayınlandı · ${say.onayda || 0} onayda` +
      ` · hedefler: ${sosyal.aglar.join(', ') || 'yok'}`,
    duzelt: '/admin/social-os/'
  });
  halkalar.push({
    anahtar: 'dogrudan-yayin', ad: 'BTMEDYA doğrudan sosyal yayın', saat: '5 dakikada bir',
    durum: !nativePublisher ? 'uyari' : activeAccounts === 0 ? 'eksik' : Number(jobs.error || 0) > 0 ? 'uyari' : 'tamam',
    ozet: !nativePublisher
      ? 'Yayın motoru doğrudan moda alınmalı; bu zincirin Metricool bağımlılığı yoktur.'
      : activeAccounts === 0
        ? 'Doğrudan OAuth ile bağlı hesap yok. Connect Merkezi üzerinden Facebook Page / Instagram Professional ve diğer hedefleri bağlayın.'
        : `${activeAccounts} doğrudan bağlı hesap · ${Number(jobs.queued || 0)} kuyrukta · ${Number(jobs.publishing || 0)} yayınlanıyor · ${Number(jobs.published || 0)} yayınlandı · ${Number(jobs.error || 0)} hata`,
    duzelt: '/admin/social-os/'
  });

  return {
    ok: true,
    simdi: new Date(simdi).toISOString(),
    halkalar,
    bolumler: {
      bugun: bolumAdlari(gununKategorileri(secili, ayar.gunlukAzami, gun)),
      yarin: bolumAdlari(gununKategorileri(secili, ayar.gunlukAzami, gun + 1)),
      gunlukAzami: ayar.gunlukAzami
    }
  };
}
