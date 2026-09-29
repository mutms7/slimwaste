import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import sharp from "sharp";

if (process.env.RUN_CONNECTED_SMOKE !== "1")
  throw new Error(
    "Set RUN_CONNECTED_SMOKE=1 to create and clean up temporary test accounts.",
  );
const env = parseEnv(readFileSync(".env.local", "utf8"));
const base = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const accounts = [];

async function account(throughApp = false) {
  const email = `slimwaste-smoke-${randomUUID()}@example.test`;
  const password = randomBytes(32).toString("hex");
  const identity = { id: "", jar: new Map() };
  if (throughApp) {
    const response = await fetch(`${base}/api/auth`, {
      method: "POST",
      headers: {
        origin: new URL(base).origin,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, mode: "sign-up" }),
    });
    const result = await response.json();
    assert.equal(
      response.status,
      200,
      `Create password account: ${result.error}`,
    );
    identity.id = result.user.id;
    for (const value of response.headers.getSetCookie()) {
      const first = value.split(";", 1)[0];
      const separator = first.indexOf("=");
      identity.jar.set(
        first.slice(0, separator),
        decodeURIComponent(first.slice(separator + 1)),
      );
    }
    assert.ok(identity.jar.size, "Password account receives session cookies");
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { purpose: "temporary synthetic integration test" },
    });
    assert.equal(error, null, "Create test account");
    identity.id = data.user.id;
  }
  accounts.push(identity);
  identity.client = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () =>
          [...identity.jar].map(([name, value]) => ({ name, value })),
        setAll: (values) =>
          values.forEach(({ name, value }) => identity.jar.set(name, value)),
      },
    },
  );
  if (!throughApp) {
    const signed = await identity.client.auth.signInWithPassword({
      email,
      password,
    });
    assert.equal(signed.error, null, "Sign in test account");
  }
  return identity;
}

async function request(
  identity,
  path,
  method = "GET",
  body,
  consent = true,
  expected = 200,
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      origin: new URL(base).origin,
      cookie: [...identity.jar]
        .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
        .join("; "),
      ...(consent
        ? {
            "x-ai-consent": "gemini-free-tier-v1",
            "x-ai-consent-user": identity.id,
          }
        : {}),
      ...(body && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(65000),
  });
  const result = await response.json();
  assert.equal(
    response.status,
    expected,
    `${method} ${path}: ${result.code || result.error || response.status}`,
  );
  return result;
}

try {
  const passwordAccount = await account(true);
  assert.equal(
    (await request(passwordAccount, "/api/session")).user.id,
    passwordAccount.id,
  );
  await request(passwordAccount, "/api/auth", "DELETE");
  console.log("PASS: hosted password account creation, session, and sign-out");
  const first = await account();
  const second = await account();
  assert.equal((await request(first, "/api/session")).user.id, first.id);
  console.log("PASS: hosted authentication and app session");
  const jpeg = await sharp(readFileSync("public/sample-food.svg"))
    .jpeg()
    .toBuffer();
  const upload = () => {
    const data = new FormData();
    data.append(
      "image",
      new Blob([jpeg], { type: "image/jpeg" }),
      "synthetic-food.jpg",
    );
    return data;
  };
  await request(first, "/api/scans", "POST", upload(), false, 403);
  const { id } = await request(
    first,
    "/api/scans",
    "POST",
    upload(),
    true,
    201,
  );
  const original = await request(first, `/api/scans/${id}`);
  assert.ok(original.scan.items.length > 0);
  assert.ok(original.scan.image_url);
  console.log(
    "PASS: consent enforcement, live image detection, private photo storage",
  );
  await request(second, `/api/scans/${id}`, "GET", undefined, true, 404);
  await request(second, `/api/scans/${id}`, "DELETE", undefined, true, 404);
  const isolated = await second.client.from("scans").select("id").eq("id", id);
  assert.equal(isolated.error, null);
  assert.deepEqual(isolated.data, []);
  console.log("PASS: cross-account API and database isolation");
  const items = original.scan.items.map((item) => ({
    ...item,
    reason: "leftover",
    note: "Synthetic test illustration.",
  }));
  await request(first, `/api/scans/${id}`, "PUT", {
    items,
    reference: "Synthetic illustrated plate for testing.",
  });
  const corrected = await request(first, `/api/scans/${id}`);
  assert.equal(corrected.scan.status, "corrected");
  assert.equal(corrected.scan.items[0].reason, "leftover");
  await request(
    first,
    `/api/scans/${id}/coach`,
    "POST",
    { question: "" },
    false,
    403,
  );
  const advice = await request(first, `/api/scans/${id}/coach`, "POST", {
    question: "",
  });
  assert.ok(advice.reply.actions.length > 0);
  const followup = await request(first, `/api/scans/${id}/coach`, "POST", {
    question:
      "This is a fictional test kitchen with only a microwave. What can it do differently?",
  });
  assert.ok(followup.messages.length >= 3);
  assert.ok(
    (await request(first, "/api/scans")).scans.some((scan) => scan.id === id),
  );
  console.log("PASS: saved corrections, live coaching, follow-up, and history");
  const expired = await admin
    .from("scan_images")
    .update({ expires_at: new Date(Date.now() - 60000).toISOString() })
    .eq("scan_id", id)
    .eq("user_id", first.id);
  assert.equal(expired.error, null);
  const unauthenticatedCron = await fetch(base + "/api/cron/retention");
  assert.equal(unauthenticatedCron.status, 401);
  const retention = await fetch(base + "/api/cron/retention", {
    headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
  });
  const cleaned = await retention.json();
  assert.equal(retention.status, 200);
  assert.equal(cleaned.failed, 0);
  assert.ok(cleaned.removed >= 1);
  assert.equal((await request(first, `/api/scans/${id}`)).scan.image_url, null);
  await request(first, `/api/scans/${id}`, "DELETE");
  assert.equal((await request(first, "/api/scans")).scans.length, 0);
  console.log("PASS: authenticated retention and scan deletion");
} finally {
  for (const identity of accounts) {
    const { data: objects, error: listError } = await admin.storage
      .from("scan-images")
      .list(identity.id);
    assert.equal(listError, null, "List test objects for cleanup");
    if (objects?.length) {
      const { error } = await admin.storage
        .from("scan-images")
        .remove(objects.map((object) => `${identity.id}/${object.name}`));
      assert.equal(error, null, "Remove test objects");
    }
    const { error } = await admin.auth.admin.deleteUser(identity.id);
    assert.equal(error, null, "Remove test account");
  }
  console.log("Removed temporary test accounts and their data.");
}
