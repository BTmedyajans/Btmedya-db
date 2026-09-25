export function recoveryPasswordValid(value, configured){
  if(!configured) return false;
  const sep=String(configured).indexOf(':');
  if(sep<1) return false;
  const expires=Number(String(configured).slice(0,sep));
  const code=String(configured).slice(sep+1);
  return Number.isSafeInteger(expires) && expires>Math.floor(Date.now()/1000) && !!code && value===code;
}
