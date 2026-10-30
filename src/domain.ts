import {
  categories,
  type Availability,
  type Category,
  type JoinRequest,
  type Plan,
  type PlanInput,
  type Snapshot,
} from './types';

export type PlanFilters = {
  date?: 'today' | 'tomorrow' | string;
  activity?: Category | 'All';
  area?: string;
  maxCost?: number;
  spacesOnly?: boolean;
  availability?: Availability;
};

export function availableSpaces(plan: Plan, requests: JoinRequest[]): number {
  return Math.max(
    0,
    plan.capacity - requests.filter((r) => r.planId === plan.id && r.status === 'accepted').length,
  );
}

export function planStatus(
  plan: Plan,
  requests: JoinRequest[],
  now = Date.now(),
): 'open' | 'full' | 'cancelled' | 'finished' {
  if (plan.cancelled) return 'cancelled';
  if (Date.parse(plan.startsAt) + plan.durationMinutes * 60_000 <= now) return 'finished';
  return availableSpaces(plan, requests) === 0 ? 'full' : 'open';
}

export function validatePlan(input: PlanInput, now = Date.now()): void {
  if (input.title.trim().length < 3 || input.title.trim().length > 100)
    throw new Error('Use a title between 3 and 100 characters.');
  if (!categories.includes(input.category)) throw new Error('Choose a valid activity.');
  if (!Number.isFinite(Date.parse(input.startsAt)) || Date.parse(input.startsAt) <= now)
    throw new Error('Choose a start time in the future.');
  if (
    !Number.isInteger(input.durationMinutes) ||
    input.durationMinutes < 15 ||
    input.durationMinutes > 1440
  )
    throw new Error('Duration must be between 15 minutes and 24 hours.');
  if (input.venue.trim().length < 3 || input.venue.trim().length > 180)
    throw new Error('Add a public meeting venue (3–180 characters).');
  if (input.area.trim().length < 2 || input.area.trim().length > 100)
    throw new Error('Add an approximate area (2–100 characters).');
  if (input.description.trim().length < 10 || input.description.length > 2000)
    throw new Error('Write a description between 10 and 2,000 characters.');
  if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 20)
    throw new Error('Choose between 1 and 20 guest spaces.');
  if (
    !Number.isFinite(input.cost) ||
    input.cost < 0 ||
    input.cost > 1000 ||
    Math.abs(input.cost * 100 - Math.round(input.cost * 100)) > 0.00001
  )
    throw new Error('Enter a cost from £0 to £1,000, with at most two decimal places.');
  if (input.details.length > 1000) throw new Error('Keep relevant details under 1,000 characters.');
}

export function isMember(snapshot: Snapshot, planId: string, userId: string): boolean {
  const plan = snapshot.plans.find((p) => p.id === planId);
  return Boolean(
    plan &&
    (plan.hostId === userId ||
      snapshot.requests.some(
        (r) => r.planId === planId && r.userId === userId && r.status === 'accepted',
      )),
  );
}

export function isBlocked(
  snapshot: Pick<Snapshot, 'blocks'>,
  first: string,
  second: string,
): boolean {
  return snapshot.blocks.some(
    (b) =>
      (b.blockerId === first && b.blockedId === second) ||
      (b.blockerId === second && b.blockedId === first),
  );
}

export function canChat(
  snapshot: Snapshot,
  planId: string,
  userId: string,
  now = Date.now(),
): boolean {
  const plan = snapshot.plans.find((p) => p.id === planId);
  if (
    !plan ||
    !isMember(snapshot, planId, userId) ||
    plan.cancelled ||
    Date.parse(plan.startsAt) + plan.durationMinutes * 60_000 <= now
  )
    return false;
  const members = [
    plan.hostId,
    ...snapshot.requests
      .filter((r) => r.planId === planId && r.status === 'accepted')
      .map((r) => r.userId),
  ];
  return !members.some((id) => id !== userId && isBlocked(snapshot, id, userId));
}

export function activeAvailability(availability: Availability, now = Date.now()): boolean {
  return (
    Date.parse(availability.endsAt) > now &&
    Date.parse(availability.startsAt) < Date.parse(availability.endsAt)
  );
}

function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function matchesPlan(
  plan: Plan,
  requests: JoinRequest[],
  filters: PlanFilters = {},
  now = Date.now(),
): boolean {
  if (plan.cancelled || Date.parse(plan.startsAt) <= now) return false;
  if (filters.activity && filters.activity !== 'All' && plan.category !== filters.activity)
    return false;
  if (filters.area && !plan.area.toLowerCase().includes(filters.area.trim().toLowerCase()))
    return false;
  if (filters.maxCost !== undefined && plan.cost > filters.maxCost) return false;
  if (filters.spacesOnly && availableSpaces(plan, requests) < 1) return false;
  if (filters.date) {
    const target = new Date(now);
    if (filters.date === 'tomorrow') target.setDate(target.getDate() + 1);
    const date =
      filters.date === 'today' || filters.date === 'tomorrow' ? localDate(target) : filters.date;
    if (localDate(new Date(plan.startsAt)) !== date) return false;
  }
  if (filters.availability) {
    const a = filters.availability;
    if (!activeAvailability(a, now)) return false;
    const starts = Date.parse(plan.startsAt);
    const ends = starts + plan.durationMinutes * 60_000;
    if (starts >= Date.parse(a.endsAt) || ends <= Date.parse(a.startsAt)) return false;
    if (!a.interests.includes(plan.category)) return false;
    if (!plan.area.toLowerCase().includes(a.area.trim().toLowerCase())) return false;
  }
  return true;
}
