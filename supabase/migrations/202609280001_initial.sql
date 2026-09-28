create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  household text not null default '' check (length(household)<=200), cooking_access text not null default '' check (length(cooking_access)<=200), grocery_cadence text not null default '' check (length(grocery_cadence)<=200),
  budget_preference text not null default '' check (length(budget_preference)<=200), dietary_restrictions text not null default '' check (length(dietary_restrictions)<=500), evaluation_consent boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.scans (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'review' check (status in ('review','corrected','deleting')),
  reference text not null default '' check (length(reference)<=300), reference_question text not null default '' check (length(reference_question)<=300), model_version text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create index scans_user_created on public.scans(user_id, created_at desc) where deleted_at is null;
create table public.scan_images (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid not null unique references public.scans(id) on delete cascade,
  storage_path text not null unique, width integer not null, height integer not null, mime_type text not null,
  created_at timestamptz not null default now(), expires_at timestamptz not null, deleted_at timestamptz
);
create index scan_images_expiry on public.scan_images(expires_at) where deleted_at is null;
create table public.original_detections (
  scan_id uuid primary key references public.scans(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
  result jsonb not null, presented_result jsonb not null, model_version text not null, created_at timestamptz not null default now()
);
create table public.corrected_scan_items (
  scan_id uuid not null references public.scans(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null, name text not null check (length(trim(name)) between 1 and 80),
  category text not null check (category in ('produce','bread-and-grains','protein','dairy','prepared-food','other')),
  edible text not null check (edible in ('edible','inedible','uncertain')),
  quantity_min numeric not null check (quantity_min >= 0 and quantity_min <= 10000), quantity_max numeric not null check (quantity_max > quantity_min and quantity_max <= 10000),
  unit text not null check (unit in ('g','pieces','bowls','cups','slices')),
  confidence text not null check (confidence in ('low','medium','high')),
  uncertainty text not null check (length(uncertainty) between 1 and 300),
  reason text not null check (reason in ('spoiled','leftover','over-portioned','disliked','unavoidable','unsure')),
  note text not null default '' check (length(note)<=500),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key (scan_id,id)
);
create table public.correction_snapshots (
  id uuid primary key default gen_random_uuid(), scan_id uuid not null references public.scans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, revision integer not null, items jsonb not null,
  reference text not null, created_at timestamptz not null default now(), unique(scan_id,revision)
);
create table public.coaching_threads (
  id uuid primary key default gen_random_uuid(), scan_id uuid not null unique references public.scans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.messages (
  id uuid primary key default gen_random_uuid(), thread_id uuid not null references public.coaching_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, role text not null check (role in ('user','assistant')),
  content text not null, created_at timestamptz not null default now()
);
create index messages_thread_created on public.messages(thread_id,created_at);
create table public.action_suggestions (
  id uuid primary key default gen_random_uuid(), thread_id uuid not null references public.coaching_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, title text not null, detail text not null,
  created_at timestamptz not null default now()
);
create table public.user_feedback (
  id uuid primary key default gen_random_uuid(), scan_id uuid not null references public.scans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, helpful boolean not null, note text not null default '',
  created_at timestamptz not null default now()
);
create table public.weekly_aggregates (
  user_id uuid not null references auth.users(id) on delete cascade, week_start date not null,
  scan_count integer not null default 0, item_count integer not null default 0, categories jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(), primary key (user_id, week_start)
);
create table public.rate_limits (
  key_hash text primary key, window_start timestamptz not null, hits integer not null
);
create table public.deletion_queue (
  id uuid primary key default gen_random_uuid(), storage_path text not null unique, user_id uuid not null,
  attempts integer not null default 0, next_attempt_at timestamptz not null default now(), created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.scans enable row level security;
alter table public.scan_images enable row level security;
alter table public.original_detections enable row level security;
alter table public.corrected_scan_items enable row level security;
alter table public.correction_snapshots enable row level security;
alter table public.coaching_threads enable row level security;
alter table public.messages enable row level security;
alter table public.action_suggestions enable row level security;
alter table public.user_feedback enable row level security;
alter table public.weekly_aggregates enable row level security;
alter table public.rate_limits enable row level security;
alter table public.deletion_queue enable row level security;

create policy own_profile on public.profiles for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy own_scans on public.scans for select to authenticated using (user_id = (select auth.uid()));
create policy own_images on public.scan_images for select to authenticated using (user_id = (select auth.uid()));
create policy own_detections on public.original_detections for select to authenticated using (user_id = (select auth.uid()));
create policy own_items on public.corrected_scan_items for select to authenticated using (user_id = (select auth.uid()));
create policy own_snapshots on public.correction_snapshots for select to authenticated using (user_id = (select auth.uid()));
create policy own_threads on public.coaching_threads for select to authenticated using (user_id = (select auth.uid()));
create policy own_messages on public.messages for select to authenticated using (user_id = (select auth.uid()));
create policy own_actions on public.action_suggestions for select to authenticated using (user_id = (select auth.uid()));
create policy own_feedback on public.user_feedback for select to authenticated using (user_id = (select auth.uid()));
create policy own_aggregates on public.weekly_aggregates for select to authenticated using (user_id = (select auth.uid()));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('scan-images','scan-images',false,4194304,array['image/jpeg']) on conflict (id) do update set public=false,file_size_limit=4194304,allowed_mime_types=array['image/jpeg'];
create policy read_own_scan_images on storage.objects for select to authenticated using (
  bucket_id='scan-images' and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists(select 1 from public.scan_images i join public.scans s on s.id=i.scan_id
    where i.storage_path=name and i.user_id=(select auth.uid()) and i.deleted_at is null and i.expires_at > now() and s.deleted_at is null)
);

create or replace function public.consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then raise exception 'invalid limit'; end if;
  insert into public.rate_limits(key_hash,window_start,hits) values (p_key, now(), 1)
  on conflict (key_hash) do update set
    window_start = case when public.rate_limits.window_start <= now() - make_interval(secs => p_window_seconds) then now() else public.rate_limits.window_start end,
    hits = case when public.rate_limits.window_start <= now() - make_interval(secs => p_window_seconds) then 1 else public.rate_limits.hits + 1 end
  returning hits into n;
  return n <= p_limit;
end $$;
revoke all on function public.consume_rate_limit(text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer) to service_role;

create or replace function public.refresh_weekly_aggregate(p_user_id uuid,p_week date)
returns void language plpgsql security definer set search_path = public as $$
declare scans_n integer; items_n integer; category_counts jsonb;
begin
  select count(*) into scans_n from public.scans s where s.user_id=p_user_id and s.status='corrected' and s.deleted_at is null and date_trunc('week',s.created_at at time zone 'UTC')::date=p_week;
  select count(*) into items_n from public.corrected_scan_items i join public.scans s on s.id=i.scan_id
    where s.user_id=p_user_id and s.status='corrected' and s.deleted_at is null and date_trunc('week',s.created_at at time zone 'UTC')::date=p_week;
  select coalesce(jsonb_object_agg(category,n),'{}'::jsonb) into category_counts from (
    select i.category,count(*) n from public.corrected_scan_items i join public.scans s on s.id=i.scan_id
    where s.user_id=p_user_id and s.status='corrected' and s.deleted_at is null and date_trunc('week',s.created_at at time zone 'UTC')::date=p_week group by i.category
  ) counts;
  insert into public.weekly_aggregates(user_id,week_start,scan_count,item_count,categories)
  values(p_user_id,p_week,scans_n,items_n,category_counts)
  on conflict(user_id,week_start) do update set scan_count=excluded.scan_count,item_count=excluded.item_count,categories=excluded.categories,updated_at=now();
end $$;
revoke all on function public.refresh_weekly_aggregate(uuid,date) from public, anon, authenticated;
grant execute on function public.refresh_weekly_aggregate(uuid,date) to service_role;

create or replace function public.replace_scan_corrections(p_scan_id uuid,p_items jsonb,p_reference text)
returns void language plpgsql security definer set search_path = public as $$
declare owner_id uuid; next_revision integer; scan_week date;
begin
  select user_id,date_trunc('week',created_at at time zone 'UTC')::date into owner_id,scan_week from public.scans where id=p_scan_id and deleted_at is null and status <> 'deleting' for update;
  if owner_id is null or owner_id <> auth.uid() then raise exception 'scan not found' using errcode='42501'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 20 or length(p_reference) > 300 then raise exception 'invalid items'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) x where
    jsonb_typeof(x) <> 'object' or x->>'name' is null or length(x->>'name') > 80 or
    x->>'category' not in ('produce','bread-and-grains','protein','dairy','prepared-food','other') or
    x->>'edible' not in ('edible','inedible','uncertain') or
    x->>'unit' not in ('g','pieces','bowls','cups','slices') or
    x->>'confidence' not in ('low','medium','high') or
    x->>'reason' not in ('spoiled','leftover','over-portioned','disliked','unavoidable','unsure') or
    length(x->>'uncertainty') > 300 or length(x->>'note') > 500
  ) then raise exception 'invalid item'; end if;
  select coalesce(max(revision),0)+1 into next_revision from public.correction_snapshots where scan_id=p_scan_id;
  insert into public.correction_snapshots(scan_id,user_id,revision,items,reference) values (p_scan_id,owner_id,next_revision,p_items,p_reference);
  delete from public.corrected_scan_items where scan_id=p_scan_id;
  insert into public.corrected_scan_items(scan_id,user_id,id,name,category,edible,quantity_min,quantity_max,unit,confidence,uncertainty,reason,note)
  select p_scan_id,owner_id,(x->>'id')::uuid,x->>'name',x->>'category',x->>'edible',(x->>'quantity_min')::numeric,(x->>'quantity_max')::numeric,x->>'unit',x->>'confidence',x->>'uncertainty',x->>'reason',x->>'note'
  from jsonb_array_elements(p_items) x;
  update public.scans set status='corrected',reference=p_reference,updated_at=now() where id=p_scan_id;
  delete from public.coaching_threads where scan_id=p_scan_id;
  perform public.refresh_weekly_aggregate(owner_id,scan_week);
end $$;
revoke all on function public.replace_scan_corrections(uuid,jsonb,text) from public, anon;
grant execute on function public.replace_scan_corrections(uuid,jsonb,text) to authenticated;

create or replace function public.queue_scan_deletion(p_scan_id uuid,p_user_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare image_path text; scan_week date;
begin
  select date_trunc('week',created_at at time zone 'UTC')::date into scan_week from public.scans where id=p_scan_id and user_id=p_user_id and deleted_at is null for update;
  if scan_week is null then
    raise exception 'scan not found' using errcode='42501';
  end if;
  select storage_path into image_path from public.scan_images where scan_id=p_scan_id;
  if image_path is not null then
    insert into public.deletion_queue(storage_path,user_id) values(image_path,p_user_id)
    on conflict(storage_path) do nothing;
  end if;
  delete from public.scans where id=p_scan_id and user_id=p_user_id;
  perform public.refresh_weekly_aggregate(p_user_id,scan_week);
  return image_path;
end $$;
revoke all on function public.queue_scan_deletion(uuid,uuid) from public, anon, authenticated;
grant execute on function public.queue_scan_deletion(uuid,uuid) to service_role;

create or replace function public.persist_coaching_reply(p_scan_id uuid,p_user_id uuid,p_revision integer,p_question text,p_reply jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare current_revision integer; thread_id uuid;
begin
  perform 1 from public.scans where id=p_scan_id and user_id=p_user_id and status='corrected' and deleted_at is null for update;
  if not found then raise exception 'scan unavailable' using errcode='40001'; end if;
  select max(revision) into current_revision from public.correction_snapshots where scan_id=p_scan_id;
  if current_revision is distinct from p_revision then raise exception 'correction changed' using errcode='40001'; end if;
  insert into public.coaching_threads(scan_id,user_id) values(p_scan_id,p_user_id)
  on conflict(scan_id) do update set updated_at=now() returning id into thread_id;
  if length(trim(p_question)) > 0 then
    insert into public.messages(thread_id,user_id,role,content) values(thread_id,p_user_id,'user',trim(p_question));
  end if;
  insert into public.messages(thread_id,user_id,role,content,created_at) values(thread_id,p_user_id,'assistant',p_reply::text,now()+interval '1 millisecond');
  insert into public.action_suggestions(thread_id,user_id,title,detail)
  select thread_id,p_user_id,x->>'title',x->>'detail' from jsonb_array_elements(p_reply->'actions') x;
end $$;
revoke all on function public.persist_coaching_reply(uuid,uuid,integer,text,jsonb) from public, anon, authenticated;
grant execute on function public.persist_coaching_reply(uuid,uuid,integer,text,jsonb) to service_role;
