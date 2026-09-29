import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Body, Button, Card, Feedback, Input, Label, Row, Screen, Title } from '@/components/hotel-ui';
import { TvPicker } from '@/components/tv-picker';
import { useHotelId } from '@/lib/auth';
import { listScreens, sectionNames, type Section } from '@/lib/screens';
import { supabase } from '@/lib/supabase';
import { hotelAction } from '@/lib/server';
import { errorText } from '@/lib/format';

function parsePair(value: string): string | null {
  const code = value.trim();
  const match = /^(?:hotel-display:\/\/pair\/)?([A-Za-z0-9_-]{32,128})$/.exec(code);
  return match?.[1] ?? null;
}

export default function Pantallas() {
  const hotelId = useHotelId(); const [tvs, setTvs] = useState<Awaited<ReturnType<typeof listScreens>>>([]);
  const [error, setError] = useState<string | null>(null); const [code, setCode] = useState(''); const [name, setName] = useState(''); const [location, setLocation] = useState(''); const [editId, setEditId] = useState<string | null>(null);
  const [scanner, setScanner] = useState(false); const scanLock = useRef(false); const [permission, requestPermission] = useCameraPermissions(); const [publish, setPublish] = useState<Section | null>(null);
  const load = useCallback(async () => { try { setTvs(await listScreens(hotelId)); setError(null); } catch (e) { setError(errorText(e)); } }, [hotelId]);
  useEffect(() => { void load(); }, [load]);
  function scanned(raw: string) {
    if (scanLock.current) return;
    scanLock.current = true;
    const token = parsePair(raw);
    if (!token) {
      setError('QR no válido para Hotel Display.');
      setScanner(false);
      return;
    }
    setCode(token);
    setError(null);
    setScanner(false);
  }
  async function pair() { const token = parsePair(code); if (!token) { setError('Introduce un código de vinculación válido.'); return; } try { await hotelAction('pair_tv', { token }); setCode(''); await load(); } catch (e) { setError(errorText(e)); } }
  async function saveName() { if (!editId || !name.trim()) { setError('Escribe el nombre de la pantalla.'); return; } const r = await supabase.from('tv_devices').update({ name: name.trim(), location: location.trim() || null }).eq('id', editId).eq('hotel_id', hotelId); if (r.error) setError(errorText(r.error)); else { setEditId(null); setName(''); setLocation(''); void load(); } }
  function unpair(id: string, title: string) { Alert.alert('Desvincular pantalla', `La TV ${title} volverá a mostrar su QR.`, [{ text: 'Cancelar' }, { text: 'Desvincular', style: 'destructive', onPress: () => void (async () => { try { await hotelAction('unpair_tv', { tv_id: id }); await load(); } catch (e) { setError(errorText(e)); } })() }]); }
  async function openScanner() { if (!permission?.granted) { const result = await requestPermission(); if (!result.granted) { setError('Se necesita permiso de cámara para escanear el QR. También puedes escribir el código.'); return; } } scanLock.current = false; setScanner(true); }
  return <Screen><Title subtitle="Puedes vincular varias TVs y publicar una sección fija en cada una.">Pantallas vinculadas</Title><Feedback message={error} error />
    <Card><Label>Vincular con QR</Label><Button title="Escanear QR" onPress={() => void openScanner()} /><Input label="O código manual (emulador)" value={code} onChangeText={setCode} autoCapitalize="none" />{parsePair(code) && <Body>QR detectado. Pulsa Vincular pantalla para confirmar.</Body>}<Button title="Vincular pantalla" disabled={!parsePair(code)} onPress={() => void pair()} /></Card>
    {editId && <Card><Input label="Nombre" value={name} onChangeText={setName} /><Input label="Ubicación opcional" value={location} onChangeText={setLocation} /><Row><Button title="Guardar" onPress={() => void saveName()} /><Button title="Cancelar" kind="secondary" onPress={() => setEditId(null)} /></Row></Card>}
    {!tvs.length && <Card><Body>Aún no hay TVs vinculadas. La app de TV deberá generar el QR.</Body></Card>}
    {tvs.map(tv => <Card key={tv.id}><Label>{tv.name}</Label><Body>{tv.location || 'Sin ubicación'}</Body><Body muted>Sección: {tv.screen?.section ? sectionNames[tv.screen.section as Section] ?? tv.screen.section : 'Sin asignar'} · Vinculada; estado de conexión no disponible.</Body>
      <Row><Button title="Editar" kind="secondary" onPress={() => { setEditId(tv.id); setName(tv.name); setLocation(tv.location ?? ''); }} /><Button title="Desvincular" kind="danger" onPress={() => unpair(tv.id, tv.name)} /></Row></Card>)}
    <Label>Asignar sección a una o varias pantallas</Label><Row>{(['services_hours','notices','cashier'] as Section[]).map(section => <Button key={section} title={sectionNames[section]} kind="secondary" onPress={() => setPublish(section)} />)}</Row>
    <Body muted>Para bienvenida y multimedia, primero selecciona el mensaje o archivo desde su apartado.</Body>
    {publish && <TvPicker visible onClose={() => { setPublish(null); void load(); }} section={publish} />}
    <Modal visible={scanner} onRequestClose={() => setScanner(false)} animationType="slide"><View style={styles.cameraWrap}><CameraView style={styles.camera} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={scanner ? ({ data }) => scanned(data) : undefined} /><Button title="Cerrar cámara" onPress={() => setScanner(false)} /></View></Modal>
  </Screen>;
}

const styles = StyleSheet.create({ cameraWrap: { flex: 1, padding: 18, backgroundColor: '#111' }, camera: { flex: 1, marginBottom: 18 } });
