// ============================================================================
// SIH26109 – AI-Based Predictive Modelling for Early Forecasting of Bovine Mastitis
// Public Web Dashboard Client Application
// Telemetry Pipeline: ESP32 -> Wi-Fi -> ThingSpeak -> Public Dashboard
// ============================================================================

// ============================================================================
// 1. CONFIGURATION: Clearly marked settings for ThingSpeak Channel & API
// ============================================================================
const CONFIG = {
  channelId: "3489897",
  readApiKey: "", // Enter your ThingSpeak Read API Key here if channel is private
  fieldNumber: 1, // Field 1 = EC reading
  refreshIntervalSeconds: 15, // Auto-refresh interval (15-20 seconds)
};

// Check localStorage for saved custom credentials (if modified in Settings UI)
function loadConfig() {
  const saved = localStorage.getItem("sih26109_ts_config");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.channelId) CONFIG.channelId = parsed.channelId;
      if (parsed.readApiKey !== undefined) CONFIG.readApiKey = parsed.readApiKey;
      if (parsed.fieldNumber) CONFIG.fieldNumber = parseInt(parsed.fieldNumber, 10);
      if (parsed.refreshIntervalSeconds) CONFIG.refreshIntervalSeconds = parseInt(parsed.refreshIntervalSeconds, 10);
    } catch (e) {
      console.warn("Failed to load saved config:", e);
    }
  }
}

// ============================================================================
// 2. DATASET: 20-Cow Herd Baseline Records (from mastitis_20_cows.csv)
// ============================================================================
const HERD_DATA = [
  { Cow_ID: "COW001", Breed_Type: "Holstein Cross", Milk_EC_mS_cm: 4.2, Milk_Yield_L_day: 22.0, SCC_thousand_cells_mL: 145, Risk_Label: "Low" },
  { Cow_ID: "COW002", Breed_Type: "Jersey Cross", Milk_EC_mS_cm: 4.5, Milk_Yield_L_day: 21.0, SCC_thousand_cells_mL: 180, Risk_Label: "Low" },
  { Cow_ID: "COW003", Breed_Type: "HF Cross", Milk_EC_mS_cm: 4.7, Milk_Yield_L_day: 23.5, SCC_thousand_cells_mL: 165, Risk_Label: "Low" },
  { Cow_ID: "COW004", Breed_Type: "Jersey Cross", Milk_EC_mS_cm: 4.9, Milk_Yield_L_day: 20.5, SCC_thousand_cells_mL: 210, Risk_Label: "Low" },
  { Cow_ID: "COW005", Breed_Type: "HF Cross", Milk_EC_mS_cm: 5.1, Milk_Yield_L_day: 22.5, SCC_thousand_cells_mL: 195, Risk_Label: "Low" },
  { Cow_ID: "COW006", Breed_Type: "Gir Cross", Milk_EC_mS_cm: 5.0, Milk_Yield_L_day: 21.5, SCC_thousand_cells_mL: 225, Risk_Label: "Low" },
  { Cow_ID: "COW007", Breed_Type: "HF Cross", Milk_EC_mS_cm: 5.6, Milk_Yield_L_day: 19.0, SCC_thousand_cells_mL: 310, Risk_Label: "Medium" },
  { Cow_ID: "COW008", Breed_Type: "Jersey Cross", Milk_EC_mS_cm: 5.8, Milk_Yield_L_day: 18.5, SCC_thousand_cells_mL: 360, Risk_Label: "Medium" },
  { Cow_ID: "COW009", Breed_Type: "HF Cross", Milk_EC_mS_cm: 6.0, Milk_Yield_L_day: 17.5, SCC_thousand_cells_mL: 420, Risk_Label: "Medium" },
  { Cow_ID: "COW010", Breed_Type: "Gir Cross", Milk_EC_mS_cm: 6.1, Milk_Yield_L_day: 18.0, SCC_thousand_cells_mL: 390, Risk_Label: "Medium" },
  { Cow_ID: "COW011", Breed_Type: "HF Cross", Milk_EC_mS_cm: 6.3, Milk_Yield_L_day: 16.5, SCC_thousand_cells_mL: 480, Risk_Label: "Medium" },
  { Cow_ID: "COW012", Breed_Type: "Jersey Cross", Milk_EC_mS_cm: 6.4, Milk_Yield_L_day: 17.0, SCC_thousand_cells_mL: 510, Risk_Label: "Medium" },
  { Cow_ID: "COW013", Breed_Type: "HF Cross", Milk_EC_mS_cm: 6.7, Milk_Yield_L_day: 15.5, SCC_thousand_cells_mL: 620, Risk_Label: "High" },
  { Cow_ID: "COW014", Breed_Type: "Jersey Cross", Milk_EC_mS_cm: 6.9, Milk_Yield_L_day: 14.5, SCC_thousand_cells_mL: 710, Risk_Label: "High" },
  { Cow_ID: "COW015", Breed_Type: "HF Cross", Milk_EC_mS_cm: 7.1, Milk_Yield_L_day: 13.5, SCC_thousand_cells_mL: 820, Risk_Label: "High" },
  { Cow_ID: "COW016", Breed_Type: "Gir Cross", Milk_EC_mS_cm: 7.3, Milk_Yield_L_day: 14.0, SCC_thousand_cells_mL: 760, Risk_Label: "High" },
  { Cow_ID: "COW017", Breed_Type: "HF Cross", Milk_EC_mS_cm: 7.5, Milk_Yield_L_day: 12.5, SCC_thousand_cells_mL: 910, Risk_Label: "High" },
  { Cow_ID: "COW018", Breed_Type: "Jersey Cross", Milk_EC_mS_cm: 7.7, Milk_Yield_L_day: 11.5, SCC_thousand_cells_mL: 980, Risk_Label: "High" },
  { Cow_ID: "COW019", Breed_Type: "HF Cross", Milk_EC_mS_cm: 8.0, Milk_Yield_L_day: 10.5, SCC_thousand_cells_mL: 1120, Risk_Label: "High" },
  { Cow_ID: "COW020", Breed_Type: "Gir Cross", Milk_EC_mS_cm: 8.2, Milk_Yield_L_day: 9.5, SCC_thousand_cells_mL: 1250, Risk_Label: "High" },
];

// ============================================================================
// 3. APPLICATION STATE
// ============================================================================
let appState = {
  mode: "live", // "live" or "demo"
  currentEc: 0.0,
  liveEc: null,
  simulatedEc: 5.0,
  lastEntryId: null,
  lastSyncTime: null,
  recentFeeds: [],
  selectedCowId: "COW001",
  countdownTimer: CONFIG.refreshIntervalSeconds,
  intervalId: null,
  timerIntervalId: null,
  isFetching: false,
};

// ============================================================================
// 4. AI RISK PREDICTION & EVALUATION LOGIC
// Threshold Rules:
// - EC < 5.5  -> 🟢 NORMAL
// - 5.5 <= EC < 7.0 -> 🟡 POSSIBLE RISK
// - EC >= 7.0 -> 🔴 HIGH RISK
// ============================================================================
function evaluateRisk(ecValue) {
  const ec = parseFloat(ecValue);
  if (isNaN(ec)) {
    return {
      tier: "Unknown",
      icon: "❓",
      title: "NO DATA",
      cssClass: "risk-unknown",
      confidenceScore: 0.0,
      badgeText: "Awaiting Data",
      advisory: "No telemetry reading available.",
      recText: "Awaiting valid telemetry input.",
      recBadge: "Pending",
    };
  }

  if (ec < 5.5) {
    // Normal / Low Risk
    const confidence = Math.min(98.8, Math.max(82.0, 96.0 - Math.abs(ec - 4.5) * 8.5)).toFixed(1);
    return {
      tier: "Normal",
      icon: "🟢",
      title: "NORMAL",
      cssClass: "risk-normal",
      confidenceScore: confidence,
      badgeText: "Low Risk",
      advisory: "Milk EC is within normal physiological limits (< 5.5 mS/cm). Continue routine farm monitoring.",
      recText: "Milk electrical conductivity indicates healthy mammary gland tissue. Continue routine milking hygiene and herd observation.",
      recBadge: "🟢 Routine Monitoring",
    };
  } else if (ec < 7.0) {
    // Possible Risk / Medium
    const confidence = Math.min(95.6, Math.max(76.0, 94.0 - Math.abs(ec - 6.2) * 12.0)).toFixed(1);
    return {
      tier: "Possible Risk",
      icon: "🟡",
      title: "POSSIBLE RISK",
      cssClass: "risk-medium",
      confidenceScore: confidence,
      badgeText: "Possible Risk",
      advisory: "Elevated EC (5.5–6.9 mS/cm) detected. Monitor the cow closely and consider veterinary examination.",
      recText: "Mild-to-moderate ion leakage detected in milk. Isolate milk from the affected quarter, monitor Somatic Cell Count (SCC), and perform CMT (California Mastitis Test).",
      recBadge: "🟡 Close Monitoring Required",
    };
  } else {
    // High Risk
    const confidence = Math.min(99.4, Math.max(85.0, 88.0 + (ec - 7.0) * 8.0)).toFixed(1);
    return {
      tier: "High Risk",
      icon: "🔴",
      title: "HIGH RISK",
      cssClass: "risk-high",
      confidenceScore: confidence,
      badgeText: "High Risk",
      advisory: "High conductivity (≥ 7.0 mS/cm). Mastitis likely. Veterinary examination recommended immediately.",
      recText: "Severe ionic imbalance indicating active acute or subclinical mastitis inflammation. Schedule immediate veterinary inspection and antibiotic/anti-inflammatory protocol.",
      recBadge: "🔴 Immediate Veterinary Action",
    };
  }
}

// ============================================================================
// 5. THINGSPEAK TELEMETRY CLIENT
// ============================================================================
async function fetchThingSpeakData() {
  if (appState.isFetching) return;
  appState.isFetching = true;

  const liveIndicator = document.getElementById("live-indicator");
  const liveIndicatorText = document.getElementById("live-indicator-text");
  const hwConnStatus = document.getElementById("hw-conn-status");

  let url = `https://api.thingspeak.com/channels/${CONFIG.channelId}/feeds.json?results=15`;
  if (CONFIG.readApiKey) {
    url += `&api_key=${encodeURIComponent(CONFIG.readApiKey)}`;
  }

  try {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.feeds || data.feeds.length === 0) {
      throw new Error("Channel returned no feed records.");
    }

    // Parse feeds
    const feeds = data.feeds;
    appState.recentFeeds = feeds;

    // Latest feed item
    const latest = feeds[feeds.length - 1];
    const fieldKey = `field${CONFIG.fieldNumber}`;
    const rawVal = latest[fieldKey];

    const ecNum = parseFloat(rawVal);
    appState.liveEc = isNaN(ecNum) ? 0.0 : ecNum;
    appState.lastEntryId = latest.entry_id;
    appState.lastSyncTime = new Date(latest.created_at);

    // Update Connection Indicators
    liveIndicator.className = "status-pill status-online";
    liveIndicatorText.textContent = `🟢 ThingSpeak Live (ID: ${latest.entry_id})`;
    hwConnStatus.textContent = "🟢 Connected (Active)";
    hwConnStatus.className = "status-val text-green";

    document.getElementById("hw-entry-id").textContent = `#${latest.entry_id}`;
    document.getElementById("hw-sync-time").textContent = formatDateTime(appState.lastSyncTime);

    // If currently in live mode, update active reading
    if (appState.mode === "live") {
      appState.currentEc = appState.liveEc;
      renderCurrentReading();
    }

    renderRecentFeeds();
    renderRecentTrendChart();
  } catch (error) {
    console.error("ThingSpeak Telemetry Fetch Error:", error);
    liveIndicator.className = "status-pill status-error";
    liveIndicatorText.textContent = "🔴 ThingSpeak Error";
    hwConnStatus.textContent = "🔴 Connection Error";
    hwConnStatus.className = "status-val text-red";
  } finally {
    appState.isFetching = false;
    resetCountdown();
  }
}

function formatDateTime(dateObj) {
  if (!dateObj) return "--";
  return dateObj.toLocaleTimeString() + " (" + dateObj.toLocaleDateString() + ")";
}

// ============================================================================
// 6. UI RENDERING & COMPONENT UPDATES
// ============================================================================
function renderCurrentReading() {
  const ec = appState.currentEc;
  const valEl = document.getElementById("current-ec-value");
  const updatedEl = document.getElementById("last-updated-text");
  const sourceTag = document.getElementById("data-source-tag");

  valEl.textContent = (typeof ec === "number") ? ec.toFixed(1) : "--";

  if (appState.mode === "live") {
    sourceTag.textContent = "Live IoT";
    sourceTag.style.background = "#e0f2fe";
    sourceTag.style.color = "#0369a1";
    updatedEl.textContent = appState.lastSyncTime
      ? `Received: ${formatDateTime(appState.lastSyncTime)} (Entry #${appState.lastEntryId})`
      : "Synchronizing with ThingSpeak...";
  } else {
    sourceTag.textContent = "Interactive Simulator";
    sourceTag.style.background = "#fef3c7";
    sourceTag.style.color = "#92400e";
    updatedEl.textContent = "Simulated manual value for testing AI responsiveness";
  }

  // Evaluate Risk
  const assessment = evaluateRisk(ec);

  // Update Diagnostic Card
  const riskCard = document.getElementById("risk-status-card");
  riskCard.className = `metric-card risk-card ${assessment.cssClass}`;

  document.getElementById("risk-icon").textContent = assessment.icon;
  document.getElementById("risk-status-text").textContent = assessment.title;
  document.getElementById("risk-badge").textContent = assessment.badgeText;
  document.getElementById("risk-advisory").textContent = assessment.advisory;

  // Update AI Section
  const aiTier = document.getElementById("ai-predicted-tier");
  aiTier.textContent = assessment.tier;
  aiTier.className = `ai-stat-val text-${assessment.tier === 'Normal' ? 'green' : assessment.tier === 'Possible Risk' ? 'orange' : 'red'}`;

  document.getElementById("ai-model-score").textContent = `${assessment.confidenceScore}%`;

  const recBox = document.getElementById("ai-recommendation-box");
  recBox.innerHTML = `
    <span class="ai-rec-badge">${assessment.recBadge}</span>
    <p id="ai-recommendation-text">${assessment.recText}</p>
  `;

  // Update Herd Chart Marker
  renderHerdChart();
}

function renderRecentFeeds() {
  const tbody = document.getElementById("recent-feeds-body");
  if (!tbody || !appState.recentFeeds.length) return;

  const reversed = [...appState.recentFeeds].reverse().slice(0, 10);
  tbody.innerHTML = "";

  reversed.forEach(feed => {
    const val = parseFloat(feed[`field${CONFIG.fieldNumber}`]);
    const numStr = isNaN(val) ? "0.0" : val.toFixed(1);
    const risk = evaluateRisk(val);
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="text-mono">#${feed.entry_id}</td>
      <td>${new Date(feed.created_at).toLocaleTimeString()}</td>
      <td><strong>${numStr}</strong> mS/cm</td>
      <td><span class="risk-badge" style="font-size:0.75rem;">${risk.icon} ${risk.title}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderRecentTrendChart() {
  const chartEl = document.getElementById("recent-trend-chart");
  if (!chartEl || !window.Plotly || !appState.recentFeeds.length) return;

  const feeds = appState.recentFeeds;
  const xTimes = feeds.map(f => new Date(f.created_at).toLocaleTimeString());
  const yVals = feeds.map(f => {
    const v = parseFloat(f[`field${CONFIG.fieldNumber}`]);
    return isNaN(v) ? 0 : v;
  });

  const trace = {
    x: xTimes,
    y: yVals,
    type: "scatter",
    mode: "lines+markers",
    name: "EC Telemetry",
    line: { color: "#2563eb", width: 2.5 },
    marker: { size: 6, color: "#1d4ed8" }
  };

  const layout = {
    title: { text: "ThingSpeak Telemetry Stream (Field 1)", font: { size: 13, color: "#334155" } },
    margin: { t: 30, r: 20, l: 40, b: 40 },
    yaxis: { title: "EC (mS/cm)", range: [0, Math.max(10, Math.max(...yVals) + 1)] },
    xaxis: { title: "Time" },
    shapes: [
      { type: "line", y0: 5.5, y1: 5.5, x0: 0, x1: 1, xref: "paper", line: { color: "#f59e0b", dash: "dot", width: 1.5 } },
      { type: "line", y0: 7.0, y1: 7.0, x0: 0, x1: 1, xref: "paper", line: { color: "#ef4444", dash: "dot", width: 1.5 } }
    ]
  };

  Plotly.react(chartEl, [trace], layout, { responsive: true, displayModeBar: false });
}

function renderHerdChart() {
  const chartEl = document.getElementById("herd-ec-chart");
  if (!chartEl || !window.Plotly) return;

  const cowIds = HERD_DATA.map(c => c.Cow_ID);
  const ecValues = HERD_DATA.map(c => c.Milk_EC_mS_cm);
  const colors = HERD_DATA.map(c => {
    if (c.Risk_Label === "Low") return "#10b981"; // Green
    if (c.Risk_Label === "Medium") return "#f59e0b"; // Orange
    return "#ef4444"; // Red
  });

  const trace = {
    x: cowIds,
    y: ecValues,
    type: "bar",
    name: "Milk EC",
    marker: { color: colors },
    text: HERD_DATA.map(c => `${c.Milk_EC_mS_cm} mS/cm (${c.Risk_Label})`),
    hoverinfo: "x+text"
  };

  const currentVal = appState.currentEc;

  const layout = {
    title: {
      text: `Milk Electrical Conductivity Across Cows (Current Marker: ${currentVal.toFixed(1)} mS/cm)`,
      font: { size: 14, color: "#1e293b", weight: "bold" }
    },
    margin: { t: 40, r: 20, l: 50, b: 60 },
    yaxis: {
      title: "Milk EC (mS/cm)",
      range: [0, 10.5]
    },
    xaxis: {
      title: "Cow Identifier",
      tickangle: -45
    },
    shapes: [
      // Normal threshold
      {
        type: "line",
        y0: 5.5, y1: 5.5,
        x0: 0, x1: 1, xref: "paper",
        line: { color: "#f59e0b", dash: "dash", width: 1.5 }
      },
      // High-risk threshold
      {
        type: "line",
        y0: 7.0, y1: 7.0,
        x0: 0, x1: 1, xref: "paper",
        line: { color: "#ef4444", dash: "dash", width: 1.5 }
      },
      // Current active reading indicator line
      {
        type: "line",
        y0: currentVal, y1: currentVal,
        x0: 0, x1: 1, xref: "paper",
        line: { color: "#2563eb", width: 2.5, dash: "solid" }
      }
    ],
    annotations: [
      {
        xref: "paper", yref: "y",
        x: 0.98, y: currentVal,
        text: `Live/Simulated: ${currentVal.toFixed(1)} mS/cm`,
        showarrow: true,
        arrowhead: 2,
        ax: -40, ay: -20,
        font: { color: "#1d4ed8", size: 11, weight: "bold" },
        bgcolor: "#eff6ff",
        bordercolor: "#93c5fd"
      }
    ]
  };

  Plotly.react(chartEl, [trace], layout, { responsive: true, displayModeBar: false });
}

// ============================================================================
// 7. COW SELECTION & PROFILE
// ============================================================================
function initCowSelector() {
  const select = document.getElementById("cow-select");
  if (!select) return;

  select.innerHTML = "";
  HERD_DATA.forEach(cow => {
    const opt = document.createElement("option");
    opt.value = cow.Cow_ID;
    opt.textContent = `${cow.Cow_ID} (${cow.Breed_Type}) - ${cow.Milk_EC_mS_cm} mS/cm`;
    select.appendChild(opt);
  });

  select.value = appState.selectedCowId;
  select.addEventListener("change", (e) => {
    appState.selectedCowId = e.target.value;
    updateSelectedCowProfile();
  });

  document.getElementById("btn-simulate-cow").addEventListener("click", () => {
    const cow = HERD_DATA.find(c => c.Cow_ID === appState.selectedCowId);
    if (cow) {
      setSimulatorValue(cow.Milk_EC_mS_cm);
      // Switch to simulation tab
      document.querySelector('input[name="telemetry-mode"][value="demo"]').checked = true;
      setMode("demo");
    }
  });

  updateSelectedCowProfile();
}

function updateSelectedCowProfile() {
  const cow = HERD_DATA.find(c => c.Cow_ID === appState.selectedCowId) || HERD_DATA[0];

  document.getElementById("active-cow-id").textContent = cow.Cow_ID;
  document.getElementById("cow-metric-id").textContent = cow.Cow_ID;
  document.getElementById("cow-metric-breed").textContent = cow.Breed_Type;
  document.getElementById("cow-metric-ec").textContent = `${cow.Milk_EC_mS_cm} mS/cm`;

  const riskEl = document.getElementById("cow-metric-risk");
  riskEl.textContent = cow.Risk_Label;
  riskEl.className = `metric-mid-num text-${cow.Risk_Label === 'Low' ? 'green' : cow.Risk_Label === 'Medium' ? 'orange' : 'red'}`;
}

// ============================================================================
// 8. HERD TABLES & CSV DOWNLOAD
// ============================================================================
function populateTables() {
  // High-Risk Cows Table
  const highRiskBody = document.getElementById("high-risk-body");
  const highCows = HERD_DATA.filter(c => c.Risk_Label === "High");

  highRiskBody.innerHTML = "";
  highCows.forEach(cow => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${cow.Cow_ID}</strong></td>
      <td>${cow.Breed_Type}</td>
      <td><strong class="text-red">${cow.Milk_EC_mS_cm}</strong> mS/cm</td>
      <td>${cow.Milk_Yield_L_day} L</td>
      <td>${cow.SCC_thousand_cells_mL}k</td>
      <td><span class="risk-badge" style="background:#fee2e2; color:#991b1b;">🔴 High Risk</span></td>
    `;
    highRiskBody.appendChild(tr);
  });

  // All Cows Table
  renderAllCowsTable(HERD_DATA);

  // Search filter
  const searchInput = document.getElementById("herd-search");
  searchInput.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = HERD_DATA.filter(c =>
      c.Cow_ID.toLowerCase().includes(q) ||
      c.Breed_Type.toLowerCase().includes(q) ||
      c.Risk_Label.toLowerCase().includes(q)
    );
    renderAllCowsTable(filtered);
    document.getElementById("record-count-tag").textContent = `Showing ${filtered.length} of ${HERD_DATA.length} records`;
  });

  // CSV Download Button
  document.getElementById("btn-download-csv").addEventListener("click", downloadFarmCsv);
}

function renderAllCowsTable(data) {
  const body = document.getElementById("all-cows-body");
  body.innerHTML = "";
  data.forEach(cow => {
    const tr = document.createElement("tr");
    const badgeColor = cow.Risk_Label === 'Low' ? '#d1fae5; color:#065f46' : cow.Risk_Label === 'Medium' ? '#fef3c7; color:#92400e' : '#fee2e2; color:#991b1b';
    tr.innerHTML = `
      <td><strong>${cow.Cow_ID}</strong></td>
      <td>${cow.Breed_Type}</td>
      <td>${cow.Milk_EC_mS_cm} mS/cm</td>
      <td>${cow.Milk_Yield_L_day} L</td>
      <td>${cow.SCC_thousand_cells_mL}k</td>
      <td><span class="risk-badge" style="background:${badgeColor}; font-size:0.75rem;">${cow.Risk_Label}</span></td>
    `;
    body.appendChild(tr);
  });
}

function downloadFarmCsv() {
  const headers = ["Cow_ID", "Breed_Type", "Milk_EC_mS_cm", "Milk_Yield_L_day", "SCC_thousand_cells_mL", "Risk_Label"];
  const rows = HERD_DATA.map(c => [
    c.Cow_ID,
    `"${c.Breed_Type}"`,
    c.Milk_EC_mS_cm,
    c.Milk_Yield_L_day,
    c.SCC_thousand_cells_mL,
    c.Risk_Label
  ]);

  const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "mastitis_farm_records.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ============================================================================
// 9. TIMER & AUTO-REFRESH CONTROLLER
// ============================================================================
function resetCountdown() {
  appState.countdownTimer = CONFIG.refreshIntervalSeconds;
  updateCountdownUI();
}

function updateCountdownUI() {
  const secEl = document.getElementById("timer-seconds");
  const fillEl = document.getElementById("countdown-progress");
  if (secEl) secEl.textContent = appState.countdownTimer;
  if (fillEl) {
    const pct = ((appState.countdownTimer) / CONFIG.refreshIntervalSeconds) * 100;
    fillEl.style.width = `${pct}%`;
  }
}

function startTimerLoop() {
  if (appState.timerIntervalId) clearInterval(appState.timerIntervalId);

  appState.timerIntervalId = setInterval(() => {
    if (appState.countdownTimer > 1) {
      appState.countdownTimer--;
      updateCountdownUI();
    } else {
      appState.countdownTimer = CONFIG.refreshIntervalSeconds;
      updateCountdownUI();
      fetchThingSpeakData();
    }
  }, 1000);
}

// ============================================================================
// 10. SIMULATOR & MODE SWITCHING
// ============================================================================
function setMode(mode) {
  appState.mode = mode;
  const sliderContainer = document.getElementById("simulation-slider-container");
  const tabLive = document.getElementById("tab-live-mode");
  const tabDemo = document.getElementById("tab-demo-mode");

  if (mode === "demo") {
    tabLive.classList.remove("active");
    tabDemo.classList.add("active");
    sliderContainer.classList.remove("hidden");
    appState.currentEc = appState.simulatedEc;
  } else {
    tabDemo.classList.remove("active");
    tabLive.classList.add("active");
    sliderContainer.classList.add("hidden");
    appState.currentEc = (appState.liveEc !== null) ? appState.liveEc : 0.0;
  }
  renderCurrentReading();
}

function setSimulatorValue(val) {
  const num = parseFloat(val);
  appState.simulatedEc = num;
  const slider = document.getElementById("ec-slider");
  if (slider) slider.value = num;
  const display = document.getElementById("slider-val-display");
  if (display) display.textContent = num.toFixed(1);

  if (appState.mode === "demo") {
    appState.currentEc = num;
    renderCurrentReading();
  }
}

function initModeAndSimulator() {
  const modeRadios = document.querySelectorAll('input[name="telemetry-mode"]');
  modeRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      setMode(e.target.value);
    });
  });

  const slider = document.getElementById("ec-slider");
  slider.addEventListener("input", (e) => {
    setSimulatorValue(e.target.value);
  });

  const presetBtns = document.querySelectorAll(".btn-preset");
  presetBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      setSimulatorValue(btn.getAttribute("data-val"));
    });
  });

  document.getElementById("btn-manual-refresh").addEventListener("click", () => {
    fetchThingSpeakData();
  });
}

// ============================================================================
// 11. SETTINGS PANEL (CONFIGURATION CONTROLS)
// ============================================================================
function initSettingsPanel() {
  const panel = document.getElementById("settings-panel");
  const btnToggle = document.getElementById("btn-settings-toggle");
  const btnClose = document.getElementById("btn-close-settings");
  const btnSave = document.getElementById("btn-save-settings");
  const btnReset = document.getElementById("btn-reset-settings");

  btnToggle.addEventListener("click", () => {
    panel.classList.toggle("hidden");
    // Pre-fill inputs with current config
    document.getElementById("cfg-channel-id").value = CONFIG.channelId;
    document.getElementById("cfg-api-key").value = CONFIG.readApiKey;
    document.getElementById("cfg-field").value = CONFIG.fieldNumber;
    document.getElementById("cfg-interval").value = CONFIG.refreshIntervalSeconds;
  });

  btnClose.addEventListener("click", () => panel.classList.add("hidden"));

  btnSave.addEventListener("click", () => {
    CONFIG.channelId = document.getElementById("cfg-channel-id").value.trim();
    CONFIG.readApiKey = document.getElementById("cfg-api-key").value.trim();
    CONFIG.fieldNumber = parseInt(document.getElementById("cfg-field").value, 10) || 1;
    CONFIG.refreshIntervalSeconds = parseInt(document.getElementById("cfg-interval").value, 10) || 15;

    localStorage.setItem("sih26109_ts_config", JSON.stringify(CONFIG));
    panel.classList.add("hidden");

    resetCountdown();
    fetchThingSpeakData();
  });

  btnReset.addEventListener("click", () => {
    localStorage.removeItem("sih26109_ts_config");
    CONFIG.channelId = "3489897";
    CONFIG.readApiKey = "";
    CONFIG.fieldNumber = 1;
    CONFIG.refreshIntervalSeconds = 15;

    document.getElementById("cfg-channel-id").value = CONFIG.channelId;
    document.getElementById("cfg-api-key").value = CONFIG.readApiKey;
    document.getElementById("cfg-field").value = CONFIG.fieldNumber;
    document.getElementById("cfg-interval").value = CONFIG.refreshIntervalSeconds;

    panel.classList.add("hidden");
    resetCountdown();
    fetchThingSpeakData();
  });
}

// ============================================================================
// 12. BOOTSTRAP / ENTRY POINT
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  loadConfig();
  initCowSelector();
  populateTables();
  initModeAndSimulator();
  initSettingsPanel();

  // Initial Fetch & Timer Start
  fetchThingSpeakData();
  startTimerLoop();
});
