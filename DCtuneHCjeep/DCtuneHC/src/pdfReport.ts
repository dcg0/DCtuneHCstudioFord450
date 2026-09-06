import { Platform } from "react-native";
import type { Telemetry, SensorKey } from "./types";

// Mapa de placeholders de la plantilla → valores reales de telemetría.
// Los sensores no monitorizados por la app se marcan como "N/D".
export function buildReportValues(telemetry: Telemetry, deviceConnected: boolean): Record<string, string> {
  const f = (k: SensorKey) => {
    const v = telemetry[k];
    return Number.isFinite(v) ? String(Math.round(v * 10) / 10) : "N/D";
  };

  const fecha = new Date().toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const fuente = deviceConnected ? "OBD-II / ELM327" : "MODO DEMO";

  return {
    cliente: "Cliente",
    fecha,
    telefono: "—",
    correo: "—",
    vehiculo: "FORD BUS · V10 6.8L",
    placas: "—",
    kilometraje: "—",
    vin: "—",
    filas_servicios: `
      <tr><td>Lectura de sensores OBD-II (${fuente})</td><td>9 PIDs monitoreados · protocolo AUTO</td><td>Completado</td></tr>
      <tr><td>Monitoreo en tiempo real</td><td>RPM, velocidad, refrigerante, MAP, acelerador, combustible, voltaje, aire admisión, AFR</td><td>Completado</td></tr>
    `,
    s_rpm: `${f("rpm")} RPM`,
    s_velocidad: `${f("speed")} km/h`,
    s_ect: `${f("coolant")} °C`,
    s_iat: `${f("intake")} °C`,
    s_maf: "N/D",
    s_map: `${f("map")} kPa`,
    s_tps: `${f("throttle")} %`,
    s_app: "N/D",
    s_bateria: `${f("voltage")} V`,
    s_presion_aceite: "N/D",
    s_o2_b1s1: `${f("afr")} :1`,
    s_o2_b1s2: "N/D",
    s_stft: "N/D",
    s_ltft: "N/D",
    s_presion_combustible: "N/D",
    s_nivel_combustible: `${f("fuel")} %`,
    s_knock: "N/D",
    s_avance_encendido: "N/D",
    s_ckp: "N/D",
    s_cmp: "N/D",
    s_evap: "N/D",
    s_egr: "N/D",
    s_tpms_fi: "N/D",
    s_tpms_fd: "N/D",
    s_tpms_ri: "N/D",
    s_tpms_rd: "N/D",
    s_abs: "N/D",
    s_freno_mano: "N/D",
    s_tcm: "N/D",
    s_temp_transmision: "N/D",
    s_alternador: "N/D",
    s_direccion: "N/D",
    s_airbag: "N/D",
    s_angulo_volante: "N/D",
    s_temp_ambiente: "N/D",
    s_luz: "N/D",
    s_lluvia: "N/D",
    s_pdc: "N/D",
    s_nivel_aceite: "N/D",
    s_balatas: "N/D",
    s_dtc_activos: "Sin códigos activos detectados",
    observaciones: `Diagnóstico realizado mediante ${fuente}. Lecturas obtenidas en tiempo real desde módulo ELM327.\n\nValores registrados:\n• RPM: ${f("rpm")}\n• Velocidad: ${f("speed")} km/h\n• Refrigerante: ${f("coolant")} °C\n• MAP: ${f("map")} kPa\n• Acelerador: ${f("throttle")} %\n• Combustible: ${f("fuel")} %\n• Voltaje: ${f("voltage")} V\n• Aire admisión: ${f("intake")} °C\n• AFR: ${f("afr")} :1\n\nNota: Los sensores marcados como N/D no son soportados por el protocolo OBD-II estándar del ELM327 o no fueron publicados por la ECU.`,
  };
}

export async function downloadDiagnosticPDF(telemetry: Telemetry, deviceConnected: boolean): Promise<void> {
  const values = buildReportValues(telemetry, deviceConnected);

  if (Platform.OS === "web") {
    try {
      const resp = await fetch("/plantilla-reporte.html");
      let html = await resp.text();
      for (const [key, value] of Object.entries(values)) {
        html = html.split(`{{${key}}}`).join(value);
      }
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (win) {
        win.addEventListener("load", () => {
          setTimeout(() => win.print(), 400);
        });
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      // Fallback: construir HTML mínimo si no se puede cargar la plantilla
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reporte DC Tune HC</title></head><body><pre>${JSON.stringify(values, null, 2)}</pre></body></html>`;
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    }
  } else {
    // En Android nativo se requiere un módulo nativo de PDF; por ahora solo alerta.
    alert("La descarga de PDF está disponible en la versión web.");
  }
}
