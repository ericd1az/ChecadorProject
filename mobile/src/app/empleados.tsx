import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Switch } from 'react-native';
import { Body, Button, Card, Feedback, Input, Label, Row, Screen, Title } from '@/components/hotel-ui';
import { useHotelId } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { hotelAction } from '@/lib/server';
import { errorText } from '@/lib/format';
import { confirmDeviceOwner } from '@/lib/device-auth';
import type { Database } from '@/lib/database.types';

type Employee = Database['public']['Tables']['employees']['Row'];
export default function Empleados() {
  const hotelId = useHotelId(); const [items, setItems] = useState<Employee[]>([]); const [id, setId] = useState<string | null>(null);
  const [name, setName] = useState(''); const [schedule, setSchedule] = useState(''); const [active, setActive] = useState(true);
  const [pinFor, setPinFor] = useState<Employee | null>(null); const [pin, setPin] = useState(''); const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false); const [unlockBusy, setUnlockBusy] = useState(false); const [unlockError, setUnlockError] = useState<string | null>(null);
  const authenticating = useRef(false);
  const autoPrompted = useRef(false);
  const unlock = useCallback(async () => {
    if (unlocked || authenticating.current) return;
    autoPrompted.current = true;
    authenticating.current = true;
    setUnlockBusy(true); setUnlockError(null);
    try {
      if (await confirmDeviceOwner('Acceder a empleados')) setUnlocked(true);
      else setUnlockError('No se confirmó la identidad. Intenta de nuevo.');
    } catch (cause) { setUnlockError(errorText(cause)); }
    finally { authenticating.current = false; setUnlockBusy(false); }
  }, [unlocked]);
  const load = useCallback(async () => { const r = await supabase.from('employees').select('*').eq('hotel_id', hotelId).order('full_name'); if (r.error) setError(errorText(r.error)); else { setItems(r.data); setError(null); } }, [hotelId]);
  useEffect(() => { if (unlocked) void load(); }, [load, unlocked]);
  useEffect(() => { const timer = setTimeout(() => { if (!autoPrompted.current) void unlock(); }, 350); return () => clearTimeout(timer); }, [unlock]);
  useEffect(() => { const listener = AppState.addEventListener('change', state => {
    if (state === 'background') {
      setUnlocked(false); setItems([]); setId(null); setName(''); setSchedule(''); setActive(true); setPinFor(null); setPin('');
    }
  }); return () => listener.remove(); }, []);
  function reset() { setId(null); setName(''); setSchedule(''); setActive(true); }
  async function save() { if (!name.trim() || !schedule.trim()) { setError('Nombre y horario son obligatorios.'); return; } const data = { full_name: name.trim(), schedule_label: schedule.trim(), is_active: active }; const r = id ? await supabase.from('employees').update(data).eq('id', id).eq('hotel_id', hotelId) : await supabase.from('employees').insert({ ...data, hotel_id: hotelId }); if (r.error) setError(errorText(r.error)); else { reset(); void load(); } }
  async function savePin() { if (!pinFor || !/^\d{6}$/.test(pin)) { setError('El PIN debe tener exactamente 6 dígitos.'); return; } try { await hotelAction('set_pin', { employee_id: pinFor.id, pin }); setPin(''); setPinFor(null); Alert.alert('PIN guardado', 'El PIN nunca se muestra ni se guarda en el celular.'); } catch (e) { setError(errorText(e)); setPin(''); } }
  if (!unlocked) return <Screen><Title subtitle="Confirma tu identidad con la seguridad del celular para ver o modificar empleados.">Empleados bloqueados</Title>
    <Feedback message={unlockError} error />
    <Card><Body>Usa huella, rostro o el PIN de desbloqueo del celular. Ese PIN no se guarda en la aplicación ni sustituye el PIN personal de cada empleado.</Body>
      <Button title={unlockBusy ? 'Verificando…' : 'Desbloquear empleados'} disabled={unlockBusy} onPress={() => void unlock()} /></Card>
  </Screen>;
  return <Screen><Title subtitle="El PIN identifica al empleado; se guarda protegido solo en el servidor.">Empleados</Title><Feedback message={error} error />
    <Card><Input label="Nombre completo" value={name} onChangeText={setName} /><Input label="Horario de trabajo" value={schedule} onChangeText={setSchedule} placeholder="Ej. 08:00 a 16:00" /><Row><Label>Activo</Label><Switch value={active} onValueChange={setActive} /></Row><Row><Button title={id ? 'Guardar cambios' : 'Agregar empleado'} onPress={() => void save()} />{id && <Button title="Cancelar" kind="secondary" onPress={reset} />}</Row></Card>
    {pinFor && <Card><Label>Configurar PIN de {pinFor.full_name}</Label><Input label="PIN personal de 6 dígitos" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry maxLength={6} /><Row><Button title="Guardar PIN" onPress={() => void savePin()} /><Button title="Cancelar" kind="secondary" onPress={() => { setPin(''); setPinFor(null); }} /></Row></Card>}
    {!items.length && <Card><Body>No hay empleados.</Body></Card>}
    {items.map(item => <Card key={item.id}><Label>{item.full_name} · {item.is_active ? 'Activo' : 'Inactivo'}</Label><Body>{item.schedule_label}</Body><Row><Button title="Editar" kind="secondary" onPress={() => { setId(item.id); setName(item.full_name); setSchedule(item.schedule_label); setActive(item.is_active); }} /><Button title="Asignar PIN" onPress={() => { setPinFor(item); setPin(''); }} /></Row></Card>)}
  </Screen>;
}
