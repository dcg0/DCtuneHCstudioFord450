const form = document.querySelector("#diagnosticForm");
const dateField = document.querySelector("#date");
const folioField = form.elements.folio;
const downloadButton = document.querySelector("#downloadButton");
const message = document.querySelector("#formMessage");
const toggle = document.querySelector("#toggleMonitoring");
let monitoring = false;
let timer = null;
const sensorHistory = {};

document.querySelectorAll(".sensor-tile").forEach((tile) => {
  sensorHistory[tile.dataset.sensor] = [];
});

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

function parseSensorValue(formValue, sensor) {
  if (sensor === "temp") return parseFloat(String(formValue).split("/")[0]) || 0;
  return parseFloat(String(formValue).replace(/[^\d.\-]/g, "")) || 0;
}

function updateTiles() {
  const data = readForm();
  document.querySelector("#sessionFolio").textContent = data.folio || "ECU-0001";

  const sensorMap = {
    battery: "battery",
    rpm: "rpm",
    map: "map",
    temp: "temperature",
    tps: "tps",
    afr: "afr",
    pw1: "pw1",
    advance: "advance",
  };

  document.querySelectorAll(".sensor-tile").forEach((tile) => {
    const sensor = tile.dataset.sensor;
    const formKey = sensorMap[sensor];
    if (!formKey) return;
    const raw = data[formKey] || "";
    const value = parseSensorValue(raw, sensor);
    const min = parseFloat(tile.dataset.min);
    const max = parseFloat(tile.dataset.max);
    const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

    const valEl = tile.querySelector(".tile-val");
    if (sensor === "battery") valEl.textContent = value.toFixed(1);
    else if (sensor === "tps" || sensor === "advance" || sensor === "pw1" || sensor === "afr") valEl.textContent = value.toFixed(1);
    else valEl.textContent = Math.round(value);

    tile.querySelector(".tile-bar-fill").style.width = pct + "%";

    const now = Date.now();
    const hist = sensorHistory[sensor] || [];
    hist.push({ time: now, value });
    sensorHistory[sensor] = hist.slice(-60);
  });
}

function simulateMonitoring() {
  const rpm = 810 + Math.round(Math.random() * 120);
  const battery = (12.45 + Math.random() * .3).toFixed(2);
  const temp = 86 + Math.round(Math.random() * 4);
  const map = 35 + Math.round(Math.random() * 8);
  const tps = (2 + Math.random() * 5).toFixed(1);
  form.elements.rpm.value = `${rpm} RPM`;
  form.elements.battery.value = `${battery} V`;
  form.elements.temperature.value = `${temp} °C / 31 °C`;
  form.elements.map.value = `${map} kPa`;
  form.elements.tps.value = `${tps} %`;
  updateTiles();
}

folioField.addEventListener("input", updateTiles);
form.addEventListener("input", updateTiles);
setDate();
updateTiles();

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

const fullscreen = document.querySelector("#sensorFullscreen");
const fsClose = document.querySelector("#fsClose");
let activeSensor = null;
let fsUpdateTimer = null;

function openFullscreen(tile) {
  activeSensor = tile;
  fullscreen.style.setProperty("--c", tile.dataset.color);
  fullscreen.hidden = false;
  document.body.style.overflow = "hidden";
  updateFullscreen();
}

function closeFullscreen() {
  fullscreen.hidden = true;
  activeSensor = null;
  document.body.style.overflow = "";
  if (fsUpdateTimer) { clearInterval(fsUpdateTimer); fsUpdateTimer = null; }
}

function updateFullscreen() {
  if (!activeSensor) return;
  const tile = activeSensor;
  const sensor = tile.dataset.sensor;
  const label = tile.dataset.label;
  const unit = tile.dataset.unit;
  const min = parseFloat(tile.dataset.min);
  const max = parseFloat(tile.dataset.max);
  const color = tile.dataset.color;
  const pid = tile.dataset.pid;

  document.querySelector("#fsPid").textContent = "PID " + pid;
  document.querySelector("#fsTitle").textContent = label;
  document.querySelector("#fsUnit").textContent = unit;
  document.querySelector("#fsMin").textContent = min;
  document.querySelector("#fsMax").textContent = max;

  const value = parseSensorValue(readForm()[sensor === "temp" ? "temperature" : sensor] || "0", sensor);
  const formatted = (sensor === "battery" || sensor === "tps" || sensor === "advance" || sensor === "pw1" || sensor === "afr")
    ? value.toFixed(1)
    : String(Math.round(value));
  document.querySelector("#fsValue").textContent = formatted;

  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  document.querySelector("#fsBarFill").style.width = pct + "%";

  const hist = sensorHistory[sensor] || [];
  const stats = document.querySelector("#fsStats");
  if (hist.length > 0) {
    const values = hist.map((s) => s.value);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const avgV = values.reduce((a, b) => a + b, 0) / values.length;
    stats.innerHTML = [
      ["ACTUAL", formatted],
      ["MÍNIMO", minV.toFixed(sensor === "battery" || sensor === "tps" || sensor === "advance" || sensor === "pw1" || sensor === "afr" ? 1 : 0)],
      ["MÁXIMO", maxV.toFixed(sensor === "battery" || sensor === "tps" || sensor === "advance" || sensor === "pw1" || sensor === "afr" ? 1 : 0)],
      ["PROMEDIO", avgV.toFixed(sensor === "battery" || sensor === "tps" || sensor === "advance" || sensor === "pw1" || sensor === "afr" ? 1 : 0)],
    ].map(([l, v]) => `<div class="fs-stat"><span class="fs-stat-label">${l}</span><span class="fs-stat-val">${v} ${unit}</span></div>`).join("");
  } else {
    stats.innerHTML = '<div class="fs-stat"><span class="fs-stat-label">SIN DATOS</span><span class="fs-stat-val">—</span></div>';
  }

  const chartBars = document.querySelector("#fsChartBars");
  const recent = hist.slice(-34);
  chartBars.innerHTML = recent.map((s) => {
    const barPct = Math.max(4, Math.min(100, ((s.value - min) / (max - min)) * 100));
    return `<div class="fs-chart-bar" style="height:${barPct}%;background:${color}"></div>`;
  }).join("");

  if (monitoring && !fsUpdateTimer) {
    fsUpdateTimer = setInterval(updateFullscreen, 2200);
  }
}

document.querySelectorAll(".sensor-tile").forEach((tile) => {
  tile.addEventListener("click", () => openFullscreen(tile));
});
fsClose.addEventListener("click", closeFullscreen);
fullscreen.addEventListener("click", (e) => { if (e.target === fullscreen) closeFullscreen(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !fullscreen.hidden) closeFullscreen(); });

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
