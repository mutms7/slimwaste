import { beforeEach, expect, it, vi } from "vitest";
import { GET } from "../src/app/auth/callback/route";
import { userClient } from "../src/lib/server/supabase";

vi.mock("../src/lib/server/supabase", () => ({ userClient: vi.fn() }));
beforeEach(() => vi.resetAllMocks());

it("exchanges the email code and redirects only to the app's scan page", async () => {
  const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
  vi.mocked(userClient).mockResolvedValue({
    auth: { exchangeCodeForSession },
  } as never);
  const response = await GET(
    new Request(
      "https://slimwaste.vercel.app/auth/callback?code=synthetic-code&next=https://other.example",
    ),
  );
  expect(exchangeCodeForSession).toHaveBeenCalledWith("synthetic-code");
  expect(response.headers.get("location")).toBe(
    "https://slimwaste.vercel.app/scan",
  );
  expect(response.headers.get("cache-control")).toBe("no-store");
});

it("returns expired links to sign-in without exposing the provider error", async () => {
  vi.mocked(userClient).mockResolvedValue({
    auth: {
      exchangeCodeForSession: vi
        .fn()
        .mockResolvedValue({ error: { message: "private detail" } }),
    },
  } as never);
  const response = await GET(
    new Request("https://slimwaste.vercel.app/auth/callback?code=expired"),
  );
  expect(response.headers.get("location")).toBe(
    "https://slimwaste.vercel.app/sign-in?link_error=1",
  );
});

it("doesn't exchange a missing callback code", async () => {
  await GET(new Request("https://slimwaste.vercel.app/auth/callback"));
  expect(userClient).not.toHaveBeenCalled();
});
