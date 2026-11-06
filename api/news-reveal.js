// FIFA Babyboys: admin-only match-start reveal. No secret news in client bundles.
const BASE=process.env.SUPABASE_URL||'https://xcdbglfngfcmjsgkwntd.supabase.co';
const PUBLIC_KEY='sb_publishable_IOazYDDTUjSxnp08fsJ4EQ_INUvrf2r';
function respond(res,status,payload){return res.status(status).setHeader('Cache-Control','no-store').json(payload)}
async function service(path,options={}){
 const key=process.env.SUPABASE_SECRET_KEY;
 if(!key||!key.startsWith('sb_secret_'))throw Error('Missing server key');
 return fetch(BASE+path,{...options,headers:{apikey:key,Authorization:'Bearer '+key,...options.headers}});
}
async function read(response){
 const body=await response.json().catch(()=>null);
 if(!response.ok)throw Error('Supabase request failed: '+response.status);
 return body;
}
module.exports=async function handler(req,res){
 if(req.method!=='POST')return respond(res,405,{error:'Method not allowed'});
 try{
  const bearer=String(req.headers.authorization||'').match(/^Bearer (\S+)$/)?.[1];
  if(!bearer)return respond(res,401,{error:'Logga in som administratör'});
  const who=await fetch(BASE+'/auth/v1/user',{headers:{apikey:PUBLIC_KEY,Authorization:'Bearer '+bearer}});
  if(!who.ok)return respond(res,401,{error:'Sessionen är inte giltig'});
  const user=await who.json();
  if(!user.id)return respond(res,401,{error:'Sessionen är inte giltig'});
  const admins=await read(await service('/rest/v1/babyboys_admins?select=user_id&user_id=eq.'+encodeURIComponent(user.id)));
  if(!Array.isArray(admins)||admins.length!==1)return respond(res,403,{error:'Endast admin kan visa nyheter'});
  const {eveningId,matchId}=req.body||{};
  if(typeof eveningId!=='string'||eveningId.length<1||eveningId.length>150||
     typeof matchId!=='string'||!/^[a-zA-Z0-9_-]{1,150}$/.test(matchId))
   return respond(res,400,{error:'Ogiltig spelkväll eller match'});
  // Verify the match exists in persisted game state, not only in a request.
  const stateRows=await read(await service('/rest/v1/babyboys_state?id=eq.1&select=data'));
  const state=stateRows?.[0]?.data;
  const evening=state?.evenings?.find(e=>e.id===eveningId);
  const match=evening?.tournaments?.flatMap(t=>t.matches||[]).find(m=>m.id===matchId);
  if(!match||match.finished)return respond(res,409,{error:'Matchen måste vara sparad och pågående'});
  const claimed=await read(await service('/rest/v1/rpc/babyboys_claim_match_start',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({p_evening_id:eveningId,p_match_id:matchId})
  }));
  const news=claimed?.[0];
  if(!news)return respond(res,200,{news:null});
  let imageUrl=null;
  if(news.image_path){
   const signed=await read(await service('/storage/v1/object/sign/babyboys-news/'+news.image_path,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresIn:600})
   }));
   if(signed.signedURL)imageUrl=new URL('/storage/v1'+(signed.signedURL.startsWith('/')?'':'/')+signed.signedURL,BASE).toString();
  }
  return respond(res,200,{news:{id:news.news_id,headline:news.headline,article:news.article,imageUrl}});
 }catch(error){
  console.error('news-reveal:',error.message);
  return respond(res,500,{error:'Nyheten kunde inte hämtas'});
 }
};
