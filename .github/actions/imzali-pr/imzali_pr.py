#!/usr/bin/env python3
"""Otomasyon çıktısını imzalı commit ile bir dala yazar ve PR açar.

Neden: depo kural seti her dalda imzalı commit istiyor. Actions koşucusunda
`git commit` + `git push` imzasız commit üretir ve push reddedilir (11 Ekim:
haber kapak otomasyonu, Hero Video Quality). GitHub GraphQL
`createCommitOnBranch` ile yazılan commit'i GitHub kendisi imzalar, yani
kural setine bypass eklemeden ya da kuralı gevşetmeden aynı akış çalışır.

Ortam: GH_TOKEN, GITHUB_REPOSITORY, GITHUB_API_URL, GITHUB_GRAPHQL_URL,
DAL, YOLLAR (boşlukla ayrılmış), MESAJ, PR_BASLIK, PR_GOVDE.
Yalnız stdlib; token değeri hiçbir çıktıya yazılmaz.
"""
from __future__ import annotations

import base64
import json
import os
import shlex
import subprocess
import sys
import urllib.error
import urllib.request

API = os.environ.get("GITHUB_API_URL", "https://api.github.com")
GRAPHQL = os.environ.get("GITHUB_GRAPHQL_URL", "https://api.github.com/graphql")
REPO = os.environ["GITHUB_REPOSITORY"]
TOKEN = os.environ["GH_TOKEN"]
DAL = os.environ["DAL"]
YOLLAR = shlex.split(os.environ["YOLLAR"])
MESAJ = os.environ.get("MESAJ", "chore: otomasyon çıktısı")
PR_BASLIK = os.environ.get("PR_BASLIK", MESAJ)
PR_GOVDE = os.environ.get("PR_GOVDE", "")
# GraphQL gövdesi base64 ile büyür; küçük paketler timeout/504 riskini düşürür.
PARCA_BAYT = 3 * 1024 * 1024


def istek(yontem: str, url: str, govde: dict | None = None) -> tuple[int, dict]:
    veri = None if govde is None else json.dumps(govde).encode()
    req = urllib.request.Request(url, data=veri, method=yontem, headers={
        "Authorization": "Bearer " + TOKEN,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    try:
        with urllib.request.urlopen(req, timeout=120) as yanit:
            ham = yanit.read()
            return yanit.status, json.loads(ham) if ham else {}
    except urllib.error.HTTPError as hata:
        ham = hata.read().decode("utf-8", "replace")[:800]
        try:
            return hata.code, json.loads(ham)
        except ValueError:
            return hata.code, {"message": ham}


def degisenler() -> tuple[list[str], list[str]]:
    cikti = subprocess.run(
        ["git", "status", "--porcelain=v1", "-z", "--untracked-files=all", "--", *YOLLAR],
        check=True, capture_output=True,
    ).stdout.decode()
    eklenen, silinen = [], []
    parcalar = cikti.split("\0")
    i = 0
    while i < len(parcalar):
        kayit = parcalar[i]
        i += 1
        if not kayit:
            continue
        durum, yol = kayit[:2], kayit[3:]
        if "R" in durum or "C" in durum:
            eski = parcalar[i]
            i += 1
            if "R" in durum:
                silinen.append(eski)
        (silinen if "D" in durum else eklenen).append(yol)
    return eklenen, silinen


def dal_hazirla(taban: str) -> str:
    # Each workflow run uses a branch named for its source commit. Reuse that
    # branch's current head; never force-reset an existing automation branch.
    ref_url = f"{API}/repos/{REPO}/git/ref/heads/{DAL}"
    kod, yanit = istek("GET", ref_url)
    if kod == 200:
        oid = (yanit.get("object") or {}).get("sha")
        if oid:
            print(f"Var olan otomasyon dalı korunuyor: {DAL} @ {oid[:12]}")
            return oid
        sys.exit(f"::error::{DAL} dalı bulundu ancak commit SHA alınamadı.")

    if kod != 404:
        sys.exit(f"::error::{DAL} dalı okunamadı (HTTP {kod}): {yanit.get('message', '')}")

    kod, yanit = istek("POST", f"{API}/repos/{REPO}/git/refs",
                       {"ref": f"refs/heads/{DAL}", "sha": taban})
    if kod == 201:
        return taban

    # Handle two scheduled runs racing to create the same source-scoped branch.
    if kod == 422:
        kod, tekrar = istek("GET", ref_url)
        oid = ((tekrar.get("object") or {}).get("sha") or "") if kod == 200 else ""
        if oid:
            print(f"Eşzamanlı çalıştırmanın oluşturduğu dal kullanılıyor: {DAL} @ {oid[:12]}")
            return oid

    sys.exit(f"::error::{DAL} dalı hazırlanamadı (HTTP {kod}): {yanit.get('message', '')}. "
             "Ana dalı veya var olan otomasyon dallarını force-reset etmeyin.")


def commit_at(onceki: str, eklenen: list[str], silinen: list[str], baslik: str) -> str:
    sorgu = """mutation($girdi: CreateCommitOnBranchInput!) {
      createCommitOnBranch(input: $girdi) { commit { oid url } } }"""
    girdi = {
        "branch": {"repositoryNameWithOwner": REPO, "branchName": DAL},
        "message": {"headline": baslik},
        "expectedHeadOid": onceki,
        "fileChanges": {
            "additions": [{"path": y, "contents": base64.b64encode(open(y, "rb").read()).decode()} for y in eklenen],
            "deletions": [{"path": y} for y in silinen],
        },
    }
    kod, yanit = istek("POST", GRAPHQL, {"query": sorgu, "variables": {"girdi": girdi}})
    commit = ((yanit.get("data") or {}).get("createCommitOnBranch") or {}).get("commit")
    if kod != 200 or not commit:
        hatalar = "; ".join(h.get("message", "") for h in yanit.get("errors", [])) or yanit.get("message", "")
        sys.exit(f"::error::İmzalı commit yazılamadı (HTTP {kod}): {hatalar}")
    print(f"İmzalı commit: {commit['oid'][:12]} ({len(eklenen)} dosya, {len(silinen)} silme)")
    return commit["oid"]


def pr_ac() -> None:
    sahip = REPO.split("/")[0]
    kod, acik = istek("GET", f"{API}/repos/{REPO}/pulls?state=open&base=main&head={sahip}:{DAL}")
    if kod == 200 and acik:
        print(f"Açık PR #{acik[0]['number']} güncellendi.")
        return
    kod, yanit = istek("POST", f"{API}/repos/{REPO}/pulls",
                       {"title": PR_BASLIK, "head": DAL, "base": "main", "body": PR_GOVDE})
    if kod == 201:
        print(f"PR açıldı: #{yanit['number']}")
    else:
        print(f"::warning::PR açılamadı (HTTP {kod}: {yanit.get('message', '')}); "
              f"Actions'ın PR açma izni kapalı olabilir. Çıktı {DAL} dalında hazır.")


def main() -> None:
    eklenen, silinen = degisenler()
    if not eklenen and not silinen:
        print("Yazılacak değişiklik yok; akış güncel.")
        return
    taban = subprocess.run(["git", "rev-parse", "HEAD"], check=True, capture_output=True, text=True).stdout.strip()
    ucu = dal_hazirla(taban)
    parcalar, parca, boyut = [], [], 0
    for yol in eklenen:
        b = os.path.getsize(yol)
        if parca and boyut + b > PARCA_BAYT:
            parcalar.append(parca)
            parca, boyut = [], 0
        parca.append(yol)
        boyut += b
    parcalar.append(parca)
    for no, p in enumerate(parcalar, 1):
        baslik = MESAJ if len(parcalar) == 1 else f"{MESAJ} ({no}/{len(parcalar)})"
        ucu = commit_at(ucu, p, silinen if no == 1 else [], baslik)
    pr_ac()


if __name__ == "__main__":
    main()
