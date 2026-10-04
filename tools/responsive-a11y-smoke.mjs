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
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000}).catch(e=>null);
    const status=response?.status()||0;
    if(item.path==='/admin/' && status===401){ continue; }
    if(!response || status>=400){ failures.push(vp.name+' '+item.path+' HTTP '+(status||'NO_RESPONSE')); continue; }
    await page.waitForTimeout(350);
    const result=await page.evaluate(() => {
      const html=document.documentElement;
      const body=document.body;
      const imgs=[...document.images];
      const unnamedButtons=[...document.querySelectorAll('button')].filter(b=>!((b.textContent||'').trim()||b.getAttribute('aria-label')||b.getAttribute('title')));
      const unnamedLinks=[...document.querySelectorAll('a')].filter(a=>!((a.textContent||'').trim()||a.getAttribute('aria-label')||a.getAttribute('title')) && !a.querySelector('img[alt]'));
      return {
        width:innerWidth,
        scrollWidth:Math.max(html.scrollWidth,body?.scrollWidth||0),
        imageWithoutAlt:imgs.filter(i=>!i.hasAttribute('alt')).length,
        unnamedButtons:unnamedButtons.length,
        unnamedLinks:unnamedLinks.length,
        hiddenFocusable:[...document.querySelectorAll('[aria-hidden="true"]')].filter(e=>!e.inert && e.querySelector('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).length,
        portfolioLabelMismatch:[...document.querySelectorAll('.portfoy-oynat')].filter(b=>{const label=(b.getAttribute('aria-label')||'').trim(),visible=(b.querySelector('.portfoy-sure')?.textContent||'').trim();return visible&&label&&!label.includes(visible)}).length
      };
    });
    if(result.scrollWidth > result.width + 2) failures.push(vp.name+' '+item.path+' horizontal-overflow '+result.scrollWidth+'>'+result.width);
    if(result.imageWithoutAlt) failures.push(vp.name+' '+item.path+' images-without-alt '+result.imageWithoutAlt);
    if(result.unnamedButtons) failures.push(vp.name+' '+item.path+' unnamed-buttons '+result.unnamedButtons);
    if(result.unnamedLinks) failures.push(vp.name+' '+item.path+' unnamed-links '+result.unnamedLinks);
    if(result.hiddenFocusable) failures.push(vp.name+' '+item.path+' aria-hidden-focusable '+result.hiddenFocusable);
    if(result.portfolioLabelMismatch) failures.push(vp.name+' '+item.path+' portfolio-label-mismatch '+result.portfolioLabelMismatch);
    if(item.path==='/' && vp.name==='mobile'){
      const toggle=page.locator('#menuToggle');
      if(await toggle.count()){
        const initiallyInert=await page.locator('#siteMenu').evaluate(el=>el.inert);
        if(!initiallyInert) failures.push('mobile / hidden menu is not inert on initial load');
        const mobileVideo=await page.locator('.mfilm-video').getAttribute('data-mobile-src');
        if(!mobileVideo?.endsWith('-mobile.mp4')) failures.push('mobile / hero video is not the optimized mobile asset');
        await toggle.click();
        const state=await page.locator('#siteMenu').getAttribute('aria-hidden');
        if(state!=='false') failures.push('mobile / menu did not open');
        await page.keyboard.press('Escape');
        const closed=await page.locator('#siteMenu').getAttribute('aria-hidden');
        if(closed!=='true') failures.push('mobile / menu did not close');
      }
    }
  }
  await page.close();
}
await browser.close();
if(failures.length){ console.error('RESPONSIVE_A11Y_SMOKE_FAILED'); failures.forEach(x=>console.error(x)); process.exit(1); }
console.log('BTMEDYA responsive/a11y smoke: OK · 3 viewports · 11 routes · no horizontal overflow or unnamed controls');
