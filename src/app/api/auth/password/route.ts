import { z } from "zod";
import {
  ApiError,
  json,
  readJson,
  requireSameOrigin,
  run,
} from "@/lib/server/http";
import { userClient } from "@/lib/server/supabase";

const schema = z.object({ password: z.string().min(12).max(128) }).strict();

export async function PUT(request: Request) {
  return run(async () => {
    requireSameOrigin(request);
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success)
      throw new ApiError(
        400,
        "invalid_password",
        "Use a password with at least 12 characters.",
      );
    const client = await userClient();
    const { data } = await client.auth.getUser();
    if (!data.user)
      throw new ApiError(
        401,
        "recovery_expired",
        "That recovery link has expired. Request a new one.",
      );
    const { error } = await client.auth.updateUser({
      password: parsed.data.password,
    });
    if (error)
      throw new ApiError(
        400,
        "password_update_failed",
        "That password couldn't be saved. Try a different one.",
      );
    return json({ ok: true });
  });
}
