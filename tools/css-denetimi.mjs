#!/usr/bin/env node
/* =====================================================================
 * CSS BUTUNLUK DENETIMI
 *
 * 24 Eylul 2026: home.css'te .cinematic-vignette kuralindaki
 * linear-gradient( parantezi kapanmamisti. Tarayici o noktadan sonraki
 * butun kurallari yuttu; anasayfanin basligi, spot metni ve butonlari
 * hic gorunmedi. Dosya "gecerli" duruyordu cunku suslu parantezler
 * dengeliydi; hatayi yalnizca tarayici ayristiricisi goruyordu.
 *
 * Bu betik her kural govdesinde parantez dengesini ayri ayri olcer.
 *
 * Kullanim: node tools/css-denetimi.mjs
 * ===================================================================== */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const bulgular = [];

function dosyalar(dizin) {
  const out = [];
  for (const g of readdirSync(dizin, { withFileTypes: true })) {
    const y = join(dizin, g.name);
    if (g.isDirectory()) { if (!['node_modules', '.git'].includes(g.name)) out.push(...dosyalar(y)); }
    else if (g.name.endsWith('.css')) out.push(y);
  }
  return out;
}

for (const yol of dosyalar('public')) {
  const metin = readFileSync(yol, 'utf8');
  // Dize icindeki parantezler sayilmamali: url("...(...)") gecerlidir.
  let derinlik = 0, satir = 1, tirnak = null, yorum = false, kuralBasi = 1;
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (c === '\n') { satir++; continue; }
    if (yorum) { if (c === '*' && metin[i + 1] === '/') { yorum = false; i++; } continue; }
    if (tirnak) { if (c === tirnak && metin[i - 1] !== '\\') tirnak = null; continue; }
    if (c === '/' && metin[i + 1] === '*') { yorum = true; i++; continue; }
    if (c === '"' || c === "'") { tirnak = c; continue; }
    if (c === '(') { if (derinlik === 0) kuralBasi = satir; derinlik++; }
    else if (c === ')') derinlik--;
    else if (c === '}' && derinlik !== 0) {
      bulgular.push(`${yol}:${satir} — kural kapanirken parantez dengesi ${derinlik > 0 ? '+' : ''}${derinlik} ` +
        `(acilis satiri ${kuralBasi}). Tarayici buradan sonraki kurallari yutar.`);
      derinlik = 0;
    }
  }
  if (derinlik !== 0) bulgular.push(`${yol} — dosya sonunda parantez dengesi ${derinlik}.`);
  const ac = (metin.match(/{/g) || []).length, kap = (metin.match(/}/g) || []).length;
  if (ac !== kap) bulgular.push(`${yol} — suslu parantez dengesiz: ${ac} acilis, ${kap} kapanis.`);
}

if (bulgular.length) {
  console.error('CSS BUTUNLUK HATASI:\n');
  bulgular.forEach((b, i) => console.error(`  ${i + 1}. ${b}\n`));
  process.exit(1);
}
console.log('CSS butunluk denetimi temiz: her kuralda parantezler kapaniyor.');
