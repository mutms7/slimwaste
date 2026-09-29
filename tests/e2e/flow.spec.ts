import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";
const scanId = "33333333-3333-4333-8333-333333333333";
const item = {
  id: "44444444-4444-4444-8444-444444444444",
  name: "Spinach",
  category: "produce",
  edible: "edible",
  quantity_min: 150,
  quantity_max: 250,
  unit: "g",
  confidence: "low",
  uncertainty: "No known size reference.",
  reason: "unsure",
  note: "",
};
test("camera, correction, coaching, follow-up and history with controlled API fixtures", async ({
  page,
}) => {
  let saved: Record<string, unknown> | null = null;
  await page.route("**/api/session", (r) =>
    r.fulfill({
      json: {
        configured: true,
        user: { id: "test-user", email: "student@example.test" },
      },
    }),
  );
  await page.route("**/api/scans", async (r) => {
    if (r.request().method() === "POST")
      await r.fulfill({ json: { id: scanId } });
    else
      await r.fulfill({
        json: {
          scans: [
            {
              id: scanId,
              created_at: "2026-09-28T12:00:00Z",
              status: "corrected",
              items: [{ ...item, name: "Kale" }],
              reference: "",
              reference_question: "",
              image_url: null,
              model_version: "test",
            },
          ],
        },
      });
  });
  await page.route(`**/api/scans/${scanId}`, async (r) => {
    if (r.request().method() === "PUT") {
      saved = r.request().postDataJSON();
      await r.fulfill({ json: { id: scanId } });
    } else
      await r.fulfill({
        json: {
          scan: {
            id: scanId,
            created_at: "2026-09-28T12:00:00Z",
            status: saved ? "corrected" : "review",
            items: saved ? saved.items : [item],
            reference: "",
            reference_question: "How wide is the plate?",
            image_url: null,
            model_version: "test",
          },
          messages: [],
          advice: null,
        },
      });
  });
  await page.route(`**/api/scans/${scanId}/coach`, async (r) => {
    const question = r.request().postDataJSON().question;
    await r.fulfill({
      json: {
        reply: {
          breakdown:
            "Kale was left over. Try buying enough for one planned meal.",
          actions: [
            {
              title: "Choose the smaller bag",
              detail: "Use it in your next pasta meal.",
            },
          ],
        },
        messages: question
          ? [
              {
                id: "m1",
                role: "user",
                content: question,
                created_at: "2026-09-28T12:00:00Z",
              },
            ]
          : [],
      },
    });
  });
  await page.goto("/scan");
  const camera = page.getByRole("button", { name: "Take a photo" });
  await expect(camera).toBeVisible();
  const bounds = await camera.boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThan(
    page.viewportSize()!.height - 70,
  );
  const photo = await sharp({
    create: { width: 100, height: 60, channels: 3, background: "green" },
  })
    .jpeg()
    .toBuffer();
  await page
    .getByLabel("Choose a food photo")
    .setInputFiles({ name: "food.jpg", mimeType: "image/jpeg", buffer: photo });
  await expect(
    page.getByRole("heading", { name: "Sort the receipt." }),
  ).toBeVisible();
  await expect(
    page.getByText("Photo unavailable.", { exact: false }).first(),
  ).toBeVisible();
  await page.getByLabel("FOOD NAME", { exact: true }).fill("Kale");
  await page.getByRole("button", { name: "Save and see suggestions" }).click();
  await expect(
    page.getByRole("heading", { name: "Choose the smaller bag" }),
  ).toBeVisible();
  expect(saved).toMatchObject({ items: [{ name: "Kale" }] });
  await page.getByRole("textbox").fill("What if I only have a microwave?");
  await page.getByRole("button", { name: /send|ask/i }).click();
  await expect(
    page.getByText("What if I only have a microwave?", { exact: true }),
  ).toBeVisible();
  await page.goto("/history");
  await expect(page.getByRole("heading", { name: "Kale" })).toBeVisible();
});
test("provider failure is visible and never becomes a sample analysis", async ({
  page,
}) => {
  await page.route("**/api/session", (r) =>
    r.fulfill({
      json: {
        configured: true,
        user: { id: "test-user", email: "student@example.test" },
      },
    }),
  );
  await page.route("**/api/scans", (r) =>
    r.fulfill({
      status: 429,
      json: {
        error: "Photo analysis is busy. Please try again later.",
        code: "provider_limited",
      },
    }),
  );
  await page.goto("/scan");
  await expect(
    page.getByRole("button", { name: "Take a photo" }),
  ).toBeVisible();
  const photo = await sharp({
    create: { width: 10, height: 10, channels: 3, background: "green" },
  })
    .jpeg()
    .toBuffer();
  await page
    .getByLabel("Choose a food photo")
    .setInputFiles({ name: "food.jpg", mimeType: "image/jpeg", buffer: photo });
  await expect(
    page.getByText("Photo analysis is busy. Please try again later."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/scan$/);
  await expect(
    page.getByRole("button", { name: "Take a photo" }),
  ).toBeEnabled();
});
test("sample is labelled, responsive, keyboard accessible and has no serious accessibility violations", async ({
  page,
}, testInfo) => {
  await page.goto("/scan/sample/review");
  await expect(
    page.getByText("This is a sample illustration and example result.", {
      exact: false,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact || ""),
    ),
  ).toEqual([]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe(
    "BODY",
  );
  await page.screenshot({
    path: `output/playwright/${testInfo.project.name}-review.png`,
    fullPage: true,
  });
  await page.goto("/scan");
  await expect(page.getByText("Checking your account…")).toHaveCount(0);
  await page.screenshot({
    path: `output/playwright/${testInfo.project.name}-scan.png`,
    fullPage: true,
  });
});

test("free-tier processing requires agreement and keeps the camera accessible", async ({
  page,
}) => {
  await page.route("**/api/session", (route) =>
    route.fulfill({
      json: {
        configured: true,
        user: { id: "test-user", email: "student@example.test" },
        aiDataUse: "gemini-free-tier",
      },
    }),
  );
  const agreements: (string | undefined)[] = [];
  await page.route("**/api/scans", async (route) => {
    const agreement = route.request().headers()["x-ai-consent"];
    agreements.push(agreement);
    await route.fulfill({
      status: agreement ? 503 : 403,
      json: {
        error: agreement
          ? "The AI service is temporarily unavailable."
          : "Check the free AI processing agreement before sending a photo or asking for advice.",
      },
    });
  });
  await page.goto("/scan");
  const agreement = page.getByRole("checkbox", {
    name: "I agree to this processing in this tab.",
  });
  await expect(agreement).not.toBeChecked();
  const camera = page.getByRole("button", { name: "Take a photo" });
  const bounds = await camera.boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThan(
    page.viewportSize()!.height - 70,
  );
  const photo = await sharp({
    create: { width: 10, height: 10, channels: 3, background: "green" },
  })
    .jpeg()
    .toBuffer();
  await page
    .getByLabel("Choose a food photo")
    .setInputFiles({ name: "food.jpg", mimeType: "image/jpeg", buffer: photo });
  await expect(
    page.getByText(
      "Check the free AI processing agreement before sending a photo or asking for advice.",
    ),
  ).toBeVisible();
  expect(agreements[0]).toBeUndefined();
  await agreement.check();
  await page
    .getByLabel("Choose a food photo")
    .setInputFiles({ name: "food.jpg", mimeType: "image/jpeg", buffer: photo });
  await expect(
    page.getByText("The AI service is temporarily unavailable."),
  ).toBeVisible();
  expect(agreements[1]).toBe("gemini-free-tier-v1");
  await page.reload();
  await expect(agreement).toBeChecked();
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact || ""),
    ),
  ).toEqual([]);
});
