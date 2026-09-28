import type { CoachReply, Message, Profile, Scan } from "./schema";

export class ApiError extends Error {
  constructor(
    message: string,
    public code = "request_failed",
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      signal: options.signal || AbortSignal.timeout(60000),
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...options.headers,
      },
      cache: "no-store",
    });
  } catch (error) {
    if (
      error instanceof DOMException &&
      ["TimeoutError", "AbortError"].includes(error.name)
    )
      throw new ApiError(
        "That took too long. Please try again. Your saved review is still there.",
        "timeout",
      );
    throw new ApiError(
      "You seem to be offline. Check your connection and try again.",
      "offline",
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(
      data.error || "Something went wrong. Please try again.",
      data.code || "request_failed",
    );
  return data as T;
}

export const session = () =>
  api<{ user: { id: string; email: string } | null; configured: boolean }>(
    "/api/session",
  );
export const getScans = () => api<{ scans: Scan[] }>("/api/scans");
export const getScan = (id: string) =>
  api<{ scan: Scan; messages: Message[]; advice: CoachReply | null }>(
    `/api/scans/${encodeURIComponent(id)}`,
  );
export const getProfile = () => api<{ profile: Profile }>("/api/profile");
