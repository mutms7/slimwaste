import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { expect, it } from "vitest";
import sharp from "sharp";
import { detect, coach } from "../src/lib/server/ai";

it.skipIf(process.env.RUN_LIVE_SMOKE !== "1")(
  "checks configured AI with synthetic, non-private sample content",
  async () => {
    const env = parseEnv(readFileSync(".env.local", "utf8"));
    for (const key of [
      "AI_PROVIDER",
      "GEMINI_API_KEY",
      "GEMINI_MODEL",
      "OPENAI_API_KEY",
      "OPENAI_MODEL",
      "AI_DATA_USE_ACK",
    ])
      if (env[key]) process.env[key] = env[key];
    const image = await sharp(readFileSync("public/sample-food.svg"))
      .jpeg()
      .toBuffer();
    const result = await detect(image);
    expect(result.detection.items.length).toBeGreaterThan(0);
    const reply = await coach({
      items: result.detection.items,
      reference: "This is a test illustration, not a real student record.",
      profile: {
        household: "Test shared kitchen",
        cooking_access: "Test microwave",
        grocery_cadence: "Weekly",
        budget_preference: "Low cost",
        dietary_restrictions: "",
        evaluation_consent: false,
      },
      patterns: [],
      recentMessages: [],
      question:
        "What is one practical way to plan a smaller portion next time?",
    });
    expect(reply.actions.length).toBeGreaterThan(0);
  },
  100000,
);
