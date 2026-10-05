import { chromium } from 'playwright';

const BASE = 'https://btmedya.com.tr';
const pages = ['/','/haberler/','/hizmetler/','/video-produksiyon/','/sosyal-medya/','/portfoy/'];
const viewports = [{name:'desktop',width:1440,height:900},{name:'tablet',width:768,height:1024},{name:'mobile',width:390,height:844}];

const browser = await chromium.launch({headless:true});
for (const vp of viewports) {
  const page = await browser.newPage({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:1});
  for (const path of pages) {
    await page.goto(BASE+path,{waitUntil:'domcontentloaded',timeout:30000}).catch(()=>null);
    await page.waitForTimeout(400);
    const out=await page.evaluate(()=>{
      const W=innerWidth;
      const offenders=[...document.querySelectorAll('*')].map((el,i)=>{
        const r=el.getBoundingClientRect();
        const cs=getComputedStyle(el);
        return {i,tag:el.tagName,id:el.id||'',cls:typeof el.className==='string'?el.className.slice(0,100):'',left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),position:cs.position,transform:cs.transform,overflow:cs.overflow,display:cs.display};
      }).filter(x=>x.left < -2 || x.right > W+2).sort((a,b)=>Math.max(0,b.right-W, -b.left)-Math.max(0,a.right-W,-a.left)).slice(0,20);
      return {url:location.href,innerWidth:W,scrollWidth:Math.max(document.documentElement.scrollWidth,document.body?.scrollWidth||0),offenders};
    });
    console.log(JSON.stringify({viewport:vp.name,path,...out}));
  }
  await page.close();
}
await browser.close();