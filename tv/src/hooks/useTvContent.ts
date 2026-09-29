import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { fetchContent, fetchScreen } from '../lib/data';
import { errorMessage } from '../lib/format';
import { supabase } from '../lib/supabase';
import type { DisplayContent, ScreenState, Section, TvDevice } from '../lib/types';

const sectionTables: Record<Section, string[]> = {
  welcome: ['welcome_messages'],
  services_hours: ['services', 'service_hours'],
  media: ['media_assets'],
  notices: ['notices'],
  cashier: ['cashier_display'],
};

export function useTvContent(tv: TvDevice | null) {
  const [screen, setScreen] = useState<ScreenState | null>(null);
  const [content, setContent] = useState<DisplayContent | null>(null);
  const [screenLoading, setScreenLoading] = useState(Boolean(tv));
  const [contentLoading, setContentLoading] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const contentRef = useRef<DisplayContent | null>(null);
  const reloadScreenRef = useRef<(() => void) | null>(null);
  const reloadContentRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!tv) {
      setScreen(null);
      setContent(null);
      contentRef.current = null;
      setScreenLoading(false);
      setScreenError(null);
      setContentError(null);
      return;
    }
    let active = true;
    setScreen(null);
    setContent(null);
    contentRef.current = null;
    setScreenLoading(true);
    const loadScreen = async () => {
      try {
        const latest = await fetchScreen(tv.id);
        if (!active) return;
        setScreen((previous) => previous?.section === latest?.section && previous?.welcome_id === latest?.welcome_id &&
          previous?.media_id === latest?.media_id ? previous : latest);
        setScreenError(null);
      } catch (cause) {
        if (active) setScreenError(errorMessage(cause));
      } finally {
        if (active) setScreenLoading(false);
      }
    };
    reloadScreenRef.current = () => { void loadScreen(); };
    void loadScreen();
    const channel = supabase.channel(`tv-screen-${tv.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tv_screen_state', filter: `tv_id=eq.${tv.id}` },
        () => { void loadScreen(); })
      .subscribe((status) => { if (status === 'SUBSCRIBED') void loadScreen(); });
    const timer = setInterval(() => { void loadScreen(); }, 20_000);
    const foreground = AppState.addEventListener('change', (state) => { if (state === 'active') void loadScreen(); });
    return () => {
      active = false;
      clearInterval(timer);
      foreground.remove();
      reloadScreenRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [tv]);

  useEffect(() => {
    if (!screen || !screen.section || !tv) {
      setContent(null);
      contentRef.current = null;
      setContentLoading(false);
      setContentError(null);
      return;
    }
    let active = true;
    let sequence = 0;
    setContent(null);
    contentRef.current = null;
    setContentLoading(true);
    const loadContent = async () => {
      const current = ++sequence;
      try {
        const next = await fetchContent(screen, contentRef.current);
        if (!active || current !== sequence) return;
        contentRef.current = next;
        setContent(next);
        setContentError(null);
      } catch (cause) {
        if (active && current === sequence) setContentError(errorMessage(cause));
      } finally {
        if (active && current === sequence) setContentLoading(false);
      }
    };
    reloadContentRef.current = () => { void loadContent(); };
    void loadContent();
    let channel = supabase.channel(`tv-content-${tv.id}-${screen.section}`);
    for (const table of sectionTables[screen.section]) {
      channel = channel.on('postgres_changes',
        { event: 'INSERT', schema: 'public', table, filter: `hotel_id=eq.${tv.hotel_id}` },
        () => { void loadContent(); });
      channel = channel.on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table, filter: `hotel_id=eq.${tv.hotel_id}` },
        () => { void loadContent(); });
      // Supabase Realtime no admite filtros en DELETE. Solo se usa la señal
      // para volver a consultar los datos visibles de este hotel mediante RLS.
      channel = channel.on('postgres_changes',
        { event: 'DELETE', schema: 'public', table },
        () => { void loadContent(); });
    }
    channel.subscribe((status) => { if (status === 'SUBSCRIBED') void loadContent(); });
    const timer = setInterval(() => { void loadContent(); }, 15_000);
    const foreground = AppState.addEventListener('change', (state) => { if (state === 'active') void loadContent(); });
    return () => {
      active = false;
      clearInterval(timer);
      foreground.remove();
      reloadContentRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [tv, screen]);

  const retry = () => { reloadScreenRef.current?.(); reloadContentRef.current?.(); };
  return { screen, content, screenLoading, contentLoading, error: screenError ?? contentError, retry };
}
