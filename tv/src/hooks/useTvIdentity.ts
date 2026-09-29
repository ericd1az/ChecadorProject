import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { findThisTv, requestPairing } from '../lib/data';
import { errorMessage } from '../lib/format';
import { supabase } from '../lib/supabase';
import type { TvDevice } from '../lib/types';

export function useTvIdentity() {
  const [uid, setUid] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [tv, setTv] = useState<TvDevice | null>(null);
  const [qr, setQr] = useState<{ value: string; expiresAt: number } | null>(null);
  const [pairBusy, setPairBusy] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const pairingLock = useRef(false);
  const lookupLock = useRef(false);
  const wasPaired = useRef(false);

  const initialize = useCallback(async () => {
    setBootError(null);
    setPairError(null);
    setChecked(false);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      let userId = sessionData.session?.user.id;
      if (!userId) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        userId = data.user?.id;
      }
      if (!userId) throw new Error('No se pudo crear la identidad de esta TV.');
      setUid(userId);
      const found = await findThisTv(userId);
      setTv(found);
      setChecked(true);
      setOffline(false);
    } catch (error) {
      setBootError(errorMessage(error));
      setOffline(true);
    }
  }, []);

  useEffect(() => { void initialize(); }, [initialize]);

  const refreshTv = useCallback(async () => {
    if (!uid || !checked || lookupLock.current) return;
    lookupLock.current = true;
    try {
      const found = await findThisTv(uid);
      setTv((previous) => previous?.id === found?.id && previous?.name === found?.name &&
        previous?.location === found?.location ? previous : found);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      lookupLock.current = false;
    }
  }, [uid, checked]);

  useEffect(() => {
    if (!uid || !checked) return;
    const timer = setInterval(() => { void refreshTv(); }, tv ? 20_000 : 5_000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') { supabase.auth.startAutoRefresh(); void refreshTv(); }
      else supabase.auth.stopAutoRefresh();
    });
    return () => { clearInterval(timer); listener.remove(); };
  }, [uid, checked, tv, refreshTv]);

  useEffect(() => {
    if (tv) {
      wasPaired.current = true;
      setQr(null);
      setPairError(null);
    } else if (wasPaired.current) {
      wasPaired.current = false;
      setQr(null);
      setPairError(null);
    }
  }, [tv]);

  const renewQr = useCallback(async () => {
    if (!uid || !checked || tv || pairingLock.current) return;
    pairingLock.current = true;
    setPairBusy(true);
    setPairError(null);
    setQr(null);
    try {
      const next = await requestPairing();
      setQr(next);
      setOffline(false);
    } catch (error) {
      setPairError(errorMessage(error));
      setOffline(true);
    } finally {
      pairingLock.current = false;
      setPairBusy(false);
    }
  }, [uid, checked, tv]);

  useEffect(() => {
    if (uid && checked && !tv && !qr && !pairBusy && !pairError) void renewQr();
  }, [uid, checked, tv, qr, pairBusy, pairError, renewQr]);

  return { uid, checked, tv, qr, pairBusy, pairError, bootError, offline, initialize, renewQr, refreshTv };
}
