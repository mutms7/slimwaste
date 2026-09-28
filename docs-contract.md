# Shared interface

UI calls same-origin JSON endpoints. Errors: `{error:string,code:string,requestId?:string}`. Supabase cookie auth.

- GET /api/session: `{user:{id,email}|null,configured:boolean}`
- POST /api/auth: `{email}` sends email OTP. POST /api/auth/verify: `{email,token}` verifies email OTP. DELETE /api/auth signs out.
- POST /api/scans: multipart `image` file (JPEG/PNG/WebP, max 4 MB), returns `{id}`.
- GET /api/scans: `{scans:Scan[]}`. GET /api/scans/:id: `{scan:Scan,messages:Message[],advice:CoachReply|null}`.
- PUT /api/scans/:id: correctionSchema JSON. Atomic replace and snapshot. Returns `{id}`.
- DELETE /api/scans/:id: removes private images and data, `{ok:true}`.
- POST /api/scans/:id/coach: `{question:string}` (empty means initial coaching), returns `{reply:CoachReply,messages:Message[]}`.
- GET /api/profile and PUT /api/profile: `{profile:Profile}` response. PUT body is Profile.
- POST /api/scans/:id/feedback: `{helpful:boolean,note:string}`.

Use src/lib/schema.ts types. UI implements an explicitly labelled sample at /scan/sample/review and /scan/sample/coach entirely client-side, never API fallback. API never accepts sample IDs. Root and /scan show camera surface; actual upload requires auth. Live history and insights only from API. Lead owns schema, project configuration, docs and tests. Backend agent owns src/app/api, src/lib/server, migrations. UI agent owns other src/app files, src/components, src/lib/client.ts and sample.ts, public.
