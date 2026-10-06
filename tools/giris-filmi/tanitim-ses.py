#!/usr/bin/env python3
"""BTMEDYA 15 sn tanıtım filmi ses tasarımı (6 Ekim).

Neden sentez: kaynak planların çoğunda ses yok ya da kendi müzikleri
birbirini kesiyor; lisanslı müzik kullanılmaz. Kurgu (tools/giris-filmi/
tanitim.sh) ile aynı zaman çizelgesi:
  0.00-2.40  gece saha çekimi: şehir uğultusu, deklanşör sesleri
  2.40       geçiş: hışırtı
  2.40-3.60  gece şehir: alçak drone
  3.60       vuruş; sosyal medya bölümü: 120 BPM nabız
  6.80       yükselen gerilim -> 7.10 enerji patlaması (stüdyo)
  10.80      vuruş + parıltı: AI bölümü
  14.00      kapanış akoru, 15.00'te söner

Çalıştır: python3 tools/giris-filmi/tanitim-ses.py <cikti.wav>
"""
import sys
import wave

import numpy as np

SR = 48000
SURE = 15.0
N = int(SR * SURE)
t = np.arange(N) / SR
rng = np.random.default_rng(20261006)
sol = np.zeros(N)
sag = np.zeros(N)


def tek_kutup(x, kesim, tur="alcak"):
    k = np.broadcast_to(np.asarray(kesim, dtype=float), x.shape)
    a = np.exp(-2 * np.pi * k / SR)
    y = np.empty_like(x)
    s = 0.0
    for i in range(len(x)):
        s = (1 - a[i]) * x[i] + a[i] * s
        y[i] = s
    return y if tur == "alcak" else x - y


def bant(x, alt, ust):
    return tek_kutup(tek_kutup(x, ust), alt, "yuksek")


def zarf(bas, atak, birak, egri=4.0):
    e = np.zeros(N)
    i0 = int(bas * SR)
    parca = np.concatenate([np.linspace(0, 1, max(int(atak * SR), 1)), np.exp(-egri * np.linspace(0, 1, max(int(birak * SR), 1)))])
    son = min(N, i0 + len(parca))
    if i0 < N:
        e[i0:son] = parca[: son - i0]
    return e


def aralik(bas, bit, yumus=0.25):
    return np.clip((t - bas) / yumus, 0, 1) * np.clip((bit - t) / yumus, 0, 1)


def ekle(x, kazanc=1.0, pan=0.0, genis=0.0):
    global sol, sag
    x = x * kazanc
    k = int(genis * SR)
    sag_x = np.concatenate([np.zeros(k), x[: N - k]]) if k else x
    sol += x * np.sqrt(1 - pan)
    sag += sag_x * np.sqrt(1 + pan)


def vurus(bas, f0=90, f1=34, sure=1.0, kazanc=0.9):
    e = zarf(bas, 0.004, sure, egri=5)
    faz = 2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-np.clip(t - bas, 0, None) * 6)) / SR
    ekle(np.sin(faz) * e, kazanc)


def hisirti(bas, sure, yukari=True, kazanc=0.4):
    n = int(sure * SR)
    i0 = int(bas * SR)
    k = np.geomspace(300, 5200, n) if yukari else np.geomspace(5200, 220, n)
    x = tek_kutup(tek_kutup(rng.standard_normal(n), k), 150, "yuksek") * np.sin(np.linspace(0, np.pi, n)) ** 2
    y = np.zeros(N)
    son = min(N, i0 + n)
    y[i0:son] = x[: son - i0]
    ekle(y, kazanc, 0.0, 0.013)


# 1) Gece şehir: uğultu + uzak trafik + deklanşörler.
ugultu = tek_kutup(rng.standard_normal(N), 380) * aralik(0.0, 3.8, 0.4)
ekle(ugultu, 1.4, -0.1, 0.011)
for bas in (0.75, 1.05, 1.62, 2.05):
    e = zarf(bas, 0.001, 0.07, egri=10)
    ekle(bant(rng.standard_normal(N), 1800, 7000) * e, 0.5, 0.2)
    ekle(bant(rng.standard_normal(N), 300, 1200) * zarf(bas + 0.035, 0.001, 0.05, egri=10), 0.35, 0.2)
# Sıcak alçak drone: film boyunca, sonda yükselir.
for f, g in ((55.0, 1.0), (82.41, 0.5), (110.0, 0.4)):
    ekle(np.sin(2 * np.pi * f * t) * g * (0.07 * aralik(0.0, 14.8, 0.8) + 0.05 * aralik(10.8, 14.8, 0.6)), 1.0, 0.0, 0.009)

hisirti(2.05, 0.7, True, 0.4)
hisirti(3.2, 0.6, True, 0.45)
vurus(3.6, 110, 40, 0.8, 0.9)

# 2) Sosyal medya: 120 BPM nabız, kick + hi-hat; 6.8'e kadar.
for i in range(int((6.75 - 3.6) / 0.25)):
    b = 3.6 + i * 0.25
    if i % 2 == 0:
        vurus(b, 80, 45, 0.25, 0.45)
    ekle(bant(rng.standard_normal(N), 6000, 14000) * zarf(b + 0.125, 0.001, 0.05, egri=9), 0.18, 0.3 if i % 2 else -0.3)
# Nabzın altında yumuşak synth akoru (La minör).
for f in (220.0, 261.63, 329.63):
    testere = 2 * ((f * t) % 1) - 1
    ekle(tek_kutup(testere, 900) * aralik(3.6, 6.9, 0.2) * 0.05, 1.0, 0.0, 0.017)

# 3) Stüdyo: yükselen gerilim -> enerji patlaması.
yuksel = aralik(6.3, 7.15, 0.1) * np.clip((t - 6.3) / 0.85, 0, 1)
ekle(bant(rng.standard_normal(N), 900, 6000) * yuksel * 0.5, 1.0, 0.0, 0.015)
vurus(7.1, 95, 30, 1.4, 1.2)
ekle(tek_kutup(rng.standard_normal(N), 3500) * zarf(7.1, 0.003, 1.0, egri=3.5) * 0.45, 1.0, 0.0, 0.021)
ekle(tek_kutup(rng.standard_normal(N), 700) * aralik(7.6, 10.8, 0.4) * 0.12, 1.0, 0.0, 0.008)

# 4) AI: vuruş + parıltı.
hisirti(10.3, 0.6, True, 0.4)
vurus(10.8, 120, 38, 0.9, 0.9)
parilti = aralik(10.9, 14.3, 0.4) * (0.6 + 0.4 * np.sin(2 * np.pi * 6 * t))
for f, g in ((1760, 0.5), (2637, 0.35), (3520, 0.2)):
    ekle(np.sin(2 * np.pi * f * t) * parilti * g * 0.04, 1.0, 0.0, 0.019)

# 5) Kapanış akoru (Do majör üzerine yükselen), sonda söner.
for f, g in ((130.81, 0.6), (196.0, 0.45), (261.63, 0.4), (329.63, 0.3), (392.0, 0.2)):
    ekle(np.sin(2 * np.pi * f * t) * zarf(13.6, 0.5, 1.4, egri=2.2) * g * 0.22, 1.0, 0.0, 0.012)
vurus(13.6, 70, 28, 1.4, 1.0)

kenar = np.clip(t / 0.05, 0, 1) * np.clip((SURE - t) / 0.5, 0, 1)
stereo = np.stack([sol * kenar, sag * kenar], axis=1)
stereo /= max(1e-9, np.abs(stereo).max()) / 0.89
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((stereo * 32767).astype("<i2").tobytes())
print(f"{sys.argv[1]}: {SURE:.1f} sn")
