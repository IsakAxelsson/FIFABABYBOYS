'use strict';
const {snapshot,qualifies}=require('./news-event-rules');
const BASE=process.env.SUPABASE_URL||'https://xcdbglfngfcmjsgkwntd.supabase.co';
const PUB='sb_publishable_IOazYDDTUjSxnp08fsJ4EQ_INUvrf2r';
const send=(res,status,data)=>res.status(status).setHeader('Cache-Control','no-store').json(data);
async function db(path,opts={}){
 const key=process.env.SUPABASE_SECRET_KEY;
 if(!key||!key.startsWith('sb_secret_'))throw Error('Missing secret key');
 const r=await fetch(BASE+path,{...opts,headers:{apikey:key,Authorization:'Bearer '+key,...opts.headers}});
 const data=await r.json().catch(()=>null);
 if(!r.ok)throw Error('Supabase '+r.status);
 return data;
}
module.exports=async(req,res)=>{
 if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
 try{
  const token=String(req.headers.authorization||'').replace(/^Bearer /,'');
  if(!token||token===req.headers.authorization)return send(res,401,{error:'Admin krävs'});
  const who=await fetch(BASE+'/auth/v1/user',{headers:{apikey:PUB,Authorization:'Bearer '+token}});
  if(!who.ok)return send(res,401,{error:'Ogiltig session'});
  const user=await who.json();
  const admins=await db('/rest/v1/babyboys_admins?select=user_id&user_id=eq.'+encodeURIComponent(user.id));
  if(admins.length!==1)return send(res,403,{error:'Endast admin'});
  const {eveningId,matchId,phase}=req.body||{};
  if(typeof eveningId!=='string'||!/^[a-zA-Z0-9_-]{1,150}$/.test(eveningId)
    ||!['match_end','evening_end'].includes(phase)
    ||(phase==='match_end'&&(typeof matchId!=='string'||!/^[a-zA-Z0-9_-]{1,150}$/.test(matchId))))
   return send(res,400,{error:'Ogiltig händelse'});
  const state=(await db('/rest/v1/babyboys_state?id=eq.1&select=data'))?.[0]?.data;
  const evening=state?.evenings?.find(e=>e.id===eveningId);
  if(!evening)return send(res,404,{error:'Spelkvällen saknas'});
  if(phase==='evening_end'&&!evening.closed)return send(res,409,{error:'Spelkvällen är inte avslutad'});
  const context=phase==='match_end'?snapshot(state,eveningId,matchId):{e:evening};
  if(!context||(phase==='match_end'&&!context.current.finished))return send(res,409,{error:'Matchen är inte avslutad'});
  const items=await db('/rest/v1/babyboys_news?select=id,trigger_type,trigger_player,trigger_other_player,trigger_threshold&is_active=eq.true');
  const ids=items.filter(n=>qualifies(n,context,phase)).map(n=>n.id);
  if(!ids.length)return send(res,200,{news:null});
  const eventKey=phase+':'+(phase==='match_end'?matchId:eveningId);
  const result=await db('/rest/v1/rpc/babyboys_claim_news_event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_evening_id:eveningId,p_event_key:eventKey,p_news_ids:ids})});
  const item=result?.[0];
  if(!item)return send(res,200,{news:null});
  let imageUrl=null;
  if(item.image_path){
   const signed=await db('/storage/v1/object/sign/babyboys-news/'+item.image_path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresIn:600})});
   if(signed.signedURL)imageUrl=new URL('/storage/v1'+(signed.signedURL.startsWith('/')?'':'/')+signed.signedURL,BASE).toString();
  }
  return send(res,200,{news:{id:item.news_id,headline:item.headline,article:item.article,imageUrl}});
 }catch(e){console.error('news-event',e.message);return send(res,500,{error:'Kunde inte behandla nyhetshändelsen'});}
};
