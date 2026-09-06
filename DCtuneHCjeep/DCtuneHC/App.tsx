import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import BluetoothClassic from "react-native-bluetooth-classic";
import {
  SENSOR_META,
  PID_COMMANDS,
  DEMO,
  emptyHistory,
  parsePid,
  decodePid,
  formatValue,
} from "./src/types";
import type { SensorKey, Telemetry, History, SensorMeta } from "./src/types";
import { downloadDiagnosticPDF } from "./src/pdfReport";

type Device = {
  address: string;
  name?: string;
  write: (data: string) => Promise<void>;
  onDataReceived: (listener: (event: { data: string }) => void) => { remove: () => void };
  disconnect: () => Promise<void>;
};

function GaugeTile({ sensor, value, onPress }: { sensor: SensorMeta; value: number; onPress: () => void }) {
  const [min, max] = sensor.range;
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return (
    <Pressable style={styles.tile} onPress={onPress}>
      <View style={[styles.tileAccent, { backgroundColor: sensor.color }]} />
      <View style={styles.tileBody}>
        <View style={styles.tileHeader}>
          <Text style={styles.tileLabel}>{sensor.label}</Text>
          <Text style={styles.tilePid}>{sensor.pid}</Text>
        </View>
        <View style={styles.tileReadout}>
          <Text style={[styles.tileValue, { color: sensor.color }]}>{formatValue(value, sensor.key)}</Text>
          <Text style={styles.tileUnit}>{sensor.unit}</Text>
        </View>
        <View style={styles.tileBar}>
          <View style={[styles.tileBarFill, { width: `${pct * 100}%`, backgroundColor: sensor.color }]} />
        </View>
        <View style={styles.tileFooter}>
          <Text style={styles.tileRange}>{min} – {max}</Text>
          <Text style={styles.tileExpand}>⤢</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function App() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [device, setDevice] = useState<Device | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry>(DEMO);
  const [histories, setHistories] = useState<History>(emptyHistory);
  const [selectedSensor, setSelectedSensor] = useState<SensorKey | null>(null);
  const [demo, setDemo] = useState(true);
  const [command, setCommand] = useState("");
  const [protocol, setProtocol] = useState("AUTO · esperando");
  const [terminal, setTerminal] = useState("DC Tune HC · Terminal lista\nModo DEMO · empareja un ELM327 para iniciar");
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadPDF() {
    setDownloading(true);
    try {
      await downloadDiagnosticPDF(telemetry, Boolean(device));
    } finally {
      setDownloading(false);
    }
  }
  const readerCleanup = useRef<(() => void) | null>(null);
  const elmBuffer = useRef("");
  const historyRef = useRef<History>(emptyHistory());
  const elmQueue = useRef(Promise.resolve());

  function appendTerminal(line: string) {
    if (!line.trim()) return;
    setTerminal((current) => `${current}\n${line}`.split("\n").slice(-90).join("\n"));
  }

  function queueWrite(target: Device, value: string, settleMs = 0) {
    const job = elmQueue.current.then(async () => {
      await target.write(`${value}\r`);
      if (settleMs) await wait(settleMs);
    });
    elmQueue.current = job.catch(() => undefined);
    return job;
  }

  function applyTelemetry(patch: Partial<Telemetry>) {
    setTelemetry((current) => ({ ...current, ...patch }));
    const nextHistory: History = { ...historyRef.current };
    const now = Date.now();
    (Object.entries(patch) as Array<[SensorKey, number]>).forEach(([key, value]) => {
      if (!Number.isFinite(value)) return;
      nextHistory[key] = [...nextHistory[key], { time: now, value }].slice(-60);
    });
    historyRef.current = nextHistory;
    setHistories(nextHistory);
  }

  useEffect(() => {
    let tick = 0;
    const timer = setInterval(() => {
      if (!demo) return;
      tick += 0.08;
      applyTelemetry({
        rpm: Math.round(700 + Math.abs(Math.sin(tick * 0.7)) * 3900),
        speed: Math.round(Math.abs(Math.sin(tick * 0.25)) * 92),
        coolant: Math.round(82 + Math.sin(tick * 0.12) * 7),
        map: Math.round(30 + Math.abs(Math.sin(tick * 0.5)) * 55),
        throttle: Math.round(Math.abs(Math.sin(tick * 0.33)) * 82),
        fuel: Math.round(62 + Math.sin(tick * 0.08) * 20),
        voltage: Number((13.7 + Math.sin(tick * 0.4) * 0.3).toFixed(1)),
        intake: Math.round(28 + Math.sin(tick * 0.2) * 4),
        afr: Number((14.7 + Math.sin(tick * 0.3) * 1.2).toFixed(1)),
      });
    }, 120);
    return () => clearInterval(timer);
  }, [demo]);

  useEffect(() => () => {
    readerCleanup.current?.();
    if (device) device.disconnect().catch(() => undefined);
  }, [device]);

  async function requestBluetoothPermissions() {
    if (Platform.OS !== "android" || Platform.Version < 31) return true;
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return Object.values(result).every((value) => value === PermissionsAndroid.RESULTS.GRANTED);
  }

  async function loadDevices() {
    const allowed = await requestBluetoothPermissions();
    if (!allowed) {
      Alert.alert("Permisos necesarios", "Activa Bluetooth cercano para buscar el ELM327.");
      return;
    }
    try {
      const bonded = await BluetoothClassic.getBondedDevices();
      setDevices(bonded);
      if (!bonded.length) {
        Alert.alert("Sin dispositivos emparejados", "Empareja el ELM327 desde Ajustes de Android y vuelve a buscar.");
      }
    } catch (error) {
      appendTerminal(`! No se pudieron listar dispositivos: ${String(error)}`);
    }
  }

  async function connect(selected: Device) {
    try {
      const connected = await BluetoothClassic.connectToDevice(selected.address);
      setDevice(connected);
      setDevices([]);
      setDemo(false);
      setProtocol("AUTO · inicializando");
      appendTerminal(`✓ Conectado: ${selected.name || selected.address}`);

      const subscription = connected.onDataReceived(({ data }) => {
        elmBuffer.current += data;
        appendTerminal(data.trim());
        if (!elmBuffer.current.includes(">")) return;
        const response = elmBuffer.current;
        elmBuffer.current = "";
        const updates: Partial<Telemetry> = {};
        for (const [commandName, key] of PID_COMMANDS) {
          const bytes = parsePid(response, parseInt(commandName.slice(2), 16));
          const decoded = bytes ? decodePid(key, bytes) : null;
          if (decoded !== null) updates[key] = decoded;
        }
        if (/CAN|ISO|SAE|J1850|KWP|USER/i.test(response)) setProtocol(response.replace(/\s+/g, " ").trim().slice(0, 42));
        if (Object.keys(updates).length) applyTelemetry(updates);
      });
      readerCleanup.current = () => subscription.remove();

      for (const init of ["ATZ", "ATE0", "ATL0", "ATS0", "ATH0", "ATAT1", "ATST64", "ATSP0"]) {
        await queueWrite(connected, init, 260);
      }
      await queueWrite(connected, "ATDP", 450);
      await queueWrite(connected, "0100", 450);
      appendTerminal("✓ Inicialización completa · protocolo y PIDs solicitados");
      setProtocol("AUTO · verificación 0100 enviada");
      pollObd(connected);
    } catch (error) {
      setDemo(true);
      setProtocol("ERROR DE CONEXIÓN");
      appendTerminal(`! Error de conexión: ${String(error)}`);
    }
  }

  async function pollObd(connected: Device) {
    for (const [commandName] of PID_COMMANDS) {
      try {
        await queueWrite(connected, commandName, 210);
      } catch {
        appendTerminal("! ELM327 desconectado");
        setDevice(null);
        setDemo(true);
        setProtocol("DESCONECTADO");
        return;
      }
    }
    setTimeout(() => pollObd(connected), 180);
  }

  async function sendCommand() {
    const value = command.trim().toUpperCase();
    if (!value) return;
    setCommand("");
    appendTerminal(`> ${value}`);
    if (!device) {
      appendTerminal("! Conecta un ELM327; no se envían comandos en DEMO");
      return;
    }
    try {
      await queueWrite(device, value);
    } catch (error) {
      appendTerminal(`! ${String(error)}`);
    }
  }

  function openSensor(key: SensorKey) {
    setSelectedSensor(key);
  }

  function renderTerminal() {
    return (
      <View style={styles.terminalCard}>
        <View style={styles.terminalHeader}>
          <Text style={styles.sectionTitle}>TERMINAL ELM327</Text>
          <Text style={styles.hint}>ATI · ATDP · 0100 · 010C</Text>
        </View>
        <Text style={styles.terminal}>{terminal}</Text>
        <View style={styles.commandRow}>
          <TextInput
            value={command}
            onChangeText={setCommand}
            onSubmitEditing={sendCommand}
            placeholder="Escribe AT u OBD-II"
            placeholderTextColor="#536574"
            autoCapitalize="characters"
            style={styles.input}
          />
          <Pressable style={styles.send} onPress={sendCommand}>
            <Text style={styles.sendText}>ENVIAR</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const activeMeta = SENSOR_META.find((sensor) => sensor.key === selectedSensor);
  const activeHistory = selectedSensor ? histories[selectedSensor] : [];
  const activeStats = activeHistory.length
    ? {
        latest: activeHistory[activeHistory.length - 1].value,
        min: Math.min(...activeHistory.map((sample) => sample.value)),
        max: Math.max(...activeHistory.map((sample) => sample.value)),
        avg: activeHistory.reduce((sum, sample) => sum + sample.value, 0) / activeHistory.length,
        hz: activeHistory.length > 1
          ? (activeHistory.length - 1) / Math.max((activeHistory[activeHistory.length - 1].time - activeHistory[0].time) / 1000, 0.001)
          : 0,
      }
    : { latest: 0, min: 0, max: 0, avg: 0, hz: 0 };
  const chartSamples = activeHistory.slice(-34);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" hidden />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.identity}>
            <Image source={require("./assets/logo.png")} style={styles.logo} />
            <View>
              <Text style={styles.kicker}>DC TUNE HC STUDIO</Text>
              <Text style={styles.title}>FORD BUS · V10 6.8L</Text>
              <Text style={styles.subtitle}>OBD-II / ELM327 MINI · MONITOREO PROFESIONAL</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.status, device && styles.statusLive]}>
              <Text style={styles.statusText}>{device ? "● ELM327 CONECTADO" : "○ MODO DEMO"}</Text>
            </View>
            <Pressable style={styles.button} onPress={loadDevices}>
              <Text style={styles.buttonText}>BUSCAR ELM327</Text>
            </Pressable>
          </View>
        </View>

        {devices.length > 0 && (
          <View style={styles.deviceList}>
            <Text style={styles.sectionLabel}>DISPOSITIVOS EMPAREJADOS</Text>
            {devices.map((item) => (
              <Pressable key={item.address} style={styles.deviceRow} onPress={() => connect(item)}>
                <Text style={styles.deviceName}>{item.name || "ELM327 Bluetooth"}</Text>
                <Text style={styles.deviceAddress}>{item.address}  ›</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.protocolCard}>
          <Text style={styles.protocolLabel}>PROTOCOLO ELM327</Text>
          <Text style={styles.protocolValue}>{protocol}</Text>
          <Text style={styles.protocolHint}>ATZ · ATE0 · ATL0 · ATS0 · ATAT1 · ATST64 · ATSP0 · ATDP · 0100</Text>
        </View>

        <View style={styles.cluster}>
          {SENSOR_META.map((sensor) => (
            <GaugeTile key={sensor.key} sensor={sensor} value={telemetry[sensor.key]} onPress={() => openSensor(sensor.key)} />
          ))}
        </View>

        <View style={styles.metrics}>
          <View style={styles.metric}><Text style={styles.metricLabel}>TRANSPORTE</Text><Text style={styles.metricValue}>FORD V10 · 10 CIL.</Text></View>
          <View style={styles.metric}><Text style={styles.metricLabel}>FUENTE</Text><Text style={styles.metricValue}>{device ? "OBD-II REAL" : "DEMO SEGURA"}</Text></View>
          <View style={styles.metric}><Text style={styles.metricLabel}>MUESTREO</Text><Text style={styles.metricValue}>9 PIDs · AUTO</Text></View>
        </View>

        <Pressable style={styles.pdfButton} onPress={handleDownloadPDF} disabled={downloading}>
          <Text style={styles.pdfButtonText}>{downloading ? "GENERANDO..." : "⬇ DESCARGAR REPORTE PDF"}</Text>
        </Pressable>

        {renderTerminal()}

        <View style={styles.qrFooter}>
          <Image source={require("./assets/qr1_1788306298366.png")} style={styles.qrImage} />
          <Image source={require("./assets/qr_pistones.png")} style={styles.qrImage} />
          <Text style={styles.qrText}>DC TUNE HC · IDENTIDAD VISUAL · PISTONES VERIFICADOS</Text>
        </View>

        <Text style={styles.footer}>ELM327 solo lee PIDs OBD-II. La app no escribe mapas, no borra fallas automáticamente y no sustituye una ECU Speeduino.</Text>
      </ScrollView>

      <Modal visible={Boolean(activeMeta)} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setSelectedSensor(null)}>
        {activeMeta && (
          <View style={styles.detailScreen}>
            <ScrollView contentContainerStyle={styles.detailContent}>
              <View style={styles.detailHeader}>
                <View>
                  <Text style={styles.kicker}>MONITOR EN TIEMPO REAL · {activeMeta.pid}</Text>
                  <Text style={styles.detailTitle}>{activeMeta.label}</Text>
                  <Text style={styles.detailSubtitle}>{activeMeta.note}</Text>
                </View>
                <Pressable style={styles.closeButton} onPress={() => setSelectedSensor(null)}>
                  <Text style={styles.closeText}>CERRAR ×</Text>
                </Pressable>
              </View>

              <View style={styles.liveHero}>
                <Text style={[styles.liveHeroValue, { color: activeMeta.color }]}>{formatValue(telemetry[activeMeta.key], activeMeta.key)}</Text>
                <Text style={styles.liveHeroUnit}>{activeMeta.unit}</Text>
                <Text style={styles.liveHeroStatus}>{device ? "● DATO REAL · ELM327" : "○ DEMO EN TIEMPO REAL"}</Text>
              </View>

              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.sectionTitle}>GRÁFICA DE TENDENCIA</Text>
                  <Text style={styles.hint}>{chartSamples.length} muestras · {activeStats.hz.toFixed(1)} Hz</Text>
                </View>
                <View style={styles.chart}>
                  {chartSamples.map((sample, index) => {
                    const [min, max] = activeMeta.range;
                    const normalized = Math.max(0.04, Math.min(1, (sample.value - min) / (max - min)));
                    return (
                      <View key={`${sample.time}-${index}`} style={styles.chartColumn}>
                        <View style={[styles.chartBar, { height: `${normalized * 92}%`, backgroundColor: activeMeta.color }]} />
                      </View>
                    );
                  })}
                </View>
                <View style={styles.chartScale}><Text>{activeMeta.range[0]} {activeMeta.unit}</Text><Text>rango operativo</Text><Text>{activeMeta.range[1]} {activeMeta.unit}</Text></View>
              </View>

              <View style={styles.statsGrid}>
                {[
                  ["ACTUAL", formatValue(activeStats.latest, activeMeta.key)],
                  ["MÍNIMO", formatValue(activeStats.min, activeMeta.key)],
                  ["MÁXIMO", formatValue(activeStats.max, activeMeta.key)],
                  ["PROMEDIO", formatValue(activeStats.avg, activeMeta.key)],
                ].map(([label, value]) => (
                  <View style={styles.stat} key={label}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value} {activeMeta.unit}</Text></View>
                ))}
              </View>

              <View style={styles.tableCard}>
                <Text style={styles.sectionTitle}>TABLA DE MUESTRAS</Text>
                <View style={styles.tableRow}><Text style={styles.tableHead}>HORA</Text><Text style={styles.tableHead}>VALOR</Text><Text style={styles.tableHead}>FUENTE</Text></View>
                {activeHistory.slice(-10).reverse().map((sample) => (
                  <View style={styles.tableRow} key={sample.time}>
                    <Text style={styles.tableCell}>{new Date(sample.time).toLocaleTimeString()}</Text>
                    <Text style={styles.tableCell}>{formatValue(sample.value, activeMeta.key)} {activeMeta.unit}</Text>
                    <Text style={styles.tableCell}>{device ? "OBD-II" : "DEMO"}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.detailInfo}>
                <Text style={styles.detailInfoText}>PID {activeMeta.pid} · {activeMeta.source} · Frecuencia observada: {activeStats.hz.toFixed(2)} Hz · El soporte real depende de la ECU y del protocolo detectado.</Text>
              </View>

              <Pressable style={styles.pdfButton} onPress={handleDownloadPDF} disabled={downloading}>
                <Text style={styles.pdfButtonText}>{downloading ? "GENERANDO..." : "⬇ DESCARGAR REPORTE PDF"}</Text>
              </Pressable>

              {renderTerminal()}

              <View style={styles.detailQr}>
                <Image source={require("./assets/qr_pistones.png")} style={styles.detailQrImage} />
                <Text style={styles.detailQrText}>DC TUNE HC · VERIFICACIÓN PISTÓN {activeMeta.pid}</Text>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#05080b" },
  content: { padding: 22, paddingBottom: 34 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  headerRight: { alignItems: "flex-end", gap: 10 },
  identity: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 64, height: 64, borderRadius: 32, opacity: 0.95 },
  kicker: { color: "#18d9ff", fontSize: 12, fontWeight: "900", letterSpacing: 2 },
  title: { color: "#f4f7fb", fontSize: 26, fontWeight: "900", letterSpacing: 1.5, marginTop: 3 },
  subtitle: { color: "#748695", fontSize: 11, letterSpacing: 1.1, marginTop: 5 },
  status: { backgroundColor: "#251116", borderColor: "#d33d4a", borderWidth: 1, borderRadius: 7, paddingVertical: 7, paddingHorizontal: 11 },
  statusLive: { backgroundColor: "#0c2519", borderColor: "#39e58b" },
  statusText: { color: "#ff7180", fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  button: { backgroundColor: "#0d2834", borderColor: "#18d9ff", borderWidth: 1, borderRadius: 7, paddingVertical: 9, paddingHorizontal: 13 },
  buttonText: { color: "#b9f5ff", fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  deviceList: { backgroundColor: "#0c151c", borderColor: "#2f5968", borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12 },
  sectionLabel: { color: "#6d8797", fontSize: 10, fontWeight: "900", letterSpacing: 2, marginBottom: 8 },
  deviceRow: { flexDirection: "row", justifyContent: "space-between", borderTopColor: "#1d303b", borderTopWidth: 1, paddingVertical: 10 },
  deviceName: { color: "#e8f4f9", fontWeight: "800" },
  deviceAddress: { color: "#7fa8b8", fontSize: 12 },
  protocolCard: { backgroundColor: "#08151d", borderColor: "#234b5b", borderWidth: 1, borderRadius: 8, padding: 11, marginBottom: 14 },
  protocolLabel: { color: "#6f9dac", fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  protocolValue: { color: "#a8f5ff", fontSize: 13, fontWeight: "900", marginTop: 4 },
  protocolHint: { color: "#597382", fontSize: 10, marginTop: 5 },
  cluster: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: { width: "31.5%", backgroundColor: "#0b1218", borderColor: "#1e333e", borderWidth: 1, borderRadius: 10, overflow: "hidden" },
  tileAccent: { height: 3, width: "100%" },
  tileBody: { padding: 10 },
  tileHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  tileLabel: { color: "#8fa1ad", fontSize: 9, fontWeight: "900", letterSpacing: 1, flexShrink: 1 },
  tilePid: { color: "#4d6977", fontSize: 8, fontWeight: "700", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  tileReadout: { flexDirection: "row", alignItems: "baseline", gap: 3, marginBottom: 8 },
  tileValue: { fontSize: 22, fontWeight: "900", fontVariant: ["tabular-nums"] },
  tileUnit: { color: "#6d8797", fontSize: 9, fontWeight: "800" },
  tileBar: { height: 4, backgroundColor: "#1a2630", borderRadius: 2, overflow: "hidden" },
  tileBarFill: { height: "100%", borderRadius: 2 },
  tileFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 5 },
  tileRange: { color: "#4d6977", fontSize: 8, fontWeight: "700" },
  tileExpand: { color: "#3d6977", fontSize: 13, fontWeight: "900" },
  metrics: { flexDirection: "row", justifyContent: "space-between", marginVertical: 14, gap: 10 },
  metric: { flex: 1, backgroundColor: "#0b1218", borderColor: "#1e333e", borderWidth: 1, borderRadius: 8, padding: 12 },
  metricLabel: { color: "#637986", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  metricValue: { color: "#e7f8ff", fontSize: 14, fontWeight: "800", marginTop: 6 },
  terminalCard: { backgroundColor: "#081016", borderColor: "#394d5a", borderWidth: 1, borderRadius: 10, padding: 14, marginTop: 2 },
  terminalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { color: "#ffca58", fontSize: 13, fontWeight: "900", letterSpacing: 1.5 },
  hint: { color: "#6f8492", fontSize: 10 },
  terminal: { backgroundColor: "#020405", borderColor: "#1e2b33", borderWidth: 1, borderRadius: 6, color: "#70f4a6", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 12, minHeight: 140, padding: 10 },
  commandRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  input: { flex: 1, backgroundColor: "#020405", borderColor: "#41525d", borderWidth: 1, borderRadius: 6, color: "#fff", paddingHorizontal: 10, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  send: { backgroundColor: "#6f4b0c", borderColor: "#ffca58", borderWidth: 1, borderRadius: 6, justifyContent: "center", paddingHorizontal: 16 },
  sendText: { color: "#fff2c9", fontWeight: "900", fontSize: 11 },
  qrFooter: { alignItems: "center", backgroundColor: "#071d35", borderColor: "#195a78", borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 14 },
  qrImage: { width: 120, height: 120, borderRadius: 8, borderColor: "#2edcff", borderWidth: 1, marginHorizontal: 4 },
  qrText: { color: "#8dd9ec", fontSize: 10, letterSpacing: 1.4, fontWeight: "900", marginTop: 8 },
  footer: { color: "#536573", fontSize: 11, lineHeight: 17, marginTop: 15, textAlign: "center" },
  pdfButton: { backgroundColor: "#2b1a05", borderColor: "#d4af37", borderWidth: 1.5, borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 14 },
  pdfButtonText: { color: "#f0d878", fontSize: 13, fontWeight: "900", letterSpacing: 1.5 },
  detailScreen: { flex: 1, backgroundColor: "#03080c" },
  detailContent: { padding: 20, paddingBottom: 40 },
  detailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 14, borderBottomColor: "#24404d", borderBottomWidth: 1, paddingBottom: 14 },
  detailTitle: { color: "#f4fbff", fontSize: 30, fontWeight: "900", letterSpacing: 1, marginTop: 4 },
  detailSubtitle: { color: "#83a1af", fontSize: 12, marginTop: 5, maxWidth: 620 },
  closeButton: { backgroundColor: "#17232c", borderColor: "#718897", borderWidth: 1, borderRadius: 7, paddingVertical: 9, paddingHorizontal: 12 },
  closeText: { color: "#e3f5fb", fontSize: 11, fontWeight: "900" },
  liveHero: { alignItems: "center", paddingVertical: 22, backgroundColor: "#07131b", borderRadius: 12, marginTop: 14, borderColor: "#1a4656", borderWidth: 1 },
  liveHeroValue: { fontSize: 64, fontWeight: "900", fontVariant: ["tabular-nums"] },
  liveHeroUnit: { color: "#91aab6", fontSize: 15, fontWeight: "900", letterSpacing: 2 },
  liveHeroStatus: { color: "#68d89f", fontSize: 10, fontWeight: "900", letterSpacing: 1.5, marginTop: 9 },
  chartCard: { backgroundColor: "#071119", borderColor: "#203945", borderWidth: 1, borderRadius: 10, padding: 13, marginTop: 14 },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  chart: { height: 220, flexDirection: "row", alignItems: "flex-end", gap: 3, backgroundColor: "#061018", borderColor: "#1f3945", borderWidth: 1, borderRadius: 7, padding: 9 },
  chartColumn: { flex: 1, height: "100%", justifyContent: "flex-end" },
  chartBar: { minHeight: 4, borderRadius: 3, opacity: 0.88 },
  chartScale: { flexDirection: "row", justifyContent: "space-between", marginTop: 7 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  stat: { flex: 1, minWidth: 135, backgroundColor: "#091821", borderColor: "#1b3541", borderWidth: 1, borderRadius: 7, padding: 10 },
  statLabel: { color: "#6f8e9b", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  statValue: { color: "#e6fbff", fontSize: 17, fontWeight: "900", marginTop: 5 },
  tableCard: { backgroundColor: "#071119", borderColor: "#203945", borderWidth: 1, borderRadius: 10, padding: 13, marginTop: 12 },
  tableRow: { flexDirection: "row", justifyContent: "space-between", borderBottomColor: "#162a33", borderBottomWidth: 1, paddingVertical: 7 },
  tableHead: { color: "#6f8e9b", fontSize: 9, fontWeight: "900", width: "33%" },
  tableCell: { color: "#cceaf0", fontSize: 10, width: "33%", fontVariant: ["tabular-nums"] },
  detailInfo: { backgroundColor: "#08151d", borderColor: "#234b5b", borderWidth: 1, borderRadius: 8, padding: 11, marginTop: 12 },
  detailInfoText: { color: "#7ea5b3", fontSize: 11, lineHeight: 17 },
  detailQr: { alignItems: "center", backgroundColor: "#071d35", borderColor: "#195a78", borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 14 },
  detailQrImage: { width: 130, height: 130, borderRadius: 8, borderColor: "#2edcff", borderWidth: 1 },
  detailQrText: { color: "#8dd9ec", fontSize: 10, letterSpacing: 1.2, fontWeight: "900", marginTop: 8 },
});