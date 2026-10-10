#!/usr/bin/env node
import { chromium } from 'playwright';

const BASE = process.env.BTMEDYA_BASE_URL || 'https://btmedya.com.tr';
const pages = [
  {path:'/', name:'home'},
  {path:'/haberler/', name:'news'},
  {path:'/hizmetler/', name:'services'},
  {path:'/video-produksiyon/', name:'production'},
  {path:'/sosyal-medya/', name:'social'},
  {path:'/portfoy/', name:'portfolio'},
  {path:'/arsiv/', name:'archive'},
  {path:'/kaynak-masasi/', name:'sources'},
  {path:'/iletisim/', name:'contact'},
  {path:'/en/', name:'english'},
  {path:'/admin/', name:'admin'}
];
const viewports = [
  {name:'desktop', width:1440, height:900},
  {name:'tablet', width:768, height:1024},
  {name:'mobile', width:390, height:844}
];
const browser = await chromium.launch({headless:true});
const failures=[];
for (const vp of viewports) {
  const page=await browser.newPage({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:1});
  page.on('pageerror', e => failures.push(vp.name+' '+(page.url()||'page')+' pageerror: '+e.message));
  for (const item of pages) {
    const url=BASE+item.path;
    if(item.path==='/admin/'){
      const adminResponse=await page.request.get(url,{timeout:30000,failOnStatusCode:false}).catch(()=>null);
      const adminStatus=adminResponse?.status()||0;
      if(!adminResponse) failures.push(vp.name+' /admin/ HTTP NO_RESPONSE');
      else if(adminStatus!==401 && adminStatus!==200) failures.push(vp.name+' /admin/ HTTP '+adminStatus+' (expected 401/200)');
      continue;
    }
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000}).catch(e=>null);
    const status=response?.status()||0;
    if(!response || status>=400){ failures.push(vp.name+' '+item.path+' HTTP '+(status||'NO_RESPONSE')); continue; }
    await page.waitForTimeout(350);
    const result=await page.evaluate(() => {
      const html=document.documentElement;
      const body=document.body;
      const imgs=[...document.images];
      const unnamedButtons=[...document.querySelectorAll('button')].filter(b=>!((b.textContent||'').trim()||b.getAttribute('aria-label')||b.getAttribute('title')));
      const unnamedLinks=[...document.querySelectorAll('a')].filter(a=>!((a.textContent||'').trim()||a.getAttribute('aria-label')||a.getAttribute('title')) && !a.querySelector('img[alt]'));
      const pageRight=Math.max(document.documentElement.clientWidth,document.body?.clientWidth||0);
      const contentWidth=Math.max(html.scrollWidth,body?.scrollWidth||0);
      const meta=[...document.querySelectorAll('*')].map(el=>{
        const r=el.getBoundingClientRect();
        const out=r.left < -2 || r.right > pageRight+2;
        if(!out) return null;
        if(el.classList?.contains('skip') || el.getAttribute('aria-hidden')==='true') return null;
        let p=el.parentElement,contained=false,depth=0;
        while(p && p!==document.body && depth<20){
          const cs=getComputedStyle(p);
          const ox=cs.overflowX;
          if(['auto','scroll','hidden','clip'].includes(ox)){ contained=true; break; }
          p=p.parentElement; depth++;
        }
        return contained ? null : {tag:el.tagName,id:el.id||'',cls:(typeof el.className==='string'?el.className.slice(0,100):''),left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width)};
      }).filter(Boolean).sort((a,b)=>(Math.max(0,b.right-pageRight)+Math.max(0,-b.left))-(Math.max(0,a.right-pageRight)+Math.max(0,-a.left))).slice(0,8);
      return {width:pageRight,scrollWidth:contentWidth,imageWithoutAlt:imgs.filter(i=>!i.hasAttribute('alt')).length,unnamedButtons:unnamedButtons.length,unnamedLinks:unnamedLinks.length,offenders:meta};
    });
    if(result.scrollWidth > result.width + 2 && result.offenders?.length){ failures.push(vp.name+' '+item.path+' horizontal-overflow '+result.scrollWidth+'>'+result.width); failures.push(vp.name+' '+item.path+' offenders '+JSON.stringify(result.offenders)); }
    if(result.imageWithoutAlt) failures.push(vp.name+' '+item.path+' images-without-alt '+result.imageWithoutAlt);
    if(result.unnamedButtons) failures.push(vp.name+' '+item.path+' unnamed-buttons '+result.unnamedButtons);
    if(result.unnamedLinks) failures.push(vp.name+' '+item.path+' unnamed-links '+result.unnamedLinks);
    if(item.path==='/' && vp.name==='mobile'){
      const toggle=page.locator('#menuToggle');
      if(await toggle.count()){
        // The homepage intentionally hides navigation during the intro film.
        // Exercise the real user flow: wait for the film to finish and the
        // header to become interactive before testing the hamburger menu.
        await page.waitForFunction(() => document.body.classList.contains('film-bitti') || !document.body.classList.contains('bt-clean-intro-active'), {timeout:30000});
        await toggle.waitFor({state:'visible',timeout:5000});
        await toggle.click();
        await page.waitForTimeout(120);
        const state=await page.locator('#btKategoriMenu').evaluate(el=>({hidden:el.hidden,open:el.classList.contains('is-acik')}));
        if(state.hidden || !state.open) failures.push('mobile / category menu did not open');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(320);
        const closed=await page.locator('#btKategoriMenu').evaluate(el=>el.hidden);
        if(!closed) failures.push('mobile / category menu did not close');
      }
    }
  }
  await page.close();
}

// Admin browser + authorization smoke. Use a fresh no-cookie context deliberately:
// the Worker redirects anonymous HTML requests to /admin/ (login shell), while static JS/CSS assets
// may be fetched so the browser can load the login page. Do not expect Agency OS UI before login.
const adminPage = await browser.newPage({viewport:{width:390,height:844}});
const adminResponse = await adminPage.goto(BASE+'/admin/agency-os/',{waitUntil:'domcontentloaded',timeout:30000}).catch(()=>null);
if(!adminResponse){
  failures.push('anonymous admin page NO_RESPONSE');
}else{
  const finalUrl=new URL(adminPage.url());
  const anonymous=await adminPage.evaluate(()=>({
    status:document.readyState,
    path:location.pathname,
    noindex:!!document.querySelector('meta[name="robots"][content*="noindex"]'),
    loginForm:!!document.querySelector('form input[type="password"], input[name="password"], input[autocomplete="current-password"]'),
    hasAgencyShell:!!document.querySelector('#accessBrowserReadiness')
  }));
  // Either the Worker login shell/redirect or the account's Cloudflare Access
  // login challenge is an acceptable auth boundary for a fresh anonymous browser.
  const workerLogin=adminResponse.status()===401 || adminResponse.status()===302 || adminResponse.status()===303 ||
    (finalUrl.origin===BASE && /^\/admin\/$/.test(finalUrl.pathname));
  const cloudflareAccessLogin=finalUrl.hostname.endsWith('.cloudflareaccess.com') &&
    finalUrl.pathname.startsWith('/cdn-cgi/access/login/');
  if(!workerLogin && !cloudflareAccessLogin){
    failures.push('anonymous admin page did not reach a recognized login boundary: HTTP '+adminResponse.status()+' at '+adminPage.url());
  }
  if(anonymous.hasAgencyShell && !workerLogin) failures.push('anonymous request exposed the authenticated Agency OS widget');
}
// Assert the Agency OS diagnostic exists in source without requiring an admin login cookie in CI.
const sourceChecks=[
  ['public/admin/agency-os/index.html',/id=["']accessBrowserReadiness["']/],
  ['public/admin/agency-os/agency-os.js',/function loadAccessBrowserReadiness\s*\(/],
  ['public/admin/agency-os/agency-os.js',/credentials:\s*['"]omit['"]/]
];
const fs=await import('node:fs/promises');
for(const [relative,pattern] of sourceChecks){
  const source=await fs.readFile(new URL('../'+relative,import.meta.url),'utf8').catch(()=>null);
  if(!source || !pattern.test(source)) failures.push('admin readiness source check failed: '+relative);
}
const anonPage=await browser.newPage();
for(const path of ['/api/admin/agency-supervisor','/api/admin/core','/api/admin/site-os','/api/admin/social/providers']){
  const res=await anonPage.request.get(BASE+path,{timeout:30000,failOnStatusCode:false}).catch(()=>null);
  const status=res?.status()||0;
  if(!res) failures.push('anonymous API guard NO_RESPONSE '+path);
  else if(status!==401&&status!==403) failures.push('anonymous API guard '+path+' returned '+status+' (expected 401/403)');
}
await anonPage.close();
await adminPage.close();

await browser.close();
if(failures.length){ console.error('RESPONSIVE_A11Y_SMOKE_FAILED'); failures.forEach(x=>console.error(x)); process.exit(1); }
console.log('BTMEDYA responsive/a11y smoke: OK · 3 viewports · 11 routes · no horizontal overflow or unnamed controls');
