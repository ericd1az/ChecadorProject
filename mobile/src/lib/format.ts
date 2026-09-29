export const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function dateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Hermosillo' });
}

export function errorText(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  if (typeof cause === 'string') return cause;
  if (cause && typeof cause === 'object' && 'message' in cause && typeof cause.message === 'string') {
    return cause.message;
  }
  return 'Ocurrió un error. Intenta de nuevo.';
}
