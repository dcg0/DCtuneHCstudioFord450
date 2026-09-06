export type SensorKey =
  | "rpm"
  | "speed"
  | "coolant"
  | "map"
  | "throttle"
  | "fuel"
  | "voltage"
  | "intake"
  | "afr";

export type Telemetry = Record<SensorKey, number>;
export type Sample = { time: number; value: number };
export type History = Record<SensorKey, Sample[]>;

export type SensorMeta = {
  key: SensorKey;
  label: string;
  unit: string;
  pid: string;
  source: string;
  range: [number, number];
  color: string;
  note: string;
};

export const SENSOR_META: SensorMeta[] = [
  { key: "rpm", label: "RÉGIMEN", unit: "RPM", pid: "010C", source: "Engine RPM", range: [0, 6500], color: "#ff633d", note: "Velocidad de giro calculada por la ECU." },
  { key: "speed", label: "VELOCIDAD", unit: "KM/H", pid: "010D", source: "Vehicle speed", range: [0, 160], color: "#19d9ff", note: "Velocidad reportada por la ECU, no sustituye el velocímetro legal." },
  { key: "coolant", label: "REFRIGERANTE", unit: "°C", pid: "0105", source: "Coolant temperature", range: [40, 130], color: "#ffc247", note: "Temperatura del refrigerante; PID estándar del motor." },
  { key: "map", label: "MAP", unit: "KPA", pid: "010B", source: "Intake manifold pressure", range: [0, 255], color: "#80aaff", note: "Presión absoluta del múltiple de admisión." },
  { key: "throttle", label: "ACELERADOR", unit: "%", pid: "0111", source: "Throttle position", range: [0, 100], color: "#21e6d0", note: "Apertura relativa del acelerador." },
  { key: "fuel", label: "COMBUSTIBLE", unit: "%", pid: "012F", source: "Fuel level input", range: [0, 100], color: "#51e58d", note: "Nivel de combustible publicado por el módulo." },
  { key: "voltage", label: "VOLTAJE", unit: "V", pid: "0142", source: "Control module voltage", range: [10, 16], color: "#d18bff", note: "Voltaje interno reportado por la ECU/OBD." },
  { key: "intake", label: "AIRE ADMISIÓN", unit: "°C", pid: "010F", source: "Intake air temperature", range: [-10, 100], color: "#58b8ff", note: "Temperatura del aire de admisión." },
  { key: "afr", label: "AFR", unit: ":1", pid: "0134", source: "O2 equivalence ratio", range: [10, 20], color: "#ff7bba", note: "AFR estimado desde equivalence ratio; requiere sensor compatible." },
];

export const PID_COMMANDS: Array<[string, SensorKey]> = SENSOR_META.map((sensor) => [sensor.pid, sensor.key]);

export const DEMO: Telemetry = {
  rpm: 820,
  speed: 0,
  coolant: 82,
  map: 36,
  throttle: 12,
  fuel: 78,
  voltage: 13.8,
  intake: 28,
  afr: 14.7,
};

export function emptyHistory(): History {
  return Object.fromEntries(SENSOR_META.map(({ key }) => [key, []])) as History;
}

export function parsePid(response: string, pid: number): number[] | null {
  const bytes = response
    .replace(/SEARCHING\.\.\.|NO DATA|UNABLE TO CONNECT|ERROR|>/gi, " ")
    .match(/\b[0-9a-f]{2}\b/gi)
    ?.map((value) => parseInt(value, 16)) ?? [];
  const index = bytes.findIndex((value, i) => value === 0x41 && bytes[i + 1] === pid);
  return index >= 0 ? bytes.slice(index + 2) : null;
}

export function decodePid(key: SensorKey, data: number[]): number | null {
  if (!data.length) return null;
  switch (key) {
    case "rpm":
      return data.length > 1 ? ((data[0] << 8) | data[1]) / 4 : null;
    case "speed":
      return data[0];
    case "coolant":
      return data[0] - 40;
    case "map":
      return data[0];
    case "throttle":
    case "fuel":
      return (data[0] * 100) / 255;
    case "voltage":
      return data.length > 1 ? ((data[0] << 8) | data[1]) / 1000 : null;
    case "intake":
      return data[0] - 40;
    case "afr": {
      if (data.length < 2) return null;
      const equivalenceRatio = (((data[0] << 8) | data[1]) * 2) / 65536;
      return equivalenceRatio > 0 ? 14.7 / equivalenceRatio : null;
    }
    default:
      return null;
  }
}

export function formatValue(value: number, key: SensorKey): string {
  return key === "voltage" || key === "afr" ? value.toFixed(1) : String(Math.round(value));
}
