# BTMEDYA R2 MEDIA

Bu klasör GitHub → Cloudflare R2 otomatik medya hattının kaynağıdır.

GitHub'da `main` dalına medya eklendiğinde:
`r2-media/*` → GitHub Actions → R2 `btmedya-media` → Worker `btmedya-db` → btmedya.com.tr

## Klasörler

- `haber/` gerçek haber medya dosyaları
- `portfolio/` portföy medya dosyaları
- `medya/` genel medya / hero / showreel
- `kurumsal/` kurumsal medya
- `podcast/` podcast medya
- `ai-lab/` yalnızca AI ile üretilen medya
- `sosyal/` sosyal medya arşivi

## Örnek

`r2-media/haber/2026-09-23-balikesir.jpg`

R2 anahtarı:
`haber/2026-09-23-balikesir.jpg`

Not: GitHub deposu büyük video dosyaları için uygun değildir. Normal GitHub dosya boyutu sınırlarını aşan videolar doğrudan R2/admin yükleme akışından gönderilmelidir.
