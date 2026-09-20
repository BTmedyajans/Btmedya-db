# BTMEDYA Arşiv AI

## Konum
Yönetim panelindeki bağımsız modül: /admin/arsiv-ai/

## Amaç
Gerçek BTMEDYA fotoğraf/video arşivini Google Photos + Google Drive kaynaklarından keşfetmek, sınıflandırmak ve kullanıcı onayından sonra Media Vault'a aktarmak.

## Güvenli akış
1. Kaynağı bağla (Google OAuth).
2. Medyayı keşfet.
3. BTMEDYA / Buse Tuncay / Haber / Röportaj / Prodüksiyon / Sosyal / Siyah Oda / AI LAB filtreleri.
4. AI kullanım önerisi + alternatif + gerekçe + SEO metadata üret.
5. Kullanıcı onaylar.
6. Media Vault / R2 + D1 aktarımı.

## Production sınırı
Bu özellik feature/archive-ai branch'inde geliştirilir. Production main branch'ine otomatik merge edilmez.

## Mevcut entegrasyon
İlk sürüm mevcut /api/media Media Vault API'sini kullanır. Google OAuth için client ID/secret ve callback yapılandırması ayrıca yapılmalıdır; gizli değerler GitHub'a yazılmamalıdır.

## Yayın kuralı
Gerçek medya önceliklidir. AI üretimleri AI LAB altında ayrı tutulur. Kullanıcı onayı olmadan mevcut site içeriği otomatik değiştirilmez.
