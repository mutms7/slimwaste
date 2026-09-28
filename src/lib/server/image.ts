import "server-only";
import sharp from "sharp";
import { ApiError } from "./http";

const supported = new Set(["image/jpeg", "image/png", "image/webp"]);
export async function normalizeImage(file: File) {
  if (!supported.has(file.type))
    throw new ApiError(
      415,
      "invalid_image",
      "Choose a JPEG, PNG, or WebP photo.",
    );
  if (!file.size || file.size > 4 * 1024 * 1024)
    throw new ApiError(
      413,
      "invalid_image",
      "Choose a photo smaller than 4 MB.",
    );
  const bytes = Buffer.from(await file.arrayBuffer());
  const format =
    file.type === "image/jpeg"
      ? "jpeg"
      : file.type === "image/png"
        ? "png"
        : "webp";
  try {
    const image = sharp(bytes, {
      failOn: "error",
      limitInputPixels: 36_000_000,
      animated: false,
    });
    const meta = await image.metadata();
    if (
      meta.format !== format ||
      (meta.pages ?? 1) !== 1 ||
      !meta.width ||
      !meta.height ||
      meta.width > 12000 ||
      meta.height > 12000
    )
      throw new Error("Invalid image metadata");
    const { data, info } = await image
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    await sharp(data, { failOn: "error" }).stats();
    return {
      data,
      mime: "image/jpeg" as const,
      width: info.width,
      height: info.height,
    };
  } catch {
    throw new ApiError(
      415,
      "invalid_image",
      "That photo could not be read. Please try another one.",
    );
  }
}
