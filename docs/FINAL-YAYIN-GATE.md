# BTMEDYA final yayın kapısı

Bu dosya `main` dalına yayın yapılmadan önce son kontrol listesidir. Amaç, teknik temizlik ile içerik/provenans kontrolünü birbirinden ayırmak ve canlıya yalnızca doğrulanmış çıktıyı taşımaktır.

## 1. Kod ve depo temizliği
- [ ] `public/` dışında kalan Worker, D1 migration ve Wrangler yapılandırması istemeden dışarı servis edilmiyor.
- [ ] Kullanılmayan placeholder/workflow dosyaları kaldırılmış.
- [ ] Test/preview dosyaları canlı navigasyona yanlışlıkla bağlanmıyor.
- [ ] `wrangler.toml` içinde gerçek domain, D1 ve R2 binding'leri korunuyor.
- [ ] Secret değerleri Git geçmişine veya statik dosyalara yazılmamış.

## 2. Güvenlik
- [ ] Admin şifresi ve oturum imza anahtarı Cloudflare secret olarak tanımlı.
- [ ] Admin endpoint'leri geçerli oturum olmadan veri değiştiremiyor.
- [ ] R2 medya bağlantıları imzalı ve süreli.
- [ ] Yükleme MIME türleri allow-list ile sınırlandırılmış.
- [ ] `wrangler.toml`, source dosyaları ve secret isimleri kamuya açık statik rotalardan erişilemiyor.

## 3. Medya ve video
- [ ] Hero video masaüstü ve mobil için ayrı optimize edilmiş kaynaklara sahip.
- [ ] Video poster/fallback görseli mevcut.
- [ ] Büyük medya dosyaları Git'e gereksiz yere gömülmemiş, R2 üzerinden servis ediliyor.
- [ ] Her görsel/video için kaynak, lisans/provenans ve kullanım amacı kayıtlı.
- [ ] AI ile üretilen içerik yalnızca AI LAB olarak etiketleniyor.
- [ ] BTMEDYA'nın gerçek fotoğraf/video arşivi portföyün ana kaynağı olarak korunuyor.

## 4. Haber ve kaynak doğrulama
- [ ] Her haberin kaynak URL'si ve yayın tarihi tutuluyor.
- [ ] Haber görseli/video kaynağı haber kaynağından bağımsız olarak doğrulanıyor.
- [ ] Telif/lisansı belirsiz medya canlı portföye alınmıyor.
- [ ] Kopya haberler ve aynı medya dosyasının yinelenen kayıtları temizleniyor.

## 5. Web ve mobil
- [ ] Ana sayfa, haberler, hakkımızda ve iletişim yolları 200 döndürüyor.
- [ ] `www.btmedya.com.tr` ana domaine 301 yönleniyor.
- [ ] `/admin/` erişilebilir ve giriş yapılabiliyor.
- [ ] Mobil menü, hero video, görsel lazy-load ve dokunmatik etkileşimler test edildi.
- [ ] `robots.txt`, `sitemap.xml`, canonical ve Open Graph alanları doğrulandı.

## 6. Son yayın kararı
`main` dalına doğrudan yayın ancak yukarıdaki kritik maddeler tamamlandıktan sonra yapılır. Eksik kalan maddeler yayın engeli olarak raporlanır.

### Karar ilkesi
Hız uğruna güvenlik, telif, gerçek veri veya canlı domain kararlılığı feda edilmez. Tasarımda ise BTMEDYA'nın sinematik/editoryal kimliği korunurken mobil performans önceliklidir.
