/* BTMEDYA giriş filmi bölüm göstergesi · gerçek arşiv hikâyesi */
(()=>{const root=document.querySelector('.cinematic-hero[data-tek-film]');if(!root)return;
const film=root.querySelector('.cinematic-video-1 video')||root.querySelector('.mfilm-video');if(!film)return;
const chapters=[['AÇILIŞ','BTMEDYA'],['SAHA','Gece çekimi'],['STÜDYO','Yeşil perde çekimi'],['STÜDYO MASASI','Set çekimi'],['KAMERA ARKASI','Stüdyoda çekim anı'],['PRODÜKSİYON','Defile çekimi'],['KAPANIŞ','Hikâyeleri yaşatıyoruz.']];
const host=document.createElement('div');host.className='film-chapters';host.setAttribute('aria-live','polite');host.innerHTML='<span class="film-chapters-no">01</span><span><b></b><small></small></span>';const target=root.querySelector('.cinematic-sticky')||root;target.appendChild(host);
const paint=()=>{let t=film.currentTime||0,i=0;const starts=[0,2.6,6.8,11.8,16.8,21.4,26];for(let n=starts.length-1;n>=0;n--)if(t>=starts[n]){i=n;break;}host.querySelector('.film-chapters-no').textContent=String(i+1).padStart(2,'0');host.querySelector('b').textContent=chapters[i][0];host.querySelector('small').textContent=chapters[i][1];host.classList.toggle('is-kapanis',i===6);};film.addEventListener('timeupdate',paint);film.addEventListener('loadedmetadata',paint);paint();
})();
