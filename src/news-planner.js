/* BTMEDYA AI HABER PLANNER
 * OpenAI anahtarını source'a koymaz. Worker env.OPENAI_API_KEY üzerinden okunur.
 * Bu modül planı üretir; otomatik yayın yapmaz.
 */
export const NEWS_PLANNER_DEFAULTS={
  timezone:"Europe/Istanbul",
  runs:[
    {id:"morning",label:"Sabah taraması",hour:8,minute:0},
    {id:"midday",label:"Öğle taraması",hour:13,minute:0},
    {id:"evening",label:"Akşam taraması",hour:19,minute:0}
  ],
  regions:["Balıkesir","Türkiye","Dünya"],
  topics:["yerel yönetim","ekonomi","kamu hizmetleri","ulaşım","iş dünyası","teknoloji","yapay zekâ","kültür","spor"],
  requireHumanApproval:true
};

export function plannerStatus(env){
  return {enabled:Boolean(env.OPENAI_API_KEY),humanApproval:true,timezone:"Europe/Istanbul"};
}

export async function draftWithOpenAI(env,input){
  if(!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY tanımlı değil");
  const prompt={
    role:"BTMEDYA haber editörü",
    rules:[
      "Kaynağı doğrulanmayan bilgiyi gerçek olarak yazma.",
      "Kaynak, yayın zamanı ve iddia ile olguyu ayır.",
      "Eski haberleri güncelmiş gibi sunma.",
      "Yerel haberde Balıkesir bağlamını koru.",
      "Yayınlamadan önce insan editör onayı zorunlu."
    ],
    task:input
  };
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+env.OPENAI_API_KEY},body:JSON.stringify({model:env.OPENAI_NEWS_MODEL||"gpt-5.6",input:JSON.stringify(prompt),max_output_tokens:5000})});
  if(!r.ok) throw new Error("OpenAI API: "+r.status);
  return r.json();
}
