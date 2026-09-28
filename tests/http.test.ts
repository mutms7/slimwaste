import { afterEach, expect, it, vi } from "vitest";
import { requireSameOrigin, readBodyLimited } from "../src/lib/server/http";

afterEach(() => vi.unstubAllEnvs());
it("rejects a foreign origin and permits the configured app and Vercel preview", () => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://slimwaste.vercel.app");
  vi.stubEnv("VERCEL_URL", "slimwaste-preview.vercel.app");
  expect(() =>
    requireSameOrigin(
      new Request("https://slimwaste.vercel.app/api/scans", {
        headers: { origin: "https://other.example" },
      }),
    ),
  ).toThrow("another site");
  expect(() =>
    requireSameOrigin(
      new Request("https://slimwaste.vercel.app/api/scans", {
        headers: { origin: "https://slimwaste.vercel.app" },
      }),
    ),
  ).not.toThrow();
  expect(() =>
    requireSameOrigin(
      new Request("https://slimwaste-preview.vercel.app/api/scans", {
        headers: { origin: "https://slimwaste-preview.vercel.app" },
      }),
    ),
  ).not.toThrow();
});
it("caps streamed uploads even when content length is absent", async () => {
  const request = new Request("https://slimwaste.vercel.app/api/scans", {
    method: "POST",
    body: new Uint8Array(1025),
  });
  await expect(readBodyLimited(request, 1024)).rejects.toMatchObject({
    status: 413,
  });
});
it("preserves an accepted upload without mutating bytes", async () => {
  const request = new Request("https://slimwaste.vercel.app/api/scans", {
    method: "POST",
    body: new Uint8Array([1, 2, 3]),
  });
  expect(await readBodyLimited(request, 3)).toEqual(new Uint8Array([1, 2, 3]));
});
