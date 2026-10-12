# BTMEDYA Social OS — Buffer Ücretsiz API Kurulumu

Bu entegrasyon, Buffer'ın ücretsiz hesabını kullanarak BTMEDYA yönetim panelinden sosyal gönderileri planlar. Mevcut `btmedya-db` Worker, D1, R2 ve alan adları korunur; yeni bir sunucu gerekmez.

## Ücretsiz plan sınırı

Buffer'ın güncel ücretsiz planı en fazla 3 sosyal kanal ve kanal başına 10 bekleyen planlı gönderi sunuyor. API erişimi fiyatlandırma sayfasında Free planda listeleniyor; kullanım kendi API kotasına tabidir. Instagram, Facebook ve YouTube için Buffer GraphQL API post/scheduling örnekleri mevcut. TikTok için API şeması/kanal desteği hesap ve sağlayıcı özelliklerine göre doğrulanmalıdır; hata dönerse o gönderi başarılı kabul edilmez.

Kaynaklar:
- https://buffer.com/pricing
- https://developers.buffer.com/guides/getting-started.html
- https://developers.buffer.com/guides/posts-and-scheduling.html
- https://developers.buffer.com/guides/hosting-media.html

## Kurulum

1. https://publish.buffer.com adresinden ücretsiz hesap aç veya mevcut hesabına gir.
2. Buffer içinde BTMEDYA'ya ait en fazla üç kanal bağla. Free planda 10 gönderi/kanal kuyruk sınırı vardır.
3. Buffer'ın API ayarlarından bir API key üret. Anahtar Buffer API kimlik bilgisidir; yalnız kendi Buffer hesabına erişim sağlar.
4. GitHub deposunda `BTmedyajans/Btmedya-db` → **Settings → Secrets and variables → Actions → New repository secret** bölümünde şu adı oluştur ve API key'i değerine kaydet:
   - `BTMEDYA_BUFFER_API_KEY`
5. GitHub → **Actions → BTMEDYA Sync Worker Secrets → Run workflow** sayfasında branch olarak `main`, kapsam olarak `buffer` seç. İş akışı anahtarı Cloudflare Worker `btmedya-db` için Secret olarak aktarır. Anahtar kaynak dosyaya konulmaz.
6. https://btmedya.com.tr/admin/social-os/ sayfasını açıp **07 · ÜCRETSİZ BUFFER API** bölümünde **Kanalları yenile** seçeneğine bas. Buffer kanalları listeleniyorsa bağlantı doğrulanmıştır.
7. Aynı sayfadaki **02 · YAYIN OLUŞTUR** bölümünde başlık, açıklama, medya anahtarı ve yayın saatini doldur. Buffer kanallarından hedef hesapları seçip **Seçili kanallara planla** düğmesine bas.
8. Başarı yanıtında Buffer post ID'si görünmeden yayın işlemini başarılı sayma. Buffer'da gönderi planının oluştuğunu da kontrol et.

## Medya gereksinimleri

- Buffer API medya dosyalarını kendisi yüklemek yerine herkese açık, sabit URL bekler.
- BTMEDYA panelindeki medya anahtarı `/pub/<key>`, `/assets/<key>` veya `/gorsel/<key>` üzerinden URL'ye çevrilir.
- Planlanacak medya URL'si oturum açmadan erişilebilir olmalıdır. Bir gizli tarayıcı sekmesinde açılmayan, süreli imzalı ya da giriş gerektiren adresler gönderi için kullanılmamalıdır.
- Instagram ve TikTok için görsel/video; YouTube için video gerekir. YouTube için API ayrıca başlık ve kategori metadata'sı gönderir.
- Buffer API'de bir kanal ya da medya türü desteklenmiyorsa API hatası panelde gösterilir; otomasyon başarısız gönderiyi sessizce başarılı saymaz.

## Güvenlik

- API key'i sohbete, issue'ya, PR'a veya kaynak koda yazma.
- Secret yalnızca GitHub Actions Secret alanında tutulur; workflow Cloudflare'a aktarır.
- Bu entegrasyon Buffer'ın kendi kanal bağlantı/yayın özelliklerini kullanır; Meta App ID ve Meta App Secret oluşturma gereğini Buffer desteklediği kanallar için azaltır.
- TikTok için genel yayın izni veya API desteği doğrulanmadıysa herkese açık gönderi yapılmış varsayılmaz. Üretimde önce kendi kanalında düşük riskli test yap.
