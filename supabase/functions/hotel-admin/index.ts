import { withSupabase } from 'npm:@supabase/server';

type Input = { action?: string; token?: string; tv_id?: string; employee_id?: string; pin?: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pinFormat = /^\d{6}$/;
const tokenFormat = /^[A-Za-z0-9_-]{32,128}$/;

async function sha256(input: string) {
  const bytes = new TextEncoder().encode(input);
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
}

function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function reply(data: unknown, status = 200) { return Response.json(data, { status }); }

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') return reply({ error: 'Método no permitido.' }, 405);
    const uid = ctx.userClaims?.id;
    if (!uid || !uuid.test(uid)) return reply({ error: 'Sesión no válida.' }, 401);
    let input: Input;
    try { input = await req.json(); } catch { return reply({ error: 'Solicitud no válida.' }, 400); }
    const admin = ctx.supabaseAdmin;

    // Esta acción la llama exclusivamente una TV anónima aún no vinculada.
    if (input.action === 'request_pairing') {
      const token = newToken();
      const { error } = await admin.rpc('hotel_request_pairing', { p_tv_user: uid, p_token_hash: await sha256(token) });
      return error ? reply({ error: 'No se pudo generar el QR.' }, 400) : reply({ qr: `hotel-display://pair/${token}`, expires_in_seconds: 300 });
    }

    // Derivar siempre el hotel del celular autorizado, nunca del cuerpo de la solicitud.
    const { data: access, error: accessError } = await admin.from('admin_devices')
      .select('hotel_id').eq('auth_user_id', uid).eq('enabled', true).maybeSingle();
    if (accessError || !access) return reply({ error: 'Celular no autorizado.' }, 403);

    if (input.action === 'pair_tv') {
      if (!input.token || !tokenFormat.test(input.token)) return reply({ error: 'Código de QR no válido.' }, 400);
      const { data, error } = await admin.rpc('hotel_pair_tv', { p_device: uid, p_token_hash: await sha256(input.token) });
      return error ? reply({ error: 'QR vencido, ya usado o TV vinculada.' }, 400) : reply({ tv_id: data });
    }
    if (input.action === 'unpair_tv') {
      if (!input.tv_id || !uuid.test(input.tv_id)) return reply({ error: 'Pantalla no válida.' }, 400);
      const { error } = await admin.rpc('hotel_unpair_tv', { p_device: uid, p_tv: input.tv_id });
      return error ? reply({ error: 'No se pudo desvincular la pantalla.' }, 400) : reply({ ok: true });
    }
    if (input.action === 'set_pin') {
      if (!input.employee_id || !uuid.test(input.employee_id) || !input.pin || !pinFormat.test(input.pin)) return reply({ error: 'Empleado o PIN no válido. Usa seis dígitos.' }, 400);
      const { error } = await admin.rpc('hotel_set_pin', { p_device: uid, p_employee: input.employee_id, p_pin: input.pin });
      return error ? reply({ error: error.message.includes('ya está asignado') ? 'Ese PIN ya está asignado a otro empleado.' : 'No se pudo guardar el PIN.' }, 400) : reply({ ok: true });
    }
    if (['verify_pin', 'start_shift', 'end_shift'].includes(input.action ?? '')) {
      if (!input.pin || !pinFormat.test(input.pin)) return reply({ error: 'PIN inválido.' }, 400);
      const rpc = input.action === 'verify_pin' ? 'hotel_verify_pin' : input.action === 'start_shift' ? 'hotel_start_shift' : 'hotel_end_shift';
      const { data, error } = await admin.rpc(rpc, { p_device: uid, p_pin: input.pin });
      if (error) return reply({ error: error.message.includes('Demasiados intentos') ? 'Demasiados intentos. Espera 15 minutos.' : error.message.includes('turno activo') ? error.message : 'No se pudo completar la operación.' }, 400);
      if (data === null || data === false) return reply({ error: 'PIN incorrecto o empleado inactivo.' }, 400);
      return reply(input.action === 'verify_pin' ? data : { ok: true });
    }
    return reply({ error: 'Acción no reconocida.' }, 400);
  }),
};
