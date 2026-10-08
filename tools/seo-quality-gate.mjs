const BASE=(process.env.BASE_URL||"https://btmedya.com.tr").replace(/\/$/,"");
const pages=["/","/haberler/","/hakkimizda/","/hizmetler/"];
let failed=false;
function fail(message){console.error("SEO_GATE_FAIL",message);failed=true;}
function warn(message){console.warn("SEO_GATE_WARN",message);}
async function get(path){const response=await fetch(BASE+path,{redirect:"follow",headers:{"user-agent":"BTMEDYA-SEO-Monitor/1.0"}});return {response,text:await response.text()};}
for(const path of pages){
  const {response,text}=await get(path);
  if(!response.ok){fail(`${path} HTTP ${response.status}`);continue;}
  if((text.match(/<h1\b/gi)||[]).length!==1) warn(`${path} must have exactly one H1`);
  if(!/<meta[^>]+name=["']viewport["']/i.test(text)) warn(`${path} missing viewport`);
  if(!/<meta[^>]+name=["']description["']/i.test(text)) warn(`${path} missing meta description`);
  if(!/<link[^>]+rel=["']canonical["']/i.test(text)) warn(`${path} missing canonical`);
  if(!/prefers-reduced-motion/i.test(text) && !/mobile-fixes\.css/i.test(text)) warn(`${path} missing reduced-motion evidence`);
}
for(const path of ["/robots.txt","/sitemap.xml","/news-sitemap.xml","/rss.xml"]){
  const {response,text}=await get(path);
  if(!response.ok){fail(`${path} HTTP ${response.status}`);continue;}
  if(path==="/robots.txt"){
    if(!text.includes("Sitemap: https://btmedya.com.tr/sitemap.xml")) fail("robots missing sitemap");
    if(!text.includes("Sitemap: https://btmedya.com.tr/news-sitemap.xml")) fail("robots missing news sitemap");
  }
  if(path==="/sitemap.xml"&&!/<urlset[\s\S]*<url>/i.test(text)) fail("sitemap has no URLs");
  if(path==="/news-sitemap.xml"&&!/<urlset/i.test(text)) fail("news sitemap XML shell missing");
}
try{
  const listing=await get("/api/news?limit=1");
  if(!listing.response.ok) fail(`news API HTTP ${listing.response.status}`);
  const data=JSON.parse(listing.text);
  const slug=data.items?.[0]?.slug;
  if(slug){
    const detail=await get(`/haberler/${encodeURIComponent(slug)}`);
    if(!detail.response.ok) fail(`live news detail HTTP ${detail.response.status}`);
    if((detail.text.match(/<h1\b/gi)||[]).length!==1) warn("live news detail should have exactly one H1");
  } else warn("no published news item returned by API");
}catch(error){fail(`live news sample ${error.message}`);}
try{
  const url="https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url="+encodeURIComponent(BASE+"/")+"&strategy=mobile&category=performance";
  const response=await fetch(url);
  if(response.ok){
    const data=await response.json();
    const audits=data.lighthouseResult?.audits||{};
    console.log("PAGESPEED_MOBILE",JSON.stringify({LCP:audits["largest-contentful-paint"]?.numericValue,CLS:audits["cumulative-layout-shift"]?.numericValue,INP:audits["interaction-to-next-paint"]?.numericValue}));
  }else console.log("PAGESPEED_UNAVAILABLE",response.status);
}catch(error){console.log("PAGESPEED_ERROR",error.message);}
if(failed) process.exit(1);
console.log("SEO_GATE_OK");
