// Public read-only feed of deliberately published test events.
const base=process.env.SUPABASE_URL;
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const key=process.env.SUPABASE_SECRET_KEY;
 if(!base||!key)return res.status(503).json({error:'Missing configuration'});
 const after=String(req.query.after||'0');
 if(!/^(0|[1-9][0-9]{0,15})$/.test(after))return res.status(400).json({error:'Invalid cursor'});
 try{
  const url=base+'/rest/v1/babyboys_news_test_events?select=id,headline,article,image_path&id=gt.'+after+'&order=id.asc&limit=20';
  const response=await fetch(url,{headers:{apikey:key,Authorization:'Bearer '+key}});
  const rows=await response.json();
  if(!response.ok||!Array.isArray(rows))throw Error('Database '+response.status);
  const events=rows.map(row=>({id:row.id,headline:row.headline,article:row.article}));
  return res.status(200).json({events,latestId:events.length?events[events.length-1].id:Number(after)});
 }catch(error){console.error('news-test-feed',error.message);return res.status(500).json({error:'Test feed unavailable'})}
};
