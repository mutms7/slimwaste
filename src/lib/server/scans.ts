import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Scan, ScanItem, Message, CoachReply } from "@/lib/schema";
import { adminClient, dbError } from "./supabase";
import { ApiError } from "./http";
type CorrectedRow = Omit<ScanItem, "quantity_min" | "quantity_max"> & {
  quantity_min: string | number;
  quantity_max: string | number;
};
type ScanRow = Omit<Scan, "items" | "image_url"> & {
  corrected_scan_items: CorrectedRow[];
  original_detections:
    | { presented_result: { items: ScanItem[] } }
    | Array<{ presented_result: { items: ScanItem[] } }>
    | null;
  scan_images:
    | { storage_path: string; expires_at: string; deleted_at: string | null }
    | Array<{
        storage_path: string;
        expires_at: string;
        deleted_at: string | null;
      }>
    | null;
};

export async function listScans(
  client: SupabaseClient,
  userId: string,
): Promise<Scan[]> {
  const { data, error } = await client
    .from("scans")
    .select(
      "id,created_at,status,reference,reference_question,model_version,corrected_scan_items(*),original_detections(presented_result),scan_images(storage_path,expires_at,deleted_at)",
    )
    .eq("user_id", userId)
    .is("deleted_at", null)
    .neq("status", "deleting")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) dbError(error, "list_scans");
  return Promise.all((data || []).map(toScan));
}
export async function loadScan(
  client: SupabaseClient,
  userId: string,
  id: string,
): Promise<Scan> {
  const { data, error } = await client
    .from("scans")
    .select(
      "id,created_at,status,reference,reference_question,model_version,corrected_scan_items(*),original_detections(presented_result),scan_images(storage_path,expires_at,deleted_at)",
    )
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) dbError(error, "load_scan");
  if (!data || data.status === "deleting")
    throw new ApiError(404, "not_found", "Scan not found.");
  return toScan(data);
}
async function toScan(row: ScanRow): Promise<Scan> {
  const detection = Array.isArray(row.original_detections)
    ? row.original_detections[0]
    : row.original_detections;
  const original = detection?.presented_result?.items || [];
  const corrected = (row.corrected_scan_items || []).map((x) => ({
    id: x.id,
    name: x.name,
    category: x.category,
    edible: x.edible,
    quantity_min: Number(x.quantity_min),
    quantity_max: Number(x.quantity_max),
    unit: x.unit,
    confidence: x.confidence,
    uncertainty: x.uncertainty,
    reason: x.reason,
    note: x.note,
  }));
  const image = Array.isArray(row.scan_images)
    ? row.scan_images[0]
    : row.scan_images;
  let image_url: string | null = null;
  if (
    image?.storage_path &&
    !image.deleted_at &&
    new Date(image.expires_at).getTime() > Date.now()
  ) {
    const { data, error } = await adminClient()
      .storage.from("scan-images")
      .createSignedUrl(image.storage_path, 300);
    if (!error) image_url = data.signedUrl;
  }
  return {
    id: row.id,
    created_at: row.created_at,
    status: row.status,
    items: (row.status === "review" ? original : corrected) as ScanItem[],
    reference: row.reference,
    reference_question: row.reference_question,
    image_url,
    model_version: row.model_version,
  };
}
export async function loadThread(
  client: SupabaseClient,
  userId: string,
  scanId: string,
): Promise<{
  threadId: string | null;
  messages: Message[];
  advice: CoachReply | null;
}> {
  const { data: thread, error } = await client
    .from("coaching_threads")
    .select("id")
    .eq("scan_id", scanId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) dbError(error, "load_thread");
  if (!thread) return { threadId: null, messages: [], advice: null };
  const { data: newestMessages, error: messageError } = await client
    .from("messages")
    .select("id,role,content,created_at")
    .eq("thread_id", thread.id)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (messageError) dbError(messageError, "load_messages");
  const messages = [...(newestMessages || [])].reverse();
  const lastAssistant = [...(messages || [])]
    .reverse()
    .find((x) => x.role === "assistant");
  let advice: CoachReply | null = null;
  if (lastAssistant) {
    try {
      advice = JSON.parse(lastAssistant.content) as CoachReply;
    } catch {
      advice = null;
    }
  }
  return {
    threadId: thread.id,
    messages: (messages || []).map((x) => ({
      ...x,
      content:
        x.role === "assistant"
          ? (JSON.parse(x.content) as CoachReply).breakdown
          : x.content,
    })) as Message[],
    advice,
  };
}
