#!/usr/bin/env python3
"""BTMEDYA bolum sayfalari icin sosyal paylasim karti uretir (1200x675).

NEDEN
26 Eylul 2026 denetimi: 10 sayfada og:image hic yoktu, kullanan dort sayfa
ise 175x202 pikselik bir logoyu gosteriyordu. Facebook ve WhatsApp bu
boyutu onizleme olarak kabul etmiyor; bir medya ajansinin baglantilari
sosyalde gorselsiz dusuyordu.

Kartlar haber kapaklariyla ayni uretici fonksiyonlari kullanir; boylece
paylasilan her BTMEDYA baglantisi ayni gorsel dili tasir. Kare havuzu da
ayni: public/data/kapak-fotograflari.json.

Kullanim:
  python3 tools/paylasim-kapagi.py            plandaki tum kartlari uretir
  python3 tools/paylasim-kapagi.py <ad>...    yalnizca verilenleri uretir
"""
import json
import os
import sys

# Kapak uretici ayni klasorde; tire iceren dosya adi import edilemedigi
# icin modul dosya yolundan yuklenir.
import importlib.util

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_spec = importlib.util.spec_from_file_location(
    "haber_kapagi", os.path.join(KOK, "tools", "haber-kapagi.py"))
hk = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hk)

PLAN = os.path.join(KOK, "public", "data", "paylasim-kartlari.json")
HEDEF = os.path.join(KOK, "public", "assets", "paylasim")


def plan():
    with open(PLAN, encoding="utf-8") as f:
        return json.load(f)


if __name__ == "__main__":
    istenen = set(sys.argv[1:])
    os.makedirs(HEDEF, exist_ok=True)
    kareler = hk.havuz()
    n = 0
    for k in plan():
        if istenen and k["ad"] not in istenen:
            continue
        kare = kareler.get(k.get("foto") or "")
        if k.get("foto") and not kare:
            raise SystemExit(f"{k['ad']}: '{k['foto']}' karesi havuzda yok.")
        foto = os.path.join(KOK, kare["yol"]) if kare else None
        boyut = hk.kapak(
            k["baslik"], k["kategori"], k["altbilgi"],
            os.path.join(HEDEF, k["ad"] + ".webp"),
            foto=foto,
            ust=kare.get("ust", 0.30) if kare else 0.30,
            kunye=kare.get("kunye", "BTMEDYA") if kare else "BTMEDYA",
            gercek=bool(kare and kare.get("gercek")),
            # Bolum sayfasi haber degil; "HABER: BUSE TUNCAY" kunyesi burada
            # yanlis beyan olurdu.
            imza=k.get("imza", "BTMEDYA · BUSE TUNCAY"),
        )
        n += 1
        print(f"  {k['ad']:26} {boyut/1024:>5.0f} KB")
    print(f"\n  {n} paylasim karti uretildi -> public/assets/paylasim/")
