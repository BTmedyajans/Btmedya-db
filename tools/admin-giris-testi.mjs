// Admin girişi testi (6 Ekim). /admin/ oturumsuz okura giriş formu yerine
// yönetim merkezine yönlendiren kabuğu veriyordu; merkez de oturum isteyip
// /admin/'e geri gönderdiği için panel sonsuz döngüdeydi ve giriş formu hiç
// görünmüyordu. Ağ ve Cloudflare gerektirmez.
// Çalıştır: node tools/admin-giris-testi.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';

register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(s, c, n) { return s.startsWith('cloudflare:') ? { url: 'data:text/javascript,' + encodeURIComponent('export class WorkerEntrypoint{} export class WorkflowEntrypoint{} export class DurableObject{}'), shortCircuit: true } : n(s, c); }
`));
const { default: worker } = await import('../src/worker.js');

// Statik varlıklar diskten: Worker'ın hangi dosyayı sunduğu gerçek içerikle sınanır.
const dosya = yol => yol.endsWith('/') ? 'public' + yol + 'index.html' : 'public' + yol;
const kv = new Map();
const env = {
  ADMIN_USERNAME: 'BTMEDYA', ADMIN_PASSWORD: 'test-sifresi', ADMIN_SESSION_SECRET: 'test-oturum',
  KV: { get: async k => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); }, delete: async k => { kv.delete(k); } },
  // /api/login medya API'sinde; canlıda DB ve MEDIA bağlıdır. Giriş ikisine de dokunmaz.
  DB: { prepare: () => { const q = { bind: () => q, all: async () => ({ results: [] }), first: async () => null, run: async () => ({ meta: {} }) }; return q; }, batch: async () => [] },
  MEDIA: { get: async () => null, list: async () => ({ objects: [] }), head: async () => null },
  ASSETS: { fetch: async req => {
    const yol = new URL(req.url).pathname;
    try { return new Response(readFileSync(dosya(yol)), { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }); }
    catch { return new Response('yok', { status: 404 }); }
  } }
};
const istek = (yol, ek = {}) => worker.fetch(new Request('https://btmedya.com.tr' + yol, { redirect: 'manual', ...ek, headers: { accept: 'text/html', ...(ek.headers || {}) } }), env, { waitUntil() {} });

// 1) Oturumsuz /admin/: giriş formu, 401.
let r = await istek('/admin/');
assert.equal(r.status, 401);
let govde = await r.text();
assert.match(govde, /<form id="giris"/, '/admin/ oturumsuz okura giriş formu göstermeli');
assert.doesNotMatch(govde, /location\.replace\('\/admin\/agency-os/, 'oturumsuz okur yönetim merkezine yönlendirilmemeli (döngü)');

// 2) Oturumsuz alt sayfa: girişe döner, hedef korunur.
r = await istek('/admin/agency-os/?v=1');
assert.equal(r.status, 302);
assert.equal(r.headers.get('location'), 'https://btmedya.com.tr/admin/?sonra=%2Fadmin%2Fagency-os%2F%3Fv%3D1');

// 3) Yanlış şifre reddedilir; kullanıcı adı büyük/küçük harfe duyarsız.
r = await istek('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'btmedya', password: 'yanlis' }) });
assert.equal(r.status, 401);
r = await istek('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'btmedya', password: 'test-sifresi' }) });
assert.equal(r.status, 200);
const cerez = (r.headers.get('set-cookie') || '').split(';')[0];
assert.match(cerez, /^bt_admin=./, 'girişte oturum çerezi verilmeli');

// 4) Oturumla /admin/ yönetim kabuğunu (200), alt sayfa içeriği açar.
r = await istek('/admin/', { headers: { cookie: cerez } });
assert.equal(r.status, 200);
assert.match(await r.text(), /\/admin\/agency-os\//);
r = await istek('/admin/agency-os/', { headers: { cookie: cerez } });
assert.notEqual(r.status, 302, 'oturumla alt sayfa girişe dönmemeli');

// 5) Giriş formu yalnız panel içi adrese döner (açık yönlendirme yok).
const form = readFileSync('public/admin/giris/index.html', 'utf8');
const kalip = new RegExp(form.match(/const hedef=\/(.+?)\/i\.test\(sonra\)/)[1], 'i');
assert.ok(kalip.test('/admin/agency-os/?v=1'));
for (const kotu of ['https://kotu.example/', '//kotu.example/admin/', '/haberler/', '/admin/giris/']) assert.ok(!kalip.test(kotu), `açık yönlendirme: ${kotu}`);

// 6) Canlıda ADMIN_USERNAME e-posta adresi; form ise "BTMEDYA" ile dolu gelir.
//    Marka adı her yapılandırmada geçerli olmalı, yoksa doğru şifre reddedilir.
{
  const eposta = { ...env, ADMIN_USERNAME: 'busetuncay74@gmail.com' };
  const gir = (username, password) => worker.fetch(new Request('https://btmedya.com.tr/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password }) }), eposta, { waitUntil() {} });
  assert.equal((await gir('BTMEDYA', 'test-sifresi')).status, 200, 'formun varsayılan kullanıcı adı girişi açmalı');
  assert.equal((await gir('busetuncay74@gmail.com', 'test-sifresi')).status, 200, 'yapılandırılmış kullanıcı adı girişi açmalı');
  assert.equal((await gir('BTMEDYA', 'yanlis')).status, 401);
  assert.equal((await gir('baskasi', 'test-sifresi')).status, 401, 'tanımsız kullanıcı adı reddedilmeli');
  assert.match(form, /id="kullanici"[^>]*value="BTMEDYA"/, 'form varsayılanı değişirse bu test de güncellenmeli');
}

// 7) Kabuk okuru başka bir hosta göndermez: panel btmedya.com.tr/admin altında açılır.
const kabuk = readFileSync('public/admin/index.html', 'utf8');
assert.doesNotMatch(kabuk, /https?:\/\/[^"'\s]*\/admin/, 'yönetim kabuğu başka bir hosta yönlendiriyor');
assert.match(kabuk, /location\.replace\('\/admin\/agency-os\//);

// 8) Yönetim merkezinin taban stili yerinde. 2 Ekim'de dosya yalnız ek
//    kurallarla değiştirilmiş, merkez dört gün stilsiz açılmıştı.
const merkezStil = readFileSync('public/admin/agency-os/agency-os.css', 'utf8');
for (const parca of [':root{', '--lime:', 'body{', '.top{']) assert.ok(merkezStil.includes(parca), `agency-os.css taban kuralı eksik: ${parca}`);

console.log('ADMIN GIRIS TESTI GECTI');
