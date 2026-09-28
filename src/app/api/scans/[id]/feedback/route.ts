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
import { loadScan } from "@/lib/server/scans";
const schema = z
  .object({ helpful: z.boolean(), note: z.string().max(1000) })
  .strict();
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) {
  return run(async () => {
    requireSameOrigin(request);
    const id = parseId((await context.params).id);
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success)
      throw new ApiError(400, "invalid_feedback", "Please check the feedback.");
    const { client, user } = await requireUser();
    await loadScan(client, user.id, id);
    const { error } = await adminClient()
      .from("user_feedback")
      .insert({ scan_id: id, user_id: user.id, ...parsed.data });
    if (error) dbError(error, "save_feedback");
    return json({ ok: true });
  });
}
