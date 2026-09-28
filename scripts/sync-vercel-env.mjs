import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";

const values = parseEnv(readFileSync(".env.local", "utf8"));
const project = JSON.parse(readFileSync(".vercel/project.json", "utf8"));
const auth = process.env.VERCEL_TOKEN
  ? { token: process.env.VERCEL_TOKEN }
  : JSON.parse(
      readFileSync(
        join(process.env.APPDATA, "com.vercel.cli", "Data", "auth.json"),
        "utf8",
      ),
    );
if (!auth.token) throw new Error("Sign in to Vercel first.");
const names = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AI_PROVIDER",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "AI_DATA_USE_ACK",
  "SCAN_IMAGE_RETENTION_DAYS",
  "RATE_LIMIT_SECRET",
  "CRON_SECRET",
];
const entries = names
  .filter((key) => values[key])
  .map((key) => ({
    key,
    value: values[key],
    type: key.startsWith("NEXT_PUBLIC_") ? "plain" : "encrypted",
    target: ["production", "preview"],
  }));
entries.push({
  key: "NEXT_PUBLIC_APP_URL",
  value: "https://slimwaste.vercel.app",
  type: "plain",
  target: ["production", "preview"],
});
const response = await fetch(
  `https://api.vercel.com/v10/projects/${project.projectId}/env?teamId=${project.orgId}&upsert=true`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(entries),
  },
);
if (!response.ok)
  throw new Error(`Vercel environment update failed (${response.status}).`);
console.log(
  `Saved ${entries.length} environment variables to preview and production. Values are not printed.`,
);
