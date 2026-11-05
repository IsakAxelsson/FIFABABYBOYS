# BREAKING NEWS – implementation specification (development only)

## Existing app integration
Source: index.html. Existing hooks: createMatch() for match-start trigger; saveMatch() after finalizing match for all other triggers; go(view) for navigation; save() is reserved for existing match statistics and MUST NOT be used to store newsroom assets.

## Locked behavior
- Navigation button: Nyhetsredaktion. Page title: BREAKING NEWS-REDAKTIONEN.
- Use approved newsroom illustration as the newsroom page background only.
- Shared newsroom password, checked on the server; no personal accounts, names or admin rights. No moderation step.
- Upload image (required), headline (required, about 60 characters), optional article text (about 250 characters), trigger, parameters, preview, publish, manage existing news.
- Images stored separately from production statistics. Server-side authorization for create/edit/delete/upload. Restrict file type and size; do not expose admin service keys.
- 18 trigger types: evening goals, evening assists, evening points, single-match goals, single-match assists, red card, evening points leader, evening last place, random during evening (display only after a match), evening ends, overtake selected player in evening points, points deficit vs selected player, consecutive goals, N red cards in evening, career goals milestone, career assists milestone, match starts, first goal of evening.
- Dynamic fields: player, comparison player and numeric threshold only when applicable.
- Match-start news can display immediately after createMatch(). Every other news trigger is evaluated only when saveMatch() finishes, using the final match state; evening-end trigger only when evening ends, not during a match.
- For overtakes, compare before vs after the finished match, not interim events.
- Never show during active gameplay; match-start news is the explicit exception.
- Full-screen overlay, newspaper spins and scales into position; dismiss only via close X, no timeout. Responsive approximately 85–90% viewport desktop and almost full mobile.
- Prioritize uploaded image, show all image content without cropping including speech bubbles; tap to enlarge.
- Each uploaded article is permanently single-use across all evenings. It stays secret until its trigger fires, possibly weeks or months later. For competing eligible articles, randomly select one never shown before; other unused articles remain secret for future qualifying events. After reveal, the article remains permanently accessible in a public archive, but can never be triggered again. Queue simultaneous eligible reveals and show sequentially on dismiss.
- Never reset used-article state between evenings; avoid triggering on editing historical records. The archive must never expose unrevealed articles.
- Existing production state, layout, animation, statistics and admin auth must remain unchanged.

## Safety / deployment
Implement and test exclusively on feature/breaking-news-redaktion. Separate Supabase tables/storage and secure server-side endpoints before enabling uploads. No merge to main until user approves preview.
