# DC TuneRojo Studio · Monitoreo ECU

Aplicación local para capturar lecturas del túnel diagnóstico y descargar un **Certificado de Monitoreo y Diagnóstico ECU en PDF** usando la plantilla oficial entregada.

## Ejecutar

Requiere Python 3.11+ y las dependencias de `requirements.txt`.

```bash
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Abre `http://localhost:5000`.

## Uso

1. Captura folio, cliente, vehículo y datos de la ECU.
2. Pulsa **Iniciar monitoreo** si quieres simular la actualización local de las lecturas.
3. Revisa o ajusta los parámetros, DTC y dictamen.
4. Pulsa **Descargar diagnóstico**. El navegador descarga un PDF con los datos actuales y el diseño del certificado.

La generación del PDF ocurre en el servidor local; no se envían datos a servicios externos.