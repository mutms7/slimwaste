# Launch status

Checked September 28, 2026.

The code is public at https://github.com/mutms7/slimwaste. The Vercel project is connected to that repository. Vercel's Git integration automatically assigned https://slimwaste.vercel.app. This is a prelaunch deployment, not a verified live account and scan service.

The production build, lint, 36 unit/database tests, and six browser checks pass. Browser checks cover 375 px and desktop layouts, the correction-to-coaching sequence with controlled API responses, provider failure, labelled samples, and automated accessibility checks. The deployed sample review opens correctly. Actual camera permission prompts on iOS and Android still need device testing.

The Gemini key is stored in ignored local configuration and encrypted Vercel environment settings. Authentication and model discovery succeed. Actual generation attempts against Gemini 3.8 Flash returned HTTP 503 with a high-demand message. A separate availability check against Gemini 3.5 Flash also returned 503. The configured model remains Gemini 3.8 Flash; no fallback was enabled.

Supabase authentication is pending. No Supabase project was selected and the migration has not been applied to a hosted project. Before treating this as launched:

1. Finish Supabase sign-in and select or create the SlimWaste project.
2. Apply the migration, configure email OTP delivery, and add the project URL, public key, and service-role key to the local and Vercel environments.
3. Confirm that the Gemini project uses the paid-tier data-use terms described in the README. The acknowledgement setting does not establish billing status or change Google's terms.
4. Redeploy and verify real email sign-in, an actual food photo, saved corrections, coaching, follow-ups, history, and deletion. Check isolation with a second account.
5. Test the authenticated retention job and phone camera permissions, then update this status.

The explicit sample doesn't use a provider and never creates a live scan. No private test records have been uploaded.
