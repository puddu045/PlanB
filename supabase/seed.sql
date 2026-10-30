-- Optional fixtures for a private development Supabase project only.
-- Create two email/password test users through Auth first. Then:
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v host_id='HOST_AUTH_USER_UUID' -v guest_id='GUEST_AUTH_USER_UUID' -f supabase/seed.sql
-- DATABASE_URL is a server-only connection string, never an EXPO_PUBLIC_* value.
-- Distinct, existing auth.users IDs are mandatory. No passwords or real identities are seeded.
begin;
insert into planb.profiles(id,name,bio,area,interests,adult) values
  (:'host_id'::uuid,'Rowan (test account)','A fictional development host who enjoys walks and coffee.','Newcastle upon Tyne',array['Coffee','Walks'],true),
  (:'guest_id'::uuid,'Sam (test account)','A fictional development guest keen to meet activity friends.','Gateshead',array['Sports','Events'],true)
on conflict(id) do nothing;
insert into planb.plans(id,host_id,title,category,starts_at,duration_minutes,venue,area,description,capacity,cost,booking_held,details) values
  ('b0000000-0000-4000-8000-000000000001',:'host_id'::uuid,'Coffee and a proper catch-up','Coffee',date_trunc('day',now())+interval '2 days 11 hours',90,'Meet at the main entrance of Newcastle City Library','Newcastle city centre','A relaxed coffee at a public cafe. New faces welcome, and there is no need to know anyone already.',3,5,false,'Public meeting point; buy your own drink.'),
  ('b0000000-0000-4000-8000-000000000002',:'guest_id'::uuid,'Quayside photo walk','Walks',date_trunc('day',now())+interval '3 days 14 hours',120,'Outside the public entrance of BALTIC','Gateshead Quays','An easy-paced walk along the Quayside. Phone cameras are very welcome; this is about getting outside together.',4,0,false,'Wear comfortable shoes. Public route; no ticket needed.')
on conflict(id) do nothing;
commit;
