import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Body, Button, Card, colors, Feedback, Loading, Screen, Title } from '@/components/hotel-ui';
import { useAuth } from '@/lib/auth';

const menu = [
  { title: 'Pantallas', path: '/pantallas', detail: 'Vincular, renombrar y asignar TVs' },
  { title: 'Bienvenidas', path: '/bienvenidas', detail: 'Mensajes de bienvenida' },
  { title: 'Servicios y horarios', path: '/servicios', detail: 'Información para huéspedes' },
  { title: 'Multimedia', path: '/multimedia', detail: 'Imágenes y videos promocionales' },
  { title: 'Avisos', path: '/avisos', detail: 'Avisos importantes' },
  { title: 'Empleados', path: '/empleados', detail: 'Personal y PIN de caja' },
  { title: 'Turnos de caja', path: '/caja', detail: 'Iniciar o finalizar turno' },
] as const;

export default function Home() {
  const auth = useAuth();

  if (auth.status === 'loading') return <Screen><Loading label="Preparando acceso…" /></Screen>;
  if (auth.status === 'pending' || auth.status === 'revoked') return <Screen>
    <Title subtitle="Este celular todavía no puede modificar el contenido del hotel.">{auth.status === 'pending' ? 'Pendiente de autorización' : 'Acceso revocado'}</Title>
    <Card><Body>UID de esta instalación:</Body><Text selectable style={styles.uid}>{auth.userId}</Text>
      <Button title="Copiar UID" kind="secondary" onPress={() => void Clipboard.setStringAsync(auth.userId ?? '')} /></Card>
    <Card><Body>En Supabase, agrega este UID en public.admin_devices con el hotel_id correcto y enabled=true. Esta app no se autoriza a sí misma.</Body></Card>
    <Button title="Comprobar de nuevo" onPress={() => void auth.refresh()} />
  </Screen>;
  if (auth.status === 'error') return <Screen><Title>Error de acceso</Title><Feedback message={auth.error} error /><Button title="Reintentar" onPress={() => void auth.refresh()} /></Screen>;
  return <Screen>
    <Title subtitle="Administra el contenido de las pantallas de tu hotel.">Panel del hotel</Title>
    {menu.map((item) => <Pressable key={item.path} accessibilityRole="button" onPress={() => router.push(item.path)} style={styles.menu}>
      <View><Text style={styles.menuTitle}>{item.title}</Text><Text style={styles.small}>{item.detail}</Text></View><Text style={styles.arrow}>›</Text>
    </Pressable>)}
  </Screen>;
}

const styles = StyleSheet.create({
  uid: { fontSize: 13, color: colors.ink },
  small: { color: colors.muted, fontSize: 13 }, menu: { padding: 18, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menuTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' }, arrow: { color: colors.teal, fontSize: 30 },
});
