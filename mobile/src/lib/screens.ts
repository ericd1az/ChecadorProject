import { supabase } from './supabase';
import type { Database } from './database.types';

export type Section = 'welcome' | 'services_hours' | 'media' | 'notices' | 'cashier';
export type Tv = Database['public']['Tables']['tv_devices']['Row'];
export type TvState = Database['public']['Tables']['tv_screen_state']['Row'];

export const sectionNames: Record<Section, string> = {
  welcome: 'Bienvenida',
  services_hours: 'Servicios y horarios',
  media: 'Multimedia',
  notices: 'Avisos',
  cashier: 'Turno de caja',
};

export async function listScreens(hotelId: string) {
  const [tvs, states] = await Promise.all([
    supabase.from('tv_devices').select('*').eq('hotel_id', hotelId).order('paired_at', { ascending: false }),
    supabase.from('tv_screen_state').select('*').eq('hotel_id', hotelId),
  ]);
  if (tvs.error) throw tvs.error;
  if (states.error) throw states.error;
  const byId = new Map((states.data ?? []).map((state) => [state.tv_id, state]));
  return (tvs.data ?? []).map((tv) => ({ ...tv, screen: byId.get(tv.id) ?? null }));
}

export type ScreenWithState = Awaited<ReturnType<typeof listScreens>>[number];

export async function assignScreens(
  hotelId: string,
  tvIds: string[],
  section: Section,
  selectedId?: string,
) {
  if (!tvIds.length) throw new Error('Selecciona al menos una pantalla.');
  if ((section === 'welcome' || section === 'media') && !selectedId) {
    throw new Error('Primero selecciona el contenido que deseas mostrar.');
  }
  const rows = tvIds.map((tv_id) => ({
    tv_id,
    hotel_id: hotelId,
    section,
    welcome_id: section === 'welcome' ? selectedId! : null,
    media_id: section === 'media' ? selectedId! : null,
  }));
  const { error } = await supabase.from('tv_screen_state').upsert(rows, { onConflict: 'tv_id' });
  if (error) throw error;
}
