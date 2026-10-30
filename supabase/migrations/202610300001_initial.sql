-- PlanB v1. All client writes go through authenticated, validated RPCs.
-- The private schema is deliberately not in Supabase's exposed-schema list.
create schema if not exists planb;
revoke all on schema planb from public, anon, authenticated;

create table planb.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 60),
  bio text not null default '' check (char_length(bio) <= 500),
  area text not null check (char_length(trim(area)) between 2 and 100),
  interests text[] not null check (cardinality(interests) between 1 and 6 and interests <@ array['Coffee','Food','Cinema','Sports','Walks','Events']::text[]),
  adult boolean not null check (adult = true)
);
create table planb.plans (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references planb.profiles(id),
  title text not null check (char_length(trim(title)) between 3 and 100),
  category text not null check (category in ('Coffee','Food','Cinema','Sports','Walks','Events')),
  starts_at timestamptz not null check (isfinite(starts_at)),
  duration_minutes integer not null check (duration_minutes between 15 and 1440),
  venue text not null check (char_length(trim(venue)) between 3 and 180),
  area text not null check (char_length(trim(area)) between 2 and 100),
  description text not null check (char_length(trim(description)) between 10 and 2000),
  capacity integer not null check (capacity between 1 and 20),
  cost numeric(8,2) not null check (cost between 0 and 1000),
  booking_held boolean not null default false,
  details text not null default '' check (char_length(details) <= 1000),
  cancelled boolean not null default false,
  created_at timestamptz not null default now()
);
create table planb.requests (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references planb.plans(id) on delete cascade,
  user_id uuid not null references planb.profiles(id),
  message text not null default '' check (char_length(message) <= 500),
  status text not null check (status in ('pending','accepted','declined','withdrawn')),
  created_at timestamptz not null default now(),
  unique(plan_id,user_id)
);
create table planb.messages (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references planb.plans(id) on delete cascade,
  user_id uuid not null references planb.profiles(id),
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create table planb.notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references planb.profiles(id),
  text text not null,
  plan_id uuid references planb.plans(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create table planb.availability (
  user_id uuid primary key references planb.profiles(id),
  starts_at timestamptz not null check (isfinite(starts_at)),
  ends_at timestamptz not null check (isfinite(ends_at) and ends_at > starts_at),
  area text not null check (char_length(trim(area)) between 2 and 100),
  interests text[] not null check (cardinality(interests) between 1 and 6 and interests <@ array['Coffee','Food','Cinema','Sports','Walks','Events']::text[])
);
create table planb.blocks (
  blocker_id uuid not null references planb.profiles(id),
  blocked_id uuid not null references planb.profiles(id),
  primary key(blocker_id,blocked_id),
  check (blocker_id <> blocked_id)
);
create table planb.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references planb.profiles(id),
  target_id uuid not null references planb.profiles(id),
  plan_id uuid references planb.plans(id),
  reason text not null check (char_length(trim(reason)) between 5 and 2000),
  created_at timestamptz not null default now(),
  check (reporter_id <> target_id)
);

-- Defence in depth: no direct table access, including read access. A narrowly
-- scoped SECURITY DEFINER snapshot masks venues and private records below.
alter table planb.profiles enable row level security;
alter table planb.plans enable row level security;
alter table planb.requests enable row level security;
alter table planb.messages enable row level security;
alter table planb.notices enable row level security;
alter table planb.availability enable row level security;
alter table planb.blocks enable row level security;
alter table planb.reports enable row level security;
create policy deny_direct on planb.profiles for all to authenticated using (false) with check (false);
create policy deny_direct on planb.plans for all to authenticated using (false) with check (false);
create policy deny_direct on planb.requests for all to authenticated using (false) with check (false);
create policy deny_direct on planb.messages for all to authenticated using (false) with check (false);
create policy deny_direct on planb.notices for all to authenticated using (false) with check (false);
create policy deny_direct on planb.availability for all to authenticated using (false) with check (false);
create policy deny_direct on planb.blocks for all to authenticated using (false) with check (false);
create policy deny_direct on planb.reports for all to authenticated using (false) with check (false);
revoke all on all tables in schema planb from public, anon, authenticated;

create index plans_time on planb.plans(starts_at);
create index requests_plan_status on planb.requests(plan_id,status);
create index requests_user on planb.requests(user_id);
create index messages_plan_time on planb.messages(plan_id,created_at);
create index notices_user_time on planb.notices(user_id,created_at);
create index blocks_reverse on planb.blocks(blocked_id,blocker_id);

create function planb.require_member() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'Sign in to continue.'; end if;
  if not exists (select 1 from planb.profiles where id = u and adult) then
    raise exception 'Complete your adult profile before continuing.';
  end if;
  return u;
end $$;
create function planb.blocked(a uuid,b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from planb.blocks where
    (blocker_id=a and blocked_id=b) or (blocker_id=b and blocked_id=a));
$$;
create function planb.member(p uuid,u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from planb.plans where id=p and host_id=u)
    or exists(select 1 from planb.requests where plan_id=p and user_id=u and status='accepted');
$$;
create function planb.conflicts(p uuid,u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from planb.plans where id=p and planb.blocked(host_id,u))
    or exists(select 1 from planb.requests where plan_id=p and status='accepted' and planb.blocked(user_id,u));
$$;

create function public.save_profile(p_profile jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'Sign in to continue.'; end if;
  if coalesce((p_profile->>'adult')::boolean,false) is not true then raise exception 'PlanB is for adults aged 18 and over.'; end if;
  insert into planb.profiles(id,name,bio,area,interests,adult)
  values(u,trim(p_profile->>'name'),coalesce(p_profile->>'bio',''),trim(p_profile->>'area'),
    coalesce(array(select jsonb_array_elements_text(p_profile->'interests')),array[]::text[]),true)
  on conflict(id) do update set name=excluded.name,bio=excluded.bio,area=excluded.area,interests=excluded.interests,adult=true;
end $$;

create function public.save_plan(p_input jsonb,p_id uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := planb.require_member();
  s timestamptz := (p_input->>'startsAt')::timestamptz;
  n integer := (p_input->>'capacity')::integer;
  c numeric := (p_input->>'cost')::numeric;
  result uuid;
  existing planb.plans;
begin
  perform pg_advisory_xact_lock(86452026);
  if s is null or not isfinite(s) or s <= now() then raise exception 'Choose a finite future start time.'; end if;
  if c is null or c < 0 or c > 1000 or c <> trunc(c,2) then raise exception 'Use a cost from £0 to £1,000 with at most two decimal places.'; end if;
  if p_id is null then
    insert into planb.plans(host_id,title,category,starts_at,duration_minutes,venue,area,description,capacity,cost,booking_held,details)
    values(u,trim(p_input->>'title'),p_input->>'category',s,(p_input->>'durationMinutes')::integer,
      trim(p_input->>'venue'),trim(p_input->>'area'),trim(p_input->>'description'),n,(p_input->>'cost')::numeric,
      (p_input->>'bookingHeld')::boolean,coalesce(p_input->>'details','')) returning id into result;
  else
    select * into existing from planb.plans where id=p_id for update;
    if not found or existing.host_id<>u then raise exception 'Only the host can edit this plan.'; end if;
    if existing.cancelled or existing.starts_at <= now() then raise exception 'This plan can no longer be edited.'; end if;
    if n < (select count(*) from planb.requests where plan_id=p_id and status='accepted') then raise exception 'Spaces cannot be fewer than confirmed guests.'; end if;
    update planb.plans set title=trim(p_input->>'title'),category=p_input->>'category',starts_at=s,
      duration_minutes=(p_input->>'durationMinutes')::integer,venue=trim(p_input->>'venue'),area=trim(p_input->>'area'),
      description=trim(p_input->>'description'),capacity=n,cost=(p_input->>'cost')::numeric,
      booking_held=(p_input->>'bookingHeld')::boolean,details=coalesce(p_input->>'details','') where id=p_id;
    insert into planb.notices(user_id,text,plan_id) select user_id,'The host updated “'||(p_input->>'title')||'”. Check the latest details.',p_id
      from planb.requests where plan_id=p_id and status in ('pending','accepted');
    result := p_id;
  end if;
  return result;
end $$;

create function public.request_join(p_plan_id uuid,p_message text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := planb.require_member(); p planb.plans; r planb.requests;
begin
  perform pg_advisory_xact_lock(86452026);
  select * into p from planb.plans where id=p_plan_id for update;
  if not found or p.cancelled or p.starts_at<=now() then raise exception 'This plan is no longer open.'; end if;
  if p.host_id=u then raise exception 'You already host this plan.'; end if;
  if planb.conflicts(p_plan_id,u) then raise exception 'This plan is unavailable because of a block.'; end if;
  if (select count(*) from planb.requests where plan_id=p_plan_id and status='accepted') >= p.capacity then raise exception 'This plan is full.'; end if;
  select * into r from planb.requests where plan_id=p_plan_id and user_id=u;
  if found and r.status in ('pending','accepted') then raise exception 'You already requested or joined this plan.'; end if;
  if char_length(coalesce(p_message,''))>500 then raise exception 'Keep your message to 500 characters.'; end if;
  insert into planb.requests(plan_id,user_id,message,status) values(p_plan_id,u,coalesce(p_message,''),'pending')
  on conflict(plan_id,user_id) do update set status='pending',message=excluded.message,created_at=now();
  insert into planb.notices(user_id,text,plan_id) values(p.host_id,'New request to join “'||p.title||'”.',p_plan_id);
end $$;

create function public.resolve_request(p_request_id uuid,p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := planb.require_member(); p planb.plans; r planb.requests;
begin
  perform pg_advisory_xact_lock(86452026);
  select * into r from planb.requests where id=p_request_id;
  if not found then raise exception 'Request not found.'; end if;
  select * into p from planb.plans where id=r.plan_id for update;
  if p.host_id<>u then raise exception 'Only the host can decide requests.'; end if;
  if r.status<>'pending' then raise exception 'This request has already been decided.'; end if;
  if p.cancelled or p.starts_at<=now() then raise exception 'This plan is no longer open.'; end if;
  if p_accept is null then raise exception 'Choose accept or decline.'; end if;
  if p_accept then
    if planb.conflicts(p.id,r.user_id) then raise exception 'This request is unavailable because of a block.'; end if;
    if (select count(*) from planb.requests where plan_id=p.id and status='accepted')>=p.capacity then raise exception 'This plan is full.'; end if;
  end if;
  update planb.requests set status=case when p_accept then 'accepted' else 'declined' end where id=r.id;
  insert into planb.notices(user_id,text,plan_id) values(r.user_id,
    case when p_accept then 'You have a confirmed place on “'||p.title||'”.' else 'Your request for “'||p.title||'” was declined.' end,p.id);
end $$;

create function public.cancel_plan(p_plan_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := planb.require_member(); p planb.plans;
begin
  perform pg_advisory_xact_lock(86452026);
  select * into p from planb.plans where id=p_plan_id for update;
  if not found or p.host_id<>u then raise exception 'Only the host can cancel this plan.'; end if;
  if p.cancelled then return; end if;
  if p.starts_at + make_interval(mins=>p.duration_minutes) <= now() then raise exception 'This plan has finished.'; end if;
  update planb.plans set cancelled=true where id=p.id;
  insert into planb.notices(user_id,text,plan_id) select user_id,'“'||p.title||'” was cancelled.',p.id
    from planb.requests where plan_id=p.id and status in ('pending','accepted');
  update planb.requests set status='withdrawn' where plan_id=p.id and status='pending';
end $$;

create function public.leave_plan(p_plan_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := planb.require_member(); p planb.plans;
begin
  perform pg_advisory_xact_lock(86452026);
  select * into p from planb.plans where id=p_plan_id for update;
  if not found then raise exception 'Plan not found.'; end if;
  if p.host_id=u then raise exception 'Hosts must cancel their plan instead.'; end if;
  update planb.requests set status='withdrawn' where plan_id=p.id and user_id=u and status in ('pending','accepted');
  if not found then raise exception 'No active membership to withdraw.'; end if;
  insert into planb.notices(user_id,text,plan_id) values(p.host_id,'A guest withdrew from “'||p.title||'”.',p.id);
end $$;

create function public.send_message(p_plan_id uuid,p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := planb.require_member(); p planb.plans;
begin
  perform pg_advisory_xact_lock(86452026);
  select * into p from planb.plans where id=p_plan_id;
  if not found or not planb.member(p_plan_id,u) then raise exception 'Only the host and confirmed guests can chat.'; end if;
  if p.cancelled or p.starts_at + make_interval(mins=>p.duration_minutes)<=now() then raise exception 'This chat is read-only because the plan has ended.'; end if;
  if planb.conflicts(p_plan_id,u) then raise exception 'Messaging is unavailable because of a block.'; end if;
  if p_body is null or char_length(trim(p_body)) not between 1 and 2000 then raise exception 'Write a message of 1–2000 characters.'; end if;
  insert into planb.messages(plan_id,user_id,body) values(p_plan_id,u,trim(p_body));
  insert into planb.notices(user_id,text,plan_id)
    select id,'New message in “'||p.title||'”.',p.id from planb.profiles
    where id<>u and planb.member(p.id,id);
end $$;

create function public.save_availability(p_input jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := planb.require_member(); s timestamptz := (p_input->>'startsAt')::timestamptz; e timestamptz := (p_input->>'endsAt')::timestamptz;
begin
  if e is null or not isfinite(e) or e<=now() or s is null or not isfinite(s) or e<=s or e-s>interval '7 days' then raise exception 'Choose an availability window ending in the future, up to seven days long.'; end if;
  insert into planb.availability(user_id,starts_at,ends_at,area,interests)
  values(u,s,e,trim(p_input->>'area'),array(select jsonb_array_elements_text(p_input->'interests')))
  on conflict(user_id) do update set starts_at=excluded.starts_at,ends_at=excluded.ends_at,area=excluded.area,interests=excluded.interests;
end $$;

create function public.block_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := planb.require_member(); p planb.plans; guest uuid;
begin
  perform pg_advisory_xact_lock(86452026);
  if p_user_id is null or p_user_id=u or not exists(select 1 from planb.profiles where id=p_user_id) then raise exception 'Choose another user to block.'; end if;
  insert into planb.blocks values(u,p_user_id) on conflict do nothing;
  -- Host/guest: guest loses membership. Two guests: blocker leaves the shared
  -- plan. This avoids giving guests a mechanism to eject another guest.
  for p in select * from planb.plans order by id for update loop
    if p.host_id=u then guest := p_user_id;
    elsif p.host_id=p_user_id then guest := u;
    elsif planb.member(p.id,u) and planb.member(p.id,p_user_id) then guest := u;
    else guest := null;
    end if;
    if guest is not null then
      update planb.requests set status='withdrawn' where plan_id=p.id and user_id=guest and status in ('pending','accepted');
      if found then
        insert into planb.notices(user_id,text,plan_id) values(guest,'Your membership of “'||p.title||'” ended following a block.',p.id);
      end if;
    end if;
    -- Pending guests must not later be accepted into a blocked group.
    with removed as (
      update planb.requests r set status='withdrawn'
      where r.plan_id=p.id and r.status='pending' and
        ((r.user_id=u and planb.member(p.id,p_user_id)) or (r.user_id=p_user_id and planb.member(p.id,u)))
      returning user_id
    ) insert into planb.notices(user_id,text,plan_id)
      select user_id,'Your request for “'||p.title||'” ended following a block.',p.id from removed;
  end loop;
end $$;

create function public.report_user(p_user_id uuid,p_plan_id uuid,p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := planb.require_member();
begin
  if p_user_id=u then raise exception 'Choose another user to report.'; end if;
  if p_plan_id is not null and not exists(select 1 from planb.plans where id=p_plan_id) then raise exception 'Plan not found.'; end if;
  insert into planb.reports(reporter_id,target_id,plan_id,reason) values(u,p_user_id,p_plan_id,trim(p_reason));
end $$;

create function public.mark_notices_read() returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := planb.require_member();
begin update planb.notices set read=true where user_id=u; end $$;

create function public.get_snapshot() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare u uuid := auth.uid(); result jsonb;
begin
  if u is null then raise exception 'Sign in to continue.'; end if;
  if not exists(select 1 from planb.profiles where id=u and adult) then
    return jsonb_build_object('profiles','[]'::jsonb,'plans','[]'::jsonb,'requests','[]'::jsonb,'messages','[]'::jsonb,'notices','[]'::jsonb,'availability','[]'::jsonb,'blocks','[]'::jsonb,'reports','[]'::jsonb);
  end if;
  select jsonb_build_object(
    'profiles',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'bio',bio,'area',area,'interests',interests,'adult',adult))
      from planb.profiles where id=u or not planb.blocked(u,id)),'[]'::jsonb),
    'plans',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'hostId',p.host_id,'title',p.title,'category',p.category,'startsAt',p.starts_at,
      'durationMinutes',p.duration_minutes,'venue',case when planb.member(p.id,u) then p.venue else '' end,
      'area',p.area,'description',p.description,'capacity',p.capacity,'cost',p.cost,'bookingHeld',p.booking_held,'details',p.details,'cancelled',p.cancelled,'createdAt',p.created_at))
      from planb.plans p where not planb.blocked(u,p.host_id)),'[]'::jsonb),
    -- Public accepted counts contain IDs needed for capacity; messages in join
    -- requests are private to that guest and the host. Other guest IDs are
    -- disclosed only after joining, otherwise use a per-request opaque ID.
    'requests',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'planId',r.plan_id,
      'userId',case when r.user_id=u or planb.member(r.plan_id,u) then r.user_id else r.id end,
      'message',case when r.user_id=u or p.host_id=u then r.message else '' end,
      'status',r.status,'createdAt',r.created_at))
      from planb.requests r join planb.plans p on p.id=r.plan_id
      where not planb.blocked(u,p.host_id) and (r.status='accepted' or r.user_id=u or p.host_id=u)),'[]'::jsonb),
    'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'planId',m.plan_id,'userId',m.user_id,'body',m.body,'createdAt',m.created_at) order by m.created_at)
      from planb.messages m where planb.member(m.plan_id,u) and not planb.blocked(u,m.user_id)),'[]'::jsonb),
    'notices',coalesce((select jsonb_agg(jsonb_build_object('id',id,'userId',user_id,'text',text,'planId',plan_id,'read',read,'createdAt',created_at) order by created_at desc)
      from planb.notices where user_id=u),'[]'::jsonb),
    'availability',coalesce((select jsonb_agg(jsonb_build_object('userId',user_id,'startsAt',starts_at,'endsAt',ends_at,'area',area,'interests',interests))
      from planb.availability where user_id=u and ends_at>now()),'[]'::jsonb),
    'blocks',coalesce((select jsonb_agg(jsonb_build_object('blockerId',blocker_id,'blockedId',blocked_id))
      from planb.blocks where blocker_id=u),'[]'::jsonb),
    'reports',coalesce((select jsonb_agg(jsonb_build_object('id',id,'reporterId',reporter_id,'targetId',target_id,'planId',plan_id,'reason',reason,'createdAt',created_at))
      from planb.reports where reporter_id=u),'[]'::jsonb)
  ) into result;
  return result;
end $$;

-- Function defaults would grant EXECUTE to PUBLIC. Explicitly remove it from
-- private helpers and each public RPC, granting only the authenticated role.
revoke all on all functions in schema planb from public, anon, authenticated;
revoke all on function public.save_profile(jsonb) from public, anon;
revoke all on function public.save_plan(jsonb,uuid) from public, anon;
revoke all on function public.request_join(uuid,text) from public, anon;
revoke all on function public.resolve_request(uuid,boolean) from public, anon;
revoke all on function public.cancel_plan(uuid) from public, anon;
revoke all on function public.leave_plan(uuid) from public, anon;
revoke all on function public.send_message(uuid,text) from public, anon;
revoke all on function public.save_availability(jsonb) from public, anon;
revoke all on function public.block_user(uuid) from public, anon;
revoke all on function public.report_user(uuid,uuid,text) from public, anon;
revoke all on function public.mark_notices_read() from public, anon;
revoke all on function public.get_snapshot() from public, anon;
grant execute on function public.save_profile(jsonb), public.save_plan(jsonb,uuid),public.request_join(uuid,text),public.resolve_request(uuid,boolean),
  public.cancel_plan(uuid),public.leave_plan(uuid),public.send_message(uuid,text),public.save_availability(jsonb),public.block_user(uuid),
  public.report_user(uuid,uuid,text),public.mark_notices_read(),public.get_snapshot() to authenticated;
