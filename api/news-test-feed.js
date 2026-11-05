// Public read-only feed of deliberately published test events.
const base=process.env.SUPABASE_URL;
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const key=process.env.SUPABASE_SECRET_KEY;
 if(!base||!key)return res.status(503).json({error:'Missing configuration'});
 const baseline=req.query.baseline==='1';
 const after=String(req.query.after||'0');
 if(!/^(0|[1-9][0-9]{0,15})$/.test(after))return res.status(400).json({error:'Invalid cursor'});
 try{
  const url=baseline
   ? base+'/rest/v1/babyboys_news_test_events?select=id&order=id.desc&limit=1'
   : base+'/rest/v1/babyboys_news_test_events?select=id,headline,article,image_path&id=gt.'+after+'&order=id.asc&limit=20';
  const response=await fetch(url,{headers:{apikey:key,Authorization:'Bearer '+key}});
  const rows=await response.json();
  if(!response.ok||!Array.isArray(rows))throw Error('Database '+response.status);
  if(baseline)return res.status(200).json({events:[],latestId:rows[0]?.id||0});
  const events=[];
  for(const row of rows){
   let imageUrl=null;
   if(row.image_path){
    const signedResponse=await fetch(base+'/storage/v1/object/sign/babyboys-news/'+row.image_path,{
     method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},
     body:JSON.stringify({expiresIn:600})
    });
    if(!signedResponse.ok)throw Error('Image signing '+signedResponse.status);
    const signed=await signedResponse.json();
    if(signed.signedURL){
     const p=signed.signedURL;
     imageUrl=new URL(p.startsWith('/storage/v1/')?p:'/storage/v1'+(p.startsWith('/')?'':'/')+p,base).toString();
    }
   }
   events.push({id:row.id,headline:row.headline,article:row.article,imageUrl});
  }
  return res.status(200).json({events,latestId:events.length?events[events.length-1].id:Number(after)});
 }catch(error){console.error('news-test-feed',error.message);return res.status(500).json({error:'Test feed unavailable'})}
};
