# Aplicación móvil

Aplicación Expo/React Native para administrar las pantallas del hotel. Permite vincular TVs por QR, crear y mostrar bienvenidas, servicios y horarios, avisos, imágenes y videos, así como gestionar empleados y turnos de caja.

## Arranque

1. Ejecuta `npm ci` en esta carpeta.
2. Copia `.env.example` a `.env.local` y configura `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con los datos del mismo proyecto usado por la TV.
3. Habilita Anonymous Sign-Ins en Supabase Auth. Autoriza el UID de la instalación administradora en `admin_devices`; no se autoautoriza.
4. Ejecuta `npm start` y abre la app en el dispositivo o emulador correspondiente.

La app usa únicamente la clave publicable y una sesión anónima; las acciones privilegiadas pasan por la Edge Function `hotel-admin`. No pongas `service_role` ni otras credenciales privadas en `EXPO_PUBLIC_`. La carpeta raíz `../supabase/` contiene el SQL y el código de la función necesarios para el backend. En el proyecto original las migraciones ya se aplicaron, por lo que no deben ejecutarse de nuevo allí.

La biometría o el PIN del teléfono son verificaciones locales del dispositivo; el PIN personal del empleado es el que permite localizar su registro para operar su turno. Los datos y medios del hotel permanecen en Supabase y no se incluyen en este repositorio.
