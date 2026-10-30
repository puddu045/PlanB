import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoRepository, type DemoStorage } from '../src/data/demo';
import {
  activeAvailability,
  availableSpaces,
  canChat,
  matchesPlan,
  planStatus,
  validatePlan,
} from '../src/domain';
import type { PlanInput } from '../src/types';

const NOW = Date.parse('2026-11-01T09:00:00.000Z');
function memoryStorage(): DemoStorage {
  const saved = new Map<string, string>();
  return {
    getItem: async (key) => saved.get(key) ?? null,
    setItem: async (key, value) => {
      saved.set(key, value);
    },
  };
}
const input: PlanInput = {
  title: 'A friendly test walk',
  category: 'Walks',
  startsAt: new Date(NOW + 86400_000).toISOString(),
  durationMinutes: 90,
  venue: 'BALTIC public entrance',
  area: 'Gateshead',
  description: 'A gentle public riverside walk.',
  capacity: 1,
  cost: 0,
  bookingHeld: false,
  details: 'Flat route.',
};
async function fixture(capacity = 1) {
  const storage = memoryStorage();
  const repo = createDemoRepository(storage, () => NOW);
  const id = await repo.savePlan({ ...input, capacity });
  return { repo, id, storage };
}

test('plan validation rejects past times, invalid capacities, negative and fractional costs', () => {
  assert.throws(
    () => validatePlan({ ...input, startsAt: new Date(NOW).toISOString() }, NOW),
    /future/,
  );
  assert.throws(() => validatePlan({ ...input, capacity: 0 }, NOW), /spaces/);
  assert.throws(() => validatePlan({ ...input, capacity: 1.5 }, NOW), /spaces/);
  assert.throws(() => validatePlan({ ...input, cost: -1 }, NOW), /cost/);
  assert.throws(() => validatePlan({ ...input, cost: 1.005 }, NOW), /cost/);
  assert.doesNotThrow(() => validatePlan(input, NOW));
});

test('only the host can edit, cancel or resolve requests', async () => {
  const { repo, id } = await fixture();
  await repo.switchDemoUser('demo-maya');
  await assert.rejects(repo.savePlan({ ...input, title: 'Not my plan' }, id), /Only the host/);
  await assert.rejects(repo.cancelPlan(id), /Only the host/);
  await repo.requestJoin(id, 'May I join?');
  const own = (await repo.load()).requests.find((r) => r.planId === id)!;
  await assert.rejects(repo.resolveRequest(own.id, true), /Only the host/);
});

test('duplicate requests and joining your own plan are rejected', async () => {
  const { repo, id } = await fixture();
  await assert.rejects(repo.requestJoin(id, ''), /already hosting/);
  await repo.switchDemoUser('demo-maya');
  await repo.requestJoin(id, 'Hello');
  await assert.rejects(repo.requestJoin(id, 'Again'), /already have/);
  const own = (await repo.load()).requests.find((r) => r.planId === id)!;
  await repo.switchDemoUser('demo-alex');
  await repo.resolveRequest(own.id, true);
  await repo.switchDemoUser('demo-maya');
  await assert.rejects(repo.requestJoin(id, ''), /already have/);
});

test('concurrent accepts cannot overbook the final place', async () => {
  const { repo, id } = await fixture();
  await repo.switchDemoUser('demo-maya');
  await repo.requestJoin(id, 'First');
  await repo.switchDemoUser('demo-jamie');
  await repo.requestJoin(id, 'Second');
  await repo.switchDemoUser('demo-alex');
  const pending = (await repo.load()).requests.filter((r) => r.planId === id);
  const results = await Promise.allSettled(pending.map((r) => repo.resolveRequest(r.id, true)));
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const snapshot = await repo.load();
  const plan = snapshot.plans.find((p) => p.id === id)!;
  assert.equal(
    snapshot.requests.filter((r) => r.planId === id && r.status === 'accepted').length,
    1,
  );
  assert.equal(availableSpaces(plan, snapshot.requests), 0);
  assert.equal(planStatus(plan, snapshot.requests, NOW), 'full');
  await assert.rejects(repo.savePlan({ ...input, capacity: 0 }, id), /spaces/);
  await repo.switchDemoUser('demo-sam');
  await assert.rejects(repo.requestJoin(id, ''), /full/);
});

test('cancellation stops new requests, resolves pending requests and makes chat read-only', async () => {
  const { repo, id } = await fixture(2);
  await repo.switchDemoUser('demo-maya');
  await repo.requestJoin(id, 'First');
  const request = (await repo.load()).requests.find((r) => r.planId === id)!;
  await repo.switchDemoUser('demo-alex');
  await repo.resolveRequest(request.id, true);
  await repo.switchDemoUser('demo-jamie');
  await repo.requestJoin(id, 'Second');
  await repo.switchDemoUser('demo-maya');
  await repo.sendMessage(id, 'See you there');
  await repo.switchDemoUser('demo-alex');
  await repo.cancelPlan(id);
  let snapshot = await repo.load();
  assert.equal(
    planStatus(
      snapshot.plans.find((p) => p.id === id)!,
      snapshot.requests,
      NOW,
    ),
    'cancelled',
  );
  assert.equal(
    snapshot.requests.find((r) => r.planId === id && r.userId === 'demo-jamie')?.status,
    'withdrawn',
  );
  await repo.switchDemoUser('demo-maya');
  snapshot = await repo.load();
  assert.equal(snapshot.messages.filter((m) => m.planId === id).length, 1);
  assert.equal(canChat(snapshot, id, 'demo-maya', NOW), false);
  await assert.rejects(repo.sendMessage(id, 'Late message'), /current accepted/);
  await repo.switchDemoUser('demo-sam');
  await assert.rejects(repo.requestJoin(id, ''), /cancelled/);
});

test('only current host and accepted participants can access meeting details and persistent chat', async () => {
  const { repo, id, storage } = await fixture();
  await repo.switchDemoUser('demo-maya');
  assert.equal((await repo.load()).plans.find((p) => p.id === id)?.venue, '');
  await assert.rejects(repo.sendMessage(id, 'I am not a member'), /current accepted/);
  await repo.requestJoin(id, 'Hello');
  const request = (await repo.load()).requests.find((r) => r.planId === id)!;
  await assert.rejects(repo.sendMessage(id, 'Still pending'), /current accepted/);
  await repo.switchDemoUser('demo-alex');
  await repo.resolveRequest(request.id, true);
  await repo.switchDemoUser('demo-maya');
  await repo.sendMessage(id, 'Looking forward to it');
  const reopened = createDemoRepository(storage, () => NOW);
  assert.equal(await reopened.getSession(), 'demo-maya');
  assert.equal((await reopened.load()).messages.filter((m) => m.planId === id).length, 1);
  assert.equal((await reopened.load()).plans.find((p) => p.id === id)?.venue, input.venue);
  await reopened.leavePlan(id);
  assert.equal((await reopened.load()).messages.filter((m) => m.planId === id).length, 0);
  assert.equal((await reopened.load()).plans.find((p) => p.id === id)?.venue, '');
  await assert.rejects(reopened.sendMessage(id, 'Access ended'), /current accepted/);
});

test('availability automatically expires and excludes nonmatching activities, area and times', async () => {
  let clock = NOW;
  const repo = createDemoRepository(memoryStorage(), () => clock);
  const id = await repo.savePlan(input);
  const availability = {
    startsAt: new Date(NOW + 23 * 3600_000).toISOString(),
    endsAt: new Date(NOW + 26 * 3600_000).toISOString(),
    interests: ['Walks'] as const,
    area: 'Gateshead',
  };
  await repo.saveAvailability({ ...availability, interests: [...availability.interests] });
  const snapshot = await repo.load();
  const a = snapshot.availability[0]!;
  const plan = snapshot.plans.find((p) => p.id === id)!;
  assert.equal(activeAvailability(a, NOW), true);
  assert.equal(matchesPlan(plan, snapshot.requests, { availability: a }, NOW), true);
  assert.equal(
    matchesPlan(plan, snapshot.requests, { availability: { ...a, interests: ['Cinema'] } }, NOW),
    false,
  );
  assert.equal(
    matchesPlan(plan, snapshot.requests, { availability: { ...a, area: 'Manchester' } }, NOW),
    false,
  );
  clock = Date.parse(a.endsAt);
  assert.equal(activeAvailability(a, clock), false);
  assert.deepEqual((await repo.load()).availability, []);
  assert.equal(matchesPlan(plan, snapshot.requests, { availability: a }, clock), false);
  await assert.rejects(
    repo.saveAvailability({ ...availability, interests: [...availability.interests] }),
    /valid availability/,
  );
});

test('a host block revokes membership, chat history and new requests in both directions', async () => {
  const { repo, id } = await fixture();
  await repo.switchDemoUser('demo-maya');
  await repo.requestJoin(id, 'Hello');
  const request = (await repo.load()).requests.find((r) => r.planId === id)!;
  await repo.switchDemoUser('demo-alex');
  await repo.resolveRequest(request.id, true);
  await repo.sendMessage(id, 'Welcome');
  await repo.blockUser('demo-maya');
  const after = await repo.load();
  assert.equal(after.requests.find((r) => r.id === request.id)?.status, 'withdrawn');
  await repo.switchDemoUser('demo-maya');
  assert.equal((await repo.load()).messages.filter((m) => m.planId === id).length, 0);
  await assert.rejects(repo.sendMessage(id, 'Blocked'), /current accepted/);
  await assert.rejects(repo.requestJoin(id, ''), /blocked/);
});

test('blocking a fellow guest withdraws the blocker from the shared group', async () => {
  const { repo, id } = await fixture(2);
  for (const user of ['demo-maya', 'demo-jamie']) {
    await repo.switchDemoUser(user);
    await repo.requestJoin(id, 'Hello');
  }
  await repo.switchDemoUser('demo-alex');
  for (const r of (await repo.load()).requests.filter((r) => r.planId === id))
    await repo.resolveRequest(r.id, true);
  await repo.switchDemoUser('demo-maya');
  await repo.blockUser('demo-jamie');
  assert.equal(
    (await repo.load()).requests.find((r) => r.planId === id && r.userId === 'demo-maya')?.status,
    'withdrawn',
  );
  await assert.rejects(repo.sendMessage(id, 'No access'), /current accepted/);
  await repo.switchDemoUser('demo-jamie');
  await repo.sendMessage(id, 'Remaining participant');
  await repo.switchDemoUser('demo-maya');
  await assert.rejects(repo.requestJoin(id, ''), /blocked/);
});

test('reports persist privately and do not claim operational review', async () => {
  const { repo, storage } = await fixture();
  await repo.reportUser('demo-maya', null, 'A sample safety concern to store locally.');
  assert.equal((await repo.load()).reports.length, 1);
  const reopened = createDemoRepository(storage, () => NOW);
  assert.equal((await reopened.load()).reports.length, 1);
  await reopened.switchDemoUser('demo-maya');
  assert.equal((await reopened.load()).reports.length, 0);
});

test('finished plans are labelled and prevent joining or chat messages', async () => {
  let clock = NOW;
  const repo = createDemoRepository(memoryStorage(), () => clock);
  const id = await repo.savePlan(input);
  clock = Date.parse(input.startsAt) + input.durationMinutes * 60_000;
  const snapshot = await repo.load();
  assert.equal(
    planStatus(
      snapshot.plans.find((p) => p.id === id)!,
      snapshot.requests,
      clock,
    ),
    'finished',
  );
  assert.equal(canChat(snapshot, id, 'demo-alex', clock), false);
  await assert.rejects(repo.sendMessage(id, 'Too late'), /current accepted/);
  await repo.switchDemoUser('demo-maya');
  await assert.rejects(repo.requestJoin(id, ''), /already started/);
});

test('signed-out demo users cannot mutate data and demo auth never pretends to authenticate', async () => {
  const { repo } = await fixture();
  await repo.signOut();
  assert.equal(await repo.getSession(), null);
  await assert.rejects(repo.savePlan(input), /Choose a demo profile/);
  await assert.rejects(repo.signIn('sample@example.com', 'password'), /does not authenticate/);
});

test('hosts cannot reduce capacity below accepted places and request decisions notify the guest', async () => {
  const { repo, id } = await fixture(2);
  for (const user of ['demo-maya', 'demo-jamie']) {
    await repo.switchDemoUser(user);
    await repo.requestJoin(id, 'Hello');
  }
  await repo.switchDemoUser('demo-alex');
  for (const r of (await repo.load()).requests.filter((r) => r.planId === id))
    await repo.resolveRequest(r.id, true);
  await assert.rejects(repo.savePlan({ ...input, capacity: 1 }, id), /lower than your accepted/);
  await repo.switchDemoUser('demo-maya');
  const notices = (await repo.load()).notices.filter((n) => n.planId === id);
  assert.ok(notices.some((n) => n.text.includes('confirmed place') && !n.read));
  await repo.markNoticesRead();
  assert.ok((await repo.load()).notices.every((n) => n.read));
});

test('date, budget, activity, area and spaces filters restrict discovery independently', async () => {
  const { repo, id } = await fixture();
  const snapshot = await repo.load();
  const p = snapshot.plans.find((p) => p.id === id)!;
  assert.equal(
    matchesPlan(
      p,
      [],
      { date: 'tomorrow', maxCost: 0, activity: 'Walks', area: 'Gateshead', spacesOnly: true },
      NOW,
    ),
    true,
  );
  assert.equal(matchesPlan(p, [], { date: 'today' }, NOW), false);
  assert.equal(matchesPlan(p, [], { date: '2026-11-02' }, NOW), true);
  assert.equal(matchesPlan({ ...p, cost: 3 }, [], { maxCost: 2 }, NOW), false);
  assert.equal(matchesPlan(p, [], { activity: 'Cinema' }, NOW), false);
  assert.equal(matchesPlan(p, [], { area: 'Newcastle' }, NOW), false);
  const full = [
    {
      id: 'full',
      userId: 'demo-maya',
      planId: id,
      status: 'accepted' as const,
      message: '',
      createdAt: new Date(NOW).toISOString(),
    },
  ];
  assert.equal(matchesPlan(p, full, { spacesOnly: true }, NOW), false);
  assert.equal(matchesPlan(p, full, { spacesOnly: false }, NOW), true);
});
