import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { supabase } from './supabase';

type Access = {
  status: 'loading' | 'pending' | 'revoked' | 'ready' | 'error';
  userId: string | null;
  hotelId: string | null;
  label: string | null;
  error: string | null;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<Access | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Access['status']>('loading');
  const [userId, setUserId] = useState<string | null>(null);
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);

  const refresh = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current;
    const run = async () => {
    // A native device-unlock prompt can briefly reactivate the app. Keep an
    // already-authorized route mounted while its Supabase grant is rechecked.
    setStatus(current => current === 'ready' ? current : 'loading');
    setError(null);
    try {
      let { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) {
        const signed = await supabase.auth.signInAnonymously();
        if (signed.error) throw signed.error;
        session = signed.data.session;
      }
      if (!session?.user?.id) throw new Error('No se pudo crear la sesión del celular.');
      const uid = session.user.id;
      setUserId(uid);
      const { data, error: accessError } = await supabase
        .from('admin_devices')
        .select('hotel_id,label,enabled')
        .eq('auth_user_id', uid)
        .maybeSingle();
      if (accessError) throw accessError;
      setHotelId(data?.enabled ? data.hotel_id : null);
      setLabel(data?.label ?? null);
      setStatus(!data ? 'pending' : data.enabled ? 'ready' : 'revoked');
    } catch (cause) {
      setStatus('error');
      setError(cause instanceof Error ? cause.message : 'Error de conexión con Supabase.');
    }
    };
    const promise = run().finally(() => { inFlight.current = null; });
    inFlight.current = promise;
    return promise;
  }, []);

  useEffect(() => {
    void refresh();
    const listener = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void supabase.auth.startAutoRefresh();
        void refresh();
      } else {
        void supabase.auth.stopAutoRefresh();
      }
    });
    return () => listener.remove();
  }, [refresh]);

  const value = useMemo(() => ({ status, userId, hotelId, label, error, refresh }),
    [status, userId, hotelId, label, error, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider no está montado');
  return value;
}

export function useHotelId(): string {
  const { hotelId } = useAuth();
  if (!hotelId) throw new Error('El celular aún no está autorizado para un hotel');
  return hotelId;
}
