-- FIFA Babyboys: prepare globally one-time Breaking News reveals.
-- Review and run in Supabase SQL Editor on the PREVIEW project before enabling reveals.
-- Existing published news remain secret. No news are marked as shown by this migration.
BEGIN;
ALTER TABLE public.babyboys_news_shown
  ADD COLUMN IF NOT EXISTS reveal_token uuid DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS babyboys_news_shown_news_once_idx
  ON public.babyboys_news_shown(news_id);
CREATE UNIQUE INDEX IF NOT EXISTS babyboys_news_shown_reveal_token_idx
  ON public.babyboys_news_shown(reveal_token);
-- Keep shown history unavailable to anonymous clients.
ALTER TABLE public.babyboys_news_shown ENABLE ROW LEVEL SECURITY;
COMMIT;
-- The server must atomically reserve an unused news_id before returning its
-- content and a short-lived signed image URL. Never send pending news to clients.
-- NOTE: This migration alone does NOT enable event handling or publication.
