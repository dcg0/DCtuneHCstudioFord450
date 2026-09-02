const form = document.querySelector("#diagnosticForm");
const dateField = document.querySelector("#date");
const folioField = form.elements.folio;
const downloadButton = document.querySelector("#downloadButton");
const message = document.querySelector("#formMessage");
const toggle = document.querySelector("#toggleMonitoring");
let monitoring = false;
let timer = null;

function setDate() {
  const now = new Date();
  dateField.value = now.toLocaleString("es-MX", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function readForm() {
  return Object.fromEntries(new FormData(form).entries());
}

function updatePreview() {
  const data = readForm();
  document.querySelector("#sessionFolio").textContent = data.folio || "ECU-0001";
  document.querySelector("#metricBattery").textContent = data.battery || "—";
  document.querySelector("#metricRpm").textContent = (data.rpm || "—").replace(" RPM", "");
  document.querySelector("#metricTemp").textContent = (data.temperature || "—").split("/")[0].trim();
  document.querySelector("#metricAfr").textContent = data.afr || "—";
}

function simulateMonitoring() {
  const rpm = 810 + Math.round(Math.random() * 120);
  const battery = (12.45 + Math.random() * .3).toFixed(2);
  const temp = 86 + Math.round(Math.random() * 4);
  form.elements.rpm.value = `${rpm} RPM`;
  form.elements.battery.value = `${battery} V`;
  form.elements.temperature.value = `${temp} °C / 31 °C`;
  updatePreview();
}

folioField.addEventListener("input", updatePreview);
form.addEventListener("input", updatePreview);
setDate();
updatePreview();

toggle.addEventListener("click", () => {
  monitoring = !monitoring;
  toggle.classList.toggle("active", monitoring);
  toggle.innerHTML = monitoring
    ? '<span class="pulse-icon"></span>Detener monitoreo'
    : '<span class="pulse-icon"></span>Iniciar monitoreo';
  document.querySelector("#connectionLabel").textContent = monitoring ? "Monitoreo activo" : "Puerto listo";
  if (monitoring) {
    simulateMonitoring();
    timer = setInterval(simulateMonitoring, 2200);
  } else {
    clearInterval(timer);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.className = "form-message";
  message.textContent = "Generando certificado PDF…";
  downloadButton.disabled = true;
  try {
    const response = await fetch("/api/generate-pdf", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(readForm()),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({error: "No se pudo generar el archivo."}));
      throw new Error(error.error || "No se pudo generar el archivo.");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `diagnostico_${folioField.value || "ECU-0001"}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    message.textContent = "Diagnóstico descargado correctamente.";
  } catch (error) {
    message.className = "form-message error";
    message.textContent = error.message;
  } finally {
    downloadButton.disabled = false;
  }
});