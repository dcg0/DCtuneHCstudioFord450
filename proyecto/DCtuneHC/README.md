# DC Tune HC Studio · Multi-plataforma

Aplicación nativa Expo/React Native para **Android, iOS y Web**. Usa Bluetooth clásico SPP en dispositivos móviles, conectándose al ELM327 Mini para monitoreo OBD-II en tiempo real.

---

## 📥 Descargas Rápidas

### 🤖 Android
```bash
# Instalar desde código fuente
npm install
npx expo prebuild --clean
npx expo run:android
```
**[Descargar APK directamente](#)** | [Guía de instalación](#)

### 🍎 iOS (macOS requerido)
```bash
npm install
npx expo prebuild --platform ios --clean
npx expo run:ios
```
**[Próximamente en App Store](#)** | [Requisitos](#)

### 🌐 Web
```bash
npm install
npx expo web
```
**[Abrir en navegador](#)** | [Demo en línea](#)

---

## ⚙️ Requisitos

- **Node.js** 18+
- **npm** o **yarn**
- **Expo CLI**: `npm install -g expo-cli`

**Plataforma específica:**
- **Android**: Android Studio + SDK
- **iOS**: Xcode (solo macOS)
- **Web**: Navegador moderno

---

## 🚀 Compilar para Producción

### Android APK Release
```bash
eas build --platform android --release
```

### iOS App Store
```bash
eas build --platform ios
eas submit --platform ios
```

### Web Deploy
```bash
npm run build
# Subir carpeta 'dist' a tu hosting
```

---

## 📋 Flujo de la Aplicación

1. **Empareja el ELM327** desde Ajustes del dispositivo
2. **Abre la app** y pulsa **BUSCAR ELM327**
3. **Selecciona** el dispositivo emparejado
4. La app inicializa automáticamente:
   - `ATZ` (reset)
   - `ATE0` (echo off)
   - `ATL0` (line feed off)
   - `ATS0` (spaces off)
   - `ATAT1` (adaptive timing)
   - `ATST64` (timeout)
   - `ATSP0` (protocolo automático)
5. **Consulta ATDP** y solicita máscara de PIDs `0100`
6. **Toca cualquier sensor** para ver:
   - Valor actual
   - Gráfica de tendencia
   - Frecuencia, mín, máx, promedio
   - Tabla de muestras

---

## 📊 PIDs Monitorizados

| PID | Parámetro | Unidad |
|-----|-----------|--------|
| `010C` | RPM | rev/min |
| `010D` | Velocidad | km/h |
| `0105` | Temperatura refrigerante | °C |
| `010B` | MAP (presión admisión) | kPa |
| `0111` | Posición acelerador | % |
| `012F` | Nivel combustible | % |
| `0142` | Voltaje batería | V |
| `010F` | Temperatura aire admisión | °C |
| `0134` | AFR (equivalence ratio) | λ |

> **Nota**: La ECU y el adaptador ELM327 pueden no publicar todos los PIDs. La app muestra solo lo que realmente responde.

---

## 🔧 Configuración Multi-Plataforma

Ver [`app.json`](./app.json) para permisos, identificadores y configuración específica por plataforma:

- **Android**: Permisos Bluetooth, ubicación, versión
- **iOS**: Bundle ID, privacidad (NSBluetoothCentralUsageDescription)
- **Web**: Configuración PWA

---

## 🛠️ Desarrollo

### Estructura
```
proyecto/DCtuneHC/
├── app.json           # Configuración Expo
├── package.json       # Dependencias
├── App.tsx            # Componente principal
└── src/
    ├── components/    # Componentes reutilizables
    ├── screens/       # Pantallas de la app
    └── services/      # Servicios (Bluetooth, OBD-II)
```

### Dependencias principales
- `react-native@0.79.2`
- `expo@~53.0.0`
- `react-native-bluetooth-classic@^1.73.0-rc.17`

### Hot Reload
```bash
npx expo start
# Presiona 'a' para Android, 'i' para iOS, 'w' para web
```

---

## ⚠️ Limitaciones & Notas Importantes

- `react-native-bluetooth-classic` requiere **development build** (no funciona con Expo Go)
- **Web**: No soporta Bluetooth clásico SPP, solo lectura simulada
- **ELM327**: Acceso solo lectura, sin modificación de mapas ECU
- **Adaptadores clones**: Pueden no soportar todos los PIDs

---

## 📝 Licencia & Derechos

© 2026 DC tune HC Studio — Todos los derechos reservados

---

## 📞 Soporte

- 🐛 [Reportar un bug](#)
- 💬 [Contacto](#)
- 🌐 [Sitio web](#)
