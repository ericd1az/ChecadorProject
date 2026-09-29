import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Switch } from 'react-native';
import { Body, Button, Card, Chip, Feedback, Input, Label, Row, Screen, Title } from '@/components/hotel-ui';
import { TvPicker } from '@/components/tv-picker';
import { useHotelId } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { errorText, weekdays } from '@/lib/format';
import { displayLimits } from '@/lib/display-limits';
import type { Database } from '@/lib/database.types';

type Service = Pick<Database['public']['Tables']['services']['Row'], 'id' | 'name' | 'location' | 'display_order' | 'is_active'>;
type Hours = Pick<Database['public']['Tables']['service_hours']['Row'], 'id' | 'service_id' | 'weekday' | 'opens_at' | 'closes_at'>;
export default function Servicios() {
  const hotelId = useHotelId(); const [view, setView] = useState<'services' | 'hours'>('services');
  const [services, setServices] = useState<Service[]>([]); const [hours, setHours] = useState<Hours[]>([]);
  const [id, setId] = useState<string | null>(null); const [name, setName] = useState(''); const [location, setLocation] = useState(''); const [order, setOrder] = useState('0'); const [active, setActive] = useState(true);
  const [hourId, setHourId] = useState<string | null>(null); const [serviceId, setServiceId] = useState(''); const [weekday, setWeekday] = useState(1); const [opens, setOpens] = useState('09:00'); const [closes, setCloses] = useState('18:00');
  const [picker, setPicker] = useState(false); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { const [s, h] = await Promise.all([supabase.from('services').select('id,name,location,display_order,is_active').eq('hotel_id', hotelId).order('display_order'), supabase.from('service_hours').select('id,service_id,weekday,opens_at,closes_at').eq('hotel_id', hotelId).order('weekday').order('opens_at')]); if (s.error || h.error) setError(errorText(s.error ?? h.error)); else { setServices(s.data); setHours(h.data); setError(null); } }, [hotelId]);
  useEffect(() => { void load(); }, [load]);
  function resetService() { setId(null); setName(''); setLocation(''); setOrder('0'); setActive(true); }
  function resetHour() { setHourId(null); setServiceId(''); setWeekday(1); setOpens('09:00'); setCloses('18:00'); }
  async function saveService() {
    if (!name.trim() || !Number.isInteger(Number(order))) { setError('Escribe nombre y orden entero.'); return; }
    if (name.trim().length > displayLimits.serviceName || location.trim().length > displayLimits.serviceLocation) {
      setError(`El texto supera el límite para TV: nombre ${displayLimits.serviceName} o ubicación ${displayLimits.serviceLocation} caracteres.`); return;
    }
    const data = { name: name.trim(), location: location.trim() || null, display_order: Number(order), is_active: active };
    const r = id ? await supabase.from('services').update(data).eq('id', id).eq('hotel_id', hotelId) : await supabase.from('services').insert({ ...data, hotel_id: hotelId });
    if (r.error) setError(errorText(r.error)); else { resetService(); void load(); }
  }
  async function saveHour() {
    if (!serviceId || !/^\d{2}:\d{2}$/.test(opens) || !/^\d{2}:\d{2}$/.test(closes) || closes <= opens || Number(opens.slice(0,2)) > 23 || Number(closes.slice(0,2)) > 23 || Number(opens.slice(3)) > 59 || Number(closes.slice(3)) > 59) { setError('Elige servicio y horas válidas HH:MM; el cierre debe ser posterior.'); return; }
    const data = { service_id: serviceId, weekday, opens_at: opens, closes_at: closes };
    const r = hourId ? await supabase.from('service_hours').update(data).eq('id', hourId).eq('hotel_id', hotelId) : await supabase.from('service_hours').insert({ ...data, hotel_id: hotelId });
    if (r.error) setError(errorText(r.error)); else { resetHour(); void load(); }
  }
  function remove(table: 'services' | 'service_hours', itemId: string) { Alert.alert('Confirmar eliminación', table === 'services' ? 'Se eliminará el servicio y todos sus horarios.' : 'Se eliminará este horario.', [{ text: 'Cancelar' }, { text: 'Eliminar', style: 'destructive', onPress: () => void (async () => { const r = table === 'services' ? await supabase.from('services').delete().eq('id', itemId).eq('hotel_id', hotelId) : await supabase.from('service_hours').delete().eq('id', itemId).eq('hotel_id', hotelId); if (r.error) { setError(errorText(r.error)); return; } if (table === 'services' && id === itemId) resetService(); if (table === 'service_hours' && hourId === itemId) resetHour(); void load(); })() }]); }
  return <Screen><Title subtitle="Una sección para TV, dos ventanas de edición.">Servicios y horarios</Title><Feedback message={error} error />
    <Row><Button title="Servicios" kind={view === 'services' ? 'primary' : 'secondary'} onPress={() => setView('services')} /><Button title="Horarios" kind={view === 'hours' ? 'primary' : 'secondary'} onPress={() => setView('hours')} /></Row>
    <Button title="Mostrar servicios y horarios en pantallas" onPress={() => setPicker(true)} />
    {view === 'services' ? <>
      <Card><Input label={`Nombre (máx. ${displayLimits.serviceName})`} value={name} onChangeText={setName} maxLength={displayLimits.serviceName} /><Input label={`Ubicación (máx. ${displayLimits.serviceLocation})`} value={location} onChangeText={setLocation} maxLength={displayLimits.serviceLocation} /><Input label="Orden" value={order} onChangeText={setOrder} keyboardType="numeric" /><Row><Label>Activo</Label><Switch value={active} onValueChange={setActive} /></Row><Row><Button title={id ? 'Guardar cambios' : 'Agregar servicio'} onPress={() => void saveService()} />{id && <Button title="Cancelar" kind="secondary" onPress={resetService} />}</Row></Card>
      {!services.length && <Card><Body>No hay servicios.</Body></Card>}
      {services.map(s => <Card key={s.id}><Row><Label>{s.name}</Label><Chip text={s.is_active ? 'Activo' : 'Inactivo'} /></Row><Body muted>{s.location || 'Sin ubicación'} · Orden {s.display_order}</Body><Row><Button title="Editar" kind="secondary" onPress={() => { setId(s.id); setName(s.name); setLocation(s.location ?? ''); setOrder(String(s.display_order)); setActive(s.is_active); }} /><Button title="Eliminar" kind="danger" onPress={() => remove('services', s.id)} /></Row></Card>)}
    </> : <>
      <Card><Label>Servicio</Label>{services.map(s => <Pressable key={s.id} onPress={() => setServiceId(s.id)}><Body>{serviceId === s.id ? '◉' : '○'} {s.name}</Body></Pressable>)}
        <Label>Día</Label><Row>{weekdays.map((day, i) => <Pressable key={day} onPress={() => setWeekday(i)}><Chip text={`${weekday === i ? '● ' : ''}${day.slice(0, 3)}`} /></Pressable>)}</Row>
        <Input label="Abre (HH:MM)" value={opens} onChangeText={setOpens} placeholder="09:00" /><Input label="Cierra (HH:MM)" value={closes} onChangeText={setCloses} placeholder="18:00" /><Row><Button title={hourId ? 'Guardar horario' : 'Agregar horario'} onPress={() => void saveHour()} />{hourId && <Button title="Cancelar" kind="secondary" onPress={resetHour} />}</Row></Card>
      {!hours.length && <Card><Body>No hay horarios.</Body></Card>}
      {hours.map(h => <Card key={h.id}><Label>{services.find(s => s.id === h.service_id)?.name ?? 'Servicio'} · {weekdays[h.weekday]}</Label><Body>{h.opens_at.slice(0, 5)}–{h.closes_at.slice(0, 5)}</Body><Row><Button title="Editar" kind="secondary" onPress={() => { setHourId(h.id); setServiceId(h.service_id); setWeekday(h.weekday); setOpens(h.opens_at.slice(0,5)); setCloses(h.closes_at.slice(0,5)); }} /><Button title="Eliminar" kind="danger" onPress={() => remove('service_hours', h.id)} /></Row></Card>)}
    </>}
    <TvPicker visible={picker} onClose={() => setPicker(false)} section="services_hours" />
  </Screen>;
}
