import { supabase } from './supabase';
import type { DisplayContent, ScreenState, Service, ServiceHour, TvDevice } from './types';

export async function findThisTv(authUserId: string): Promise<TvDevice | null> {
  const { data, error } = await supabase.from('tv_devices')
    .select('id,auth_user_id,hotel_id,name,location')
    .eq('auth_user_id', authUserId).maybeSingle();
  if (error) throw error;
  return data as TvDevice | null;
}

export async function requestPairing(): Promise<{ value: string; expiresAt: number }> {
  const { data, error } = await supabase.functions.invoke('hotel-admin', {
    body: { action: 'request_pairing' },
  });
  if (error) throw error;
  if (!data || typeof data.qr !== 'string' || !/^hotel-display:\/\/pair\/[A-Za-z0-9_-]{32,128}$/.test(data.qr)) {
    throw new Error('El servidor devolvió un QR no válido.');
  }
  const seconds = Number(data.expires_in_seconds);
  return { value: data.qr, expiresAt: Date.now() + (Number.isFinite(seconds) ? seconds : 300) * 1000 };
}

export async function fetchScreen(tvId: string): Promise<ScreenState | null> {
  const { data, error } = await supabase.from('tv_screen_state')
    .select('tv_id,hotel_id,section,welcome_id,media_id,updated_at')
    .eq('tv_id', tvId).maybeSingle();
  if (error) throw error;
  return data as ScreenState | null;
}

async function signedUrl(path: string) {
  const { data, error } = await supabase.storage.from('hotel-media').createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) throw error ?? new Error('No se pudo abrir el archivo multimedia.');
  return data.signedUrl;
}

export async function fetchContent(state: ScreenState, previous: DisplayContent | null): Promise<DisplayContent | null> {
  const { hotel_id: hotelId, section } = state;
  if (section === null) return null;

  if (section === 'welcome') {
    if (!state.welcome_id) return { kind: 'welcome', body: '' };
    const { data, error } = await supabase.from('welcome_messages').select('body')
      .eq('hotel_id', hotelId).eq('id', state.welcome_id).maybeSingle();
    if (error) throw error;
    return { kind: 'welcome', body: data?.body ?? '' };
  }

  if (section === 'services_hours') {
    const [servicesResult, hoursResult] = await Promise.all([
      supabase.from('services').select('id,name,location,icon_storage_path,display_order')
        .eq('hotel_id', hotelId).eq('is_active', true).order('display_order').order('name'),
      supabase.from('service_hours').select('id,service_id,weekday,opens_at,closes_at')
        .eq('hotel_id', hotelId).order('weekday').order('opens_at'),
    ]);
    if (servicesResult.error) throw servicesResult.error;
    if (hoursResult.error) throw hoursResult.error;
    const services = (servicesResult.data ?? []) as Service[];
    const withIcons = await Promise.all(services.map(async (service) => {
      if (!service.icon_storage_path?.startsWith(`${hotelId}/`)) return service;
      try { return { ...service, icon_url: await signedUrl(service.icon_storage_path) }; }
      catch { return service; }
    }));
    return { kind: 'services_hours', services: withIcons, hours: (hoursResult.data ?? []) as ServiceHour[] };
  }

  if (section === 'media') {
    if (!state.media_id) return null;
    const { data, error } = await supabase.from('media_assets')
      .select('id,kind,title,file_path,updated_at')
      .eq('hotel_id', hotelId).eq('id', state.media_id).maybeSingle();
    if (error) throw error;
    if (!data || !data.file_path.startsWith(`${hotelId}/`)) return null;
    if (previous?.kind === 'media' && previous.id === data.id && previous.filePath === data.file_path &&
        previous.updatedAt === data.updated_at && previous.urlExpiresAt > Date.now() + 5 * 60_000) {
      return previous;
    }
    return {
      kind: 'media', id: data.id, mediaKind: data.kind === 'video' ? 'video' : 'image',
      title: data.title, filePath: data.file_path, updatedAt: data.updated_at,
      url: await signedUrl(data.file_path), urlExpiresAt: Date.now() + 3600_000,
    };
  }

  if (section === 'notices') {
    const { data, error } = await supabase.from('notices').select('id,title,body,display_order,created_at')
      .eq('hotel_id', hotelId).eq('is_active', true).order('display_order').order('created_at');
    if (error) throw error;
    return { kind: 'notices', notices: data ?? [] };
  }

  const { data, error } = await supabase.from('cashier_display')
    .select('status,employee_name,schedule_label').eq('hotel_id', hotelId).maybeSingle();
  if (error) throw error;
  return {
    kind: 'cashier', status: data?.status === 'active' ? 'active' : 'pending',
    employeeName: data?.employee_name ?? null, scheduleLabel: data?.schedule_label ?? null,
  };
}
