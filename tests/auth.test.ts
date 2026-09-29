import { beforeEach, expect, it, vi } from "vitest";

const signUp = vi.fn();
const signInWithPassword = vi.fn();

vi.mock("@/lib/server/supabase", () => ({
  userClient: vi.fn(async () => ({
    auth: { signUp, signInWithPassword, signOut: vi.fn() },
  })),
}));
vi.mock("@/lib/server/rate-limit", () => ({ limit: vi.fn() }));

import { POST } from "../src/app/api/auth/route";

const request = (body: unknown) =>
  new Request("https://slimwaste.vercel.app/api/auth", {
    method: "POST",
    headers: {
      origin: "https://slimwaste.vercel.app",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://slimwaste.vercel.app");
});

it("creates a password account and returns its session user", async () => {
  signUp.mockResolvedValue({
    data: {
      user: { id: "user-1", email: "student@example.test" },
      session: { access_token: "synthetic" },
    },
    error: null,
  });
  const response = await POST(
    request({
      email: "Student@Example.test",
      password: "a secure password",
      mode: "sign-up",
    }),
  );
  expect(response.status).toBe(200);
  expect(signUp).toHaveBeenCalledWith({
    email: "student@example.test",
    password: "a secure password",
  });
  await expect(response.json()).resolves.toEqual({
    user: { id: "user-1", email: "student@example.test" },
  });
});

it("signs in an existing password account", async () => {
  signInWithPassword.mockResolvedValue({
    data: {
      user: { id: "user-1", email: "student@example.test" },
      session: { access_token: "synthetic" },
    },
    error: null,
  });
  const response = await POST(
    request({
      email: "student@example.test",
      password: "a secure password",
      mode: "sign-in",
    }),
  );
  expect(response.status).toBe(200);
  expect(signInWithPassword).toHaveBeenCalledWith({
    email: "student@example.test",
    password: "a secure password",
  });
});
