import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/lib/auth';
import { colors } from '@/components/hotel-ui';

export default function RootLayout() {
  return <AuthProvider><StatusBar style="dark" /><AppRoutes /></AuthProvider>;
}

function AppRoutes() {
  const { status } = useAuth();
  return <Stack screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.ink, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="index" options={{ title: 'Hotel Display' }} />
    <Stack.Protected guard={status === 'ready'}>
    <Stack.Screen name="pantallas" options={{ title: 'Pantallas' }} />
    <Stack.Screen name="bienvenidas" options={{ title: 'Bienvenidas' }} />
    <Stack.Screen name="servicios" options={{ title: 'Servicios y horarios' }} />
    <Stack.Screen name="multimedia" options={{ title: 'Multimedia' }} />
    <Stack.Screen name="avisos" options={{ title: 'Avisos importantes' }} />
    <Stack.Screen name="empleados" options={{ title: 'Empleados' }} />
    <Stack.Screen name="caja" options={{ title: 'Turnos de caja' }} />
    </Stack.Protected>
  </Stack>;
}
