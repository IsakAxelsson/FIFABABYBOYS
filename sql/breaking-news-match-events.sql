-- Run in Supabase SQL Editor after review.
-- An event key makes each match-start event idempotent.
ALTER TABLE public.babyboys_news_shown
  ADD COLUMN IF NOT EXISTS event_key text;

CREATE UNIQUE INDEX IF NOT EXISTS babyboys_news_shown_event_key_unique
  ON public.babyboys_news_shown(event_key)
  WHERE event_key IS NOT NULL;

-- Existing globally unique news_id index prevents repeat reveals.
-- No existing news rows are modified by this migration.
