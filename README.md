# ChecadorProject · Hotel Smart Display

Proyecto con dos aplicaciones Expo/React Native conectadas a un mismo backend de Supabase:

- `mobile/`: administración de pantallas, contenidos, empleados y turnos de caja.
- `tv/`: aplicación Android TV que se vincula por QR y muestra la sección asignada.
- `supabase/`: SQL del esquema y cambios posteriores, más la Edge Function `hotel-admin`.

## Configuración local

Requiere Node.js, npm y un proyecto Supabase configurado. En **cada** aplicación, copia `.env.example` a `.env.local` y configura la URL y la clave **publicable** del mismo proyecto. `.env.local` no se versiona. Nunca coloques una clave secreta o `service_role` en las aplicaciones; las variables `EXPO_PUBLIC_` quedan incorporadas al cliente.

Para instalar y ejecutar el móvil:

```powershell
cd mobile
npm ci
npm start
```

Para la TV, instala Android Studio, el SDK de Android y un emulador Android TV. Expo Go no es suficiente para esta app:

```powershell
cd tv
npm ci
npm run android
```

`tv/android/` es generado por Expo y se reconstruye con `npm run prebuild` o durante la compilación de Android; no está en Git.

## Backend

Las migraciones de `supabase/migrations/` están en orden lógico 001, 002, 003, 004 y la actualización con fecha. La Edge Function está en `supabase/functions/hotel-admin/`. En el proyecto de prueba original estos cambios ya fueron aplicados: **no los ejecutes otra vez allí**. Para un proyecto nuevo hay que revisar y aplicar la secuencia completa, crear/configurar el bucket y desplegar la función según corresponda.

El móvil usa inicio de sesión anónimo de Supabase; el dispositivo administrador debe estar autorizado en `admin_devices`. La TV también crea una sesión anónima y se vincula mediante un QR temporal. La protección de datos depende de las políticas RLS y de la validación de la Edge Function, no de ocultar la clave publicable.

Este repositorio contiene código y esquema, no los datos de empleados, las sesiones de Auth ni los archivos multimedia cargados en Storage. Los diseños y logotipos de terceros incluidos como referencia conservan los derechos de sus titulares.
