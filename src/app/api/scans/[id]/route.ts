import { correctionSchema } from "@/lib/schema";
import { z } from "zod";
import {
  ApiError,
  json,
  parseId,
  readJson,
  requireSameOrigin,
  run,
} from "@/lib/server/http";
import { adminClient, dbError, requireUser } from "@/lib/server/supabase";
import { loadScan, loadThread } from "@/lib/server/scans";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  return run(async () => {
    const id = parseId((await context.params).id);
    const { client, user } = await requireUser();
    const scan = await loadScan(client, user.id, id);
    const { messages, advice } = await loadThread(client, user.id, id);
    return json({ scan, messages, advice });
  });
}
export async function PUT(request: Request, context: Context) {
  return run(async () => {
    requireSameOrigin(request);
    const id = parseId((await context.params).id);
    const parsed = correctionSchema.safeParse(await readJson(request, 50000));
    if (
      !parsed.success ||
      new Set(parsed.data?.items.map((i) => i.id)).size !==
        parsed.data?.items.length
    )
      throw new ApiError(
        400,
        "invalid_correction",
        "Please check the reviewed items.",
      );
    const { client, user } = await requireUser();
    await loadScan(client, user.id, id);
    const items = parsed.data.items.map((item) => ({
      ...item,
      id: z.uuid().safeParse(item.id).success ? item.id : crypto.randomUUID(),
    }));
    const { error } = await client.rpc("replace_scan_corrections", {
      p_scan_id: id,
      p_items: items,
      p_reference: parsed.data.reference,
    });
    if (error) dbError(error, "replace_scan_corrections");
    return json({ id });
  });
}
export async function DELETE(request: Request, context: Context) {
  return run(async () => {
    requireSameOrigin(request);
    const id = parseId((await context.params).id);
    const { client, user } = await requireUser();
    await loadScan(client, user.id, id);
    const admin = adminClient();
    const { data: path, error: queueError } = await admin.rpc(
      "queue_scan_deletion",
      { p_scan_id: id, p_user_id: user.id },
    );
    if (queueError) dbError(queueError, "queue_scan_deletion");
    if (path) {
      const { error: removeError } = await admin.storage
        .from("scan-images")
        .remove([path]);
      if (!removeError)
        await admin.from("deletion_queue").delete().eq("storage_path", path);
    }
    return json({ ok: true });
  });
}
