import { z } from "zod";
import {
  ApiError,
  json,
  readJson,
  requireSameOrigin,
  run,
} from "@/lib/server/http";
import { adminClient, userClient } from "@/lib/server/supabase";
import { limit } from "@/lib/server/rate-limit";

const credentialsSchema = z
  .object({
    email: z.email().max(254),
    password: z.string().min(12).max(128),
    mode: z.enum(["sign-in", "sign-up"]),
  })
  .strict();

async function accountExists(email: string) {
  const admin = adminClient();
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error)
      throw new ApiError(
        503,
        "auth_lookup_failed",
        "We couldn't check that account. Try again.",
      );
    if (
      data.users.some(
        (user) => user.email?.toLowerCase() === email.toLowerCase(),
      )
    )
      return true;
    if (data.users.length < 1000) return false;
  }
  return false;
}

export async function POST(request: Request) {
  return run(async () => {
    requireSameOrigin(request);
    const parsed = credentialsSchema.safeParse(await readJson(request));
    if (!parsed.success)
      throw new ApiError(
        400,
        "invalid_credentials",
        "Enter a valid email and a password with at least 12 characters.",
      );
    const email = parsed.data.email.toLowerCase();
    await limit(request, email, "auth");
    const client = await userClient();
    const result =
      parsed.data.mode === "sign-up"
        ? await client.auth.signUp({ email, password: parsed.data.password })
        : await client.auth.signInWithPassword({
            email,
            password: parsed.data.password,
          });
    if (result.error) {
      console.error("auth_password_failed", {
        mode: parsed.data.mode,
        code: result.error.code,
      });
      if (
        parsed.data.mode === "sign-up" &&
        result.error.code === "user_already_exists"
      )
        throw new ApiError(
          409,
          "account_exists",
          "That email already has an account. Sign in instead.",
        );
      if (parsed.data.mode === "sign-in") {
        if (!(await accountExists(email)))
          throw new ApiError(
            404,
            "account_not_found",
            "There isn't an account for that email yet. Create one below.",
          );
        throw new ApiError(
          401,
          "auth_failed",
          "That password doesn't match. Try again or reset it.",
        );
      }
      throw new ApiError(
        400,
        "auth_failed",
        "We couldn't create that account. Try another email or password.",
      );
    }
    if (!result.data.session || !result.data.user)
      throw new ApiError(
        503,
        "account_pending",
        "Your account needs confirmation before you can sign in.",
      );
    return json({
      user: { id: result.data.user.id, email: result.data.user.email },
    });
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
