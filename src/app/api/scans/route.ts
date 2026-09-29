import {
  ApiError,
  json,
  readBodyLimited,
  requireSameOrigin,
  run,
} from "@/lib/server/http";
import { adminClient, dbError, requireUser } from "@/lib/server/supabase";
import { limit } from "@/lib/server/rate-limit";
import { normalizeImage } from "@/lib/server/image";
import { detect, providerConfig, requireAiConsent } from "@/lib/server/ai";
import { listScans } from "@/lib/server/scans";

export async function GET() {
  return run(async () => {
    const { client, user } = await requireUser();
    return json({ scans: await listScans(client, user.id) });
  });
}
export async function POST(request: Request) {
  return run(async () => {
    requireSameOrigin(request);
    const { user } = await requireUser();
    providerConfig();
    requireAiConsent(request, user.id);
    await limit(request, user.id, "scan");
    const length = Number(request.headers.get("content-length"));
    if (length > 4_400_000)
      throw new ApiError(
        413,
        "invalid_image",
        "Choose a photo smaller than 4 MB.",
      );
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data"))
      throw new ApiError(415, "invalid_image", "Upload a photo.");
    const body = await readBodyLimited(request, 4_400_000);
    const form = await new Request(request.url, {
      method: "POST",
      headers: { "content-type": request.headers.get("content-type")! },
      body,
    }).formData();
    const file = form.get("image");
    if (!(file instanceof File))
      throw new ApiError(400, "invalid_image", "Choose a photo first.");
    const normalized = await normalizeImage(file);
    const { detection, original, model } = await detect(normalized.data);
    const id = crypto.randomUUID();
    const path = `${user.id}/${id}.jpg`;
    const admin = adminClient();
    const { error: uploadError } = await admin.storage
      .from("scan-images")
      .upload(path, normalized.data, {
        contentType: "image/jpeg",
        upsert: false,
      });
    if (uploadError) dbError(uploadError, "upload_scan_image");
    let saved = false;
    try {
      const days = Number(process.env.SCAN_IMAGE_RETENTION_DAYS || "30");
      if (!Number.isInteger(days) || days < 1 || days > 365)
        throw new ApiError(
          503,
          "retention_unconfigured",
          "Photo retention is not configured yet.",
        );
      const expires = new Date(Date.now() + days * 86400000).toISOString();
      const { error: scanError } = await admin.from("scans").insert({
        id,
        user_id: user.id,
        status: "review",
        reference_question: detection.reference_question,
        model_version: model,
      });
      if (scanError) dbError(scanError, "create_scan");
      const results = await Promise.all([
        admin.from("original_detections").insert({
          scan_id: id,
          user_id: user.id,
          result: original,
          presented_result: detection,
          model_version: model,
        }),
        admin.from("scan_images").insert({
          scan_id: id,
          user_id: user.id,
          storage_path: path,
          width: normalized.width,
          height: normalized.height,
          mime_type: "image/jpeg",
          expires_at: expires,
        }),
      ]);
      for (const result of results)
        if (result.error) dbError(result.error, "create_scan_details");
      saved = true;
    } finally {
      if (!saved) {
        await admin.from("scans").delete().eq("id", id).eq("user_id", user.id);
        const { error } = await admin.storage
          .from("scan-images")
          .remove([path]);
        if (error)
          await admin
            .from("deletion_queue")
            .upsert({ storage_path: path, user_id: user.id });
      }
    }
    return json({ id }, 201);
  });
}
