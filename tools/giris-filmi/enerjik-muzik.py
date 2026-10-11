#!/usr/bin/env python3
"""BTMEDYA giriş filmi için enerjik, seslendirmesiz müzik izi üretir.

Neden kodla üretiliyor: 11 Ekim'de kullanıcı giriş filminde seslendirme
yerine "daha enerjik müzik" istedi. Üretilen her nota bu dosyadadır; telif
sorusu doğmaz, istenirse tempo/uzunluk değiştirilip yeniden üretilir.

Yapı (128 BPM, 40 sn):
  0-7.5 sn   giriş: filtreli arp + yükselen gerilim
  7.5-30 sn  ana bölüm: kick, clap, hi-hat, sub bas, arp, akor
  30-36 sn   yükseliş (riser + snare roll)
  36 sn      büyük vuruş: film logo kartına geçer, üç seçenek gelir
  36-40 sn   uzayan akor ve sönüş

Kullanım: python3 tools/giris-filmi/enerjik-muzik.py cikis.wav [sure_sn]
"""
import sys
import wave

import numpy as np

SR = 48000
BPM = 128.0
BEAT = 60.0 / BPM
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 40.0
VURUS = 36.0  # logo kartı
N = int(SR * DUR)
rng = np.random.default_rng(11)


def zarf(n, a=0.002, d=0.2, s=0.0, r=0.05, sus=None):
    t = np.arange(n) / SR
    e = np.minimum(1.0, t / max(a, 1e-4))
    sus = n / SR if sus is None else sus
    e = np.where(t > a, s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)), e)
    e = np.where(t > sus, e * np.exp(-(t - sus) / max(r, 1e-4)), e)
    return e


def ekle(buf, sig, t0, gain=1.0):
    i = int(t0 * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def kick():
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 48 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7.5) + 0.15 * np.sin(ph * 2) * np.exp(-t * 30)


def clap():
    n = int(0.25 * SR)
    g = rng.standard_normal(n)
    from scipy.signal import butter, lfilter
    b, a = butter(2, [900 / (SR / 2), 4000 / (SR / 2)], 'band')
    g = lfilter(b, a, g)
    t = np.arange(n) / SR
    e = np.exp(-t * 22)
    for k in (0.0, 0.011, 0.022):
        e += np.where(t > k, np.exp(-(t - k) * 120), 0) * 0.6
    return g * e * 0.9


def hat(acik=False):
    n = int((0.18 if acik else 0.05) * SR)
    g = rng.standard_normal(n)
    from scipy.signal import butter, lfilter
    b, a = butter(2, 7000 / (SR / 2), 'high')
    g = lfilter(b, a, g)
    t = np.arange(n) / SR
    return g * np.exp(-t * (18 if acik else 90)) * 0.35


def saw(f, n, detune=(0.0,)):
    t = np.arange(n) / SR
    s = np.zeros(n)
    for d in detune:
        ff = f * (1 + d)
        s += 2 * ((t * ff) % 1.0) - 1
    return s / len(detune)


def lp(sig, fc):
    from scipy.signal import butter, lfilter
    b, a = butter(2, min(fc, SR / 2 - 100) / (SR / 2), 'low')
    return lfilter(b, a, sig)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# Akor yürüyüşü (A minör: Am - F - C - G), her akor 2 ölçü.
AKOR = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
KOK = [45, 41, 48, 43]

L = np.zeros(N)
R = np.zeros(N)
olcu = 4 * BEAT
K, C, H, HO = kick(), clap(), hat(), hat(True)

t = 0.0
adim = 0
while t < DUR:
    beat_no = adim // 4
    olcu_no = int(t // olcu)
    akor_i = (olcu_no // 2) % 4
    ana = 7.5 <= t < VURUS
    yukselis = 30.0 <= t < VURUS
    son = t >= VURUS
    sx = adim % 4  # 16'lık konum
    # Kick: ana bölümde dörtlük; girişte son iki ölçüde.
    if sx == 0 and (ana or 5.6 <= t < 7.5) and not (yukselis and t > VURUS - 1.0):
        ekle(L, K, t, 0.95); ekle(R, K, t, 0.95)
    # Clap: 2 ve 4.
    if ana and sx == 0 and beat_no % 2 == 1:
        ekle(L, C, t, 0.5); ekle(R, C, t, 0.45)
    # Hi-hat: 16'lıklar, off-beat açık hat.
    if ana:
        g = 0.22 if sx in (1, 3) else 0.12
        ekle(L, H, t, g * 0.8); ekle(R, H, t, g)
        if sx == 2:
            ekle(L, HO, t, 0.18); ekle(R, HO, t, 0.2)
    # Snare roll yükselişte hızlanır.
    if yukselis:
        hiz = 1 if t < 33 else 2
        for k in range(hiz):
            ekle(L, C * 0.5, t + k * BEAT / 4 / hiz, 0.25 + (t - 30) / 12)
            ekle(R, C * 0.5, t + k * BEAT / 4 / hiz, 0.25 + (t - 30) / 12)
    # Sub bas: off-beat 8'lik pompa.
    if (ana or son) and sx == 2 and t < DUR - 0.5:
        n = int(BEAT / 2 * SR)
        b = lp(saw(hz(KOK[akor_i] - 12), n, (0, 0.004)), 260) * zarf(n, 0.004, 0.18, 0.4, 0.05)
        ekle(L, b, t, 0.55); ekle(R, b, t, 0.55)
    # Arp: 16'lık, giriş filtresi açılır.
    notlar = AKOR[akor_i] + [AKOR[akor_i][0] + 12]
    m = notlar[adim % 4] + 12
    n = int(BEAT / 4 * SR * 0.95)
    fc = 600 + 5200 * min(1.0, t / 7.5) if t < 7.5 else (5800 + 3000 * max(0, t - 30) / 6)
    a = lp(saw(hz(m), n, (-0.006, 0.006)), fc) * zarf(n, 0.003, 0.09, 0.0, 0.02)
    if not son:
        ekle(L, a, t, 0.16 if adim % 2 else 0.11)
        ekle(R, a, t + 0.012, 0.11 if adim % 2 else 0.16)
    t += BEAT / 4
    adim += 1

# Akor pad: ana bölüm ve son.
for o in range(int(DUR / olcu) + 1):
    t0 = o * olcu
    if t0 < 7.5 or t0 >= DUR:
        continue
    if 30.0 <= t0 < VURUS:
        continue
    akor_i = (o // 2) % 4
    n = int(olcu * SR)
    p = sum(saw(hz(m), n, (-0.008, 0.0, 0.008)) for m in AKOR[akor_i])
    p = lp(p, 2400) * zarf(n, 0.04, 2.0, 0.6, 0.1)
    ekle(L, p, t0, 0.07); ekle(R, p, t0, 0.07)

# Riser: beyaz gürültü + yükselen sinüs, 30 -> 36 sn.
n = int((VURUS - 30.0) * SR)
tt = np.arange(n) / SR
gur = lp(rng.standard_normal(n), 1500)
from scipy.signal import butter, lfilter
b, a = butter(2, 3000 / (SR / 2), 'high')
gur = lfilter(b, a, rng.standard_normal(n)) * (tt / tt[-1]) ** 2
sin = np.sin(2 * np.pi * np.cumsum(200 + 1600 * (tt / tt[-1]) ** 2) / SR) * (tt / tt[-1]) ** 2
ekle(L, gur * 0.25 + sin * 0.08, 30.0); ekle(R, gur * 0.25 + sin * 0.08, 30.0)

# Girişteki ince gerilim: 0 -> 7.5 sn.
n = int(7.5 * SR)
tt = np.arange(n) / SR
dr = lp(saw(hz(33), n, (-0.01, 0.01)), 400) * (0.3 + 0.7 * tt / tt[-1])
ekle(L, dr, 0, 0.18); ekle(R, dr, 0, 0.18)

# Büyük vuruş (36 sn): kick + sub düşüş + uzun akor.
n = int((DUR - VURUS) * SR)
tt = np.arange(n) / SR
dusus = np.sin(2 * np.pi * np.cumsum(30 + 90 * np.exp(-tt * 6)) / SR) * np.exp(-tt * 1.4)
ekle(L, K, VURUS, 1.1); ekle(R, K, VURUS, 1.1)
ekle(L, dusus, VURUS, 0.55); ekle(R, dusus, VURUS, 0.55)
p = sum(saw(hz(m), n, (-0.01, 0.0, 0.01)) for m in [57, 60, 64, 69, 72])
p = lp(p, 3200) * np.exp(-tt * 0.9)
ekle(L, p, VURUS, 0.09); ekle(R, p, VURUS, 0.09)
ekle(L, C, VURUS, 0.6); ekle(R, C, VURUS, 0.6)

# Mastering: hafif sıkıştırma, sınırlama, giriş/çıkış yumuşatma.
st = np.stack([L, R])
st = np.tanh(st * 1.6) / np.tanh(1.6)
st /= np.max(np.abs(st)) / 0.89
fade_in = int(0.05 * SR)
fade_out = int(1.2 * SR)
st[:, :fade_in] *= np.linspace(0, 1, fade_in)
st[:, -fade_out:] *= np.linspace(1, 0, fade_out)

out = sys.argv[1] if len(sys.argv) > 1 else 'giris-muzik.wav'
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((st.T * 32767).astype('<i2').tobytes())
print(out, DUR, 'sn')
