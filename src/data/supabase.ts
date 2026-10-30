import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import type { Repository, Snapshot } from '../types';

/** Public project URL and publishable/anon key only. RLS/RPCs supply authority. */
export function createSupabaseRepository(url: string, anonKey: string): Repository {
  const client = createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  });
  async function rpc<T = void>(name: string, args?: Record<string, unknown>): Promise<T> {
    const { data, error } = await client.rpc(name, args);
    if (error) throw new Error(error.message);
    return data as T;
  }
  return {
    mode: 'supabase',
    async getSession() {
      const { data, error } = await client.auth.getSession();
      if (error) throw new Error(error.message);
      return data.session?.user.id ?? null;
    },
    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw new Error(error.message);
      return data.session?.user.id ?? null;
    },
    async signUp(email, password) {
      const { data, error } = await client.auth.signUp({ email: email.trim(), password });
      if (error) throw new Error(error.message);
      // A null session explicitly means email confirmation is still required.
      return data.session?.user.id ?? null;
    },
    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw new Error(error.message);
    },
    load: () => rpc<Snapshot>('get_snapshot'),
    saveProfile: (profile) => rpc('save_profile', { p_profile: profile }),
    savePlan: (input, id) => rpc<string>('save_plan', { p_input: input, p_id: id ?? null }),
    cancelPlan: (id) => rpc('cancel_plan', { p_plan_id: id }),
    requestJoin: (id, message) => rpc('request_join', { p_plan_id: id, p_message: message }),
    resolveRequest: (id, accept) => rpc('resolve_request', { p_request_id: id, p_accept: accept }),
    leavePlan: (id) => rpc('leave_plan', { p_plan_id: id }),
    sendMessage: (id, body) => rpc('send_message', { p_plan_id: id, p_body: body }),
    saveAvailability: (input) => rpc('save_availability', { p_input: input }),
    blockUser: (id) => rpc('block_user', { p_user_id: id }),
    reportUser: (id, planId, reason) =>
      rpc('report_user', { p_user_id: id, p_plan_id: planId, p_reason: reason }),
    markNoticesRead: () => rpc('mark_notices_read'),
  };
}
