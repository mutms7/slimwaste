import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const scan = "33333333-3333-4333-8333-333333333333";
const food = {
  id: "44444444-4444-4444-8444-444444444444",
  name: "Spinach",
  category: "produce",
  edible: "edible",
  quantity_min: 150,
  quantity_max: 250,
  unit: "g",
  confidence: "low",
  uncertainty: "No reference.",
  reason: "spoiled",
  note: "Shared fridge",
};
let db: PGlite;
async function login(id: string) {
  await db.exec(
    `reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`,
  );
}
describe("actual migration in PostgreSQL", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated,anon,service_role;
      grant execute on function auth.uid() to authenticated,anon,service_role;
      create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
      grant usage on schema storage to authenticated,anon,service_role;
      grant select on storage.objects to authenticated,anon;
      alter default privileges in schema public grant all on tables to authenticated,anon,service_role;`);
    const migration = readFileSync(
      "supabase/migrations/202609280001_initial.sql",
      "utf8",
    ).replace("create extension if not exists pgcrypto;", "");
    await db.exec(migration);
    await db.query("insert into auth.users(id) values ($1),($2)", [alice, bob]);
    await db.query(
      "insert into public.scans(id,user_id,model_version) values ($1,$2,'test-model')",
      [scan, alice],
    );
    await db.query(
      "insert into public.original_detections(scan_id,user_id,result,presented_result,model_version) values ($1,$2,$3,$3,'test-model')",
      [scan, alice, JSON.stringify({ items: [food], reference_question: "" })],
    );
    await db.query(
      "insert into storage.objects(bucket_id,name) values ('scan-images',$1)",
      [`${alice}/${scan}/display.jpg`],
    );
    await db.query(
      "insert into public.scan_images(user_id,scan_id,storage_path,width,height,mime_type,expires_at) values($1,$2,$3,100,100,'image/jpeg',now()+interval '30 days')",
      [alice, scan, `${alice}/${scan}/display.jpg`],
    );
  }, 30000);
  afterAll(async () => {
    await db?.close();
  });
  it("denies another account and anonymous readers", async () => {
    await login(bob);
    expect((await db.query("select id from public.scans")).rows).toHaveLength(
      0,
    );
    expect(
      (await db.query("select * from public.original_detections")).rows,
    ).toHaveLength(0);
    expect((await db.query("select * from storage.objects")).rows).toHaveLength(
      0,
    );
    await db.exec("reset role; set role anon;");
    expect((await db.query("select id from public.scans")).rows).toHaveLength(
      0,
    );
  });
  it("shows the owner only their private image and scan", async () => {
    await login(alice);
    expect((await db.query("select id from public.scans")).rows).toHaveLength(
      1,
    );
    expect((await db.query("select * from storage.objects")).rows).toHaveLength(
      1,
    );
  });
  it("saves corrections and labelled snapshot atomically without replacing original detections", async () => {
    await login(alice);
    const corrected = {
      ...food,
      name: "Kale",
      quantity_min: 50,
      quantity_max: 100,
    };
    await db.query("select public.replace_scan_corrections($1,$2::jsonb,$3)", [
      scan,
      JSON.stringify([corrected]),
      "Small bowl",
    ]);
    expect(
      (
        await db.query<{ name: string }>(
          "select name from public.corrected_scan_items",
        )
      ).rows[0].name,
    ).toBe("Kale");
    expect(
      (
        await db.query<{ result: { items: Array<{ name: string }> } }>(
          "select result from public.original_detections",
        )
      ).rows[0].result.items[0].name,
    ).toBe("Spinach");
    expect(
      (await db.query("select * from public.correction_snapshots")).rows,
    ).toHaveLength(1);
    await expect(
      db.query("select public.replace_scan_corrections($1,$2::jsonb,$3)", [
        scan,
        JSON.stringify([
          { ...corrected, quantity_min: 200, quantity_max: 100 },
        ]),
        "invalid",
      ]),
    ).rejects.toThrow();
    expect(
      (
        await db.query<{ name: string }>(
          "select name from public.corrected_scan_items",
        )
      ).rows[0].name,
    ).toBe("Kale");
    expect(
      (await db.query("select * from public.correction_snapshots")).rows,
    ).toHaveLength(1);
  });
  it("rejects cross-account correction RPC calls", async () => {
    await login(bob);
    await expect(
      db.query("select public.replace_scan_corrections($1,$2::jsonb,$3)", [
        scan,
        "[]",
        "attack",
      ]),
    ).rejects.toThrow();
  });
  it("blocks direct lifecycle tampering and forged model records", async () => {
    await login(alice);
    const updated = await db.query(
      "update public.scans set model_version='forged' where id=$1 returning id",
      [scan],
    );
    expect(updated.rows).toHaveLength(0);
    await expect(
      db.query(
        "insert into public.coaching_threads(scan_id,user_id) values($1,$2)",
        [scan, alice],
      ),
    ).rejects.toThrow();
    await expect(
      db.query("select public.consume_rate_limit($1,1,60)", ["bypass"]),
    ).rejects.toThrow();
  });
  it("counts server rate limits durably", async () => {
    await db.exec("reset role; set role service_role;");
    expect(
      (
        await db.query<{ consume_rate_limit: boolean }>(
          "select public.consume_rate_limit('test-hash',1,60)",
        )
      ).rows[0].consume_rate_limit,
    ).toBe(true);
    expect(
      (
        await db.query<{ consume_rate_limit: boolean }>(
          "select public.consume_rate_limit('test-hash',1,60)",
        )
      ).rows[0].consume_rate_limit,
    ).toBe(false);
  });
  it("invalidates advice when corrected items change and rejects a stale provider response", async () => {
    const reply = JSON.stringify({
      breakdown: "Use the smaller bag.",
      actions: [{ title: "Smaller bag", detail: "One planned meal." }],
    });
    await db.exec("reset role; set role service_role;");
    await db.query(
      "select public.persist_coaching_reply($1,$2,1,$3,$4::jsonb)",
      [scan, alice, "", reply],
    );
    await login(alice);
    expect((await db.query("select * from public.messages")).rows).toHaveLength(
      1,
    );
    await db.query("select public.replace_scan_corrections($1,$2::jsonb,$3)", [
      scan,
      JSON.stringify([food]),
      "New review",
    ]);
    expect((await db.query("select * from public.messages")).rows).toHaveLength(
      0,
    );
    await db.exec("reset role; set role service_role;");
    await expect(
      db.query("select public.persist_coaching_reply($1,$2,1,$3,$4::jsonb)", [
        scan,
        alice,
        "",
        reply,
      ]),
    ).rejects.toThrow("correction changed");
  });
  it("revokes direct storage reads after photo expiry", async () => {
    await db.exec("reset role;");
    await db.query(
      "update public.scan_images set expires_at=now()-interval '1 day' where scan_id=$1",
      [scan],
    );
    await login(alice);
    expect((await db.query("select * from storage.objects")).rows).toHaveLength(
      0,
    );
  });
  it("deletes private text atomically while retaining an image cleanup job", async () => {
    await db.exec("reset role; set role service_role;");
    await db.query("select public.queue_scan_deletion($1,$2)", [scan, alice]);
    expect((await db.query("select * from public.scans")).rows).toHaveLength(0);
    expect(
      (await db.query("select * from public.original_detections")).rows,
    ).toHaveLength(0);
    expect(
      (await db.query("select * from public.correction_snapshots")).rows,
    ).toHaveLength(0);
    expect(
      (await db.query("select * from public.corrected_scan_items")).rows,
    ).toHaveLength(0);
    expect(
      (await db.query("select * from public.deletion_queue")).rows,
    ).toHaveLength(1);
    expect(
      (
        await db.query<{ scan_count: number }>(
          "select scan_count from public.weekly_aggregates",
        )
      ).rows[0].scan_count,
    ).toBe(0);
    await login(alice);
    expect((await db.query("select * from storage.objects")).rows).toHaveLength(
      0,
    );
  });
});
