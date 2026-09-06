from weasyprint import HTML

html_content = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @page {
    size: letter portrait;
    margin: 4mm;
    background-color: #ffffff;
  }

  * { box-sizing: border-box; }

  html, body {
    height: 100%;
    margin: 0;
    padding: 0;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #0f172a;
  }

  .certificate-border {
    border: 3px double #991b1b;
    padding: 4px;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .inner-border {
    border: 1px solid #cbd5e1;
    padding: 8px 12px;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  /* Header Section */
  .header-table { width: 100%; margin-bottom: 2px; border-collapse: collapse; }
  .header-table td { vertical-align: middle; }
  .logo-left { width: 18%; text-align: left; }
  .logo-right { width: 18%; text-align: right; }
  .title-center { width: 64%; text-align: center; }

  .logo-img-left, .logo-img-right {
    max-height: 42px;
    max-width: 100px;
    object-fit: contain;
  }

  .main-title {
    font-size: 13pt;
    font-weight: 900;
    color: #991b1b;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    margin: 0;
  }

  .subtitle {
    font-size: 7.5pt;
    color: #1e293b;
    font-weight: bold;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    margin-top: 1px;
  }

  .endorsement {
    font-size: 6pt;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-top: 1px;
    font-weight: 600;
  }

  .divider {
    height: 2px;
    background: linear-gradient(90deg, transparent, #b91c1c, transparent);
    margin: 3px 0 4px 0;
  }

  .cert-body {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
  }

  .field-row { margin-bottom: 4px; }
  
  .field-label {
    font-size: 6.5pt;
    color: #991b1b;
    text-transform: uppercase;
    font-weight: bold;
    letter-spacing: 0.5px;
    display: block;
    margin-bottom: 2px;
  }

  .field-value-box {
    border-bottom: 1.5px solid #94a3b8;
    font-size: 9.5pt;
    font-weight: bold;
    color: #0f172a;
    height: 32px;
    padding: 4px 6px;
    font-family: 'Courier New', Courier, monospace;
    display: flex;
    align-items: center;
  }

  .grid-2, .grid-3, .grid-4 { width: 100%; border-collapse: collapse; }
  .grid-2 td { width: 50%; padding-right: 6px; vertical-align: top; }
  .grid-2 td:last-child { padding-right: 0; padding-left: 6px; }

  .grid-3 td { width: 33.33%; padding-right: 6px; vertical-align: top; }
  .grid-3 td:last-child { padding-right: 0; }

  .grid-4 td { width: 25%; padding-right: 4px; vertical-align: top; }
  .grid-4 td:last-child { padding-right: 0; }

  .table-container {
    flex-grow: 1;
    margin-top: 4px;
    margin-bottom: 4px;
    display: flex;
  }

  .diag-table {
    width: 100%;
    height: 100%;
    border-collapse: collapse;
  }

  .diag-table th {
    background-color: #f1f5f9;
    color: #991b1b;
    font-size: 7.5pt;
    text-transform: uppercase;
    padding: 6px 8px;
    border: 1px solid #cbd5e1;
    text-align: left;
    font-weight: 800;
  }

  .diag-table td {
    border: 1px solid #cbd5e1;
    padding: 10px 12px;
    font-size: 9pt;
    color: #334155;
    vertical-align: middle;
    font-family: 'Courier New', Courier, monospace;
  }

  .mega-row-box { height: 45px; }

  .footer-table { width: 100%; margin-top: 6px; border-collapse: collapse; }
  .footer-table td { vertical-align: bottom; }
  .signature-block { width: 35%; text-align: center; }
  .signature-line {
    border-top: 1px solid #475569;
    margin-top: 15px;
    padding-top: 3px;
    font-size: 7pt;
    color: #334155;
    font-weight: bold;
    line-height: 1.2;
  }

  .seal-block { width: 30%; text-align: right; }
  .seal-container {
    display: inline-block;
    width: 68px;
    height: 68px;
    border-radius: 50%;
    border: 2px double #b91c1c;
    text-align: center;
    padding: 2px;
  }

  .seal-inner {
    border: 1px dashed #b91c1c;
    border-radius: 50%;
    height: 100%;
    width: 100%;
    box-sizing: border-box;
    padding-top: 4px;
  }

  .seal-star { color: #b91c1c; font-size: 5.5pt; line-height: 1; }
  .seal-text-top { font-size: 4pt; font-weight: bold; color: #1e293b; text-transform: uppercase; }
  .seal-main { font-size: 5.5pt; font-weight: 900; color: #b91c1c; text-transform: uppercase; margin: 1px 0; }
  .seal-text-bottom { font-size: 3.8pt; color: #64748b; text-transform: uppercase; font-weight: bold; }
</style>
</head>
<body>

<div class="certificate-border">
  <div class="inner-border">
    
    <table class="header-table">
      <tr>
        <td class="logo-left">
          <img src="" class="logo-img-left" alt="Logo ROJO">
        </td>
        <td class="title-center">
          <h1 class="main-title">Certificado de Monitoreo y Diagnóstico ECU</h1>
          <div class="subtitle">DC TuneRojo Studio - Diagnóstico Avanzado</div>
          <div class="endorsement">Certificación Avalada y Válida en Todo el Estado</div>
        </td>
        <td class="logo-right">
          <img src="" class="logo-img-right" alt="Logo DC Tuner Studio">
        </td>
      </tr>
    </table>

    <div class="divider"></div>

    <div class="cert-body">
      
      <table class="grid-3">
        <tr>
          <td>
            <div class="field-row">
              <span class="field-label">N° Folio Certificado:</span>
              <div class="field-value-box"></div>
            </div>
          </td>
          <td>
            <div class="field-row">
              <span class="field-label">Fecha Diagnóstico:</span>
              <div class="field-value-box"></div>
            </div>
          </td>
          <td>
            <div class="field-row">
              <span class="field-label">Modo Sistema:</span>
              <div class="field-value-box"></div>
            </div>
          </td>
        </tr>
      </table>

      <table class="grid-2">
        <tr>
          <td>
            <div class="field-row">
              <span class="field-label">Cliente / Propietario:</span>
              <div class="field-value-box"></div>
            </div>
          </td>
          <td>
            <div class="field-row">
              <span class="field-label">Vehículo (Marca / Modelo / Año):</span>
              <div class="field-value-box"></div>
            </div>
          </td>
        </tr>
      </table>

      <table class="grid-4">
        <tr>
          <td>
            <div class="field-row">
              <span class="field-label">Número de Serie (VIN):</span>
              <div class="field-value-box"></div>
            </div>
          </td>
          <td>
            <div class="field-row">
              <span class="field-label">Firmware ECU:</span>
              <div class="field-value-box"></div>
            </div>
          </td>
          <td>
            <div class="field-row">
              <span class="field-label">Puerto / Comunicación:</span>
              <div class="field-value-box"></div>
            </div>
          </td>
          <td>
            <div class="field-row">
              <span class="field-label">Baudrate:</span>
              <div class="field-value-box"></div>
            </div>
          </td>
        </tr>
      </table>

      <div class="table-container">
        <table class="diag-table">
          <thead>
            <tr>
              <th style="width: 32%;">Parámetro de Telemetría / Sensor</th>
              <th style="width: 48%;">Lectura Obtenida (DC TuneRojo Studio)</th>
              <th style="width: 20%; text-align: center;">Estado Módulo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Voltaje de Batería (CLT/Volt)</strong></td>
              <td></td>
              <td style="text-align: center;"></td>
            </tr>
            <tr>
              <td><strong>Revoluciones Motor (RPM)</strong></td>
              <td></td>
              <td style="text-align: center;"></td>
            </tr>
            <tr>
              <td><strong>Presión / Mapeo Admis. (MAP)</strong></td>
              <td></td>
              <td style="text-align: center;"></td>
            </tr>
            <tr>
              <td><strong>Temperatura Refr. (CLT) / Aire (IAT)</strong></td>
              <td></td>
              <td style="text-align: center;"></td>
            </tr>
            <tr>
              <td><strong>Posición Mariposa (TPS)</strong></td>
              <td></td>
              <td style="text-align: center;"></td>
            </tr>
            <tr>
              <td><strong>Mezcla / Mezcla Lambda (AFR)</strong></td>
              <td></td>
              <td style="text-align: center;"></td>
            </tr>
            <tr>
              <td><strong>Tiempo de Inyección (PW1)</strong></td>
              <td></td>
              <td style="text-align: center;"></td>
            </tr>
            <tr>
              <td><strong>Avance de Encendido (Advance)</strong></td>
              <td></td>
              <td style="text-align: center;"></td>
            </tr>
            <tr class="mega-row-box">
              <td><strong>Códigos de Error Detectados (DTC)</strong></td>
              <td colspan="2"></td>
            </tr>
            <tr class="mega-row-box">
              <td><strong>Dictamen del Sistema ECU</strong></td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>

    <table class="footer-table">
      <tr>
        <td class="signature-block">
          <div class="signature-line">
            Ing. Especialista en ECU & Diagnóstico<br>
            Firma y Cédula Profesional
          </div>
        </td>
        <td style="width: 35%; text-align: center; font-size: 5.5pt; color: #475569; padding: 0 5px;">
          Documento generado automáticamente por <strong>DC TuneRojo Studio</strong>. Certifica que la unidad de control ha sido diagnosticada mediante monitoreo en tiempo real. Validez oficial estatal.
        </td>
        <td class="seal-block">
          <div class="seal-container">
            <div class="seal-inner">
              <div class="seal-star">★ ★ ★</div>
              <div class="seal-text-top">CERTIFICACIÓN</div>
              <div class="seal-main">OFICIAL</div>
              <div class="seal-text-bottom">AVALADO ESTATAL</div>
              <div class="seal-star">★ ★ ★</div>
            </div>
          </div>
        </td>
      </tr>
    </table>

  </div>
</div>

</body>
</html>"""

# Generar archivo de salida PDF
HTML(string=html_content).write_pdf("Plantilla_Certificado_Diagnostico_ECU.pdf")
print("✅ Plantilla 'Plantilla_Certificado_Diagnostico_ECU.pdf' generada correctamente.")
