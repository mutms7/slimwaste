import { z } from "zod";
import {
  ApiError,
  json,
  readJson,
  requireSameOrigin,
  run,
} from "@/lib/server/http";
import { userClient } from "@/lib/server/supabase";
import { limit } from "@/lib/server/rate-limit";
const emailSchema = z.object({ email: z.email().max(254) }).strict();
export async function POST(request: Request) {
  return run(async () => {
    requireSameOrigin(request);
    const parsed = emailSchema.safeParse(await readJson(request));
    if (!parsed.success)
      throw new ApiError(400, "invalid_email", "Enter a valid email address.");
    await limit(request, parsed.data.email.toLowerCase(), "auth");
    const client = await userClient();
    const { error } = await client.auth.signInWithOtp({
      email: parsed.data.email,
      options: { shouldCreateUser: true },
    });
    if (error)
      throw new ApiError(
        503,
        "auth_failed",
        "The sign-in code could not be sent. Please try again.",
      );
    return json({ ok: true });
  });
}
export async function DELETE(request: Request) {
  return run(async () => {
    requireSameOrigin(request);
    const client = await userClient();
    await client.auth.signOut();
    return json({ ok: true });
  });
}
