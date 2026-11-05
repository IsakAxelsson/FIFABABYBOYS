const BASE = process.env.SUPABASE_URL ||
  'https://xcdbglfngfcmjsgkwntd.supabase.co';

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.SUPABASE_SECRET_KEY;

  if (!key) {
    return res.status(503).json({ error: 'Servern saknar konfiguration' });
  }

  const page = Number(req.query.page ?? 0);

  if (!Number.isSafeInteger(page) || page < 0 || page > 10000) {
    return res.status(400).json({ error: 'Ogiltigt sidnummer' });
  }

  const headers = {
    apikey: key,
    Authorization: 'Bearer ' + key
  };

  async function read(path, options = {}) {
    const response = await fetch(BASE + path, {
      ...options,
      headers: { ...headers, ...options.headers }
    });

    if (!response.ok) {
      throw new Error('Supabase HTTP ' + response.status);
    }

    return response.json();
  }

  try {
    const limit = 20;
    const offset = page * limit;

    // Endast artiklar som redan har visats.
    const shown = await read(
      '/rest/v1/babyboys_news_shown' +
      '?select=news_id,created_at' +
      '&order=created_at.desc' +
      '&limit=' + (limit + 1) +
      '&offset=' + offset
    );

    const hasMore = shown.length > limit;
    const visible = shown.slice(0, limit);

    const ids = [...new Set(
      visible.map(row => row.news_id).filter(id =>
        /^[0-9a-f-]{36}$/i.test(String(id))
      )
    )];

    if (!ids.length) {
      return res.status(200).json({
        articles: [],
        hasMore: false
      });
    }

    const articles = await read(
      '/rest/v1/babyboys_news' +
      '?select=id,headline,article,image_path' +
      '&id=in.(' + ids.join(',') + ')'
    );

    const byId = new Map(articles.map(a => [a.id, a]));

    const result = await Promise.all(
      visible.map(async row => {
        const item = byId.get(row.news_id);
        if (!item) return null;

        let imageUrl = null;

        if (
          item.image_path &&
          /^news\/[0-9a-f-]{36}\.(png|jpg|webp)$/i.test(item.image_path)
        ) {
          const signed = await read(
            '/storage/v1/object/sign/babyboys-news/' +
            item.image_path,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ expiresIn: 600 })
            }
          );

          if (signed.signedURL) {
            const path = signed.signedURL;
            imageUrl = new URL(
              path.startsWith('/storage/v1/')
                ? path
                : '/storage/v1' +
                  (path.startsWith('/') ? '' : '/') + path,
              BASE
            ).toString();
          }
        }

        return {
          id: item.id,
          headline: item.headline,
          article: item.article,
          imageUrl,
          publishedAt: row.created_at
        };
      })
    );

    return res.status(200).json({
      articles: result.filter(Boolean),
      hasMore
    });

  } catch (error) {
    console.error('Breaking News archive:', error.message);

    return res.status(500).json({
      error: 'Nyhetsarkivet kunde inte hämtas'
    });
  }
};
