"""BTMEDYA logosu (kullanıcının gönderdiği özgün logo) -> şeffaf zeminli site varlıkları.
Biçim değiştirilmez: yalnız beyaz zemin alfa kanalına çevrilir; koyu zemin sürümünde
siyah öğeler (T, MEDYA, slogan) beyaza döner, altın öğeler aynen kalır. Site koyu
zeminli olduğu için başlıkta negatif sürüm kullanılır (siyah harf koyu zeminde görünmez).
Başlıkta slogan yok: 30-38 px yükseklikte okunmuyor; tam logo sloganla ayrı dosyadır.
Çalıştır: python3 tools/logo/logo-v4-uret.py   (gerekli: Pillow, numpy)
Çıktılar public/assets/logo/ altına (PNG indirme/baskı, WebP site için):
  btmedya-logo-v4[-negatif]          tam logo (amblem + yazı + slogan)
  btmedya-logo-yatay-v4[-negatif]    site başlığı: amblem + yazı, 410:88 oran
  bt-isaret-v4[-negatif]             yalnız BT amblemi
"""
import os, numpy as np
from PIL import Image
KOK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KAYNAK = os.path.join(KOK, "tools", "logo", "kaynak", "btmedya-logo-orijinal.jpg")
HEDEF = os.path.join(KOK, "public", "assets", "logo")
a = np.asarray(Image.open(KAYNAK).convert('RGB')).astype(np.float32)
# Beyazdan uzaklık -> alfa (JPEG gürültüsü < 10 tamamen şeffaf, > 70 tamamen opak).
d = 255 - a.min(axis=2)
alfa = np.clip((d - 10) / 60.0, 0, 1)
# Kenar yumuşatmasını beyazdan ayır (ön plan rengi = (c - (1-a)*255) / a).
on = np.where(alfa[..., None] > 0, (a - (1 - alfa[..., None]) * 255) / np.maximum(alfa[..., None], 1e-3), 0)
on = np.clip(on, 0, 255)
mx, mn = on.max(axis=2), on.min(axis=2)
doyma = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
siyah = (doyma < 0.30) & (mx < 150)          # T, MEDYA, slogan harfleri
def rgba(renk):
    return Image.fromarray(np.dstack([renk, alfa * 255]).astype(np.uint8), 'RGBA')
orijinal = rgba(on)
neg = on.copy(); neg[siyah] = (246, 244, 239)   # sıcak beyaz; altınla uyumlu
negatif = rgba(neg)
H, W = alfa.shape
def kutu(y0, y1, im):
    alt = np.asarray(im)[y0:y1, :, 3]
    ys, xs = np.where(alt > 8)
    return im.crop((xs.min(), y0 + ys.min(), xs.max() + 1, y0 + ys.max() + 1))
BANT = {'isaret': (280, 975), 'yazi': (975, 1160), 'slogan': (1170, 1260), 'tam': (280, 1260)}
def kaydet(im, ad, gen=None):
    if gen and im.width > gen: im = im.resize((gen, round(im.height * gen / im.width)), Image.LANCZOS)
    im.save(f'{HEDEF}/{ad}.png', optimize=True)
    im.save(f'{HEDEF}/{ad}.webp', quality=92, method=6)
    print(ad, im.size)
for son, im in (('', orijinal), ('-negatif', negatif)):
    tam = kutu(*BANT['tam'], im)
    kaydet(tam, 'btmedya-logo-v4' + son, 1200)
    isaret = kutu(*BANT['isaret'], im)
    kaydet(isaret, 'bt-isaret-v4' + son, 512)
    yazi = kutu(*BANT['yazi'], im)
    # Yatay başlık logosu: işaret + yazı, 410:88 oranında (sayfalardaki eski
    # width/height öznitelikleri bozulmadan aynı kutuya oturur). 3x çözünürlük.
    # Başlıkta en çok 38 px gösterilir; 132 px yükseklik ~3,5x keskinlik verir.
    Hc, Wc = 132, 615
    tuval = Image.new('RGBA', (Wc, Hc), (0, 0, 0, 0))
    ih = Hc; iw = round(isaret.width * ih / isaret.height)
    i2 = isaret.resize((iw, ih), Image.LANCZOS)
    tuval.alpha_composite(i2, (0, 0))
    bosluk = round(Hc * 0.16)
    kalan = Wc - iw - bosluk
    yh = round(yazi.height * kalan / yazi.width)
    y2 = yazi.resize((kalan, yh), Image.LANCZOS)
    # Yazının taban çizgisi işaretin tabanıyla hizalı (B'nin alt kenarı ~ %95).
    ytop = round(ih * 0.955) - yh
    tuval.alpha_composite(y2, (iw + bosluk, ytop))
    kaydet(tuval, 'btmedya-logo-yatay-v4' + son)
