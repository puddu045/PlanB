export const categories = ['Coffee', 'Food', 'Cinema', 'Sports', 'Walks', 'Events'] as const;
export type Category = (typeof categories)[number];
export type Profile = {
  id: string;
  name: string;
  bio: string;
  area: string;
  interests: Category[];
  adult: boolean;
};
export type Plan = {
  id: string;
  hostId: string;
  title: string;
  category: Category;
  startsAt: string;
  durationMinutes: number;
  venue: string;
  area: string;
  description: string;
  capacity: number;
  cost: number;
  bookingHeld: boolean;
  details: string;
  cancelled: boolean;
  createdAt: string;
};
export type PlanInput = Omit<Plan, 'id' | 'hostId' | 'createdAt' | 'cancelled'>;
export type JoinRequest = {
  id: string;
  planId: string;
  userId: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn';
  createdAt: string;
};
export type ChatMessage = {
  id: string;
  planId: string;
  userId: string;
  body: string;
  createdAt: string;
};
export type Notice = {
  id: string;
  userId: string;
  text: string;
  planId: string | null;
  read: boolean;
  createdAt: string;
};
export type Availability = {
  userId: string;
  startsAt: string;
  endsAt: string;
  area: string;
  interests: Category[];
};
export type Block = { blockerId: string; blockedId: string };
export type Report = {
  id: string;
  reporterId: string;
  targetId: string;
  planId: string | null;
  reason: string;
  createdAt: string;
};
export type Snapshot = {
  profiles: Profile[];
  plans: Plan[];
  requests: JoinRequest[];
  messages: ChatMessage[];
  notices: Notice[];
  availability: Availability[];
  blocks: Block[];
  reports: Report[];
};
export interface Repository {
  mode: 'demo' | 'supabase';
  getSession(): Promise<string | null>;
  signIn(email: string, password: string): Promise<string | null>;
  signUp(email: string, password: string): Promise<string | null>;
  signOut(): Promise<void>;
  switchDemoUser?(id: string): Promise<void>;
  load(): Promise<Snapshot>;
  saveProfile(profile: Omit<Profile, 'id'>): Promise<void>;
  savePlan(input: PlanInput, id?: string): Promise<string>;
  cancelPlan(id: string): Promise<void>;
  requestJoin(planId: string, message: string): Promise<void>;
  resolveRequest(id: string, accept: boolean): Promise<void>;
  leavePlan(planId: string): Promise<void>;
  sendMessage(planId: string, body: string): Promise<void>;
  saveAvailability(input: Omit<Availability, 'userId'>): Promise<void>;
  blockUser(id: string): Promise<void>;
  reportUser(id: string, planId: string | null, reason: string): Promise<void>;
  markNoticesRead(): Promise<void>;
}
