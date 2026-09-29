# SlimWaste visual, account recovery, and loading-game implementation prompt

Update the existing SlimWaste Next.js application without changing its core scan, correction, privacy, or retention rules.

Use the supplied lemon, jade, sea-green, nile-green, lime, and deep blue-green palette. Replace the home-page plate illustration with a real, properly licensed food-waste photograph from a stable online source. Keep the photo optimized, responsive, accessible, credited, and visually integrated into the existing layout. Keep illustrated sample results clearly labelled when a real photo would imply that the sample data came from that photo.

Improve account recovery. When a sign-in attempt uses an email that has no account, move the form into account creation and explain what happened. Keep a wrong-password error on the sign-in form for existing accounts. Add a “Forgot your password?” path that sends a recovery email without revealing whether an address exists, exchanges the recovery code through Supabase, and lets the authenticated user set a new password. Use visible labels, password-manager-compatible autocomplete values, clear status messages, and 12-character minimum passwords.

Delete every current user from the connected SlimWaste Supabase project and verify the Auth user count is zero. Do not touch any other Supabase project.

Create a reusable loading mini-game for waits caused by AI analysis or coaching. A time-based launcher should cycle randomly among a trash bag, recycling carton, and fruit. The player sorts each item into landfill, recycling, or compost and earns a score. Use vector icons and the existing palette, make controls keyboard and touch accessible, announce status without flooding screen readers, and respect reduced-motion settings. The game must disappear as soon as the request completes and must never delay, cancel, or alter the request.

Add focused unit and browser coverage for account routing, password recovery, and the loading game. Run lint, unit tests, production build, browser tests, and the connected smoke test where relevant. Push the Supabase auth configuration, deploy through the existing GitHub and Vercel setup, and verify the hosted account and recovery endpoints without leaving temporary users behind.
