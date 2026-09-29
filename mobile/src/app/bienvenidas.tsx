import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Body, Button, Card, Feedback, Input, Row, Screen, Title } from '@/components/hotel-ui';
import { TvPicker } from '@/components/tv-picker';
import { useHotelId } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { errorText } from '@/lib/format';
import { displayLimits } from '@/lib/display-limits';
import type { Database } from '@/lib/database.types';

type Welcome = Database['public']['Tables']['welcome_messages']['Row'];
export default function Bienvenidas() {
  const hotelId = useHotelId();
  const [items, setItems] = useState<Welcome[]>([]);
  const [id, setId] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [showId, setShowId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const result = await supabase.from('welcome_messages').select('*').eq('hotel_id', hotelId).order('created_at', { ascending: false }); if (result.error) setError(errorText(result.error)); else { setItems(result.data); setError(null); } }, [hotelId]);
  useEffect(() => { void load(); }, [load]);
  async function save() {
    if (!body.trim() || body.trim().length > displayLimits.welcome) { setError(`Escribe entre 1 y ${displayLimits.welcome} caracteres.`); return; }
    setBusy(true);
    const result = id ? await supabase.from('welcome_messages').update({ body: body.trim() }).eq('id', id).eq('hotel_id', hotelId) : await supabase.from('welcome_messages').insert({ hotel_id: hotelId, body: body.trim() });
    setBusy(false);
    if (result.error) { setError(errorText(result.error)); return; }
    setId(null); setBody(''); void load();
  }
  function remove(item: Welcome) { Alert.alert('Eliminar bienvenida', 'Si se muestra en una TV, esa pantalla quedará en espera de nuevo contenido.', [{ text: 'Cancelar' }, { text: 'Eliminar', style: 'destructive', onPress: () => void (async () => { const r = await supabase.from('welcome_messages').delete().eq('id', item.id).eq('hotel_id', hotelId); if (r.error) { setError(errorText(r.error)); return; } if (id === item.id) { setId(null); setBody(''); } if (showId === item.id) setShowId(null); void load(); })() }]); }
  return <Screen><Title subtitle={`Texto con estilo predeterminado, hasta ${displayLimits.welcome} caracteres para TV.`}>Bienvenidas</Title><Feedback message={error} error />
    <Card><Input label="Mensaje" value={body} onChangeText={setBody} multiline maxLength={displayLimits.welcome} /><Body muted>{body.length}/{displayLimits.welcome} caracteres</Body><Row><Button title={busy ? 'Guardando…' : id ? 'Guardar cambios' : 'Crear mensaje'} disabled={busy} onPress={() => void save()} />{id && <Button title="Cancelar" kind="secondary" onPress={() => { setId(null); setBody(''); }} />}</Row></Card>
    {!items.length && <Card><Body>No hay bienvenidas. Crea la primera arriba.</Body></Card>}
    {items.map(item => <Card key={item.id}><Body>{item.body}</Body><Row><Button title="Mostrar" onPress={() => setShowId(item.id)} /><Button title="Editar" kind="secondary" onPress={() => { setId(item.id); setBody(item.body); }} /><Button title="Eliminar" kind="danger" onPress={() => remove(item)} /></Row></Card>)}
    <TvPicker visible={!!showId} onClose={() => setShowId(null)} section="welcome" selectedId={showId ?? undefined} />
  </Screen>;
}
