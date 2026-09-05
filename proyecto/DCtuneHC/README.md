# DC Tune HC Studio · Android

Aplicación nativa Expo/React Native para Android. Usa Bluetooth clásico SPP,
que es el transporte habitual del ELM327 Mini de la fotografía; por eso no
depende de Web Serial ni de Chrome.

## Ejecutar

```bash
npm install
npx expo prebuild
npx expo run:android
```

`react-native-bluetooth-classic` necesita un **development build**. Expo Go no
incluye el módulo nativo y no puede conectarse directamente al ELM327 SPP.

## Flujo

1. Empareja el ELM327 desde Ajustes de Android.
2. Abre la app y pulsa **BUSCAR ELM327**.
3. Selecciona el dispositivo emparejado.
4. La app inicializa ATZ/ATE0/ATL0/ATS0/ATAT1/ATST64/ATSP0, consulta ATDP y
   solicita la máscara de PIDs `0100` antes de iniciar el sondeo.
5. Toca cualquier sensor para abrir su pantalla completa: valor actual,
   gráfica de tendencia, frecuencia observada, mínimo, máximo, promedio y
   tabla de muestras.
6. La terminal queda también al final de cada pantalla de sensor. Prueba
   `ATI`, `ATDP`, `0100`, `010C` o `010D`.

Si el adaptador no aparece, no está emparejado o el clon no implementa un PID,
la app mantiene el modo DEMO. El ELM327 es solo lectura OBD-II: no modifica
mapas de la ECU.

## PIDs monitorizados

`010C` RPM, `010D` velocidad, `0105` refrigerante, `010B` MAP, `0111`
acelerador, `012F` combustible, `0142` voltaje, `010F` aire de admisión y
`0134` AFR mediante equivalence ratio. La ECU y el clon ELM327 pueden no
publicar todos los PIDs; la app muestra lo que realmente responde y no
presenta una lectura DEMO como dato real.

El arte visual adjunto se muestra al final del tablero como identidad de la
entrega. No se interpreta como un código QR legible si la imagen no contiene
un patrón QR.