#!/usr/bin/env node
/* BTMEDYA erisilebilirlik denetimi.
 * Statik HTML'i merge oncesi tarar; kucuk tasarim degisikliklerinin
 * erişilebilirlik regresyonuna donmesini engeller.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const errors=[], warnings=[];
function walk(dir){
  const out=[];
  for(const e of readdirSync(dir,{withFileTypes:true})){
    const p=join(dir,e.name);
    if(e.isDirectory() && !['node_modules','.git'].includes(e.name)) out.push(...walk(p));
    else if(e.isFile() && e.name.endsWith('.html')) out.push(p);
  }
  return out;
}
const files=walk('public');

for(const file of files){
  if(file.endsWith('google3d14019638be46ce.html')) continue;
  const h=readFileSync(file,'utf8');
  if(!/<html\b[^>]*\blang\s*=\s*["'][^"']+["']/i.test(h)) errors.push(`${file}: <html> lang eksik`);
  if(!/<title>[^<]+<\/title>/i.test(h)) errors.push(`${file}: <title> eksik`);
  if(!/<meta\s+name=["']viewport["']/i.test(h)) warnings.push(`${file}: viewport meta eksik`);

  for(const m of h.matchAll(/<img\b[^>]*>/gi)){
    if(!/\balt\s*=\s*["'][^"']*["']/i.test(m[0])) errors.push(`${file}: img alt eksik: ${m[0].slice(0,140)}`);
  }
  for(const m of h.matchAll(/<iframe\b[^>]*>/gi)){
    if(!/\btitle\s*=\s*["'][^"']+["']/i.test(m[0])) errors.push(`${file}: iframe title eksik`);
  }
  for(const m of h.matchAll(/<button\b([^>]*)>([\\s\\S]*?)<\/button>/gi)){
    const attrs=m[1], text=m[2].replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/\\s+/g,' ').trim();
    if(!text && !/\baria-label\s*=\s*["'][^"']+["']/i.test(attrs) && !/\btitle\s*=\s*["'][^"']+["']/i.test(attrs))
      errors.push(`${file}: button accessible name eksik`);
  }
  for(const m of h.matchAll(/<a\b([^>]*)>([\\s\\S]*?)<\/a>/gi)){
    const attrs=m[1], inner=m[2].replace(/<img\b[^>]*>/gi,'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/\\s+/g,' ').trim();
    const imgAlt=(m[2].match(/<img\b[^>]*\balt\s*=\s*["']([^"']+)["']/i)||[])[1]||'';
    if(!inner && !imgAlt && !/\baria-label\s*=\s*["'][^"']+["']/i.test(attrs) && !/\btitle\s*=\s*["'][^"']+["']/i.test(attrs))
      errors.push(`${file}: link accessible name eksik`);
  }
  for(const m of h.matchAll(/<a\b[^>]*\btarget\s*=\s*["']_blank["'][^>]*>/gi)){
    if(!/\brel\s*=\s*["'][^"']*\bnoopener\b/i.test(m[0])) warnings.push(`${file}: target=_blank rel=noopener eksik`);
  }
  const hs=[...h.matchAll(/<h([1-6])\b/gi)].map(x=>Number(x[1]));
  for(let i=1;i<hs.length;i++) if(hs[i]-hs[i-1]>1) warnings.push(`${file}: baslik seviyesi ${hs[i-1]} -> ${hs[i]} atliyor`);
}
console.log(`BTMEDYA a11y denetimi: ${files.length} HTML, ${errors.length} hata, ${warnings.length} uyari`);
errors.forEach(x=>console.error('HATA  '+x));
warnings.slice(0,80).forEach(x=>console.warn('UYARI '+x));
process.exit(errors.length?1:0);
