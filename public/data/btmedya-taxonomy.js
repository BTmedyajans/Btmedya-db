/* BTMEDYA ortak kategori sözlüğü.
   Public + admin arayüzleri aynı ağacı kullanır.
   Ana anahtarlar geriye dönük olarak haber/sosyal/tanitim tutulur. */
window.BTMEDYA_TAXONOMY = {
  version: "2026-10-10.1",
  principle: "Müşteri niyetine göre seç, üretim türünü ikinci/üçüncü seviyede belirle, dağıtımı otomasyona bırak.",
  paths: [
    {
      key: "haber",
      number: "01",
      label: "HABER & MEDYA",
      shortLabel: "HABER",
      description: "Haber, röportaj, saha hikâyesi, özel dosya ve medya arşivi.",
      customerIntent: "Bir gelişmeyi okumak, araştırmak veya BTMEDYA'nın medya üretimini görmek.",
      publicHref: "/haberler/",
      groups: [
        {
          key: "balikesir",
          label: "BALIKESİR",
          adminLabel: "BALIKESİR",
          items: [
            {key:"balikesir",label:"Balıkesir",short:"Şehir ve ilçe gündemi",href:"/haberler/balikesir/",type:"news",automation:["news-intelligence","sabah-masasi","seo-aeo"]},
            {key:"ilce-karesi",label:"Karesi",short:"Karesi haberleri",href:"/haberler/balikesir/karesi/",type:"news",automation:["news-intelligence","sabah-masasi"]},
            {key:"ilce-altieylul",label:"Altıeylül",short:"Altıeylül haberleri",href:"/haberler/balikesir/altieylul/",type:"news",automation:["news-intelligence","sabah-masasi"]},
            {key:"ilce-edremit",label:"Edremit",short:"Edremit haberleri",href:"/haberler/balikesir/edremit/",type:"news",automation:["news-intelligence","sabah-masasi"]},
            {key:"ilce-ayvalik",label:"Ayvalık",short:"Ayvalık haberleri",href:"/haberler/balikesir/ayvalik/",type:"news",automation:["news-intelligence","sabah-masasi"]},
            {key:"ilce-bandirma",label:"Bandırma",short:"Bandırma haberleri",href:"/haberler/balikesir/bandirma/",type:"news",automation:["news-intelligence","sabah-masasi"]},
            {key:"ilce-burhaniye",label:"Burhaniye",short:"Burhaniye haberleri",href:"/haberler/balikesir/burhaniye/",type:"news",automation:["news-intelligence","sabah-masasi"]},
            {key:"ilce-gonen",label:"Gönen",short:"Gönen haberleri",href:"/haberler/balikesir/gonen/",type:"news",automation:["news-intelligence","sabah-masasi"]},
            {key:"ilce-susurluk",label:"Susurluk",short:"Susurluk haberleri",href:"/haberler/balikesir/susurluk/",type:"news",automation:["news-intelligence","sabah-masasi"]},
            {key:"ilce-erdek",label:"Erdek",short:"Erdek haberleri",href:"/haberler/balikesir/erdek/",type:"news",automation:["news-intelligence","sabah-masasi"]},
            {key:"ilce-bigadic",label:"Bigadiç",short:"Bigadiç haberleri",href:"/haberler/balikesir/bigadic/",type:"news",automation:["news-intelligence","sabah-masasi"]}
          ]
        },
        {
          key: "haber-bul",
          label: "HABERİ BUL",
          adminLabel: "EDİTORYAL",
          items: [
            {key:"turkiye",label:"Türkiye",short:"Ulusal gündem",href:"/haberler/turkiye/",type:"news",automation:["news-intelligence","seo-aeo"]},
            {key:"dunya",label:"Dünya",short:"Uluslararası gelişmeler",href:"/haberler/dunya/",type:"news",automation:["news-intelligence","seo-aeo"]}
          ]
        },
        {
          key: "topic",
          label: "KONU",
          adminLabel: "KONU",
          items: [
            {key:"gundem",label:"Gündem",short:"Güncel olaylar ve kamu",href:"/haberler/gundem/",type:"news",automation:["news-intelligence","source-desk","seo-aeo"]},
            {key:"ekonomi",label:"Ekonomi",short:"Para, piyasa ve iş dünyası",href:"/haberler/ekonomi/",type:"news",automation:["news-intelligence","source-desk","seo-aeo"]},
            {key:"egitim",label:"Eğitim",short:"Okul, üniversite ve sınav",href:"/haberler/egitim/",type:"news",automation:["source-desk","seo-aeo"]},
            {key:"saglik",label:"Sağlık",short:"Sağlık ve yaşam bilgileri",href:"/haberler/saglik/",type:"news",automation:["source-desk","seo-aeo"]},
            {key:"spor",label:"Spor",short:"Takımlar, maçlar ve spor",href:"/haberler/spor/",type:"news",automation:["news-intelligence","seo-aeo"]},
            {key:"kultur-sanat",label:"Kültür · Sanat",short:"Kültür, sanat ve etkinlik",href:"/haberler/kultur/",type:"news",automation:["source-desk","seo-aeo"]},
            {key:"yasam",label:"Yaşam",short:"Günlük yaşam ve insan hikâyeleri",href:"/haberler/yasam/",type:"news",automation:["merak-radari","seo-aeo"]},
            {key:"teknoloji-ai",label:"Teknoloji · AI",short:"Dijital dünya ve yapay zekâ",href:"/haberler/teknoloji/",type:"news",automation:["news-intelligence","ai-editor","seo-aeo"]}
          ]
        },
        {
          key: "derinles",
          label: "DERİNLEŞTİR",
          adminLabel: "ÖZEL ÜRETİM",
          items: [
            {key:"roportaj",label:"Röportaj",short:"Soru-cevap ve saha görüşmesi",href:"/halk-roportaji/",type:"editorial",automation:["source-desk","ai-editor","seo-aeo"]},
            {key:"ozel-dosya",label:"Özel Dosya",short:"Çok kaynaklı derinlemesine içerik",href:"/dosyalar/",type:"editorial",automation:["source-desk","news-intelligence","ai-editor"]},
            {key:"siyah-oda",label:"Siyah Oda / YouTube",short:"Uzman sohbeti ve bölüm üretimi",href:"/siyah-oda/",type:"program",automation:["media-vault","social-native","youtube"]}
          ]
        },
        {
          key: "arsiv",
          label: "ARŞİV & KANIT",
          adminLabel: "ARŞİV",
          items: [
            {key:"haber-arsivi",label:"Haber Arşivi",short:"Yayınlanmış haberler",href:"/haberler/",type:"archive",automation:["d1","seo-aeo"]},
            {key:"medya-arsivi",label:"Gerçek Medya Arşivi",short:"Fotoğraf ve video",href:"/arsiv/",type:"archive",automation:["r2","media-vault"]},
            {key:"dosyalar",label:"Dosyalar",short:"Rehber, analiz ve editoryal çalışmalar",href:"/dosyalar/",type:"editorial",automation:["source-desk","seo-aeo"]}
          ]
        }
      ],
      adminGroups: [
        {
          label:"ÜRET",
          items:[
            {label:"Haber Odası",href:"/admin/editor/",note:"Kaynak + AI editör + önizleme"},
            {label:"Kategori Merkezi",href:"/admin/kategori/",note:"Haber taksonomisi ve yayın kuralları"}
          ]
        },
        {
          label:"ARAŞTIR",
          items:[
            {label:"Kaynak Masası",href:"/admin/kaynak-masasi/",note:"Kaynak, güven ve provenans"},
            {label:"Trend & Haber Radarı",href:"/admin/autopilot/",note:"Trend, rakip ve içerik adayları"},
            {label:"Merak Radarı",href:"/admin/merak-radari/",note:"Okur sorusu ve özel haber fırsatı"}
          ]
        },
        {
          label:"YAYIN & ÖLÇ",
          items:[
            {label:"Yayın Merkezi",href:"/admin/yayin/",note:"Onay + kuyruk + dağıtım"},
            {label:"SEO / AEO",href:"/admin/editor/#seo",note:"Arama ve cevap motoru hazırlığı"},
            {label:"Canlı Haberler",href:"/haberler/",note:"Kamuya açık yayın"}
          ]
        }
      ]
    },
    {
      key: "sosyal",
      number: "02",
      label: "SOSYAL & DİJİTAL",
      shortLabel: "SOSYAL",
      description: "Sosyal medya yönetimi, içerik üretimi, platform dağıtımı, SEO, web ve AI otomasyonu.",
      customerIntent: "İçerik üretmek, sosyal hesapları yönetmek, görünürlüğü artırmak ve yayınlamayı otomatikleştirmek.",
      publicHref: "/sosyal-medya/",
      groups: [
        {
          key: "social-content",
          label: "İÇERİK ÜRET",
          adminLabel: "İÇERİK",
          items: [
            {key:"sosyal-yonetim",label:"Sosyal Medya Yönetimi",short:"Aylık plan, içerik ve yayın ritmi",href:"/sosyal-medya/",type:"service",automation:["client-social-os","native-social","metricool-fallback"]},
            {key:"reels-shorts",label:"Reels / Shorts",short:"Dikey kısa video",href:"/sosyal-medya/",type:"format",automation:["media-vault","native-social","tiktok","youtube"]},
            {key:"post-carousel",label:"Post / Carousel",short:"Grafik ve bilgi içeriği",href:"/sosyal-medya/",type:"format",automation:["media-vault","canva-workbench","native-social"]}
          ]
        },
        {
          key: "channels",
          label: "KANALLAR",
          adminLabel: "DAĞITIM",
          items: [
            {key:"instagram-facebook",label:"Instagram + Facebook",short:"Meta hesapları",href:"/sosyal-medya/",type:"channel",automation:["meta-direct"]},
            {key:"tiktok-youtube",label:"TikTok + YouTube",short:"Kısa ve uzun video",href:"/sosyal-medya/",type:"channel",automation:["tiktok","youtube","metricool-fallback"]},
            {key:"x-whatsapp",label:"X + WhatsApp",short:"Metin dağıtımı ve müşteri iletişimi",href:"/sosyal-medya/",type:"channel",automation:["x-api","whatsapp-cloud"]}
          ]
        },
        {
          key: "digital-growth",
          label: "DİJİTAL BÜYÜME",
          adminLabel: "BÜYÜME",
          items: [
            {key:"seo-aeo",label:"SEO / AEO",short:"Arama ve cevap motoru görünürlüğü",href:"/search-strategy/",type:"digital",automation:["seo-agent","search-console"]},
            {key:"ai-automation",label:"AI LAB + Otomasyon",short:"AI video, görsel, web ve içerik otomasyonu",href:"/ai-lab/",type:"digital",automation:["workers-ai","workflow","native-social"]},
            {key:"web-digital",label:"Web + Dijital Deneyim",short:"Kurumsal site ve etkileşimli deneyim",href:"/hizmetler/",type:"service",automation:["cloudflare","d1","r2"]}
          ]
        }
      ],
      adminGroups: [
        {
          label:"İÇERİK",
          items:[
            {label:"Müşteri Sosyal OS",href:"/admin/musteri-sosyal/",note:"Marka stratejisi + AI içerik"},
            {label:"BTMEDYA Social OS",href:"/admin/social-os/",note:"Native hesaplar + yerel kuyruk"},
            {label:"Medya Kasası",href:"/admin/app.html",note:"R2 medya + D1 metadata"}
          ]
        },
        {
          label:"DAĞITIM",
          items:[
            {label:"BTMEDYA Connect",href:"/admin/connect/",note:"Meta · TikTok · YouTube · X · WhatsApp"},
            {label:"Yayın Merkezi",href:"/admin/yayin/#social",note:"Onay + yayın kuyruğu"},
            {label:"Sosyal Site",href:"/sosyal-medya/",note:"Müşteriye açık hizmet alanı"}
          ]
        },
        {
          label:"BÜYÜME",
          items:[
            {label:"SEO / AEO",href:"/admin/editor/#seo",note:"Arama görünürlüğü"},
            {label:"Trend & Radar",href:"/admin/autopilot/",note:"İçerik keşfi ve rakip sinyali"},
            {label:"Kontrol Merkezi",href:"/admin/agency-os/",note:"Tüm otomasyonların süpervizörü"}
          ]
        }
      ]
    },
    {
      key: "tanitim",
      number: "03",
      label: "MARKA & PRODÜKSİYON",
      shortLabel: "MARKA",
      description: "Tanıtım filmi, fotoğraf-video, etkinlik, özel gün, grafik, kampanya ve portföy.",
      customerIntent: "Markasını, ürününü, etkinliğini veya özel gününü profesyonel içerikle anlatmak.",
      publicHref: "/video-produksiyon/",
      groups: [
        {
          key:"brand",
          label:"MARKA İÇERİĞİ",
          adminLabel:"MARKA",
          items:[
            {key:"tanitim-filmi",label:"Tanıtım Filmi",short:"İşletme, kurum ve marka hikâyesi",href:"/video-produksiyon/",type:"service",automation:["media-vault","project-hub","social-native"]},
            {key:"urun-hizmet",label:"Ürün / Hizmet İçeriği",short:"Fotoğraf, video ve kısa formatlar",href:"/portfoy/?niyet=tanitim",type:"service",automation:["media-vault","social-native"]},
            {key:"kampanya-reklam",label:"Kampanya & Reklam Kreatifi",short:"Dijital kampanya ve sponsorlu içerik",href:"/reklam-ve-sponsorluk/",type:"service",automation:["project-hub","sales","social-native"]}
          ]
        },
        {
          key:"production",
          label:"ÇEKİM & PRODÜKSİYON",
          adminLabel:"PRODÜKSİYON",
          items:[
            {key:"dugun-ozel-gun",label:"Düğün / Özel Gün",short:"Düğün, nişan, kına ve gelin alımı",href:"/portfoy/?niyet=dugun",type:"service",automation:["media-vault","project-hub","social-native"]},
            {key:"etkinlik",label:"Etkinlik",short:"Kurumsal ve özel etkinlik çekimi",href:"/portfoy/?niyet=etkinlik",type:"service",automation:["media-vault","project-hub","social-native"]},
            {key:"foto-video",label:"Fotoğraf + Video Prodüksiyon",short:"Çekimden kurguya teslim",href:"/video-produksiyon/",type:"service",automation:["media-vault","project-hub"]}
          ]
        },
        {
          key:"sales-proof",
          label:"VİTRİN & SATIŞ",
          adminLabel:"VİTRİN",
          items:[
            {key:"portfoy",label:"Portföy",short:"Gerçek işler ve üretim örnekleri",href:"/portfoy/",type:"proof",automation:["media-vault"]},
            {key:"vaka",label:"Vaka Çalışmaları",short:"Brief → üretim → sonuç",href:"/vaka-calismalari/",type:"proof",automation:["project-hub","sales"]},
            {key:"teklif",label:"Teklif / Proje Başlat",short:"Müşteri briefi ve satış akışı",href:"/teklif-al/",type:"sales",automation:["sales","whatsapp-cloud","crm"]}
          ]
        }
      ],
      adminGroups: [
        {
          label:"PRODÜKSİYON",
          items:[
            {label:"Medya Kasası",href:"/admin/app.html",note:"Gerçek çekim + proje varlıkları"},
            {label:"Video Prodüksiyon",href:"/video-produksiyon/",note:"Çekim ve teslim"},
            {label:"AI LAB",href:"/ai-lab/",note:"Açık etiketli AI üretimleri"}
          ]
        },
        {
          label:"MÜŞTERİ & SATIŞ",
          items:[
            {label:"Müşteri Merkezi",href:"/admin/client-hub/",note:"Firma · proje · onay"},
            {label:"Sales Desk",href:"/admin/sales/",note:"Teklif ve satış hunisi"},
            {label:"Teklif Formu",href:"/teklif-al/",note:"Müşteri giriş noktası"}
          ]
        },
        {
          label:"VİTRİN",
          items:[
            {label:"Portföy",href:"/portfoy/",note:"Gerçek işler"},
            {label:"Vaka Çalışmaları",href:"/vaka-calismalari/",note:"İş kanıtı"},
            {label:"Medya / Marka Kiti",href:"/basin-kiti/",note:"Dışa dönük kimlik ve medya"}
          ]
        }
      ]
    }
  ],
  system: {
    core: [
      {key:"github",label:"GitHub",role:"Kod + sürüm kaynağı"},
      {key:"cloudflare",label:"Cloudflare",role:"Worker + DNS + edge"},
      {key:"d1",label:"D1",role:"Yapılandırılmış veri"},
      {key:"r2",label:"R2",role:"Medya Kasası"},
      {key:"kv",label:"KV",role:"State + OAuth + rate limit"},
      {key:"workflow",label:"Workflow",role:"Uzun iş / onay akışı"},
      {key:"durable-object",label:"Durable Object",role:"Durum / canlı operasyon"}
    ],
    adapters: [
      {key:"meta-direct",label:"Meta Direct",role:"Facebook Page + Instagram Professional",mode:"native"},
      {key:"tiktok",label:"TikTok API",role:"TikTok Direct Post",mode:"native"},
      {key:"youtube",label:"YouTube API",role:"YouTube yükleme",mode:"native"},
      {key:"x-api",label:"X API",role:"X yayınlama",mode:"native"},
      {key:"whatsapp-cloud",label:"WhatsApp Cloud",role:"Müşteri iletişimi",mode:"native"},
      {key:"metricool-fallback",label:"Metricool",role:"Fallback + mevcut bağlantılar",mode:"fallback"},
      {key:"canva-workbench",label:"Canva",role:"Kreatif üretim tezgâhı",mode:"optional"},
      {key:"search-console",label:"Google Search Console",role:"SEO verisi",mode:"optional"},
      {key:"crm",label:"CRM / HubSpot",role:"Müşteri ve satış takibi",mode:"optional"},
      {key:"drive",label:"Google Drive",role:"Master arşiv importu",mode:"optional"},
      {key:"figma",label:"Figma",role:"UI / tasarım sistemi",mode:"optional"},
      {key:"notion",label:"Notion",role:"Bilgi tabanı",mode:"optional"},
      {key:"slack",label:"Slack",role:"Bildirim / ekip iletişimi",mode:"optional"}
    ],
    operatingRules: [
      "Tek operasyon arayüzü: admin paneli.",
      "Gerçek medya varsayılan; AI üretimleri AI LAB etiketiyle ayrılır.",
      "Native platform adapter first; Metricool yalnız fallback.",
      "Müşteri çalışma alanları birbirinden izole edilir.",
      "Kategori seçimi içerik, medya, yayın ve ölçüm akışını belirler."
    ]
  }
};
