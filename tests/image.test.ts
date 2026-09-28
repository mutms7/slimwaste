import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { normalizeImage } from "../src/lib/server/image";
describe("private image normalization", () => {
  it("rotates an EXIF phone photo and strips its metadata", async () => {
    const input = await sharp({
      create: { width: 120, height: 80, channels: 3, background: "red" },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const normalized = await normalizeImage(
      new File([new Uint8Array(input)], "phone.jpg", { type: "image/jpeg" }),
    );
    const metadata = await sharp(normalized.data).metadata();
    expect(metadata.width).toBe(80);
    expect(metadata.height).toBe(120);
    expect(metadata.exif).toBeUndefined();
    expect(metadata.orientation).toBeUndefined();
    expect(normalized.width).toBe(80);
    expect(normalized.height).toBe(120);
  });
  it("limits model image dimensions", async () => {
    const input = await sharp({
      create: { width: 2400, height: 1200, channels: 3, background: "green" },
    })
      .png()
      .toBuffer();
    const normalized = await normalizeImage(
      new File([new Uint8Array(input)], "large.png", { type: "image/png" }),
    );
    const metadata = await sharp(normalized.data).metadata();
    expect(metadata.width).toBe(1600);
    expect(metadata.height).toBe(800);
  });
  it("rejects a mismatched declared MIME type and malformed input", async () => {
    const png = await sharp({
      create: { width: 10, height: 10, channels: 3, background: "green" },
    })
      .png()
      .toBuffer();
    await expect(
      normalizeImage(
        new File([new Uint8Array(png)], "fake.jpg", { type: "image/jpeg" }),
      ),
    ).rejects.toThrow();
    await expect(
      normalizeImage(
        new File(["not a photo"], "bad.png", { type: "image/png" }),
      ),
    ).rejects.toThrow();
  });
  it("rejects oversized input before decoding", async () => {
    await expect(
      normalizeImage(
        new File([new Uint8Array(4194305)], "large.jpg", {
          type: "image/jpeg",
        }),
      ),
    ).rejects.toThrow("4 MB");
  });
});
