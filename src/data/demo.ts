import {
  activeAvailability,
  availableSpaces,
  canChat,
  isBlocked,
  isMember,
  validatePlan,
} from '../domain';
import {
  categories,
  type Availability,
  type Plan,
  type PlanInput,
  type Profile,
  type Repository,
  type Snapshot,
} from '../types';

export interface DemoStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
const STATE_KEY = 'planb:demo:v1';
const SESSION_KEY = 'planb:demo:session:v1';
const localStorage: DemoStorage = {
  async getItem(key) {
    const { default: storage } = await import('@react-native-async-storage/async-storage');
    return storage.getItem(key);
  },
  async setItem(key, value) {
    const { default: storage } = await import('@react-native-async-storage/async-storage');
    await storage.setItem(key, value);
  },
};
export const DEMO_USERS: Profile[] = [
  {
    id: 'demo-alex',
    name: 'Alex Morgan',
    bio: 'Coffee, long walks and finding new favourite places. Always up for a good conversation.',
    area: 'Newcastle upon Tyne',
    interests: ['Coffee', 'Walks', 'Food'],
    adult: true,
  },
  {
    id: 'demo-maya',
    name: 'Maya Patel',
    bio: 'Weekend wanderer. Keen on good coffee, independent cinema and a friendly badminton game.',
    area: 'Newcastle upon Tyne',
    interests: ['Coffee', 'Cinema', 'Sports'],
    adult: true,
  },
  {
    id: 'demo-jamie',
    name: 'Jamie Ellis',
    bio: 'New to the city. Exploring the Quayside one walk and one bakery at a time.',
    area: 'Gateshead',
    interests: ['Walks', 'Food', 'Events'],
    adult: true,
  },
  {
    id: 'demo-sam',
    name: 'Sam Wilson',
    bio: 'Casual badminton player and appreciator of a proper Sunday lunch.',
    area: 'Newcastle upon Tyne',
    interests: ['Sports', 'Food', 'Cinema'],
    adult: true,
  },
];

export function createSeed(now = Date.now()): Snapshot {
  const soon = (days: number, hour: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, 30, 0, 0);
    if (d.getTime() < now + 3_600_000) d.setDate(d.getDate() + 1);
    return d.toISOString();
  };
  const createdAt = new Date(now).toISOString();
  const plan = (
    id: string,
    hostId: string,
    title: string,
    category: Plan['category'],
    days: number,
    hour: number,
    venue: string,
    area: string,
    cost: number,
    capacity: number,
    description: string,
    durationMinutes = 90,
    bookingHeld = false,
    details = '',
  ): Plan => ({
    id,
    hostId,
    title,
    category,
    startsAt: soon(days, hour),
    durationMinutes,
    venue,
    area,
    description,
    capacity,
    cost,
    bookingHeld,
    details,
    cancelled: false,
    createdAt,
  });
  return {
    profiles: DEMO_USERS.map((p) => ({ ...p, interests: [...p.interests] })),
    plans: [
      plan(
        'coffee-quayside',
        'demo-maya',
        'A coffee & a little catch-up',
        'Coffee',
        0,
        15,
        'Quay Ingredient, public entrance',
        'Newcastle upon Tyne · Quayside',
        4.5,
        2,
        'An easy-going coffee by the river. Bring a book, a story, or just yourself. We can wander along the Quayside afterwards if the weather is kind.',
        90,
      ),
      plan(
        'badminton-evening',
        'demo-sam',
        'One more for badminton?',
        'Sports',
        0,
        18,
        'Northumbria Sport Central reception',
        'Newcastle upon Tyne · City centre',
        6,
        3,
        'A friendly doubles session. A court is already booked; all you need is indoor trainers and a little enthusiasm.',
        60,
        true,
        'Casual / beginner friendly. Spare rackets available.',
      ),
      plan(
        'walk-baltic',
        'demo-jamie',
        'River views & a slow Sunday',
        'Walks',
        1,
        11,
        'BALTIC main entrance, South Shore Road',
        'Gateshead · Quayside',
        0,
        4,
        'A gentle riverside walk across the Millennium Bridge, with plenty of time to chat and take in the view. Flat route, around 3 km.',
        120,
        false,
        'Comfortable shoes. Step-free route; message about access needs.',
      ),
      plan(
        'cinema-tyneside',
        'demo-maya',
        'An evening at the Tyneside',
        'Cinema',
        1,
        19,
        'Tyneside Cinema public foyer',
        'Newcastle upon Tyne · City centre',
        12,
        2,
        'Pick a film together and meet for a drink in the cinema café beforehand. Please buy your own ticket once we agree the showing.',
        180,
        false,
        'Film and showing to be agreed in the group chat. Cost is an estimate.',
      ),
      plan(
        'food-grainger',
        'demo-jamie',
        'Lunch around Grainger Market',
        'Food',
        2,
        12,
        'Grainger Market, Grey Street entrance',
        'Newcastle upon Tyne · City centre',
        10,
        3,
        'Try a new lunch spot at the market. Everyone buys their own food, and we will find somewhere public to sit together.',
        75,
      ),
      plan(
        'events-shipley',
        'demo-alex',
        'A little art, a little conversation',
        'Events',
        3,
        13,
        'Shipley Art Gallery public entrance',
        'Gateshead · Shipcote',
        0,
        2,
        'A relaxed look around the gallery, followed by an optional coffee. No art knowledge needed — just curiosity.',
        120,
      ),
    ],
    requests: [
      {
        id: 'seed-accepted',
        planId: 'coffee-quayside',
        userId: 'demo-jamie',
        message: 'A coffee by the river sounds lovely.',
        status: 'accepted',
        createdAt,
      },
      {
        id: 'seed-pending',
        planId: 'events-shipley',
        userId: 'demo-sam',
        message: 'I would love to join. Is a first gallery visit welcome?',
        status: 'pending',
        createdAt,
      },
    ],
    messages: [
      {
        id: 'seed-message',
        planId: 'coffee-quayside',
        userId: 'demo-maya',
        body: 'Sample conversation: looking forward to a relaxed coffee. We will meet by the public entrance.',
        createdAt,
      },
    ],
    notices: [
      {
        id: 'seed-notice',
        userId: 'demo-alex',
        text: 'Sample notification: Sam requested to join your gallery plan.',
        planId: 'events-shipley',
        read: false,
        createdAt,
      },
    ],
    availability: [],
    blocks: [],
    reports: [],
  };
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export class DemoRepository implements Repository {
  readonly mode = 'demo' as const;
  private state: Snapshot | null = null;
  private session: string | null | undefined;
  private queue: Promise<unknown> = Promise.resolve();
  private initializing: Promise<void> | null = null;
  constructor(
    private storage: DemoStorage = localStorage,
    private now: () => number = Date.now,
  ) {}
  private id(prefix: string) {
    return `${prefix}-${this.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
  private async init() {
    if (this.state && this.session !== undefined) return;
    if (!this.initializing)
      this.initializing = this.initialize().catch((error) => {
        this.initializing = null;
        throw error;
      });
    return this.initializing;
  }
  private async initialize() {
    const raw = await this.storage.getItem(STATE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Snapshot;
        const keys: (keyof Snapshot)[] = [
          'profiles',
          'plans',
          'requests',
          'messages',
          'notices',
          'availability',
          'blocks',
          'reports',
        ];
        if (!parsed || !keys.every((key) => Array.isArray(parsed[key])))
          throw new Error('Invalid saved state');
        this.state = parsed;
      } catch {
        throw new Error(
          'Saved demo data could not be read. Clear this app’s local storage to reset the sample data.',
        );
      }
    } else {
      this.state = createSeed(this.now());
      await this.storage.setItem(STATE_KEY, JSON.stringify(this.state));
    }
    const session = await this.storage.getItem(SESSION_KEY);
    this.session = session === null ? 'demo-alex' : session === 'signed-out' ? null : session;
  }
  private actor(state: Snapshot) {
    if (!this.session) throw new Error('Choose a demo profile to continue.');
    const p = state.profiles.find((p) => p.id === this.session);
    if (!p || !p.adult)
      throw new Error('Confirm you are aged 18 or over and finish your profile first.');
    return p;
  }
  private async mutate<T>(action: (state: Snapshot) => T): Promise<T> {
    const operation = this.queue.then(async () => {
      await this.init();
      const next = clone(this.state!);
      const result = action(next);
      await this.storage.setItem(STATE_KEY, JSON.stringify(next));
      this.state = next;
      return result;
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }
  private notify(s: Snapshot, userId: string, text: string, planId: string | null) {
    s.notices.unshift({
      id: this.id('notice'),
      userId,
      text,
      planId,
      read: false,
      createdAt: new Date(this.now()).toISOString(),
    });
  }
  private getPlan(s: Snapshot, id: string): Plan {
    const p = s.plans.find((p) => p.id === id);
    if (!p) throw new Error('This plan is no longer available.');
    return p;
  }
  private openForRequests(p: Plan) {
    if (p.cancelled) throw new Error('This plan has been cancelled.');
    if (Date.parse(p.startsAt) <= this.now()) throw new Error('This plan has already started.');
  }
  async getSession() {
    await this.queue;
    await this.init();
    return this.session ?? null;
  }
  async signIn(_email: string, _password: string): Promise<string | null> {
    throw new Error(
      'Demo mode does not authenticate email or passwords. Choose a sample profile instead.',
    );
  }
  async signUp(_email: string, _password: string): Promise<string | null> {
    throw new Error('Demo mode does not create real accounts. Choose a sample profile instead.');
  }
  async signOut() {
    await this.queue;
    await this.init();
    await this.storage.setItem(SESSION_KEY, 'signed-out');
    this.session = null;
  }
  async switchDemoUser(id: string) {
    await this.queue;
    await this.init();
    if (!this.state!.profiles.some((p) => p.id === id))
      throw new Error('Choose one of the sample profiles.');
    await this.storage.setItem(SESSION_KEY, id);
    this.session = id;
  }
  async load(): Promise<Snapshot> {
    await this.queue;
    await this.init();
    const s = clone(this.state!);
    const userId = this.session;
    const hidden = (hostId: string) => Boolean(userId && isBlocked(s, userId, hostId));
    const visiblePlans = s.plans.filter((p) => !hidden(p.hostId) || p.hostId === userId);
    return {
      ...s,
      profiles: s.profiles.filter((p) => p.id === userId || !userId || !isBlocked(s, userId, p.id)),
      plans: visiblePlans.map((p) => ({
        ...p,
        venue: userId && isMember(s, p.id, userId) ? p.venue : '',
      })),
      requests: s.requests
        .filter(
          (r) =>
            r.status === 'accepted' ||
            r.userId === userId ||
            s.plans.find((p) => p.id === r.planId)?.hostId === userId,
        )
        .map((r) => ({
          ...r,
          userId:
            (userId && isMember(s, r.planId, userId)) || r.userId === userId ? r.userId : r.id,
          message:
            r.userId === userId || s.plans.find((p) => p.id === r.planId)?.hostId === userId
              ? r.message
              : '',
        })),
      messages: s.messages.filter((m) =>
        Boolean(userId && isMember(s, m.planId, userId) && !isBlocked(s, userId, m.userId)),
      ),
      notices: s.notices.filter((n) => n.userId === userId),
      availability: s.availability.filter(
        (a) => a.userId === userId && activeAvailability(a, this.now()),
      ),
      blocks: s.blocks.filter((b) => b.blockerId === userId),
      reports: s.reports.filter((r) => r.reporterId === userId),
    };
  }
  async saveProfile(input: Omit<Profile, 'id'>) {
    await this.mutate((s) => {
      if (!this.session) throw new Error('Choose a demo profile first.');
      if (!input.adult) throw new Error('PlanB is for adults aged 18 and over.');
      if (input.name.trim().length < 2 || input.name.trim().length > 60)
        throw new Error('Use a name between 2 and 60 characters.');
      if (input.bio.length > 500) throw new Error('Keep your bio under 500 characters.');
      if (input.area.trim().length < 2 || input.area.length > 100)
        throw new Error('Add an approximate area between 2 and 100 characters.');
      if (!input.interests.length || !input.interests.every((i) => categories.includes(i)))
        throw new Error('Choose at least one activity interest.');
      const p = { ...input, id: this.session, name: input.name.trim(), area: input.area.trim() };
      s.profiles = [...s.profiles.filter((p) => p.id !== this.session), p];
    });
  }
  async savePlan(input: PlanInput, id?: string): Promise<string> {
    return this.mutate((s) => {
      const actor = this.actor(s);
      validatePlan(input, this.now());
      if (id) {
        const plan = this.getPlan(s, id);
        if (plan.hostId !== actor.id) throw new Error('Only the host can edit this plan.');
        this.openForRequests(plan);
        if (
          s.requests.filter((r) => r.planId === id && r.status === 'accepted').length >
          input.capacity
        )
          throw new Error('Guest spaces cannot be lower than your accepted participants.');
        Object.assign(plan, input, {
          title: input.title.trim(),
          area: input.area.trim(),
          venue: input.venue.trim(),
        });
        s.requests
          .filter((r) => r.planId === id && r.status === 'accepted')
          .forEach((r) =>
            this.notify(
              s,
              r.userId,
              `The host updated “${plan.title}”. Check the latest details.`,
              id,
            ),
          );
        return id;
      }
      const newId = this.id('plan');
      s.plans.unshift({
        ...input,
        id: newId,
        hostId: actor.id,
        createdAt: new Date(this.now()).toISOString(),
        cancelled: false,
      });
      return newId;
    });
  }
  async cancelPlan(id: string) {
    await this.mutate((s) => {
      const actor = this.actor(s);
      const p = this.getPlan(s, id);
      if (p.hostId !== actor.id) throw new Error('Only the host can cancel this plan.');
      if (p.cancelled) return;
      if (Date.parse(p.startsAt) + p.durationMinutes * 60_000 <= this.now())
        throw new Error('This plan has already finished.');
      p.cancelled = true;
      for (const r of s.requests.filter(
        (r) => r.planId === id && ['accepted', 'pending'].includes(r.status),
      )) {
        this.notify(s, r.userId, `“${p.title}” has been cancelled by the host.`, id);
        if (r.status === 'pending') r.status = 'withdrawn';
      }
    });
  }
  async requestJoin(planId: string, message: string) {
    await this.mutate((s) => {
      const actor = this.actor(s);
      const p = this.getPlan(s, planId);
      this.openForRequests(p);
      if (actor.id === p.hostId) throw new Error('You are already hosting this plan.');
      if (
        isBlocked(s, actor.id, p.hostId) ||
        s.requests.some(
          (r) => r.planId === planId && r.status === 'accepted' && isBlocked(s, actor.id, r.userId),
        )
      )
        throw new Error('You cannot request a plan with a blocked member.');
      if (message.length > 500) throw new Error('Keep your request message under 500 characters.');
      const existing = s.requests.find((r) => r.planId === planId && r.userId === actor.id);
      if (existing && ['pending', 'accepted'].includes(existing.status))
        throw new Error('You already have a request or confirmed place on this plan.');
      if (!availableSpaces(p, s.requests)) throw new Error('This plan is full.');
      if (existing)
        Object.assign(existing, {
          status: 'pending',
          message: message.trim(),
          createdAt: new Date(this.now()).toISOString(),
        });
      else
        s.requests.push({
          id: this.id('request'),
          userId: actor.id,
          planId,
          message: message.trim(),
          status: 'pending',
          createdAt: new Date(this.now()).toISOString(),
        });
      this.notify(s, p.hostId, `${actor.name} requested to join “${p.title}”.`, planId);
    });
  }
  async resolveRequest(id: string, accept: boolean) {
    await this.mutate((s) => {
      const actor = this.actor(s);
      const r = s.requests.find((r) => r.id === id);
      if (!r) throw new Error('This request no longer exists.');
      const p = this.getPlan(s, r.planId);
      if (p.hostId !== actor.id) throw new Error('Only the host can manage requests.');
      this.openForRequests(p);
      if (r.status !== 'pending') throw new Error('This request is no longer pending.');
      if (accept) {
        if (
          isBlocked(s, actor.id, r.userId) ||
          s.requests.some(
            (other) =>
              other.planId === p.id &&
              other.status === 'accepted' &&
              isBlocked(s, other.userId, r.userId),
          )
        )
          throw new Error('A blocked member cannot join this group.');
        if (!availableSpaces(p, s.requests))
          throw new Error('This plan is full. No additional place was confirmed.');
      }
      r.status = accept ? 'accepted' : 'declined';
      this.notify(
        s,
        r.userId,
        accept
          ? `You have a confirmed place on “${p.title}”. The group chat is open.`
          : `Your request for “${p.title}” was declined. There are other plans to explore.`,
        p.id,
      );
    });
  }
  async leavePlan(planId: string) {
    await this.mutate((s) => {
      const actor = this.actor(s);
      const p = this.getPlan(s, planId);
      if (p.hostId === actor.id)
        throw new Error('Hosts should cancel their plan instead of leaving.');
      const r = s.requests.find(
        (r) =>
          r.planId === planId &&
          r.userId === actor.id &&
          ['pending', 'accepted'].includes(r.status),
      );
      if (!r) throw new Error('You have no active request or place to leave.');
      r.status = 'withdrawn';
      this.notify(s, p.hostId, `${actor.name} withdrew from “${p.title}”.`, p.id);
    });
  }
  async sendMessage(planId: string, body: string) {
    await this.mutate((s) => {
      const actor = this.actor(s);
      if (!canChat(s, planId, actor.id, this.now()))
        throw new Error(
          'Only the host and current accepted participants can message an active plan.',
        );
      if (!body.trim() || body.trim().length > 2000)
        throw new Error('Write a message between 1 and 2,000 characters.');
      s.messages.push({
        id: this.id('message'),
        userId: actor.id,
        planId,
        body: body.trim(),
        createdAt: new Date(this.now()).toISOString(),
      });
      const p = this.getPlan(s, planId);
      const recipients = new Set([
        p.hostId,
        ...s.requests
          .filter((r) => r.planId === planId && r.status === 'accepted')
          .map((r) => r.userId),
      ]);
      recipients.delete(actor.id);
      recipients.forEach((userId) =>
        this.notify(s, userId, `${actor.name} sent a message in “${p.title}”.`, planId),
      );
    });
  }
  async saveAvailability(input: Omit<Availability, 'userId'>) {
    await this.mutate((s) => {
      const actor = this.actor(s);
      const a = { ...input, userId: actor.id };
      if (
        !activeAvailability(a, this.now()) ||
        !Number.isFinite(Date.parse(a.startsAt)) ||
        Date.parse(a.endsAt) - Date.parse(a.startsAt) > 7 * 86400_000
      )
        throw new Error(
          'Choose a valid availability window ending in the future, lasting no more than seven days.',
        );
      if (a.area.trim().length < 2 || a.area.length > 100)
        throw new Error('Add an approximate area.');
      if (!a.interests.length || !a.interests.every((c) => categories.includes(c)))
        throw new Error('Choose at least one activity interest.');
      s.availability = [
        ...s.availability.filter((a) => a.userId !== actor.id && activeAvailability(a, this.now())),
        a,
      ];
    });
  }
  async blockUser(id: string) {
    await this.mutate((s) => {
      const actor = this.actor(s);
      if (id === actor.id || !s.profiles.some((p) => p.id === id))
        throw new Error('Choose another person to block.');
      if (!s.blocks.some((b) => b.blockerId === actor.id && b.blockedId === id))
        s.blocks.push({ blockerId: actor.id, blockedId: id });
      for (const p of s.plans) {
        const active = (userId: string) =>
          p.hostId === userId ||
          s.requests.some(
            (r) =>
              r.planId === p.id &&
              r.userId === userId &&
              ['pending', 'accepted'].includes(r.status),
          );
        if (!active(actor.id) || !active(id)) continue;
        let removeId: string;
        if (p.hostId === actor.id) removeId = id;
        else if (p.hostId === id) removeId = actor.id;
        else {
          const blockerRequest = s.requests.find((r) => r.planId === p.id && r.userId === actor.id);
          const blockedRequest = s.requests.find((r) => r.planId === p.id && r.userId === id);
          if (blockedRequest?.status === 'accepted') removeId = actor.id;
          else if (blockerRequest?.status === 'accepted' && blockedRequest?.status === 'pending')
            removeId = id;
          else continue;
        }
        for (const r of s.requests.filter(
          (r) =>
            r.planId === p.id &&
            r.userId === removeId &&
            ['pending', 'accepted'].includes(r.status),
        ))
          r.status = 'withdrawn';
        this.notify(
          s,
          removeId,
          `Your participation in “${p.title}” has ended following a block.`,
          p.id,
        );
      }
    });
  }
  async reportUser(id: string, planId: string | null, reason: string) {
    await this.mutate((s) => {
      const actor = this.actor(s);
      if (id === actor.id || !s.profiles.some((p) => p.id === id))
        throw new Error('Choose another person to report.');
      if (reason.trim().length < 10 || reason.length > 2000)
        throw new Error('Please describe the concern in 10–2,000 characters.');
      if (planId) this.getPlan(s, planId);
      s.reports.push({
        id: this.id('report'),
        reporterId: actor.id,
        targetId: id,
        planId,
        reason: reason.trim(),
        createdAt: new Date(this.now()).toISOString(),
      });
    });
  }
  async markNoticesRead() {
    await this.mutate((s) => {
      const actor = this.actor(s);
      s.notices
        .filter((n) => n.userId === actor.id)
        .forEach((n) => {
          n.read = true;
        });
    });
  }
}

export function createDemoRepository(storage?: DemoStorage, now?: () => number): DemoRepository {
  return new DemoRepository(storage, now);
}
