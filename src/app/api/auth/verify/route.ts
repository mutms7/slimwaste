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
const schema = z
  .object({
    email: z.email().max(254),
    token: z.string().trim().min(6).max(20),
  })
  .strict();
export async function POST(request: Request) {
  return run(async () => {
    requireSameOrigin(request);
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success)
      throw new ApiError(
        400,
        "invalid_code",
        "Enter the email and sign-in code.",
      );
    await limit(request, parsed.data.email.toLowerCase(), "auth");
    const client = await userClient();
    const { data, error } = await client.auth.verifyOtp({
      email: parsed.data.email,
      token: parsed.data.token,
      type: "email",
    });
    if (error || !data.user)
      throw new ApiError(
        401,
        "invalid_code",
        "That code did not work. Request a new one.",
      );
    return json({ user: { id: data.user.id, email: data.user.email || "" } });
  });
}
