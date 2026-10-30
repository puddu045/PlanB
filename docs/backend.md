# Connected backend and privacy model

The client uses only the Supabase project URL plus its publishable/anon key. Email and password are sent to Supabase Auth; an authenticated access token supplies `auth.uid()`. Auth credentials are never copied into profile rows. No service-role key belongs in the app, Expo config, saved setup, or Git.

## Install

1. Create a Supabase development project (the free plan is sufficient). Keep **only `public`** in Data API exposed schemas. Never expose `planb`.
2. Run `supabase/migrations/202610300001_initial.sql` using the SQL editor, or link the Supabase CLI and use `supabase db push`. The SQL expects the normal Supabase `auth.users`, `auth.uid()`, `anon` and `authenticated` roles.
3. In Auth settings enable email/password. Configure the web redirect URL and email confirmation policy for your project. The app explicitly reports when sign-up needs email confirmation. Use your own development test accounts; no demo identities are authenticated accounts.
4. Copy `.env.example` to `.env.local`, set `EXPO_PUBLIC_APP_MODE=supabase`, `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Restart Expo after changing these. These are public client configuration; never put a database password/service-role key here.
5. Sign up, confirm email if required, sign in, and complete the adult profile. Use separate browser profiles/devices for host and guest. In connected mode there is no identity switcher.
6. Optional fixture plans: create two Auth test users first. Run `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v host_id='HOST_AUTH_USER_UUID' -v guest_id='GUEST_AUTH_USER_UUID' -f supabase/seed.sql` from the repo. Use a development database, not production. `DATABASE_URL` is admin-only and is never read by the app. Seed runs preserve existing profiles and plan IDs; repeat runs do not duplicate fixtures. The two test IDs must differ.

## Access model

Every data table has RLS enabled and an explicit deny-direct policy, with no client schema/table grants. Private helpers and public actions use fixed empty `search_path`, fully qualified tables and functions, and explicit role grants. Only authenticated users may execute public RPCs; all mutations derive the caller from `auth.uid()` and validate adult profile eligibility and action permissions on the server. The app does not perform direct table access. The snapshot RPC is the narrowly scoped read API; new tables/endpoints need equivalent review.

Profiles contain display name, bio, interests, approximate area and adult eligibility confirmation only. Eligibility is a self-declaration, **not identity verification**. Profiles never include email, date of birth, coordinates or a home address. The supplied profile fields must not be used for private contact details.

Any adult authenticated member may browse plan summaries and safe profiles. A plan's `venue` is returned only to its host and accepted guests; all others receive an empty string. `description` and `details` are public listing copy, so hosts must put precise meeting instructions only in `venue`. Guest request messages are visible only to that guest and the host. Public accepted request rows support accurate capacity display but replace guest identity with an opaque request ID until the viewer is a plan member. Notices, reports, blocks and active availability are returned only to their owner/reporter. Expired availability is filtered by database time on every read; no worker is required and no other user's availability is broadcast.

Chat history is returned only to a host or an accepted guest. Pending/declined/withdrawn users cannot read it. Leaving a plan or losing membership immediately revokes subsequent server reads and writes; previously downloaded content cannot be recalled. Cancelled/finished plans retain history for existing members but accept no new messages. Cancelled pending requests are withdrawn; existing accepted members remain solely for history. There are no direct messages.

## Capacity and races

`resolve_request` locks its plan row before checking the current accepted count and assigning the place, inside one database transaction. A unique `(plan_id, user_id)` key prevents duplicates; re-requesting after withdrawal/decline reuses that record. Space reductions cannot go below confirmed guests. Requests, decisions and edits reject past start times. Cancellation prevents new requests and accepts.

The v1 RPCs also use a shared transaction advisory lock (`86452026`) around plan/membership/block/message writes. This serializes these low-volume actions across plans and closes block/accept/message races. It is deliberately conservative. Before scaling, replace it with a tested consistent ordering of per-plan/per-user locks; keep atomic capacity enforcement. UI counts never supply backend authority.

## Blocking and reports

Blocks are reciprocal for access purposes: a blocked pair cannot send new join requests into the same group or messages to each other. If either user hosts, the other guest's pending/accepted membership is withdrawn. If both are guests, the **blocker leaves** each shared plan; a guest cannot use blocking to eject someone else. Membership withdrawal also removes access to historical chat and detailed venue. Pending requests that would create a blocked shared group are withdrawn. Blocked hosts' plans and mutually blocked profiles are hidden. Blocks cannot be undone in v1.

Reports are stored privately with the reporter, target, optional plan reference, reason and timestamp. Storing a report is not a moderation response. Before public launch an operator must establish a secure review queue, triage/SLA, escalation and appeals process, rate limiting, abuse monitoring, retention/deletion policy and support contact. The current client cannot read other people's reports, and no automatic claim of review is made.

## Verification boundaries

`supabase/tests/` contains isolated PostgreSQL integration checks with mock Auth identities. These test SQL/RLS/RPC behavior, not the hosted Supabase Auth service, email delivery, PostgREST schema configuration, token refresh, deployed transport or physical-device session persistence. A real two-account connected smoke test remains necessary before claiming the connected integration has been tested. Demo data is a separate local adapter and never demonstrates real authentication or backend authorization.
