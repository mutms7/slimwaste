import { ApiError, json, run } from "@/lib/server/http";
import { adminClient, dbError } from "@/lib/server/supabase";
export async function GET(request: Request) {
  return run(async () => {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
      throw new ApiError(401, "unauthorized", "Unauthorized.");
    const admin = adminClient();
    const now = new Date().toISOString();
    const { data: expired, error: expiryError } = await admin
      .from("scan_images")
      .select("storage_path,user_id")
      .lt("expires_at", now)
      .is("deleted_at", null)
      .limit(100);
    if (expiryError) dbError(expiryError, "retention_list");
    for (const image of expired || []) {
      const { error } = await admin
        .from("deletion_queue")
        .upsert(
          {
            storage_path: image.storage_path,
            user_id: image.user_id,
            next_attempt_at: now,
          },
          { onConflict: "storage_path", ignoreDuplicates: true },
        );
      if (error) dbError(error, "retention_queue");
    }
    const { data: queued, error: queueError } = await admin
      .from("deletion_queue")
      .select("id,storage_path,attempts")
      .lte("next_attempt_at", now)
      .order("created_at")
      .limit(100);
    if (queueError) dbError(queueError, "retention_pending");
    let removed = 0,
      failed = 0;
    for (const item of queued || []) {
      const { error } = await admin.storage
        .from("scan-images")
        .remove([item.storage_path]);
      if (error) {
        failed++;
        await admin
          .from("deletion_queue")
          .update({
            attempts: item.attempts + 1,
            next_attempt_at: new Date(
              Date.now() +
                Math.min(86400000, 60000 * 2 ** Math.min(item.attempts, 10)),
            ).toISOString(),
          })
          .eq("id", item.id);
      } else {
        removed++;
        await admin
          .from("scan_images")
          .update({ deleted_at: now })
          .eq("storage_path", item.storage_path);
        await admin.from("deletion_queue").delete().eq("id", item.id);
      }
    }
    await admin
      .from("rate_limits")
      .delete()
      .lt("window_start", new Date(Date.now() - 2 * 86400000).toISOString());
    return json({ ok: true, removed, failed });
  });
}
