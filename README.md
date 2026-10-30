# PlanB

**Plans changed? Find your next one.**

An Expo / React Native / Expo Router / TypeScript app for adults to find company for activities. Friendship comes first. One source tree targets Android, iOS and responsive web.

## Start the local demo

Use **Node 24 LTS** (tested with 24.19.0) and npm 11. Versions are recorded in `package-lock.json` and matched to stable Expo SDK 58.

```sh
cd /workspace/PlanB                 # or your local checkout
npm ci
npm run web
```

No `.env`, account, paid service or Supabase project is needed. The default mode is **LOCAL DEMO**, prominently labelled in the app. Fictional profiles, sample conversations and all changes are saved in this browser/device via AsyncStorage. Demo role switching is a simulation, never authentication or verification. This state is not shared across browsers or devices. To reset, clear this site's storage or the app's data; fresh seed dates are relative to the first run. Old saved plans naturally expire.

Try the main journey:

1. As Alex, explore **A coffee & a little catch-up**, open its details, and request to join.
2. In Profile, switch to **Maya · Host a plan**. Open her coffee plan in My Plans → Hosted and accept Alex.
3. Send a group message. Switch back to Alex and open My Plans → Confirmed or Inbox to see it.
4. Create a plan with **Save my plan**, then edit it or cancel it from its detail page. Set an availability window with **I’m free** to find matching plans.

Exact venue details unlock for the host and accepted guests. The demo only uses public venues. Requests are not confirmed places until accepted. Reports in demo stay on the device and are not monitored by a real moderation team.

### Web build and checks

```sh
npm run typecheck
npm run lint
npm test                           # 14 focused demo/domain tests
npm run test:sql                    # isolated PostgreSQL / PGlite integration checks
npm run build:web                  # static output in dist/
npm run serve:web                  # optional local build smoke server, Python 3 required
```

Static hosts need an SPA fallback to `index.html` for direct Expo Router links. The included smoke server does this; it is not a production server. No public deployment is configured.

### Android and iOS

```sh
npm start                          # open the Expo QR code / development menu
npm run android                    # running Android emulator + Android SDK required
npm run ios                        # macOS + Xcode simulator required
```

Use an **SDK 58 compatible Expo Go** on a physical device on the same network as Expo. This app uses only Expo-supported modules and needs no paid build service. The cloud machine has no iOS simulator or physical device attached. Native launch, keyboard/safe-area behaviour and native Auth session persistence still need physical-device checks. If the cloud network cannot expose Metro to your phone, run the same checkout locally; no tunnel or paid preview is required.

Expo's optional online compatibility metadata may be blocked in restricted cloud networks. Packages were installed using the SDK's local `bundledNativeModules.json`. With npm registry access, the same supported fallback is `EXPO_OFFLINE=1 npx expo install <package>`. For this installed environment `EXPO_OFFLINE=1 npm run web -- --host localhost` avoids optional Expo network requests. This does not disable TLS or package-integrity checks.

## Connect Supabase

The connected adapter is included, but using it requires your own development project. The default demo never silently changes into connected mode.

1. Create a free Supabase project. Keep only `public` in Data API exposed schemas; **do not expose `planb`**.
2. Run `supabase/migrations/202610300001_initial.sql` in the SQL editor. Or install the Supabase CLI, run `supabase login`, `supabase link --project-ref YOUR_PROJECT_REF`, then `supabase db push` from the repository. `supabase/config.toml` supplies local CLI defaults.
3. Enable email/password Auth. Set your app's development web URL in Auth → URL Configuration and allow the redirect URL. Configure email confirmation; sign-up tells users when they need to check email, confirm and sign in. There is no password reset UI in v1.
4. Copy `.env.example` to `.env.local` and set:

   ```dotenv
   EXPO_PUBLIC_APP_MODE=supabase
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
   ```

5. Restart Expo. Create and confirm two accounts, sign in, and complete each adult profile. Use separate browser profiles/devices for a real host/guest journey. No demo role switcher appears in connected mode.
6. Optional fixtures and full policy explanation: [docs/backend.md](docs/backend.md). The SQL seed uses **existing test Auth UUIDs**, never demo passwords or real user credentials. Its `psql` command is documented there; do not run it against production.

`EXPO_PUBLIC_*` values are bundled into the client. Only public project configuration belongs there. Never use a service-role key, database password or other secret. `.env*` files are ignored except `.env.example`. No email address or exact home location appears in public profile records. Adult eligibility is self-declared, not verified.

All connected mutations validate the caller on the server. There is no direct client table access. Capacity acceptance takes a row lock and a transaction-wide advisory lock, so the last place cannot be assigned twice. Every data table has RLS, and the authenticated RPC read API masks private data. The client polls snapshots every 15 seconds and after mutations; there are no push notifications or real-time subscription claims.

## Structure

- `app/`: Expo Router screens — Explore, My Plans, Inbox, Profile, plan creation/details and availability.
- `src/components/`: shared accessible React Native controls and group chat.
- `src/types.ts`: shared `Repository` interface and models.
- `src/data/demo.ts`: serialised, persisted local simulation with fictional data.
- `src/data/supabase.ts`: email/password Auth and the same interface implemented via validated RPCs.
- `src/domain.ts`: validation, statuses, membership, capacity and matching helpers.
- `supabase/`: migration, optional seed, local config and SQL checks.
- `tests/`: focused domain/permission tests and repeatable browser smoke.

Each cloud task is already isolated. Reuse the checkout; no extra Git worktree is needed. Tests use injected clocks/storage. SQL checks use a fresh real PostgreSQL WASM engine with a stand-in `auth.uid()` and Auth table. They exercise migration syntax, grants and RPC behaviour but **do not prove hosted Supabase Auth, PostgREST, email delivery, or concurrent database connections work**.

## Safety and v1 boundaries

Blocking prevents new requests and messaging in both directions. For host/guest shared plans, the guest's membership ends; for two guests, the blocker leaves so blocking cannot be used to eject another guest. Pending conflicts are withdrawn. Existing members keep read-only history when a plan ends or is cancelled. Losing membership revokes subsequent access to venue/chat; previously downloaded information cannot be recalled. Blocking is permanent in this first version. See [backend policy](docs/backend.md#blocking-and-reports).

Reports are private stored records. **An operational review process is required before public launch.** The app does not promise that reports are being monitored. Emergencies require local emergency services.

Before public launch:

- Run the real two-account Supabase journey, multi-connection race tests and native-device tests; arrange an independent backend/security review.
- Staff moderation, report triage, escalation/appeals and support; implement rate limits and abuse monitoring.
- Define privacy terms, consent, account deletion/export, retention and backup/restore policies; review adult eligibility safeguards.
- Add password reset, email delivery monitoring and recovery UX; replace broad snapshot polling with paginated/scoped reads as usage grows.
- Audit accessibility with screen readers, native keyboards, large fonts and real devices. Availability and date entry currently use labelled text fields in local time, not native date pickers.
- Add production observability, operational alerting, performance tests and scale the deliberately conservative mutation lock.

No payments, ticket resale, maps, AI recommendations, push notifications, subscriptions or deployment are included.

See [docs/verification.md](docs/verification.md) for tested capabilities and remaining limits.
