import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function requestId() {
  return crypto.randomUUID();
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function errorResponse(error: unknown, id: string) {
  const known =
    error instanceof ApiError
      ? error
      : new ApiError(
          500,
          "server_error",
          "Something went wrong. Please try again.",
        );
  if (!(error instanceof ApiError))
    console.error("api_failure", { requestId: id, code: "unhandled_error" });
  return json(
    { error: known.message, code: known.code, requestId: id },
    known.status,
  );
}
export async function run(handler: (id: string) => Promise<NextResponse>) {
  const id = requestId();
  const started = Date.now();
  try {
    return await handler(id);
  } catch (error) {
    return errorResponse(error, id);
  } finally {
    console.info("api_request", {
      requestId: id,
      durationMs: Date.now() - started,
    });
  }
}
export async function readJson(
  request: Request,
  maxBytes = 16384,
): Promise<unknown> {
  const body = await readBodyLimited(request, maxBytes);
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
  } catch {
    throw new ApiError(400, "invalid_json", "Please send valid JSON.");
  }
}
export async function readBodyLimited(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const length = Number(request.headers.get("content-length"));
  if (length > maxBytes)
    throw new ApiError(413, "payload_too_large", "That request is too large.");
  if (!request.body)
    throw new ApiError(400, "empty_body", "The request body is empty.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes)
        throw new ApiError(
          413,
          "payload_too_large",
          "That request is too large.",
        );
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(new ArrayBuffer(total));
  let position = 0;
  for (const chunk of chunks) {
    result.set(chunk, position);
    position += chunk.byteLength;
  }
  return result;
}
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = process.env.NEXT_PUBLIC_APP_URL;
  const deploymentOrigin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : null;
  if (
    origin &&
    (!allowed || new URL(origin).origin !== new URL(allowed).origin) &&
    origin !== deploymentOrigin
  )
    throw new ApiError(
      403,
      "origin_denied",
      "This request came from another site.",
    );
}
export function parseId(id: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  )
    throw new ApiError(404, "not_found", "Scan not found.");
  return id;
}
