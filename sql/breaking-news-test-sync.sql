-- Isolated Breaking News synchronization test; no production news is claimed.
create table if not exists public.babyboys_news_test_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  headline text not null,
  article text not null,
  image_path text
);
alter table public.babyboys_news_test_events enable row level security;
revoke all on public.babyboys_news_test_events from anon, authenticated;
create index if not exists babyboys_news_test_events_created_idx
  on public.babyboys_news_test_events(created_at, id);
-- Only server-side service role can write or read the test events.
