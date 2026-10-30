-- Run after the migration. All fixture data and helper functions roll back.
-- On a real local Supabase database: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/integration.sql
begin;
create function pg_temp.assert_true(p_value boolean, p_label text) returns void language plpgsql as $$
begin
  if p_value is distinct from true then raise exception 'FAIL: %', p_label; end if;
  raise notice 'PASS: %', p_label;
end; $$;
create function pg_temp.expect_error(p_sql text, p_label text) returns void language plpgsql as $$
declare failed boolean := false;
begin
  begin execute p_sql; exception when others then failed := true; end;
  perform pg_temp.assert_true(failed, p_label);
end; $$;

insert into auth.users(id, email) values
 ('00000000-0000-4000-8000-000000000001', 'host@planb.example'),
 ('00000000-0000-4000-8000-000000000002', 'guest@planb.example'),
 ('00000000-0000-4000-8000-000000000003', 'other@planb.example'),
 ('00000000-0000-4000-8000-000000000004', 'host2@planb.example');
create temp table test_context (label text primary key, id uuid);
grant all on test_context to authenticated;

select pg_temp.assert_true(
 not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='planb' and c.relkind='r' and not c.relrowsecurity),
 'every application table has RLS enabled');

set local role anon;
select pg_temp.expect_error('select public.get_snapshot()', 'anonymous users cannot retrieve member data');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select pg_temp.expect_error($q$select public.save_profile('{"name":"Too young","adult":false,"bio":"","area":"Newcastle","interests":["Coffee"]}'::jsonb)$q$, 'adult eligibility required');
select public.save_profile('{"name":"Sam","adult":true,"bio":"Coffee and walks","area":"Newcastle","interests":["Coffee","Walks"]}');
select pg_temp.expect_error($q$select public.save_plan(jsonb_build_object('title','Past coffee','category','Coffee','startsAt',now()-interval '1 hour','durationMinutes',60,'venue','Public cafe','area','Newcastle','description','A public meet-up','capacity',1,'cost',0,'bookingHeld',false,'details',''))$q$, 'plans cannot start in the past');
select pg_temp.expect_error($q$select public.save_plan(jsonb_build_object('title','Infinite coffee','category','Coffee','startsAt','infinity','durationMinutes',60,'venue','Public cafe','area','Newcastle','description','A public meet-up','capacity',1,'cost',0,'bookingHeld',false,'details',''))$q$, 'plans reject infinite start times');
insert into test_context select 'capacity', public.save_plan(jsonb_build_object('title','Coffee and company','category','Coffee','startsAt',now()+interval '2 days','durationMinutes',60,'venue','Laneway Coffee','area','Newcastle','description','Coffee in a public cafe','capacity',1,'cost',3.50,'bookingHeld',false,'details','A chat over a brew'));
select pg_temp.assert_true((public.get_snapshot()->'plans'->0->>'venue')='Laneway Coffee', 'host can see meeting venue');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select public.save_profile('{"name":"Alex","adult":true,"bio":"New to town","area":"Newcastle","interests":["Coffee"]}');
select pg_temp.assert_true((public.get_snapshot()->'plans'->0->>'venue')='', 'nonparticipants cannot see detailed meeting venue');
select pg_temp.expect_error('select * from planb.profiles', 'raw profile table is inaccessible to authenticated clients');
select pg_temp.expect_error(format('select public.send_message(%L, %L)', (select id from test_context where label='capacity'), 'Not yet a member'), 'nonmembers cannot send chat');
select public.request_join((select id from test_context where label='capacity'), 'Would love to join');
select pg_temp.expect_error(format('select public.request_join(%L, %L)', (select id from test_context where label='capacity'), 'Duplicate'), 'duplicate active requests rejected');
select pg_temp.assert_true(jsonb_array_length(public.get_snapshot()->'messages')=0, 'pending guest cannot read group chat');
insert into test_context select 'guest_request', (r->>'id')::uuid from jsonb_array_elements(public.get_snapshot()->'requests') r where r->>'userId'='00000000-0000-4000-8000-000000000002';
select pg_temp.expect_error(format('select public.resolve_request(%L,true)', (select id from test_context where label='guest_request')), 'only host may accept a request');
select pg_temp.expect_error(format('select public.cancel_plan(%L)', (select id from test_context where label='capacity')), 'only host may cancel a plan');
select pg_temp.expect_error($q$select public.save_availability(jsonb_build_object('startsAt',now()-interval '2 hours','endsAt',now()-interval '1 hour','area','Newcastle','interests',jsonb_build_array('Coffee')))$q$, 'expired availability cannot be saved');
select pg_temp.expect_error($q$select public.save_availability(jsonb_build_object('startsAt','infinity','endsAt','infinity','area','Newcastle','interests',jsonb_build_array('Coffee')))$q$, 'availability rejects infinite timestamps');
select pg_temp.expect_error($q$select public.save_availability(jsonb_build_object('startsAt','-infinity','endsAt',now()+interval '4 hours','area','Newcastle','interests',jsonb_build_array('Coffee')))$q$, 'availability rejects negative-infinite starts');
select public.save_availability(jsonb_build_object('startsAt',now(),'endsAt',now()+interval '4 hours','area','Newcastle','interests',jsonb_build_array('Coffee')));
select pg_temp.assert_true(jsonb_array_length(public.get_snapshot()->'availability')=1, 'own active availability is returned');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
select public.save_profile('{"name":"Robin","adult":true,"bio":"Walking and coffee","area":"Gateshead","interests":["Coffee","Walks"]}');
select public.request_join((select id from test_context where label='capacity'), 'Another guest');
insert into test_context select 'other_request', (r->>'id')::uuid from jsonb_array_elements(public.get_snapshot()->'requests') r where r->>'userId'='00000000-0000-4000-8000-000000000003';
select pg_temp.assert_true(jsonb_array_length(public.get_snapshot()->'availability')=0, 'availability is private to its owner');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select public.resolve_request((select id from test_context where label='guest_request'),true);
select pg_temp.expect_error(format('select public.resolve_request(%L,true)', (select id from test_context where label='other_request')), 'accept cannot exceed plan capacity');
select pg_temp.assert_true((select count(*)=1 from jsonb_array_elements(public.get_snapshot()->'requests') r where r->>'status'='accepted'), 'exactly one place was allocated');
select public.send_message((select id from test_context where label='capacity'), 'Welcome to the group');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select pg_temp.assert_true((public.get_snapshot()->'plans'->0->>'venue')='Laneway Coffee', 'accepted participant can see meeting venue');
select pg_temp.assert_true(jsonb_array_length(public.get_snapshot()->'messages')=1, 'accepted participant can read chat');
select pg_temp.assert_true(jsonb_array_length(public.get_snapshot()->'notices')>0, 'acceptance creates an in-app notice');
select public.send_message((select id from test_context where label='capacity'), 'See you there');
select public.leave_plan((select id from test_context where label='capacity'));
select pg_temp.expect_error(format('select public.send_message(%L, %L)', (select id from test_context where label='capacity'), 'Access revoked'), 'leaving revokes chat write access');
select pg_temp.assert_true(jsonb_array_length(public.get_snapshot()->'messages')=0, 'leaving revokes historical chat read access');
select public.request_join((select id from test_context where label='capacity'), 'Please rejoin');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select public.resolve_request((select id from test_context where label='guest_request'),true);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select public.block_user('00000000-0000-4000-8000-000000000001');
select pg_temp.expect_error(format('select public.request_join(%L, %L)', (select id from test_context where label='capacity'), 'Blocked host'), 'blocked pairs cannot send new join requests');
select pg_temp.expect_error(format('select public.send_message(%L, %L)', (select id from test_context where label='capacity'), 'Blocked chat'), 'blocking removes shared chat access');
select public.report_user('00000000-0000-4000-8000-000000000001', (select id from test_context where label='capacity'), 'Uncomfortable messages');
select pg_temp.assert_true(jsonb_array_length(public.get_snapshot()->'reports')=1, 'reports are persisted for reporter');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select pg_temp.assert_true(jsonb_array_length(public.get_snapshot()->'reports')=0, 'reported user cannot read report');
select public.cancel_plan((select id from test_context where label='capacity'));
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
select pg_temp.expect_error(format('select public.request_join(%L, %L)', (select id from test_context where label='capacity'), 'Cancelled plan'), 'cancelled plans reject requests');

reset role;
-- Move time behind an availability record to exercise expiry on reads without a sleep.
update planb.availability set starts_at=now()-interval '2 hours', ends_at=now()-interval '1 hour'
 where user_id='00000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select pg_temp.assert_true(jsonb_array_length(public.get_snapshot()->'availability')=0, 'expired availability automatically disappears from reads');

-- Blocking another guest removes the blocker, never lets a guest eject someone else.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
select public.save_profile('{"name":"Jo","adult":true,"bio":"Cinema club","area":"Gateshead","interests":["Cinema"]}');
insert into test_context select 'group', public.save_plan(jsonb_build_object('title','Film afternoon','category','Cinema','startsAt',now()+interval '3 days','durationMinutes',120,'venue','Tyneside Cinema','area','Newcastle','description','A film and a friendly chat','capacity',2,'cost',10,'bookingHeld',true,'details','Meet in the foyer'));
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select public.request_join((select id from test_context where label='group'), 'Cinema sounds good');
insert into test_context select 'group_guest', (r->>'id')::uuid from jsonb_array_elements(public.get_snapshot()->'requests') r where r->>'planId'=(select id::text from test_context where label='group') and r->>'userId'='00000000-0000-4000-8000-000000000002';
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
select public.request_join((select id from test_context where label='group'), 'Love a film');
insert into test_context select 'group_other', (r->>'id')::uuid from jsonb_array_elements(public.get_snapshot()->'requests') r where r->>'planId'=(select id::text from test_context where label='group') and r->>'userId'='00000000-0000-4000-8000-000000000003';
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
select public.resolve_request((select id from test_context where label='group_guest'), true);
select public.resolve_request((select id from test_context where label='group_other'), true);
select public.send_message((select id from test_context where label='group'), 'See you at the cinema');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select public.block_user('00000000-0000-4000-8000-000000000003');
select pg_temp.assert_true(jsonb_array_length(public.get_snapshot()->'messages')=0, 'blocking a co-guest revokes blocker chat membership');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
select public.send_message((select id from test_context where label='group'), 'Still attending');
select pg_temp.assert_true(jsonb_array_length(public.get_snapshot()->'messages')=2, 'a guest cannot eject another guest by blocking them');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
select public.cancel_plan((select id from test_context where label='group'));
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
select pg_temp.expect_error(format('select public.send_message(%L, %L)', (select id from test_context where label='group'), 'Cancelled chat'), 'cancelled plans have read-only chat');
select pg_temp.assert_true(jsonb_array_length(public.get_snapshot()->'messages')=2, 'cancellation retains chat history for existing members');
select public.leave_plan((select id from test_context where label='group'));
select pg_temp.assert_true(jsonb_array_length(public.get_snapshot()->'messages')=0, 'leaving a cancelled plan revokes chat history access');
rollback;
