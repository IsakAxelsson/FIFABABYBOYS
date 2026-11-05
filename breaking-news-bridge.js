/* FIFA Babyboys Breaking News UI bridge.
   Safe default: preview only. Real claims remain disabled until end-to-end tests pass.
   Load after the game's inline script: <script src="/breaking-news-bridge.js" defer></script>
*/
(()=>{
 'use strict';
 const LIVE_REVEALS_ENABLED=false;
 const css=`
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Libre+Baskerville:wght@400;700&display=swap');
.bb-news-overlay{position:fixed;inset:0;background:#000c;z-index:99999;display:flex;align-items:center;justify-content:center;padding:54px 18px 24px}
.bb-news-overlay[hidden]{display:none}
.bb-news-paper{background:radial-gradient(circle at 10% 10%,#fff4d9,#e9d0a8);color:#16100e;border:5px solid #e1c39b;outline:3px solid #72523a;box-shadow:8px 12px 0 #b38b61,0 25px 65px #000a;padding:18px;max-height:calc(100vh - 90px);overflow:auto;transform:rotate(-1deg);animation:bbNewsArrive 850ms cubic-bezier(.17,1.4,.35,1) both}
@keyframes bbNewsArrive{0%{opacity:0;transform:perspective(900px) translateZ(-650px) rotate(-390deg) scale(.15)}80%{opacity:1;transform:rotate(3deg) scale(1.04)}100%{transform:rotate(-1deg) scale(1)}}
.bb-news-paper.portrait{width:min(560px,90vw)}.bb-news-paper.landscape{width:min(1050px,94vw)}
.bb-news-mast{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #b71915;padding-bottom:6px;font-family:Anton,Impact,sans-serif;font-size:clamp(18px,3vw,32px)}
.bb-news-extra,.bb-news-banner{background:#b91412;color:white;font-family:Anton,Impact,sans-serif}.bb-news-extra{padding:3px 10px;margin-right:9px;display:inline-block;transform:skew(-12deg) rotate(-3deg)}
.bb-news-banner{text-align:center;font-size:clamp(30px,6vw,70px);margin:9px 0 22px}
.bb-news-body{display:grid;gap:15px}.bb-news-paper.landscape .bb-news-body{grid-template-columns:1.4fr 1fr}.bb-news-headline{font:clamp(26px,3.5vw,50px)/1.08 Anton,Impact,sans-serif;text-transform:uppercase;overflow-wrap:anywhere;border-bottom:5px solid #c41b16;padding-bottom:8px;margin:0 0 12px}
.bb-news-story{font:clamp(12px,1.35vw,17px)/1.65 'Libre Baskerville',Georgia,serif;white-space:pre-wrap;overflow-wrap:anywhere;margin:0}
.bb-news-image{width:100%;height:min(48vh,500px);background:#e2d3b9;border:4px solid #1a1513;display:flex;align-items:center;justify-content:center}
.bb-news-image img{width:100%;height:100%;object-fit:contain;cursor:zoom-in}
.bb-news-footer{font:12px Anton,Impact,sans-serif;color:#aa1c16;border-top:3px solid #c3201b;margin-top:14px;padding-top:5px;letter-spacing:2px}
.bb-news-close{position:fixed;top:12px;right:16px;border:2px solid white;background:#c7211c;color:white;border-radius:50%;font:bold 28px system-ui;width:48px;height:48px;cursor:pointer;z-index:1}
.bb-news-zoom{position:fixed;inset:0;background:#000e;z-index:100000;display:flex;align-items:center;justify-content:center;padding:40px;cursor:zoom-out}.bb-news-zoom img{max-width:100%;max-height:100%;object-fit:contain}
@media(max-width:670px){.bb-news-paper.landscape .bb-news-body{grid-template-columns:1fr}.bb-news-image{height:36vh}.bb-news-paper{padding:12px}.bb-news-banner{font-size:32px}}
@media(prefers-reduced-motion:reduce){.bb-news-paper{animation:none}}
`;
 const style=document.createElement('style');style.textContent=css;document.head.append(style);
 const queuedNews=[];
 const showNext=()=>{if(!document.querySelector('.bb-news-overlay')&&queuedNews.length)show(queuedNews.shift());};
 const enqueueNews=news=>{if(news){queuedNews.push(news);showNext();}};
 const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el};
 function show(news){
  if(!news||document.querySelector('.bb-news-overlay'))return;
  const overlay=node('div','bb-news-overlay');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
  const close=node('button','bb-news-close','×');close.setAttribute('aria-label','Stäng tidningen');
  const paper=node('article','bb-news-paper portrait');
  const mast=node('div','bb-news-mast');const left=node('span');left.append(node('span','bb-news-extra','EXTRA!'),node('span','','FIFA BABYBOYS'));mast.append(left,node('span','','🎮'));
  const banner=node('div','bb-news-banner','BREAKING NEWS');
  const body=node('div','bb-news-body');const headline=node('h2','bb-news-headline',news.headline||'EXTRA!');
  const story=node('p','bb-news-story',news.article||'');
  const picture=node('div','bb-news-image');
  const img=node('img');img.alt='Bild till Breaking News';
  if(news.imageUrl){
   img.onload=()=>{paper.className='bb-news-paper '+(img.naturalWidth>=img.naturalHeight?'landscape':'portrait')};
   img.src=new URL(news.imageUrl,location.href).href;
   picture.append(img);
   img.onclick=()=>{const zoom=node('div','bb-news-zoom');const big=node('img');big.src=img.src;big.alt=img.alt;zoom.append(big);document.body.append(zoom);zoom.onclick=()=>zoom.remove()};
  }
  body.append(headline,picture,story);paper.append(mast,banner,body,node('div','bb-news-footer','EXTRA • FIFA BABYBOYS • REDAKTIONEN'));
  const dismiss=()=>{overlay.remove();document.removeEventListener('keydown',onKey);showNext()};
  const onKey=e=>{if(e.key==='Escape')dismiss()};
  close.onclick=dismiss;overlay.append(close,paper);document.body.append(overlay);document.addEventListener('keydown',onKey);close.focus();
 }
 window.babyboysBreakingNewsPreview=()=>show({headline:'TEST – NY MATCH!',article:'Det här är en förhandsvisning. Inga riktiga nyheter hämtas eller förbrukas.'});
 if(new URLSearchParams(location.search).get('newsTest')==='1'){
  const button=node('button','','📰 Testa Breaking News');
  button.type='button';button.style.cssText='position:fixed;right:14px;bottom:14px;z-index:99998;background:#b91412;color:white;border:2px solid #fff;border-radius:8px;padding:12px;font:bold 15px system-ui;box-shadow:0 6px 20px #0008';
  button.onclick=window.babyboysBreakingNewsPreview;
  document.body.append(button);
 }
 // Test-only cross-screen synchronization. Baseline excludes earlier events.
 if(new URLSearchParams(location.search).get('newsTest')==='1'){
  let cursor=null;
  let polling=false;
  const poll=async()=>{
   if(polling)return;
   polling=true;
   try{
    const url=cursor===null?'/api/news-test-feed?baseline=1':'/api/news-test-feed?after='+cursor;
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok)throw Error('Sync HTTP '+response.status);
    const data=await response.json();
    if(cursor!==null&&Array.isArray(data.events))data.events.forEach(enqueueNews);
    cursor=Number(data.latestId)||0;
   }catch(error){console.warn('Breaking News test sync:',error.message)}
   finally{polling=false}
  };
  poll();
  setInterval(poll,2000);
 }
 // Safe match-start simulation: no API calls, no database claims, no secret articles.
 // Only active in the explicit ?newsTest=1 development preview.
 if(new URLSearchParams(location.search).get('newsTest')==='1'){
  const originalCreateMatch=window.createMatch;
  if(typeof originalCreateMatch==='function'){
   window.createMatch=function(...args){
    const result=originalCreateMatch.apply(this,args);
    const token=typeof sessionToken==='function'?sessionToken():null;
    if(!token){console.warn('Breaking News test: admininloggning krävs');return result;}
    fetch('/api/news-test-publish',{method:'POST',headers:{Authorization:'Bearer '+token},cache:'no-store'})
     .then(async response=>{const raw=await response.text();let data;try{data=JSON.parse(raw)}catch{throw Error('Servern svarade med text (HTTP '+response.status+'): '+raw.slice(0,180))}if(!response.ok)throw Error(data.error||'HTTP '+response.status);if(data.publishedId)console.info('Breaking News test event published',data.publishedId)})
     .catch(error=>{console.error('Breaking News test:',error);alert('Breaking News-test: '+error.message)});
    return result;
   };
  }else console.warn('Breaking News test: createMatch kunde inte hittas');
 }
 if(!LIVE_REVEALS_ENABLED)return;
 // Live wiring is intentionally off until safe dry-run verification.
 const original=window.createMatch;
 if(typeof original!=='function')return;
 window.createMatch=function(...args){
  const result=original.apply(this,args);
  const match=typeof activeM==='function'?activeM():null;
  const evening=typeof activeE==='function'?activeE():null;
  const token=typeof sessionToken==='function'?sessionToken():null;
  if(match?.id&&evening?.id&&token){
   Promise.resolve(window.writeQueue).then(async()=>{
    const response=await fetch('/api/news-reveal',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({eveningId:evening.id,matchId:match.id})});
    if(!response.ok)throw Error('Breaking News API '+response.status);
    const payload=await response.json();if(payload.news)show(payload.news);
   }).catch(err=>console.error('Breaking News:',err));
  }
  return result;
 };
})();
