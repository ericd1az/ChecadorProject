import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { Body, Button, Card, Feedback, Input, Label, Screen, Title } from '@/components/hotel-ui';
import { TvPicker } from '@/components/tv-picker';
import { useHotelId } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { hotelAction } from '@/lib/server';
import { dateTime, errorText } from '@/lib/format';
import { confirmDeviceOwner } from '@/lib/device-auth';
import type { Database } from '@/lib/database.types';

type Shift = Database['public']['Tables']['cashier_shifts']['Row'];
type Matched = { employee_id: string; full_name: string; schedule_label: string };
export default function Caja() {
  const hotelId = useHotelId(); const [pin, setPin] = useState(''); const [matched, setMatched] = useState<Matched | null>(null); const [biometric, setBiometric] = useState(false);
  const [active, setActive] = useState<Shift | null>(null); const [history, setHistory] = useState<Shift[]>([]); const [names, setNames] = useState<Record<string,string>>({}); const [picker, setPicker] = useState(false); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const [s, e] = await Promise.all([supabase.from('cashier_shifts').select('*').eq('hotel_id', hotelId).order('started_at', { ascending: false }).limit(20), supabase.from('employees').select('id,full_name').eq('hotel_id', hotelId)]); if (s.error || e.error) { setError(errorText(s.error ?? e.error)); return; } setHistory(s.data); setActive(s.data.find(row => !row.ended_at) ?? null); setNames(Object.fromEntries(e.data.map(row => [row.id, row.full_name]))); }, [hotelId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const listener = AppState.addEventListener('change', state => { if (state === 'background') setBiometric(false); }); return () => listener.remove(); }, []);
  function clear() { setPin(''); setMatched(null); setBiometric(false); }
  async function verify() { if (!/^\d{6}$/.test(pin)) { setError('Introduce un PIN de 6 dígitos.'); return; } setBusy(true); try { const result = await hotelAction<Matched>('verify_pin', { pin }); setMatched(result); setError(null); } catch (e) { setError(errorText(e)); clear(); } finally { setBusy(false); } }
  async function confirmLocalAccess() { setBusy(true); try { const confirmed = await confirmDeviceOwner('Confirmar inicio de turno'); if (!confirmed) { setError('No se confirmó la identidad con el celular.'); return; } setBiometric(true); setError(null); } catch (e) { setError(errorText(e)); } finally { setBusy(false); } }
  async function changeShift(action: 'start_shift' | 'end_shift') { setBusy(true); try { await hotelAction(action, { pin }); clear(); await load(); Alert.alert('Turno actualizado', action === 'start_shift' ? 'Turno iniciado.' : 'Turno finalizado. La pantalla de caja queda pendiente.'); } catch (e) { setError(errorText(e)); clear(); } finally { setBusy(false); } }
  return <Screen><Title subtitle="El PIN personal identifica al empleado; la huella, rostro o PIN del celular confirma localmente su uso.">Turnos de caja</Title><Feedback message={error} error />
    <Card><Label>Estado actual</Label><Body>{active ? `${names[active.employee_id] || 'Empleado'} · desde ${dateTime(active.started_at)}` : 'Pendiente: no hay turno activo'}</Body></Card>
    <Button title="Mostrar turno de caja en pantallas" kind="secondary" onPress={() => setPicker(true)} />
    <Card><Input label="PIN personal" value={pin} onChangeText={(value) => { setPin(value.replace(/\D/g, '')); setMatched(null); setBiometric(false); }} keyboardType="number-pad" secureTextEntry maxLength={6} />
      <Button title={busy ? 'Verificando…' : 'Verificar PIN'} disabled={busy} onPress={() => void verify()} />
      {matched && <><Body>Empleado: {matched.full_name}</Body><Body>Horario: {matched.schedule_label}</Body>
        {active ? <>{active.employee_id === matched.employee_id ? <Button title="Finalizar turno" kind="danger" disabled={busy} onPress={() => void changeShift('end_shift')} /> : <Feedback message="Solo el empleado del turno activo puede finalizarlo." error />}</> : <>{!biometric ? <Button title="Confirmar huella, rostro o PIN del celular" disabled={busy} onPress={() => void confirmLocalAccess()} /> : <Button title="Comenzar turno" disabled={busy} onPress={() => void changeShift('start_shift')} />}</>}
        <Button title="Cancelar" kind="secondary" onPress={clear} /></>}
    </Card>
    <Label>Historial reciente</Label>{!history.length && <Card><Body>No hay turnos registrados.</Body></Card>}
    {history.map(row => <Card key={row.id}><Label>{names[row.employee_id] || 'Empleado'}</Label><Body>Entrada: {dateTime(row.started_at)}</Body><Body>Salida: {row.ended_at ? dateTime(row.ended_at) : 'Turno activo'}</Body></Card>)}
    <TvPicker visible={picker} onClose={() => setPicker(false)} section="cashier" />
  </Screen>;
}
