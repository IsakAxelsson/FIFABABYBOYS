-- Atomically reserve one unused eligible article for a finished-match event.
-- Deploy only after reviewing server-side event validation.
CREATE OR REPLACE FUNCTION public.babyboys_claim_news_event(
 p_evening_id text, p_event_key text, p_news_ids uuid[]
)
RETURNS TABLE(news_id uuid, headline text, article text, image_path text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE picked public.babyboys_news%ROWTYPE;
BEGIN
 IF p_evening_id IS NULL OR length(p_evening_id) NOT BETWEEN 1 AND 150
 OR p_event_key IS NULL OR length(p_event_key) NOT BETWEEN 1 AND 200
 OR p_news_ids IS NULL OR cardinality(p_news_ids)=0 THEN RETURN; END IF;
 -- Serialize competing claims for the same event, including requests with no article.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_event_key,0));
 IF EXISTS(SELECT 1 FROM public.babyboys_news_shown WHERE event_key=p_event_key) THEN RETURN; END IF;
 SELECT n.* INTO picked FROM public.babyboys_news n
 WHERE n.id=ANY(p_news_ids) AND n.is_active IS TRUE
 AND NOT EXISTS(SELECT 1 FROM public.babyboys_news_shown s WHERE s.news_id=n.id)
 ORDER BY random() LIMIT 1 FOR UPDATE OF n SKIP LOCKED;
 IF NOT FOUND THEN RETURN; END IF;
 INSERT INTO public.babyboys_news_shown(evening_id,news_id,event_key)
 VALUES(p_evening_id,picked.id,p_event_key) ON CONFLICT DO NOTHING;
 IF NOT FOUND THEN RETURN; END IF;
 RETURN QUERY SELECT picked.id,picked.headline,picked.article,picked.image_path;
END;
$$;
REVOKE ALL ON FUNCTION public.babyboys_claim_news_event(text,text,uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.babyboys_claim_news_event(text,text,uuid[]) TO service_role;
