import { beforeEach, expect, it, vi } from "vitest";

const signUp = vi.fn();
const signInWithPassword = vi.fn();
const resetPasswordForEmail = vi.fn();
const getUser = vi.fn();
const updateUser = vi.fn();
const exchangeCodeForSession = vi.fn();
const listUsers = vi.fn();

vi.mock("@/lib/server/supabase", () => ({
  userClient: vi.fn(async () => ({
    auth: {
      signUp,
      signInWithPassword,
      resetPasswordForEmail,
      getUser,
      updateUser,
      exchangeCodeForSession,
      signOut: vi.fn(),
    },
  })),
  adminClient: vi.fn(() => ({ auth: { admin: { listUsers } } })),
}));
vi.mock("@/lib/server/rate-limit", () => ({ limit: vi.fn() }));

import { POST } from "../src/app/api/auth/route";
import { POST as recover } from "../src/app/api/auth/recovery/route";
import { PUT as updatePassword } from "../src/app/api/auth/password/route";
import { GET as finishRecovery } from "../src/app/auth/reset/route";

const request = (body: unknown, method = "POST") =>
  new Request("https://slimwaste.vercel.app/api/auth", {
    method,
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

it("returns a missing-account code so the form can switch to account creation", async () => {
  signInWithPassword.mockResolvedValue({
    data: { user: null, session: null },
    error: { code: "invalid_credentials" },
  });
  listUsers.mockResolvedValue({ data: { users: [] }, error: null });
  const response = await POST(
    request({
      email: "new@example.test",
      password: "a secure password",
      mode: "sign-in",
    }),
  );
  expect(response.status).toBe(404);
  await expect(response.json()).resolves.toMatchObject({
    code: "account_not_found",
  });
});

it("requests a recovery link with the hosted reset callback", async () => {
  resetPasswordForEmail.mockResolvedValue({ error: null });
  const response = await recover(request({ email: "student@example.test" }));
  expect(response.status).toBe(200);
  expect(resetPasswordForEmail).toHaveBeenCalledWith("student@example.test", {
    redirectTo: "https://slimwaste.vercel.app/auth/reset",
  });
});

it("updates the password for an authenticated recovery session", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  updateUser.mockResolvedValue({ error: null });
  const response = await updatePassword(
    request({ password: "a newer secure password" }, "PUT"),
  );
  expect(response.status).toBe(200);
  expect(updateUser).toHaveBeenCalledWith({
    password: "a newer secure password",
  });
});

it("exchanges the recovery code and opens the new-password form", async () => {
  exchangeCodeForSession.mockResolvedValue({ error: null });
  const response = await finishRecovery(
    new Request("https://slimwaste.vercel.app/auth/reset?code=recovery-code"),
  );
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe(
    "https://slimwaste.vercel.app/reset-password",
  );
});
