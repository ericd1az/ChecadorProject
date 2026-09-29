import { supabase } from './supabase';

export async function hotelAction<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session) throw authError ?? new Error('Sesión caducada. Vuelve a abrir la aplicación.');
  const { data, error } = await supabase.functions.invoke('hotel-admin', {
    body: { action, ...payload },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) {
    const response = 'context' in error ? error.context as Response | undefined : undefined;
    const body = await response?.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error || error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}
