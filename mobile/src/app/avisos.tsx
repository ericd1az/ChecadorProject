import { useCallback, useEffect, useState } from 'react';
import { Alert, Switch } from 'react-native';
import { Body, Button, Card, Feedback, Input, Label, Row, Screen, Title } from '@/components/hotel-ui';
import { TvPicker } from '@/components/tv-picker';
import { useHotelId } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { errorText } from '@/lib/format';
import { displayLimits } from '@/lib/display-limits';
import type { Database } from '@/lib/database.types';

type Notice = Database['public']['Tables']['notices']['Row'];
const maxNotices = 5;
export default function Avisos() {
  const hotelId = useHotelId();
  const [items, setItems] = useState<Notice[]>([]);
  const [id, setId] = useState<string | null>(null);
  const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [order, setOrder] = useState('0'); const [active, setActive] = useState(true);
  const [picker, setPicker] = useState(false); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { const r = await supabase.from('notices').select('*').eq('hotel_id', hotelId).order('display_order').order('created_at'); if (r.error) setError(errorText(r.error)); else { setItems(r.data); setError(null); } }, [hotelId]);
  useEffect(() => { void load(); }, [load]);
  function reset() { setId(null); setTitle(''); setBody(''); setOrder('0'); setActive(true); }
  async function save() {
    if (!id && items.length >= maxNotices) { setError('Ya hay cinco avisos. Elimina uno antes de crear otro.'); return; }
    if (!title.trim() || title.trim().length > displayLimits.noticeTitle || !body.trim() || body.trim().length > displayLimits.noticeBody || !Number.isInteger(Number(order))) { setError(`Completa título (máx. ${displayLimits.noticeTitle}), mensaje (máx. ${displayLimits.noticeBody}) y orden entero.`); return; }
    const values = { title: title.trim(), body: body.trim(), display_order: Number(order), is_active: active };
    const r = id ? await supabase.from('notices').update(values).eq('id', id).eq('hotel_id', hotelId) : await supabase.from('notices').insert({ ...values, hotel_id: hotelId });
    if (r.error) setError(errorText(r.error)); else { reset(); void load(); }
  }
  function remove(item: Notice) { Alert.alert('Eliminar aviso', item.title, [{ text: 'Cancelar' }, { text: 'Eliminar', style: 'destructive', onPress: () => void (async () => { const r = await supabase.from('notices').delete().eq('id', item.id).eq('hotel_id', hotelId); if (r.error) setError(errorText(r.error)); else void load(); })() }]); }
  return <Screen><Title subtitle="Hasta cinco avisos por hotel. Las TVs asignadas los muestran en una tabla fija.">Avisos importantes</Title><Feedback message={error} error />
    <Body muted>{items.length}/{maxNotices} avisos guardados{items.length >= maxNotices ? ' · Elimina uno para crear otro.' : ''}</Body>
    <Card><Input label="Título" value={title} onChangeText={setTitle} maxLength={displayLimits.noticeTitle} /><Body muted>{title.length}/{displayLimits.noticeTitle} caracteres</Body><Input label="Mensaje" value={body} onChangeText={setBody} multiline maxLength={displayLimits.noticeBody} /><Body muted>{body.length}/{displayLimits.noticeBody} caracteres</Body><Input label="Orden" value={order} onChangeText={setOrder} keyboardType="numeric" />
      <Row><Label>Activo</Label><Switch value={active} onValueChange={setActive} /></Row><Row><Button title={id ? 'Guardar cambios' : 'Crear aviso'} disabled={!id && items.length >= maxNotices} onPress={() => void save()} />{id && <Button title="Cancelar" kind="secondary" onPress={reset} />}</Row></Card>
    <Button title="Mostrar avisos en pantallas" onPress={() => setPicker(true)} />
    {!items.length && <Card><Body>No hay avisos.</Body></Card>}
    {items.map(item => <Card key={item.id}><Label>{item.title} · {item.is_active ? 'Activo' : 'Inactivo'} · orden {item.display_order}</Label><Body>{item.body}</Body><Row><Button title="Editar" kind="secondary" onPress={() => { setId(item.id); setTitle(item.title); setBody(item.body); setOrder(String(item.display_order)); setActive(item.is_active); }} /><Button title="Eliminar" kind="danger" onPress={() => remove(item)} /></Row></Card>)}
    <TvPicker visible={picker} onClose={() => setPicker(false)} section="notices" />
  </Screen>;
}
