import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Modal, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Body, Button, Card, Feedback, Input, Label, Row, Screen, Title } from '@/components/hotel-ui';
import { TvPicker } from '@/components/tv-picker';
import { useHotelId } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { errorText } from '@/lib/format';
import type { Database } from '@/lib/database.types';

type Media = Database['public']['Tables']['media_assets']['Row'];
export default function Multimedia() {
  const hotelId = useHotelId(); const [items, setItems] = useState<Media[]>([]); const [urls, setUrls] = useState<Record<string, string>>({});
  const [title, setTitle] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [showId, setShowId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null); const [editTitle, setEditTitle] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await supabase.from('media_assets').select('*').eq('hotel_id', hotelId).order('created_at', { ascending: false });
    if (r.error) { setError(errorText(r.error)); return; }
    setItems(r.data); setError(null);
    const previews: Record<string, string> = {};
    await Promise.all(r.data.map(async item => {
      const signed = await supabase.storage.from('hotel-media').createSignedUrl(item.file_path, 600);
      if (signed.data) previews[item.id] = signed.data.signedUrl;
    })); setUrls(previews);
  }, [hotelId]);
  useEffect(() => { void load(); }, [load]);
  async function choose(kind: 'image' | 'video') {
    if (kind === 'video' && items.filter(item => item.kind === 'video').length >= 5) { setError('El hotel ya tiene cinco videos.'); return; }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Se necesita permiso para elegir archivos de la galería.'); return; }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: kind === 'image' ? ['images'] : ['videos'], allowsMultipleSelection: false, quality: 1 });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    // Expo ImagePicker informa la duración de video en milisegundos.
    const duration = kind === 'video' ? asset.duration : null;
    if (kind === 'video' && (duration == null || !Number.isFinite(duration) || duration <= 0 || duration > 20000)) { setError('El video debe durar 20 segundos o menos y tener duración detectable.'); return; }
    setBusy(true); setError(null);
    try {
      const ext = (asset.fileName?.split('.').pop() || (kind === 'image' ? 'jpg' : 'mp4')).toLowerCase().replace(/[^a-z0-9]/g, '');
      const filePath = `${hotelId}/${Crypto.randomUUID()}.${ext}`;
      const bytes = await new File(asset.uri).arrayBuffer();
      const uploaded = await supabase.storage.from('hotel-media').upload(filePath, bytes, { contentType: asset.mimeType || (kind === 'image' ? 'image/jpeg' : 'video/mp4'), upsert: false });
      if (uploaded.error) throw uploaded.error;
      const inserted = await supabase.from('media_assets').insert({ hotel_id: hotelId, kind, title: title.trim() || asset.fileName || null, file_path: filePath, duration_seconds: kind === 'video' ? Math.ceil(duration! / 1000) : null });
      if (inserted.error) {
        const cleanup = await supabase.storage.from('hotel-media').remove([filePath]);
        if (cleanup.error) throw new Error(`No se guardó el registro y quedó un archivo pendiente de limpiar en Storage: ${filePath}. ${errorText(inserted.error)}`);
        throw inserted.error;
      }
      setTitle(''); await load();
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  async function rename() { if (!editId) return; const r = await supabase.from('media_assets').update({ title: editTitle.trim() || null }).eq('id', editId).eq('hotel_id', hotelId); if (r.error) setError(errorText(r.error)); else { setEditId(null); void load(); } }
  function remove(item: Media) { Alert.alert('Eliminar archivo', 'Si se muestra en una TV, esa pantalla quedará en espera de nuevo contenido.', [{ text: 'Cancelar' }, { text: 'Eliminar', style: 'destructive', onPress: () => void (async () => {
    const row = await supabase.from('media_assets').delete().eq('id', item.id).eq('hotel_id', hotelId);
    if (row.error) { setError(errorText(row.error)); return; }
    if (editId === item.id) setEditId(null);
    if (showId === item.id) setShowId(null);
    const file = await supabase.storage.from('hotel-media').remove([item.file_path]);
    await load();
    if (file.error) setError(`Registro eliminado, pero el archivo quedó en Storage: ${errorText(file.error)}. Limpia la ruta ${item.file_path} desde Supabase.`);
  })() }]); }
  async function preview(item: Media) {
    const signed = await supabase.storage.from('hotel-media').createSignedUrl(item.file_path, 600);
    if (signed.error) setError(errorText(signed.error)); else setPreviewUrl(signed.data.signedUrl);
  }
  return <Screen><Title subtitle="Una imagen por selección. Hasta 5 videos de 20 segundos por hotel.">Multimedia</Title><Feedback message={error} error />
    <Card><Input label="Título opcional para el siguiente archivo" value={title} onChangeText={setTitle} /><Row><Button title={busy ? 'Subiendo…' : 'Agregar imagen'} disabled={busy} onPress={() => void choose('image')} /><Button title="Agregar video" kind="secondary" disabled={busy} onPress={() => void choose('video')} /></Row></Card>
    {editId && <Card><Input label="Nuevo título" value={editTitle} onChangeText={setEditTitle} /><Row><Button title="Guardar" onPress={() => void rename()} /><Button title="Cancelar" kind="secondary" onPress={() => setEditId(null)} /></Row></Card>}
    {!items.length && <Card><Body>No hay archivos promocionales.</Body></Card>}
    {items.map(item => <Card key={item.id}>{item.kind === 'image' && urls[item.id] ? <Image source={{ uri: urls[item.id] }} style={{ width: '100%', height: 160, borderRadius: 12 }} resizeMode="contain" /> : null}
      <Label>{item.title || 'Sin título'}</Label><Body muted>{item.kind === 'video' ? `Video · ${item.duration_seconds}s` : 'Imagen'} · Archivo privado</Body>
      <Row>{item.kind === 'video' && <Button title="Ver video" kind="secondary" onPress={() => void preview(item)} />}<Button title="Mostrar" onPress={() => setShowId(item.id)} /><Button title="Renombrar" kind="secondary" onPress={() => { setEditId(item.id); setEditTitle(item.title ?? ''); }} /><Button title="Eliminar" kind="danger" onPress={() => remove(item)} /></Row></Card>)}
    <TvPicker visible={!!showId} onClose={() => setShowId(null)} section="media" selectedId={showId ?? undefined} />
    <Modal visible={!!previewUrl} onRequestClose={() => setPreviewUrl(null)} animationType="slide"><View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#101820', padding: 18 }}>
      {previewUrl && <VideoPreview url={previewUrl} />}<Button title="Cerrar video" onPress={() => setPreviewUrl(null)} /></View></Modal>
  </Screen>;
}

function VideoPreview({ url }: { url: string }) {
  const player = useVideoPlayer(url, instance => {
    instance.loop = true;
    instance.play();
  });
  return <VideoView player={player} style={{ width: '100%', height: 300 }} nativeControls />;
}
