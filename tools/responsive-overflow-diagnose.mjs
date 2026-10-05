#!/usr/bin/env node
import { chromium } from 'playwright';

const BASE = process.env.BTMEDYA_BASE_URL || 'https://btmedya.com.tr';
const pages = ['/', '/haberler/', '/hizmetler/', '/video-produksiyon/', '/sosyal-medya/', '/portfoy/', '/arsiv/', '/kaynak-masasi/', '/iletisim/', '/en/'];
const viewports = [{name:'desktop',width:1440,height:900},{name:'tablet',width:768,height:1024},{name:'mobile',width:390,height:844}];

const browser = await chromium.launch({headless:true});
for (const vp of viewports) {
  const page = await browser.newPage({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:1});
  for (const path of pages) {
    const response = await page.goto(BASE + path,{waitUntil:'domcontentloaded',timeout:30000}).catch(()=>null);
    if (!response || response.status() >= 400) {
      console.log(JSON.stringify({viewport:vp.name,path,kind:'http',status:response?.status()||0}));
      continue;
    }
    await page.waitForTimeout(350);
    const result = await page.evaluate(() => {
      const vw = innerWidth;
      const candidates = [...document.querySelectorAll('body *')].map((el, index) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          index,
          tag: el.tagName.toLowerCase(),
          id: el.id || '',
          cls: typeof el.className === 'string' ? el.className.split(/\s+/).filter(Boolean).slice(0,4).join('.') : '',
          left: Math.round(r.left*10)/10,
          right: Math.round(r.right*10)/10,
          width: Math.round(r.width*10)/10,
          display: cs.display,
          position: cs.position,
          overflowX: cs.overflowX,
          z: cs.zIndex
        };
      }).filter(x => x.width > 0 && (x.left < -1 || x.right > vw + 1))
       .sort((a,b) => Math.max(b.right-vw,-b.left) - Math.max(a.right-vw,-a.left))
       .slice(0,20);
      const html=document.documentElement, body=document.body;
      const menu=document.querySelector('#menuToggle');
      return {
        vw,
        htmlScrollWidth: html.scrollWidth,
        bodyScrollWidth: body?.scrollWidth || 0,
        candidates,
        menu: menu ? {
          exists:true,
          rect: (()=>{const r=menu.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width}})(),
          ariaExpanded: menu.getAttribute('aria-expanded')
        } : {exists:false}
      };
    });
    console.log(JSON.stringify({viewport:vp.name,path,...result}));
    if (path === '/' && vp.name === 'mobile') {
      const toggle = page.locator('#menuToggle');
      if (await toggle.count()) {
        await toggle.click().catch(e=>console.log(JSON.stringify({viewport:vp.name,path,kind:'menu-click-error',message:e.message})));
        const state = await page.evaluate(() => ({
          btkmHidden: document.querySelector('#btKategoriMenu')?.hidden ?? null,
          btkmClass: document.querySelector('#btKategoriMenu')?.className ?? null,
          oldHidden: document.querySelector('#siteMenu')?.getAttribute('aria-hidden') ?? null,
          htmlClass: document.documentElement.className
        }));
        console.log(JSON.stringify({viewport:vp.name,path,kind:'menu-state',...state}));
        await page.keyboard.press('Escape').catch(()=>{});
      }
    }
  }
  await page.close();
}
await browser.close();