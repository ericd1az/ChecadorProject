import * as LocalAuthentication from 'expo-local-authentication';

/** Confirms the phone owner locally; the app never receives the device PIN. */
export async function confirmDeviceOwner(promptMessage: string): Promise<boolean> {
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  if (level === LocalAuthentication.SecurityLevel.NONE) {
    throw new Error('Configura una huella, rostro o PIN de desbloqueo en los ajustes del celular.');
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    promptSubtitle: 'Huella, rostro o PIN del celular',
    fallbackLabel: 'Usar PIN del celular',
    disableDeviceFallback: false,
    biometricsSecurityLevel: 'strong',
  });
  if (!result.success && (result.error === 'not_available' || result.error === 'passcode_not_set')) {
    throw new Error('No hay un método de desbloqueo compatible configurado en este celular.');
  }
  return result.success;
}
