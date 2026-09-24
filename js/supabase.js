import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// RLS must enforce: user_progress owner read/write; comments public read, authenticated insert, owner delete; reports authenticated insert only.
let clientPromise;

export function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

async function getClient() {
  if (!isConfigured()) return null;
  if (!clientPromise) {
    clientPromise = new Promise((resolve, reject) => {
      if (window.supabase) { resolve(window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)); return; }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => resolve(window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return clientPromise;
}

export async function getUser() {
  const client = await getClient();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data.user || null;
}

export async function signIn(email, password) {
  const client = await getClient();
  if (!client) throw new Error('Supabase is not configured.');
  return client.auth.signInWithPassword({ email, password });
}

export async function signUp(email, password) {
  const client = await getClient();
  if (!client) throw new Error('Supabase is not configured.');
  return client.auth.signUp({ email, password });
}

export async function signInWithProvider(provider) {
  const client = await getClient();
  if (!client) throw new Error('Supabase is not configured.');
  return client.auth.signInWithOAuth({ provider, options: { redirectTo: location.href } });
}

export async function sendMagicLink(email) {
  const client = await getClient();
  if (!client) throw new Error('Supabase is not configured.');
  return client.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href } });
}

export async function resetPassword(email) {
  const client = await getClient();
  if (!client) throw new Error('Supabase is not configured.');
  return client.auth.resetPasswordForEmail(email, { redirectTo: location.href });
}

export async function signOut() {
  const client = await getClient();
  if (client) await client.auth.signOut();
}

export async function syncProgressToCloud(snapshot) {
  const client = await getClient();
  if (!client) return { configured: false };
  const user = await getUser();
  if (!user) return { configured: true, authenticated: false };
  const { error } = await client.from('user_progress').upsert({ user_id: user.id, ...snapshot, updated_at: new Date().toISOString() });
  if (error) throw error;
  return { configured: true, authenticated: true };
}

export async function getCloudProgress() {
  const client = await getClient();
  const user = await getUser();
  if (!client || !user) return null;
  const { data, error } = await client.from('user_progress').select('quiz_history, flashcard_progress, stats').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getSupabaseClient() { return getClient(); }
