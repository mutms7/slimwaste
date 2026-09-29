# Launch status

Checked September 29, 2026.

The public repository is https://github.com/mutms7/slimwaste. Vercel publishes its main branch at https://slimwaste.vercel.app. The interface has a custom S logo, self-hosted Bricolage Grotesque and DM Sans fonts, the supplied lemon, jade, and mint palette, a credited Unsplash food-waste photograph, and an interactive sorting game during AI waits.

The production build, lint, 45 unit/database tests, and 14 browser checks pass. Browser checks cover 375 px and desktop layouts, corrections, coaching and history with controlled API responses, provider failure, the loading game, missing-account handoff, password recovery, labelled samples, free-tier agreement, and accessibility.

The SlimWaste Supabase project is xgndbbjhnhjvjqlfmxvz, in the selected free organization and ca-central-1 region. The initial migration is applied, all 13 public tables have row-level security, and scan-images is private. Project credentials and a generated database password are saved in ignored local configuration. App credentials are also in Vercel environment settings; the database password is not uploaded. The existing GoodLife.AI project is untouched.

The connected check passed with two temporary accounts against real hosted Supabase and Gemini: app sessions, agreement enforcement, image detection and private storage, cross-account API and direct database isolation, saved corrections, coaching, follow-up, history, authenticated retention, and deletion. Temporary users and objects were removed. The image was a synthetic illustration, not a user's private photo. Email delivery was not part of this test.

Gemini 3.5 Flash-Lite passed live image detection and coaching on the free tier. The app uses one configured model and retries HTTP 503 once within the existing timeout. It does not automatically switch providers or invent results on failure.

The owner explicitly chose free Gemini. AI_DATA_USE_ACK is gemini-free-tier. Users must agree before photos or coaching context are sent, and the server checks a versioned agreement bound to the signed-in account on both routes. Google may use free-tier content for model improvement and human review. No billing was enabled. The separate evaluation opt-in does not control Google's data use.

The app uses email-and-password accounts, so a user creates an account once and signs in without receiving a link every time. A missing login moves to account creation, and a forgot-password flow requests a Supabase recovery link and lets the authenticated recovery session choose a new password. Email confirmation is disabled for the early-access project. Recovery delivery outside the project team still needs a transactional email provider.

Both existing SlimWaste Auth users and their stored scan-photo objects were deleted on September 29, 2026. The Auth user count was verified as zero afterward. The existing GoodLife.AI project was not touched.

Remaining checks before public launch:

1. Create and sign in with a fresh real password account on the hosted app.
2. Add a transactional email provider and verify recovery delivery to a non-team address.
3. Try an actual food photo and camera permissions on iOS and Android.

The explicit sample never creates a live scan. No private user photos or kitchen information were used in verification.
