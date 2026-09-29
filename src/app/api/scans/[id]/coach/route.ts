import { z } from "zod";
import { correctionSchema, profileSchema, type Profile } from "@/lib/schema";
import { coach, requireAiConsent } from "@/lib/server/ai";
import {
  ApiError,
  json,
  parseId,
  readJson,
  requireSameOrigin,
  run,
} from "@/lib/server/http";
import { limit } from "@/lib/server/rate-limit";
import { loadScan, loadThread } from "@/lib/server/scans";
import { adminClient, dbError, requireUser } from "@/lib/server/supabase";
const schema = z.object({ question: z.string().max(1000) }).strict();
const empty: Profile = {
  household: "",
  cooking_access: "",
  grocery_cadence: "",
  budget_preference: "",
  dietary_restrictions: "",
  evaluation_consent: false,
};
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) {
  return run(async () => {
    requireSameOrigin(request);
    const id = parseId((await context.params).id);
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success)
      throw new ApiError(
        400,
        "invalid_question",
        "Keep the question under 1,000 characters.",
      );
    const { client, user } = await requireUser();
    requireAiConsent(request, user.id);
    const scan = await loadScan(client, user.id, id);
    if (scan.status !== "corrected")
      throw new ApiError(
        409,
        "review_required",
        "Review the scan before asking for advice.",
      );
    const { data: revisionRow, error: revisionError } = await client
      .from("correction_snapshots")
      .select("revision,items,reference")
      .eq("scan_id", id)
      .eq("user_id", user.id)
      .order("revision", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (revisionError) dbError(revisionError, "coach_revision");
    if (!revisionRow)
      throw new ApiError(
        409,
        "review_required",
        "Review the scan before asking for advice.",
      );
    await limit(request, user.id, "coach");
    const thread = await loadThread(client, user.id, id);
    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select(
        "household,cooking_access,grocery_cadence,budget_preference,dietary_restrictions,evaluation_consent",
      )
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) dbError(profileError, "coach_profile");
    const { data: recent, error: recentError } = await client
      .from("corrected_scan_items")
      .select(
        "name,reason,category,quantity_min,quantity_max,unit,scan_id,scans!inner(created_at,status,deleted_at)",
      )
      .eq("user_id", user.id)
      .neq("scan_id", id)
      .eq("scans.status", "corrected")
      .is("scans.deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(30);
    if (recentError) dbError(recentError, "coach_patterns");
    const corrected = correctionSchema.parse({
      items: revisionRow.items,
      reference: revisionRow.reference,
    });
    const reply = await coach({
      ...corrected,
      profile: profileSchema.parse(profile || empty),
      patterns: recent || [],
      recentMessages: thread.messages
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content })),
      question: parsed.data.question,
    });
    const admin = adminClient();
    const { error: saveError } = await admin.rpc("persist_coaching_reply", {
      p_scan_id: id,
      p_user_id: user.id,
      p_revision: revisionRow.revision,
      p_question: parsed.data.question,
      p_reply: reply,
    });
    if (saveError?.code === "40001")
      throw new ApiError(
        409,
        "scan_changed",
        "This scan changed while advice was being prepared. Please try again.",
      );
    if (saveError) dbError(saveError, "save_coaching_reply");
    const updated = await loadThread(client, user.id, id);
    return json({ reply, messages: updated.messages });
  });
}
