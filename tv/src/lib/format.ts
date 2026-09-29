import type { ServiceHour } from './types';

const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Keep these in sync with AppMovilx/src/lib/display-limits.ts.
export const tvTextLimits = {
  serviceName: 24,
  serviceLocation: 25,
  noticeTitle: 24,
  noticeBody: 60,
} as const;

export function shortenForTv(value: string, limit: number): string {
  const characters = Array.from(value.replace(/\s+/g, ' ').trim());
  return characters.length <= limit ? characters.join('') : `${characters.slice(0, limit - 1).join('').trimEnd()}…`;
}

export function formatHour(value: string): string {
  return value.slice(0, 5);
}

export function formatNoticePublishedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  try {
    const options = { timeZone: 'America/Hermosillo' };
    const day = new Intl.DateTimeFormat('es-MX', { ...options, day: '2-digit', month: 'short', year: 'numeric' }).format(date);
    const time = new Intl.DateTimeFormat('es-MX', { ...options, hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
    return `${day}\n${time} h`;
  } catch {
    // Sonora stays at UTC-07 year-round, even on runtimes without IANA zones.
    const local = new Date(date.getTime() - 7 * 60 * 60 * 1000);
    const day = `${String(local.getUTCDate()).padStart(2, '0')}/${String(local.getUTCMonth() + 1).padStart(2, '0')}/${local.getUTCFullYear()}`;
    const time = `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`;
    return `${day}\n${time} h`;
  }
}

export function scheduleForService(hours: ServiceHour[], serviceId: string): string[] {
  const rows = hours.filter((hour) => hour.service_id === serviceId);
  if (!rows.length) return ['Horario no disponible'];
  return rows.map((hour) => `${days[hour.weekday] ?? 'Día'}  ${formatHour(hour.opens_at)}–${formatHour(hour.closes_at)}`);
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) return String(error.message);
  return 'No se pudo conectar con el servidor.';
}
