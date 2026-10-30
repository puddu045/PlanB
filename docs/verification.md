# Verification of the first version

Verified in this cloud environment on 30 October 2026, using Node 24.19.0, npm 11.9.0 and Expo SDK 58.

| Check                                    | Outcome                                                                    |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| Clean dependency installation (`npm ci`) | Passed                                                                     |
| `npm run typecheck`                      | Passed                                                                     |
| `npm run lint`                           | Passed                                                                     |
| `npm test`                               | 14 tests passed; no skipped tests                                          |
| `npm run test:sql`                       | 36 PostgreSQL assertions passed                                            |
| `npm run build:web`                      | Passed; static SPA exported                                                |
| Android and iOS JavaScript/Hermes export | Both passed; not native builds/device launches                             |
| Exported app in Chromium at 1440×1000    | Eight journey steps passed; no console/page errors or failed requests      |
| Exported app in Chromium at 390×844      | Same eight journey steps passed; no console/page errors or failed requests |

The browser journey covers Explore and category filters; hidden meeting venue/chat before acceptance; Alex requesting Maya's coffee plan; Maya accepting and chatting; Alex seeing confirmation, venue and chat after switching roles and reloading; creating/editing/cancelling a plan; availability matching by date/area/activity; storing a demo report; and blocking a host, which removes access to the plan/chat and persists across reload.

A mobile layout overlap found during the first run was fixed and the journey rerun successfully. The repeatable smoke script uses fresh contexts and saves current screenshots and result JSON under ignored `.artifacts/`. Sample demo state from tests never modifies source fixtures.

To repeat browser checks on a machine with Python 3 and Chromium:

```sh
python3 -m venv /tmp/planb-browser
/tmp/planb-browser/bin/pip install playwright
# Use an installed Chromium; alternatively install Playwright Chromium in that venv.
npm run build:web
npm run serve:web                 # leave running in another terminal
/tmp/planb-browser/bin/python tests/browser_smoke.py --chromium /usr/bin/chromium
```

`--only desktop` or `--only phone` selects one viewport. `--base-url` selects a different local server. This is browser viewport testing, not an iOS/Android device test.

Native export command:

```sh
EXPO_OFFLINE=1 npx expo export --platform android --platform ios --output-dir .artifacts/native
```

## Limits of this evidence

SQL tests execute the actual migration and real PostgreSQL semantics in PGlite, with a minimal mock Supabase Auth schema and `auth.uid()`. They verify RLS/grants, caller permissions, capacity limits, duplicate prevention, membership revocation, report/privacy scopes, cancellation, expired availability and invalid timestamps. The code serializes important mutations inside a database transaction and locks the plan row during acceptance. The SQL harness is single-connection; real multi-connection contention still needs testing against a development Supabase database.

No project credentials were configured, so hosted Supabase Auth, email confirmation, PostgREST RPC transport and connected session persistence were **not tested**. No physical phone or simulator was attached. Native exports establish bundle generation only. There was no public deployment, remote push or claim of production readiness. Follow the public-launch checklist in the README before inviting real users.
