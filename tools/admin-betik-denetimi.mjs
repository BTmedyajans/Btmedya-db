// Admin sayfalarındaki satır içi betiklerin sözdizimi denetimi (11 Ekim).
// Connect Merkezi ve Site OS betikleri sözdizimi hatasıyla canlıdaydı; sayfa
// açılıyor ama hiçbir düğme çalışmıyordu ve hiçbir test bunu yakalamıyordu.
// Her satır içi <script> bloğu new Function ile derlenir (çalıştırılmaz).
// Çalıştır: node tools/admin-betik-denetimi.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dosyalar = [];
(function gez(d) { for (const a of readdirSync(d)) { const y = join(d, a); if (statSync(y).isDirectory()) gez(y); else if (y.endsWith('.html')) dosyalar.push(y); } })('public/admin');
const bulgular = [];
let sayi = 0;
for (const f of dosyalar) {
  const t = readFileSync(f, 'utf8');
  for (const m of t.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/type="(?:application\/ld\+json|application\/json|module)"/.test(m[1]) || !m[2].trim()) continue;
    sayi++;
    try { new Function(m[2]); } catch (e) { bulgular.push(`${f}: ${e.message}`); }
  }
}
if (bulgular.length) { console.error('ADMIN BETIK DENETIMI BASARISIZ\n- ' + bulgular.join('\n- ')); process.exit(1); }
console.log(`ADMIN BETIK DENETIMI GECTI: ${dosyalar.length} sayfa, ${sayi} satır içi betik`);
