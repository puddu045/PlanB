import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { createDemoRepository } from './data/demo';
import { createSupabaseRepository } from './data/supabase';
import { Repository, Snapshot } from './types';

const mode = process.env.EXPO_PUBLIC_APP_MODE || 'demo';
let repository: Repository;
let configurationError = '';
if (mode === 'supabase') {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    configurationError =
      'Connected mode needs EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY. Set them in .env and restart Expo, or select demo mode.';
  else {
    try {
      repository = createSupabaseRepository(url, key);
    } catch {
      configurationError =
        'Supabase configuration is invalid. Check your public project URL and publishable/anon key in .env, then restart Expo.';
    }
  }
} else if (mode === 'demo') repository = createDemoRepository();
else configurationError = 'EXPO_PUBLIC_APP_MODE must be demo or supabase.';
const empty: Snapshot = {
  profiles: [],
  plans: [],
  requests: [],
  messages: [],
  notices: [],
  availability: [],
  blocks: [],
  reports: [],
};
type Store = {
  repo: Repository;
  data: Snapshot;
  userId: string | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  act: <T>(fn: (r: Repository) => Promise<T>) => Promise<T>;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState(empty);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(configurationError);
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++revision.current;
    if (configurationError) {
      setLoading(false);
      return;
    }
    try {
      const id = await repository.getSession();
      const next = id ? await repository.load() : empty;
      if (request !== revision.current) return;
      setUserId(id);
      setData(next);
      setError('');
    } catch (e) {
      if (request === revision.current)
        setError(e instanceof Error ? e.message : 'Could not load your plans. Please try again.');
    } finally {
      if (request === revision.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const initial = setTimeout(() => {
      void refresh();
    }, 0);
    const interval = setInterval(() => {
      void refresh();
    }, 15000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refresh();
    });
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      sub.remove();
    };
  }, [refresh]);
  const act = useCallback(
    async <T,>(fn: (r: Repository) => Promise<T>): Promise<T> => {
      const value = await fn(repository);
      await refresh();
      return value;
    },
    [refresh],
  );
  return (
    <Context.Provider value={{ repo: repository, data, userId, loading, error, refresh, act }}>
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error('Missing StoreProvider');
  return store;
}
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [failed, setFailed] = useState(false);
  async function run(fn: () => Promise<unknown>, success = '') {
    setBusy(true);
    setFeedback('');
    setFailed(false);
    try {
      await fn();
      setFeedback(success);
      return true;
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Something went wrong. Try again.');
      setFailed(true);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, feedback, failed, run, clear: () => setFeedback('') };
}
