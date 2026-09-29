import { z } from "zod";
import {
  ApiError,
  json,
  readJson,
  requireSameOrigin,
  run,
} from "@/lib/server/http";
import { limit } from "@/lib/server/rate-limit";
import { userClient } from "@/lib/server/supabase";

const schema = z.object({ email: z.email().max(254) }).strict();

export async function POST(request: Request) {
  return run(async () => {
    requireSameOrigin(request);
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success)
      throw new ApiError(400, "invalid_email", "Enter a valid email address.");
    const email = parsed.data.email.toLowerCase();
    await limit(request, email, "auth");
    const client = await userClient();
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: new URL(
        "/auth/reset",
        process.env.NEXT_PUBLIC_APP_URL || request.url,
      ).toString(),
    });
    if (error) {
      console.error("auth_recovery_failed", { code: error.code });
      throw new ApiError(
        503,
        "recovery_failed",
        "The recovery email couldn't be sent. Try again in a moment.",
      );
    }
    return json({ ok: true });
  });
}
