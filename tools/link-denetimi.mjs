#!/usr/bin/env node
/* BTMEDYA dahili baglanti denetimi. */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
const haberler=JSON.parse(readFileSync('public/data/haberler.json','utf8'));
const haberSlugs=new Set(haberler.map(x=>String(x.slug||'')));
import { join, normalize } from 'node:path';

const broken=[];
function walk(dir){const out=[];for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory()&&!['node_modules','.git'].includes(e.name))out.push(...walk(p));else if(e.isFile()&&e.name.endsWith('.html'))out.push(p);}return out;}
const files=walk('public');

function targetFile(path){
  let p=decodeURIComponent(path.split('#')[0].split('?')[0]);
  if(!p||p==='/') return 'public/index.html';
  if(p.startsWith('/api/')||p.startsWith('/media/')||p.startsWith('/pub/')) return null;
  if(p.startsWith('/haberler/')) {
    const slug=p.replace(/^\/haberler\//,'').replace(/\/$/,'');
    const cleanCategories=new Set(['balikesir','gundem','ekonomi','kultur','egitim','saglik','spor','teknoloji','dunya','yasam']);
    if(p==='/haberler/' || cleanCategories.has(slug)) return null;
    return haberSlugs.has(slug)||p.endsWith('.html') ? null : '__MISSING_DYNAMIC_NEWS__';
  }
  if(p.startsWith('/assets/')) return existsSync('public'+p)?'public'+p:null;
  if(p==='/robots.txt'||p==='/sitemap.xml'||p==='/news-sitemap.xml'||p==='/rss.xml'||p.startsWith('/.well-known/')) return existsSync('public'+p)?'public'+p:null;
  if(!p.startsWith('/')) return null;
  const raw=normalize('public'+p).replaceAll('\\\\','/');
  if(existsSync(raw)) return raw;
  if(existsSync(raw.replace(/\/$/,'')+'/index.html')) return raw.replace(/\/$/,'')+'/index.html';
  if(existsSync(raw+'.html')) return raw+'.html';
  return null;
}
for(const file of files){
  const h=readFileSync(file,'utf8');
  for(const m of h.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi)){
    const href=m[1];
    if(/^(https?:|mailto:|tel:|javascript:|data:)/i.test(href)||href.startsWith('#')||href.includes('${')||href.startsWith('/api/')||href.startsWith('/media/')||href.startsWith('/pub/')) continue;
    const t=targetFile(href);
    if(t==='__MISSING_DYNAMIC_NEWS__') broken.push(`${file}: haber slug'i veri kaynaginda yok ${href}`);
    else if(t===null && href.startsWith('/assets/')) broken.push(`${file}: eksik asset ${href}`);
    else if(href.startsWith('/') && t===null && !href.startsWith('/haberler/')) broken.push(`${file}: bozuk dahili baglanti ${href}`);
  }
}
console.log(`BTMEDYA link denetimi: ${files.length} HTML, ${broken.length} sorun`);
broken.forEach(x=>console.error('HATA  '+x));
process.exit(broken.length?1:0);
