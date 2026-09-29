# Aplicación Android TV

Aplicación Expo/React Native TV para pantallas del hotel. Cada instalación presenta un QR temporal para vincularse con la app móvil y muestra una sección fija asignada desde ella: bienvenida, servicios y horarios, multimedia, avisos o turno de caja.

## Arranque

1. Instala Node.js, Android Studio, el SDK de Android y crea un AVD Android TV.
2. Ejecuta `npm ci` en esta carpeta.
3. Copia `.env.example` a `.env.local` y configura la misma URL y clave **publicable** de Supabase que usa el móvil.
4. Inicia el AVD y ejecuta `npm run android`. Expo Go no sirve para esta aplicación de TV.

El proyecto nativo `android/` se genera localmente y está ignorado por Git. Puedes regenerarlo con `npm run prebuild`; el script de Android también prepara lo necesario para compilar. Para vincular, escanea el QR desde la sección de pantallas de la app móvil. Si la red se interrumpe, la TV intenta reconectar; no hay una caché multimedia persistente.

La TV utiliza solo la clave publicable. No almacenes claves `service_role`, PIN ni datos biométricos en ella. La carpeta raíz `../supabase/` contiene los archivos de backend compartidos. El diseño incluye recursos visuales inspirados en Hotel Xcaret México; los logotipos de terceros conservan los derechos de sus titulares.
