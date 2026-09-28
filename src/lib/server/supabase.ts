import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { ApiError } from "./http";

function publicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new ApiError(
      503,
      "auth_unconfigured",
      "Sign-in is not configured yet.",
    );
  return { url, key };
}
export function isConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
export async function userClient() {
  const { url, key } = publicConfig();
  const jar = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return jar.getAll();
      },
      setAll(values) {
        for (const value of values)
          jar.set(value.name, value.value, value.options);
      },
    },
  });
}
export function adminClient() {
  const { url } = publicConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key)
    throw new ApiError(
      503,
      "storage_unconfigured",
      "Private storage is not configured yet.",
    );
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function requireUser() {
  const client = await userClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user)
    throw new ApiError(401, "sign_in_required", "Please sign in first.");
  return { client, user: data.user };
}
export function dbError(
  error: { message: string; code?: string } | null,
  action: string,
): never {
  if (error?.code === "42501")
    throw new ApiError(403, "forbidden", "You cannot access this record.");
  console.error("database_failure", { action, code: error?.code });
  throw new ApiError(
    503,
    "database_error",
    "The service is temporarily unavailable.",
  );
}
