// Prueba manual aislada. Crear antes un hotel temporal en SQL Editor.
// Después de imprimir los UID, autorizar solo el celular en admin_devices y pulsar Enter.
// Al terminar, eliminar exactamente los dos auth.users y el hotel temporal por ID.
import fs from 'node:fs';
import readline from 'node:readline/promises';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').trim().split(/\r?\n/).map(line => {
  const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)];
}));
function client() { return createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } }); }
async function invoke(c, action, data = {}) {
  const result = await c.functions.invoke('hotel-admin', { body: { action, ...data } });
  if (result.error) {
    const body = await result.error.context?.json?.().catch(() => null);
    throw new Error(body?.error || result.error.message);
  }
  return result.data;
}
async function assertReject(operation, label) {
  try { await operation(); throw new Error(`ERROR: ${label} fue permitido`); }
  catch (error) { if (error.message.startsWith('ERROR:')) throw error; console.log(`OK rechazo: ${label}`); }
}
const admin = client(); const tv = client();
const a = await admin.auth.signInAnonymously(); if (a.error) throw a.error;
const t = await tv.auth.signInAnonymously(); if (t.error) throw t.error;
console.log(`ADMIN_TEST_UID=${a.data.user.id}`);
console.log(`TV_TEST_UID=${t.data.user.id}`);
await assertReject(() => invoke(admin, 'verify_pin', { pin: '000000' }), 'celular sin autorizar');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
await rl.question('Autoriza ADMIN_TEST_UID en el hotel TEMPORAL; pulsa Enter para seguir: '); rl.close();
const row = await admin.from('admin_devices').select('hotel_id').eq('auth_user_id', a.data.user.id).single();
if (row.error) throw row.error;
const hotelId = row.data.hotel_id;
const e1 = await admin.from('employees').insert({ hotel_id: hotelId, full_name: 'Prueba Caja A', schedule_label: '08:00–16:00' }).select('id').single();
if (e1.error) throw e1.error;
const e2 = await admin.from('employees').insert({ hotel_id: hotelId, full_name: 'Prueba Caja B', schedule_label: '16:00–00:00' }).select('id').single();
if (e2.error) throw e2.error;
await invoke(admin, 'set_pin', { employee_id: e1.data.id, pin: '951482' });
await assertReject(() => invoke(admin, 'set_pin', { employee_id: e2.data.id, pin: '951482' }), 'PIN duplicado');
const found = await invoke(admin, 'verify_pin', { pin: '951482' });
if (found.employee_id !== e1.data.id) throw new Error('El PIN no identificó al empleado.');
console.log('OK PIN identifica al empleado.');
await invoke(admin, 'start_shift', { pin: '951482' });
await assertReject(() => invoke(admin, 'start_shift', { pin: '951482' }), 'segundo turno activo');
await invoke(admin, 'end_shift', { pin: '951482' });
const display = await admin.from('cashier_display').select('status,employee_name').eq('hotel_id', hotelId).single();
if (display.error || display.data.status !== 'pending' || display.data.employee_name) throw new Error('El cierre no dejó la TV pendiente.');
console.log('OK turno cerrado y pantalla pendiente.');
const qr = await invoke(tv, 'request_pairing');
const token = qr.qr.split('/').pop();
const paired = await invoke(admin, 'pair_tv', { token });
await assertReject(() => invoke(admin, 'pair_tv', { token }), 'reutilización del QR');
const assigned = await admin.from('tv_screen_state').update({ section: 'cashier', welcome_id: null, media_id: null }).eq('tv_id', paired.tv_id);
if (assigned.error) throw assigned.error;
await invoke(admin, 'unpair_tv', { tv_id: paired.tv_id });
console.log('OK QR de un uso, asignación y desvinculación.');
for (let i = 0; i < 5; i++) await assertReject(() => invoke(admin, 'verify_pin', { pin: '000000' }), `PIN incorrecto ${i + 1}`);
await assertReject(() => invoke(admin, 'verify_pin', { pin: '951482' }), 'límite de intentos');
console.log(`PRUEBA_OK HOTEL_TEST_ID=${hotelId}. Limpia hotel y UID exactos.`);
