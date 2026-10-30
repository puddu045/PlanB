/** Run with npm run test:sql. PGLITE_MODULE can override the test engine module.
 * Uses a fresh in-memory real PostgreSQL WASM database and Supabase auth stand-in.
 * This does not validate Supabase Auth, PostgREST, Realtime, or concurrent sessions.
 */
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const modulePath = process.env.PGLITE_MODULE;
const { PGlite } = await import(
  modulePath ? pathToFileURL(modulePath).href : '@electric-sql/pglite'
);
let passed = 0;
const db = new PGlite();
const options = {
  onNotice: (notice) => {
    if (notice.message.startsWith('PASS:')) {
      passed++;
      console.log(notice.message);
    }
  },
};
try {
  for (const file of [
    'bootstrap.sql',
    '../migrations/202610300001_initial.sql',
    'integration.sql',
  ]) {
    await db.exec(await readFile(new URL(file, import.meta.url), 'utf8'), options);
  }
  if (passed === 0) throw new Error('No SQL assertions ran');
  console.log(
    `SQL checks passed: ${passed}. Supabase services and concurrent transactions were not tested.`,
  );
} finally {
  await db.close();
}
