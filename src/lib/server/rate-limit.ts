import "server-only";
import { createHmac } from "node:crypto";
import { adminClient, dbError } from "./supabase";
import { ApiError } from "./http";

function hashed(value: string) {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32)
    throw new ApiError(
      503,
      "rate_limit_unconfigured",
      "Rate limiting is not configured yet.",
    );
  return createHmac("sha256", secret).update(value).digest("hex");
}
export async function limit(
  request: Request,
  userId: string | null,
  action: "auth" | "scan" | "coach",
) {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const ip = request.headers.get("x-real-ip") || forwarded || "unknown";
  const specs =
    action === "auth"
      ? { ip: [10, 3600], account: [6, 3600] }
      : action === "scan"
        ? { ip: [30, 3600], account: [12, 3600] }
        : { ip: [100, 3600], account: [40, 3600] };
  const client = adminClient();
  const keys = [
    {
      key: hashed(`${action}:ip:${ip}`),
      max: specs.ip[0],
      seconds: specs.ip[1],
    },
  ];
  if (userId)
    keys.push({
      key: hashed(`${action}:account:${userId}`),
      max: specs.account[0],
      seconds: specs.account[1],
    });
  for (const entry of keys) {
    const { data, error } = await client.rpc("consume_rate_limit", {
      p_key: entry.key,
      p_limit: entry.max,
      p_window_seconds: entry.seconds,
    });
    if (error) dbError(error, "rate_limit");
    if (!data)
      throw new ApiError(
        429,
        "rate_limited",
        "You have reached the limit. Please try again later.",
      );
  }
}
