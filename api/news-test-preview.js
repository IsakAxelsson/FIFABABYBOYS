// Read-only, admin-authenticated preview of exactly one test article.
 // Does not insert into babyboys_news_shown or invoke reveal RPCs.
 const BASE = process.env.SUPABASE_URL || 'https://xcdbglfngfcmjsgkwntd.supabase.co';
 const TITLE = 'TEST – BABYBOYS I CHOCK!';
 const PUBLISHABLE = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_IOazYDDTUjSxnp08fsJ4EQ_INUvrf2r';

 const send = (res, status, data) =>
   res.status(status).setHeader('Cache-Control', 'no-store').json(data);

 async function adminFetch(path, opts = {}) {
   const key = process.env.SUPABASE_SECRET_KEY;
   if (!key) throw new Error('Missing server key');
   return fetch(BASE + path, {
     ...opts,
     headers: {
       apikey: key,
       Authorization: 'Bearer ' + key,
       ...opts.headers
     }
   });
 }

 async function read(resp) {
   const data = await resp.json().catch(() => null);
   if (!resp.ok) throw new Error('Database request failed: ' + resp.status);
   return data;
 }

 module.exports = async function handler(req, res) {
   if (req.method !== 'GET')
     return send(res, 405, { error: 'Method not allowed' });

   try {
     const bearer = String(req.headers.authorization || '')
       .match(/^Bearer (\S+)$/)?.[1];

     if (!bearer)
       return send(res, 401, { error: 'Admininloggning krävs' });

     const who = await fetch(BASE + '/auth/v1/user', {
       headers: {
         apikey: PUBLISHABLE,
         Authorization: 'Bearer ' + bearer
       }
     });

     if (!who.ok)
       return send(res, 401, { error: 'Ogiltig inloggning' });

     const user = await who.json();

     if (!user.id)
       return send(res, 401, { error: 'Ogiltig inloggning' });

     const admins = await read(await adminFetch(
       '/rest/v1/babyboys_admins?select=user_id&user_id=eq.' +
       encodeURIComponent(user.id)
     ));

     if (!Array.isArray(admins) || admins.length !== 1)
       return send(res, 403, { error: 'Endast administratör' });

     const rows = await read(await adminFetch(
       '/rest/v1/babyboys_news?select=headline,article,image_path,trigger_type,is_active' +
       '&headline=eq.' + encodeURIComponent(TITLE) +
       '&trigger_type=eq.match_start&is_active=eq.true&limit=2'
     ));

     if (!Array.isArray(rows) || rows.length !== 1)
       return send(res, 409, {
         error: 'Hittade inte exakt en aktiv testnyhet med rätt rubrik och utlösare'
       });

     const item = rows[0];
     let imageUrl = null;

     if (item.image_path) {
       const signed = await read(await adminFetch(
         '/storage/v1/object/sign/babyboys-news/' + item.image_path,
         {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ expiresIn: 600 })
         }
       ));

       if (signed.signedURL) {
         const p = signed.signedURL;
         imageUrl = new URL(
           p.startsWith('/storage/v1/')
             ? p
             : '/storage/v1' + (p.startsWith('/') ? '' : '/') + p,
           BASE
         ).toString();
       }
     }

     return send(res, 200, {
       news: {
         headline: item.headline,
         article: item.article,
         imageUrl
       },
       readOnly: true
     });

   } catch (e) {
     console.error('news-test-preview', e.message);
     return send(res, 500, {
       error: 'Kunde inte hämta testnyheten'
     });
   }
 };

