import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, colors, Feedback, Screen, Title } from './hotel-ui';
import { useHotelId } from '@/lib/auth';
import { assignScreens, listScreens, type Section } from '@/lib/screens';
import { errorText } from '@/lib/format';

export function TvPicker({ visible, onClose, section, selectedId }: { visible: boolean; onClose: () => void; section: Section; selectedId?: string }) {
  const hotelId = useHotelId();
  const [tvs, setTvs] = useState<Awaited<ReturnType<typeof listScreens>>>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { try { setTvs(await listScreens(hotelId)); setError(null); } catch (e) { setError(errorText(e)); } }, [hotelId]);
  useEffect(() => { if (visible) { setChosen([]); void load(); } }, [visible, load]);
  async function show() {
    setBusy(true);
    try { await assignScreens(hotelId, chosen, section, selectedId); onClose(); }
    catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <Screen><Title subtitle="El contenido permanecerá fijo hasta que lo cambies.">Elegir pantallas</Title>
      <Feedback message={error} error />
      {tvs.length === 0 ? <Card><Body>No hay pantallas vinculadas.</Body></Card> : tvs.map(tv => <Pressable key={tv.id} accessibilityRole="checkbox" accessibilityState={{ checked: chosen.includes(tv.id) }} style={styles.choice}
        onPress={() => setChosen(current => current.includes(tv.id) ? current.filter(id => id !== tv.id) : [...current, tv.id])}>
        <Text style={styles.check}>{chosen.includes(tv.id) ? '☑' : '□'}</Text><View><Text style={styles.name}>{tv.name}</Text><Text style={styles.sub}>{tv.location || 'Sin ubicación'}</Text></View>
      </Pressable>)}
      <Button title={busy ? 'Publicando…' : `Mostrar en ${chosen.length} pantalla(s)`} disabled={busy || !chosen.length} onPress={() => void show()} />
      <Button title="Cancelar" kind="secondary" onPress={onClose} />
    </Screen>
  </Modal>;
}

const styles = StyleSheet.create({ choice: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.surface, padding: 15, borderRadius: 13, borderWidth: 1, borderColor: colors.border }, check: { fontSize: 26, color: colors.teal }, name: { color: colors.ink, fontSize: 16, fontWeight: '700' }, sub: { color: colors.muted, fontSize: 12 } });
