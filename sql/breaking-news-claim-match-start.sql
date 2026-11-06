-- Atomic one-time selection for a real match-start event.
-- Run in Supabase SQL Editor before enabling the API.
CREATE OR REPLACE FUNCTION public.babyboys_claim_match_start(
  p_evening_id text,
  p_match_id text
)
RETURNS TABLE(news_id uuid, headline text, article text, image_path text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  picked public.babyboys_news%ROWTYPE;
  event_name text;
BEGIN
  IF p_evening_id IS NULL OR length(p_evening_id) NOT BETWEEN 1 AND 150
     OR p_match_id IS NULL OR p_match_id !~ '^[a-zA-Z0-9_-]{1,150}$'
  THEN
    RAISE EXCEPTION 'Invalid match event';
  END IF;

  event_name := 'match_start:' || p_match_id;
  IF EXISTS (SELECT 1 FROM public.babyboys_news_shown WHERE event_key = event_name) THEN
    RETURN;
  END IF;

  SELECT n.* INTO picked
  FROM public.babyboys_news AS n
  WHERE n.is_active IS TRUE
    AND n.trigger_type = 'match_start'
    AND NOT EXISTS (
      SELECT 1 FROM public.babyboys_news_shown AS s WHERE s.news_id = n.id
    )
  ORDER BY random()
  LIMIT 1
  FOR UPDATE OF n SKIP LOCKED;

  IF NOT FOUND THEN RETURN; END IF;

  INSERT INTO public.babyboys_news_shown (evening_id, news_id, event_key)
  VALUES (p_evening_id, picked.id, event_name)
  ON CONFLICT DO NOTHING;

  IF NOT FOUND THEN RETURN; END IF;

  RETURN QUERY SELECT picked.id, picked.headline, picked.article, picked.image_path;
END;
$$;

REVOKE ALL ON FUNCTION public.babyboys_claim_match_start(text,text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.babyboys_claim_match_start(text,text)
TO service_role;
