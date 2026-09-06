import base64
import io
import json
import mimetypes
import os
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from weasyprint import HTML


ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"
ASSETS = ROOT / "assets"
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "5000"))


def esc(value: object) -> str:
    """Escape values before inserting them into the generated certificate."""
    text = "" if value is None else str(value)
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def logo_data_uri() -> str:
    image = ASSETS / "rojo.png"
    if not image.exists():
        return ""
    encoded = base64.b64encode(image.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def render_certificate(data: dict) -> str:
    telemetry = [
        ("Voltaje de Batería (CLT/Volt)", data.get("battery", "12.6 V"), data.get("batteryStatus", "Óptimo")),
        ("Revoluciones Motor (RPM)", data.get("rpm", "850 RPM"), data.get("rpmStatus", "Estable")),
        ("Presión / Mapeo Admis. (MAP)", data.get("map", "38 kPa"), data.get("mapStatus", "Normal")),
        ("Temperatura Refr. (CLT) / Aire (IAT)", data.get("temperature", "88 °C / 31 °C"), data.get("temperatureStatus", "Normal")),
        ("Posición Mariposa (TPS)", data.get("tps", "3.4 %"), data.get("tpsStatus", "Normal")),
        ("Mezcla / Mezcla Lambda (AFR)", data.get("afr", "14.7 : 1"), data.get("afrStatus", "Correcta")),
        ("Tiempo de Inyección (PW1)", data.get("pw1", "2.8 ms"), data.get("pw1Status", "Normal")),
        ("Avance de Encendido (Advance)", data.get("advance", "12.0°"), data.get("advanceStatus", "Normal")),
    ]
    rows = "\n".join(
        f"""
        <tr>
          <td><strong>{esc(label)}</strong></td>
          <td>{esc(value)}</td>
          <td class="status">{esc(status)}</td>
        </tr>"""
        for label, value, status in telemetry
    )
    date_value = data.get("date") or datetime.now().strftime("%d/%m/%Y %H:%M")
    logo = logo_data_uri()
    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<style>
  @page {{ size: letter portrait; margin: 4mm; }}
  * {{ box-sizing: border-box; }}
  html, body {{ height: 100%; margin: 0; font-family: Helvetica, Arial, sans-serif; color: #0f172a; }}
  .certificate-border {{ border: 3px double #991b1b; padding: 4px; height: 100%; }}
  .inner-border {{ border: 1px solid #cbd5e1; padding: 8px 12px; min-height: 100%; display: flex; flex-direction: column; }}
  .header-table, .grid-2, .grid-3, .grid-4, .footer-table {{ width: 100%; border-collapse: collapse; }}
  .header-table td, .grid-2 td, .grid-3 td, .grid-4 td, .footer-table td {{ vertical-align: top; }}
  .logo-left, .logo-right {{ width: 18%; vertical-align: middle !important; }}
  .logo-right {{ text-align: right; }}
  .title-center {{ width: 64%; text-align: center; vertical-align: middle !important; }}
  .brand-image {{ width: 94px; height: 39px; object-fit: cover; object-position: center; border-radius: 3px; }}
  .brand-text {{ color: #991b1b; font-size: 14pt; font-weight: 900; letter-spacing: 1px; }}
  .brand-sub {{ color: #0f172a; font-size: 5pt; font-weight: bold; text-transform: uppercase; }}
  .main-title {{ margin: 0; color: #991b1b; font-size: 13pt; font-weight: 900; letter-spacing: .8px; text-transform: uppercase; }}
  .subtitle {{ margin-top: 1px; color: #1e293b; font-size: 7.5pt; font-weight: bold; letter-spacing: .8px; text-transform: uppercase; }}
  .endorsement {{ margin-top: 1px; color: #64748b; font-size: 6pt; text-transform: uppercase; letter-spacing: .8px; font-weight: 600; }}
  .divider {{ height: 2px; margin: 3px 0 4px; background: #b91c1c; }}
  .grid-3 td {{ width: 33.33%; padding-right: 6px; }}
  .grid-2 td {{ width: 50%; padding-right: 6px; }}
  .grid-2 td:last-child, .grid-3 td:last-child {{ padding-right: 0; padding-left: 6px; }}
  .grid-4 td {{ width: 25%; padding-right: 4px; }}
  .grid-4 td:last-child {{ padding-right: 0; }}
  .field-row {{ margin-bottom: 4px; }}
  .field-label {{ display: block; margin-bottom: 2px; color: #991b1b; font-size: 6.5pt; text-transform: uppercase; font-weight: bold; letter-spacing: .5px; }}
  .field-value-box {{ min-height: 32px; padding: 4px 6px; border-bottom: 1.5px solid #94a3b8; color: #0f172a; font: bold 9.5pt "Courier New", monospace; }}
  .table-container {{ margin-top: 4px; }}
  .diag-table {{ width: 100%; border-collapse: collapse; }}
  .diag-table th {{ padding: 6px 8px; background: #f1f5f9; border: 1px solid #cbd5e1; color: #991b1b; font-size: 7.5pt; text-align: left; text-transform: uppercase; }}
  .diag-table td {{ padding: 8px 10px; border: 1px solid #cbd5e1; color: #334155; font: 8.5pt "Courier New", monospace; vertical-align: middle; }}
  .diag-table th:nth-child(1) {{ width: 32%; }} .diag-table th:nth-child(2) {{ width: 48%; }} .diag-table th:nth-child(3) {{ width: 20%; text-align: center; }}
  .diag-table .status {{ text-align: center; color: #166534; font-weight: bold; }}
  .wide-row td {{ height: 45px; }}
  .footer-table {{ margin-top: auto; }}
  .signature-block {{ width: 35%; text-align: center; }}
  .signature-line {{ margin-top: 15px; padding-top: 3px; border-top: 1px solid #475569; color: #334155; font-size: 7pt; font-weight: bold; line-height: 1.2; }}
  .footer-copy {{ width: 35%; padding: 0 5px; color: #475569; font-size: 5.5pt; text-align: center; }}
  .seal-block {{ width: 30%; text-align: right; }}
  .seal {{ display: inline-block; width: 68px; height: 68px; padding: 7px 3px; border: 2px double #b91c1c; border-radius: 50%; color: #b91c1c; text-align: center; }}
  .seal strong {{ display: block; margin: 2px 0; font-size: 7pt; }} .seal span {{ display: block; color: #64748b; font-size: 4pt; font-weight: bold; text-transform: uppercase; }}
</style>
</head>
<body>
<div class="certificate-border"><div class="inner-border">
  <table class="header-table"><tr>
    <td class="logo-left">{f'<img class="brand-image" src="{logo}" alt="ROJO">' if logo else '<div class="brand-text">ROJO</div>'}</td>
    <td class="title-center">
      <h1 class="main-title">Certificado de Monitoreo y Diagnóstico ECU</h1>
      <div class="subtitle">DC TuneRojo Studio - Diagnóstico Avanzado</div>
      <div class="endorsement">Certificación Avalada y Válida en Todo el Estado</div>
    </td>
    <td class="logo-right"><div class="brand-text" style="font-size:9pt">DC TUNEROJO</div><div class="brand-sub">STUDIO</div></td>
  </tr></table>
  <div class="divider"></div>
  <table class="grid-3"><tr>
    <td><div class="field-row"><span class="field-label">N° Folio Certificado:</span><div class="field-value-box">{esc(data.get("folio", "ECU-0001"))}</div></div></td>
    <td><div class="field-row"><span class="field-label">Fecha Diagnóstico:</span><div class="field-value-box">{esc(date_value)}</div></div></td>
    <td><div class="field-row"><span class="field-label">Modo Sistema:</span><div class="field-value-box">{esc(data.get("mode", "Monitoreo en tiempo real"))}</div></div></td>
  </tr></table>
  <table class="grid-2"><tr>
    <td><div class="field-row"><span class="field-label">Cliente / Propietario:</span><div class="field-value-box">{esc(data.get("owner", "Sin capturar"))}</div></div></td>
    <td><div class="field-row"><span class="field-label">Vehículo (Marca / Modelo / Año):</span><div class="field-value-box">{esc(data.get("vehicle", "Sin capturar"))}</div></div></td>
  </tr></table>
  <table class="grid-4"><tr>
    <td><div class="field-row"><span class="field-label">Número de Serie (VIN):</span><div class="field-value-box">{esc(data.get("vin", "—"))}</div></div></td>
    <td><div class="field-row"><span class="field-label">Firmware ECU:</span><div class="field-value-box">{esc(data.get("firmware", "—"))}</div></div></td>
    <td><div class="field-row"><span class="field-label">Puerto / Comunicación:</span><div class="field-value-box">{esc(data.get("port", "OBD-II"))}</div></div></td>
    <td><div class="field-row"><span class="field-label">Baudrate:</span><div class="field-value-box">{esc(data.get("baudrate", "115200"))}</div></div></td>
  </tr></table>
  <div class="table-container"><table class="diag-table">
    <thead><tr><th>Parámetro de Telemetría / Sensor</th><th>Lectura Obtenida (DC TuneRojo Studio)</th><th>Estado Módulo</th></tr></thead>
    <tbody>{rows}
      <tr class="wide-row"><td><strong>Códigos de Error Detectados (DTC)</strong></td><td colspan="2">{esc(data.get("dtc", "Sin códigos detectados"))}</td></tr>
      <tr class="wide-row"><td><strong>Dictamen del Sistema ECU</strong></td><td colspan="2">{esc(data.get("verdict", "Sistema estable. Sin anomalías críticas detectadas."))}</td></tr>
    </tbody>
  </table></div>
  <table class="footer-table"><tr>
    <td class="signature-block"><div class="signature-line">Ing. Especialista en ECU &amp; Diagnóstico<br>Firma y Cédula Profesional</div></td>
    <td class="footer-copy">Documento generado automáticamente por <strong>DC TuneRojo Studio</strong>. Certifica que la unidad de control ha sido diagnosticada mediante monitoreo en tiempo real. Validez oficial estatal.</td>
    <td class="seal-block"><div class="seal">★ ★ ★<strong>OFICIAL</strong><span>Certificación<br>Avalado estatal</span>★ ★ ★</div></td>
  </tr></table>
</div></div>
</body></html>"""


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        print(f"[{self.log_date_time_string()}] {format % args}")

    def send_bytes(self, content: bytes, content_type: str, status: int = 200, headers: dict | None = None) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        for key, value in (headers or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(content)

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        relative = "index.html" if path in {"/", ""} else path.removeprefix("/")
        file_path = (ROOT / relative).resolve()
        if not str(file_path).startswith(str(ROOT)) or not file_path.is_file():
            self.send_bytes(b"Not found", "text/plain; charset=utf-8", 404)
            return
        content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        self.send_bytes(file_path.read_bytes(), content_type)

    def do_POST(self) -> None:
        if urlparse(self.path).path != "/api/generate-pdf":
            self.send_bytes(b"Not found", "text/plain; charset=utf-8", 404)
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size > 100_000:
                raise ValueError("La solicitud es demasiado grande.")
            payload = json.loads(self.rfile.read(size) or b"{}")
            pdf = io.BytesIO()
            HTML(string=render_certificate(payload), base_url=str(ROOT)).write_pdf(pdf)
            folio = "".join(c for c in str(payload.get("folio", "ECU-0001")) if c.isalnum() or c in "-_")[:40] or "ECU-0001"
            self.send_bytes(
                pdf.getvalue(),
                "application/pdf",
                headers={"Content-Disposition": f'attachment; filename="diagnostico_{folio}.pdf"'},
            )
        except Exception as error:
            message = json.dumps({"error": str(error)}, ensure_ascii=False).encode("utf-8")
            self.send_bytes(message, "application/json; charset=utf-8", 400)


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"DC TuneRojo Studio disponible en http://localhost:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
