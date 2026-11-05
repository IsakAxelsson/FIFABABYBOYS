// FIFA Babyboys newsroom API. Server-only: never import into browser code.
const URL_BASE = process.env.SUPABASE_URL || 'https://xcdbglfngfcmjsgkwntd.supabase.co';
const TYPES = new Set(['evening_goals','evening_assists','evening_points','match_goals','match_assists','red_card','leader','last','random','evening_end','overtake','points_gap','consecutive_goals','evening_reds','career_goals','career_assists','match_start','first_goal']);
const PLAYERS = new Set(['Jonatan','August','Isak']);
const NEED_PLAYER = new Set(['evening_goals','evening_assists','evening_points','match_goals','match_assists','red_card','leader','last','overtake','points_gap','consecutive_goals','evening_reds','career_goals','career_assists','first_goal']);
const NEED_OTHER = new Set(['overtake','points_gap']);
const NEED_COUNT = new Set(['evening_goals','evening_assists','evening_points','match_goals','match_assists','points_gap','consecutive_goals','evening_reds','career_goals','career_assists']);
const crypto = require('node:crypto');

function constantTimeEqual(a,b) {
  const x=crypto.createHash('sha256').update(a).digest(), y=crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(x,y);
}
function response(res,status,data) {res.status(status).setHeader('Cache-Control','no-store').json(data);}
function supa(path,options={}) {
  const key=process.env.SUPABASE_SECRET_KEY;
  if(!key || !key.startsWith('sb_secret_')) throw new Error('SUPABASE_SECRET_KEY is not configured');
  return fetch(URL_BASE+path,{...options,headers:{apikey:key,Authorization:'Bearer '+key,...options.headers}});
}
async function jsonResult(r) {
  const body=await r.text();
  let data;try{data=body?JSON.parse(body):null;}catch{data=null;}
  if(!r.ok)throw new Error('Supabase '+r.status+': '+(data?.message||data?.error||'Request failed'));
  return data;
}
function validateNews(item) {
  const headline=String(item.headline||'').trim(), article=String(item.article||'').trim();
  const trigger_type=String(item.trigger_type||'');
  const trigger_player=item.trigger_player||null,trigger_other_player=item.trigger_other_player||null;
  const trigger_threshold=item.trigger_threshold===null||item.trigger_threshold===undefined?null:Number(item.trigger_threshold);
  if(!headline||headline.length>60||article.length>250||!TYPES.has(trigger_type))throw new Error('Ogiltig rubrik, text eller händelse');
  if(NEED_PLAYER.has(trigger_type)&&!PLAYERS.has(trigger_player))throw new Error('Välj spelare');
  if(NEED_OTHER.has(trigger_type)&&(!PLAYERS.has(trigger_other_player)||trigger_other_player===trigger_player))throw new Error('Välj en annan spelare');
  if(NEED_COUNT.has(trigger_type)&&(!Number.isInteger(trigger_threshold)||trigger_threshold<1||trigger_threshold>99999))throw new Error('Ogiltigt antal');
  const image_path=String(item.image_path||'');
  if(!/^news\/[0-9a-f-]{36}\.(png|jpg|webp)$/.test(image_path))throw new Error('Ogiltig bildsökväg');
  return {headline,article,trigger_type,trigger_player:NEED_PLAYER.has(trigger_type)?trigger_player:null,trigger_other_player:NEED_OTHER.has(trigger_type)?trigger_other_player:null,trigger_threshold:NEED_COUNT.has(trigger_type)?trigger_threshold:null,image_path,is_active:item.is_active!==false};
}
module.exports=async function handler(req,res){
 try {
  if(req.method==='OPTIONS'){res.setHeader('Allow','GET, POST, PATCH, DELETE');return res.status(204).end();}
  if(!['GET','POST','PATCH','DELETE'].includes(req.method))return response(res,405,{error:'Method not allowed'});
  const secret=process.env.BREAKING_NEWS_PASSWORD;
  const supplied=req.headers['x-newsroom-password'];
  if(!secret||typeof supplied!=='string'||!constantTimeEqual(secret,supplied))return response(res,401,{error:'Fel lösenord'});
  if(req.method==='GET'){
    const r=await supa('/rest/v1/babyboys_news?select=*&order=created_at.desc');

const news = await jsonResult(r);
return response(res, 200, {
  pendingCount: news.filter(n => n.is_active !== false).length
});

  }
  const body=req.body||{};
  if(req.method==='POST'&&body.action==='upload'){
    const mime=String(body.mime||'');
    const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[mime];
    if(!ext)return response(res,400,{error:'Endast PNG, JPG eller WebP'});
    const path='news/'+crypto.randomUUID()+'.'+ext;
    const r=await supa('/storage/v1/object/upload/sign/babyboys-news/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({upsert:false})});
    const data=await jsonResult(r);
    return response(res,200,{path,uploadUrl:new URL('/storage/v1'+(data.url.startsWith('/')?'':'/')+data.url,URL_BASE).toString()});
  }
  if(req.method==='POST'){
    const item=validateNews(body);
    const r=await supa('/rest/v1/babyboys_news',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(item)});
    return response(res,201,{news:(await jsonResult(r))[0]});
  }
  const id=String(body.id||req.query.id||'');
  if(!/^[0-9a-f-]{36}$/.test(id))return response(res,400,{error:'Ogiltigt nyhets-ID'});
  if(req.method==='DELETE'){
    const r=await supa('/rest/v1/babyboys_news?id=eq.'+id,{method:'DELETE'});
    await jsonResult(r);return response(res,200,{ok:true});
  }
  const item=validateNews(body);
  const r=await supa('/rest/v1/babyboys_news?id=eq.'+id,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({...item,updated_at:new Date().toISOString()})});
  return response(res,200,{news:(await jsonResult(r))[0]});
 } catch(err) {
  console.error('Newsroom API:',err.message);
  return response(res,400,{error:err.message.startsWith('Supabase')?'Databasfel. Kontrollera serverloggen.':err.message});
 }
};
