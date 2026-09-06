# Notas de entorno (Base44)

- El código de la app venía comprimido en `DCtuneHCamionFor.zip`; se extrajo a `DCtuneHC/`
  (fuente real editable). Es una app Expo / React Native para Android.
- Para la vista previa se corre **Expo Web** (`npx expo start --web --port 3000`) dentro de
  `docker-compose.base44.yml`. No hay backend ni base de datos y no requiere credenciales.
- `react-native-bluetooth-classic` es un módulo nativo que no existe en el navegador:
  `metro.config.js` lo sustituye en plataforma `web` por `src/bluetooth-classic.web.js`
  (stub). Por eso la vista previa se queda siempre en **modo DEMO**; el Bluetooth SPP real
  solo funciona en un development build de Android (`npx expo run:android`).
- La versión `^1.70.0` de `react-native-bluetooth-classic` no existe en npm; se fijó
  `1.73.0-rc.17`.
- No usar `CI=1` en el servicio web: desactiva el watch/hot reload de Metro.
- Verificación: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → 200 y el
  tablero muestra los medidores animados (RPM, velocidad, etc.).
