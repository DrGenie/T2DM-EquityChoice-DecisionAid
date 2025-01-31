/****************************************************************************
 * SCRIPT.JS
 * 1) Tab navigation (keeps tabs active)
 * 2) Range slider labels
 * 3) Probability gauge
 * 4) WTP bar charts
 * 5) Scenario saving + PDF
 * 6) Cost & benefits always show items
 ****************************************************************************/

let currentUptakeProbability = 0;
let savedResults = [];

/** TAB NAVIGATION */
function openTab(tabId, btn) {
  const allTabs = document.getElementsByClassName("tabcontent");
  for (let i = 0; i < allTabs.length; i++) {
    allTabs[i].style.display = "none";
  }
  const tabLinks = document.getElementsByClassName("tablink");
  for (let j = 0; j < tabLinks.length; j++) {
    tabLinks[j].classList.remove("active");
  }
  document.getElementById(tabId).style.display = "block";
  btn.classList.add("active");

  // Always refresh cost-benefit on that tab
  if (tabId === "costsTab") {
    renderCostsBenefits();
  }
}

/** SLIDER LABELS */
function updateCostDisplay(val) {
  document.getElementById("costValue").textContent = `$${val}`;
}
function updateCostOthersDisplay(val) {
  document.getElementById("costOthersValue").textContent = `$${val}`;
}

/** MODEL COEFFICIENTS: Exp3 cost approx. -0.001 & costOthers -0.0004 */
const coefficients = {
  '1': {
    ASC_optout: -0.553,
    ASC: -0.203,
    efficacy_50: 0.855,
    efficacy_90: 1.558,
    risk_8: -0.034,
    risk_16: -0.398,
    risk_30: -0.531,
    cost: -0.00123
  },
  '2': {
    ASC_optout: -0.338,
    ASC_mean: -0.159,
    efficacy_50: 1.031,
    efficacy_90: 1.780,
    risk_8: -0.054,
    risk_16: -0.305,
    risk_30: -0.347,
    cost: -0.00140
  },
  '3': {
    ASC_optout: -0.344,
    ASC_mean: -0.160,
    efficacy_50: 0.604,
    efficacy_90: 1.267,
    efficacyOthers_50: 0.272,
    efficacyOthers_90: 0.370,
    risk_8: -0.108,
    risk_16: -0.218,
    risk_30: -0.339,
    riskOthers_8: -0.111,
    riskOthers_16: -0.103,
    riskOthers_30: -0.197,
    cost: -0.001,
    costOthers: -0.0004
  }
};

/** WTP DATA: Exp3 cost = -0.001 for risk & efficacy */
const wtpData = {
  '1': [
    { attribute: "Efficacy 50%", wtp: 0.855 / 0.00123, pVal: 0.000, se: 0.074 / 0.00123 },
    { attribute: "Efficacy 90%", wtp: 1.558 / 0.00123, pVal: 0.000, se: 0.078 / 0.00123 },
    { attribute: "Risk 8%",     wtp: -0.034 / 0.00123, pVal: 0.689, se: 0.085 / 0.00123 },
    { attribute: "Risk 16%",    wtp: -0.398 / 0.00123, pVal: 0.000, se: 0.086 / 0.00123 },
    { attribute: "Risk 30%",    wtp: -0.531 / 0.00123, pVal: 0.000, se: 0.090 / 0.00123 }
  ],
  '2': [
    { attribute: "Efficacy 50%", wtp: 1.031 / 0.00140, pVal: 0.000, se: 0.078 / 0.00140 },
    { attribute: "Efficacy 90%", wtp: 1.780 / 0.00140, pVal: 0.000, se: 0.084 / 0.00140 },
    { attribute: "Risk 8%",     wtp: -0.054 / 0.00140, pVal: 0.550, se: 0.090 / 0.00140 },
    { attribute: "Risk 16%",    wtp: -0.305 / 0.00140, pVal: 0.001, se: 0.089 / 0.00140 },
    { attribute: "Risk 30%",    wtp: -0.347 / 0.00140, pVal: 0.000, se: 0.094 / 0.00140 }
  ],
  '3': [
    // Risk (Self)
    { attribute: "Risk 8% (Self)",  wtp: -0.108 / 0.001, pVal: 0.200, se: 0.084 / 0.001 },
    { attribute: "Risk 16% (Self)", wtp: -0.218 / 0.001, pVal: 0.013, se: 0.088 / 0.001 },
    { attribute: "Risk 30% (Self)", wtp: -0.339 / 0.001, pVal: 0.000, se: 0.085 / 0.001 },
    // Risk (Others)
    { attribute: "Risk 8% (Others)",  wtp: -0.111 / 0.001, pVal: 0.190, se: 0.085 / 0.001 },
    { attribute: "Risk 16% (Others)", wtp: -0.103 / 0.001, pVal: 0.227, se: 0.085 / 0.001 },
    { attribute: "Risk 30% (Others)", wtp: -0.197 / 0.001, pVal: 0.017, se: 0.083 / 0.001 },
    // Efficacy (Self)
    { attribute: "Efficacy 50% (Self)", wtp: 0.604 / 0.001, pVal: 0.000, se: 0.084 / 0.001 },
    { attribute: "Efficacy 90% (Self)", wtp: 1.267 / 0.001, pVal: 0.000, se: 0.075 / 0.001 },
    // Efficacy (Others)
    { attribute: "Efficacy 50% (Others)", wtp: 0.272 / 0.001, pVal: 0.000, se: 0.083 / 0.001 },
    { attribute: "Efficacy 90% (Others)", wtp: 0.370 / 0.001, pVal: 0.000, se: 0.076 / 0.001 }
  ]
};

/** PREDICT UPTAKE: Radial Gauge */
function predictUptake() {
  const scenario = buildScenarioFromInputs();
  if (!scenario) return;
  computeGaugeProbability(scenario);
}

let probGaugeChartInstance = null;
function computeGaugeProbability(scenario) {
  let utility = 0;
  const exp = scenario.experiment;
  const coefs = coefficients[exp];
  if (!coefs) return;

  // ASC
  if (exp === '1') {
    utility += coefs.ASC;
  } else {
    utility += coefs.ASC_mean;
  }
  // Efficacy
  if (scenario.efficacy === '50') utility += coefs.efficacy_50;
  if (scenario.efficacy === '90') utility += coefs.efficacy_90;
  // Risk
  if (scenario.risk === '8')  utility += coefs.risk_8;
  if (scenario.risk === '16') utility += coefs.risk_16;
  if (scenario.risk === '30') utility += coefs.risk_30;
  // Cost
  utility += coefs.cost * scenario.cost;

  // Exp3: others
  if (exp === '3') {
    if (scenario.efficacyOthers === '50') utility += coefs.efficacyOthers_50;
    if (scenario.efficacyOthers === '90') utility += coefs.efficacyOthers_90;
    if (scenario.riskOthers === '8')  utility += coefs.riskOthers_8;
    if (scenario.riskOthers === '16') utility += coefs.riskOthers_16;
    if (scenario.riskOthers === '30') utility += coefs.riskOthers_30;
    utility += coefs.costOthers * scenario.costOthers;
  }

  const expU = Math.exp(utility);
  const expOpt = Math.exp(coefs.ASC_optout);
  const prob = (expU / (expU + expOpt)) * 100;
  currentUptakeProbability = prob;

  displayGauge(prob);
  alert(`Predicted Probability: ${prob.toFixed(2)}%. ${
    prob < 30 ? "Low uptake. Consider reducing cost or boosting efficacy." :
    prob < 70 ? "Moderate uptake. Additional improvements may help." :
                "High uptake. Maintaining these attributes is recommended."
  }`);
}

function displayGauge(prob) {
  const ctx = document.getElementById("probGaugeChart").getContext("2d");
  if (probGaugeChartInstance) {
    probGaugeChartInstance.destroy();
  }

  probGaugeChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ["Uptake Probability","Remaining"],
      datasets: [{
        data: [prob, 100 - prob],
        backgroundColor: [
          prob < 30 ? "rgba(231,76,60,0.6)" :
          prob < 70 ? "rgba(241,196,15,0.6)" :
                      "rgba(39,174,96,0.6)",
          "#ecf0f1"
        ],
        borderColor: [
          prob < 30 ? "rgba(231,76,60,1)" :
          prob < 70 ? "rgba(241,196,15,1)" :
                      "rgba(39,174,96,1)",
          "#bdc3c7"
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      cutout: '70%',
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `Predicted Uptake = ${prob.toFixed(2)}%`,
          font: { size: 16 }
        },
        tooltip: { enabled: false }
      }
    }
  });
}

/** SCENARIOS */
function buildScenarioFromInputs() {
  const experiment = document.getElementById("experimentSelect").value;
  if (!experiment) {
    alert("Please select an experiment.");
    return null;
  }
  const efficacy = document.getElementById("efficacy").value;
  const risk = document.getElementById("risk").value;
  const cost = parseInt(document.getElementById("cost").value, 10);

  let efficacyOthers = "N/A";
  let riskOthers = "N/A";
  let costOthers = "N/A";
  const missing = [];

  if (!efficacy) missing.push("Efficacy (Self)");
  if (!risk) missing.push("Risk (Self)");
  if (isNaN(cost)) missing.push("Cost (Self)");

  if (experiment === '3') {
    efficacyOthers = document.getElementById("efficacyOthers").value;
    riskOthers = document.getElementById("riskOthers").value;
    costOthers = parseInt(document.getElementById("costOthers").value, 10);

    if (!efficacyOthers) missing.push("Efficacy (Others)");
    if (!riskOthers) missing.push("Risk (Others)");
    if (isNaN(costOthers)) missing.push("Cost (Others)");
  }
  if (missing.length > 0) {
    alert(`Please provide: ${missing.join(", ")}`);
    return null;
  }
  return {
    experiment,
    efficacy,
    risk,
    cost,
    efficacyOthers,
    riskOthers,
    costOthers
  };
}

function saveScenario() {
  if (currentUptakeProbability <= 0) {
    alert("Please predict the Health Plan Uptake before saving the scenario.");
    return;
  }
  const scn = buildScenarioFromInputs();
  if (!scn) return;

  const eName = `Experiment ${scn.experiment}`;
  const scenarioObj = {
    name: `Scenario ${savedResults.length + 1}`,
    experiment: eName,
    efficacy: scn.efficacy,
    risk: scn.risk,
    cost: scn.cost,
    efficacyOthers: scn.experiment === '3' ? scn.efficacyOthers : 'N/A',
    riskOthers: scn.experiment === '3' ? scn.riskOthers : 'N/A',
    costOthers: scn.experiment === '3' ? scn.costOthers : 'N/A',
    uptake: currentUptakeProbability.toFixed(2)
  };
  savedResults.push(scenarioObj);
  addScenarioToTable(scenarioObj);
  alert(`"${scenarioObj.name}" saved successfully.`);
  renderWTPComparison();
}

function addScenarioToTable(s) {
  const tb = document.querySelector("#scenarioTable tbody");
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${s.name}</td>
    <td>${s.experiment}</td>
    <td>${s.efficacy}</td>
    <td>${s.risk}</td>
    <td>$${s.cost}</td>
    <td>${s.efficacyOthers}</td>
    <td>${s.riskOthers}</td>
    <td>$${s.costOthers}</td>
    <td>${s.uptake}</td>
  `;
  tb.appendChild(row);
}

function loadSavedResults() {
  savedResults = [];
  const tBody = document.querySelector("#scenarioTable tbody");
  if (tBody) tBody.innerHTML = "";
}

function toggleExperimentAttributes() {
  const exp = document.getElementById("experimentSelect").value;
  const isExp3 = (exp === '3');
  document.getElementById("efficacyOthersDiv").style.display = isExp3 ? 'block' : 'none';
  document.getElementById("riskOthersDiv").style.display = isExp3 ? 'block' : 'none';
  document.getElementById("costOthersDiv").style.display = isExp3 ? 'block' : 'none';
}

/** EXPORT SCENARIOS */
function exportToPDF() {
  if (savedResults.length < 1) {
    alert("No scenarios to export.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = 15;

  doc.setFontSize(16);
  doc.text("T2DM Equity-Efficiency - Scenarios", pageWidth / 2, currentY, { align: "center" });
  currentY += 10;

  savedResults.forEach((item, idx) => {
    if (currentY + 60 > pageHeight - 15) {
      doc.addPage();
      currentY = 15;
    }
    doc.setFontSize(14);
    doc.text(`Scenario ${idx + 1}: ${item.name}`, 15, currentY);
    currentY += 7;
    doc.setFontSize(12);
    doc.text(`Experiment: ${item.experiment}`, 15, currentY); currentY += 5;
    doc.text(`Efficacy (Self): ${item.efficacy}%`, 15, currentY); currentY += 5;
    doc.text(`Risk (Self): ${item.risk}%`, 15, currentY); currentY += 5;
    doc.text(`Cost (Self): $${item.cost}`, 15, currentY); currentY += 5;
    if (item.efficacyOthers !== 'N/A') {
      doc.text(`Efficacy (Others): ${item.efficacyOthers}%`, 15, currentY);
      currentY += 5;
    }
    if (item.riskOthers !== 'N/A') {
      doc.text(`Risk (Others): ${item.riskOthers}%`, 15, currentY);
      currentY += 5;
    }
    if (item.costOthers !== 'N/A') {
      doc.text(`Cost (Others): $${item.costOthers}`, 15, currentY);
      currentY += 5;
    }
    doc.text(`Predicted Uptake: ${item.uptake}%`, 15, currentY);
    currentY += 10;
  });

  doc.save("Scenarios_Comparison.pdf");
}

/** WTP CHART */
let wtpChartInstance = null;
function renderWTPChart() {
  const exp = document.getElementById("experimentSelect").value;
  if (!exp) {
    alert("Please select an experiment in the Inputs tab first.");
    return;
  }
  if (!wtpData[exp]) {
    alert("No WTP data available for this experiment.");
    return;
  }

  openTab("wtpTab", document.querySelector(".tabs button:nth-child(6)"));

  const dArr = wtpData[exp];
  const ctx = document.getElementById("wtpChartMain").getContext("2d");
  if (wtpChartInstance) {
    wtpChartInstance.destroy();
  }

  const labels = dArr.map(i => i.attribute);
  const values = dArr.map(i => i.wtp);
  const errors = dArr.map(i => i.se);

  wtpChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "WTP (USD)",
        data: values,
        backgroundColor: values.map(v => (v >= 0 ? "rgba(52,152,219,0.6)" : "rgba(231,76,60,0.6)")),
        borderColor: values.map(v => (v >= 0 ? "rgba(52,152,219,1)" : "rgba(231,76,60,1)")),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      },
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `WTP (USD) - Experiment ${exp}`,
          font: { size: 16 }
        },
        tooltip: {
          callbacks: {
            afterBody: ctx => {
              const i = ctx[0].dataIndex;
              const seVal = errors[i].toFixed(2);
              const pVal = dArr[i].pVal;
              return `SE: ${seVal}, p-value: ${pVal}`;
            }
          }
        }
      }
    },
    plugins: [{
      id: "errorbars",
      afterDraw: chart => {
        const { ctx, scales: { x, y } } = chart;
        chart.getDatasetMeta(0).data.forEach((bar, i) => {
          const val = values[i];
          const se = errors[i];
          if (se && typeof se === "number") {
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = "black";
            ctx.lineWidth = 1;
            const centerX = bar.x;
            const topY = y.getPixelForValue(val + se);
            const bottomY = y.getPixelForValue(val - se);
            ctx.moveTo(centerX, topY);
            ctx.lineTo(centerX, bottomY);
            // top & bottom whiskers
            ctx.moveTo(centerX - 4, topY);
            ctx.lineTo(centerX + 4, topY);
            ctx.moveTo(centerX - 4, bottomY);
            ctx.lineTo(centerX + 4, bottomY);
            ctx.stroke();
            ctx.restore();
          }
        });
      }
    }]
  });

  document.getElementById("wtpConclusion").innerHTML = `
    <strong>Note:</strong> Negative WTP indicates disutility requiring compensation; 
    positive WTP indicates willingness to pay for that attribute improvement.
  `;
}

/** WTP COMPARISON (Risk) */
let wtpComparisonChartInstance = null;
function renderWTPComparison() {
  if (savedResults.length < 1) {
    document.getElementById("wtpComparisonContainer").style.display = "none";
    return;
  }
  document.getElementById("wtpComparisonContainer").style.display = "block";

  const ctx = document.getElementById("wtpComparisonChart").getContext("2d");
  if (wtpComparisonChartInstance) {
    wtpComparisonChartInstance.destroy();
  }

  const riskAverages = {
    "Experiment 1": [],
    "Experiment 2": [],
    "Experiment 3 Self": [],
    "Experiment 3 Others": []
  };

  savedResults.forEach(s => {
    const eName = s.experiment;
    const eNum = eName.split(" ")[1];
    const dataArr = wtpData[eNum];
    if (!dataArr) return;
    dataArr.forEach(item => {
      if (!item.attribute.toLowerCase().includes("risk")) return;
      if (eName === "Experiment 1") {
        riskAverages["Experiment 1"].push(item.wtp);
      } else if (eName === "Experiment 2") {
        riskAverages["Experiment 2"].push(item.wtp);
      } else if (eName === "Experiment 3") {
        if (item.attribute.includes("(Self)")) {
          riskAverages["Experiment 3 Self"].push(item.wtp);
        } else {
          riskAverages["Experiment 3 Others"].push(item.wtp);
        }
      }
    });
  });

  const avg = arr => {
    if (!arr || arr.length===0) return 0;
    return (arr.reduce((acc,v)=>acc+v,0)/arr.length).toFixed(2);
  };

  const exp1Risk = avg(riskAverages["Experiment 1"]);
  const exp2Risk = avg(riskAverages["Experiment 2"]);
  const exp3RiskSelf = avg(riskAverages["Experiment 3 Self"]);
  const exp3RiskOthers = avg(riskAverages["Experiment 3 Others"]);

  const labels = ["Exp1 (Risk)", "Exp2 (Risk)", "Exp3 (Self-Risk)", "Exp3 (Others-Risk)"];
  const values = [
    parseFloat(exp1Risk),
    parseFloat(exp2Risk),
    parseFloat(exp3RiskSelf),
    parseFloat(exp3RiskOthers)
  ];

  wtpComparisonChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Average WTP (USD) for Risk",
        data: values,
        backgroundColor: values.map(v => v < 0 ? "rgba(231,76,60,0.6)" : "rgba(52,152,219,0.6)"),
        borderColor: values.map(v => v < 0 ? "rgba(231,76,60,1)" : "rgba(52,152,219,1)"),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      },
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Average WTP for Risk Across Experiments",
          font: { size: 16 }
        }
      }
    }
  });

  document.getElementById("wtpComparisonConclusion").innerHTML = `
    <strong>Conclusion:</strong><br/><br/>
    Across experiments, risk aversion tends to decline when participants consider equity aspects.<br/>
    <em>Example Numeric Values:</em><br/>
    <strong>Experiment 1:</strong> Risk WTP ≈ $-260.98<br/>
    <strong>Experiment 2:</strong> Risk WTP ≈ $-168.10<br/>
    <strong>Experiment 3 (Self):</strong> Risk WTP ≈ $-256.19<br/>
    <strong>Experiment 3 (Others):</strong> Risk WTP ≈ $-210.47<br/>
    (Negative indicates disutility; positive indicates willingness to pay for risk reduction.)
  `;
}

/** COST & BENEFIT LOGIC */
let costsChartInstance = null;
let benefitsChartInstance = null;

/** Updated insurance-like cost components */
const costComponents = [
  { item: "Plan Administration & Management", totalCost: 4000.00 },
  { item: "Chronic Disease Management Fee",   totalCost: 2000.00 },
  { item: "Medication Coverage",             totalCost: 3000.00 },
  { item: "Lab & Diagnostic Costs",          totalCost: 800.00 },
  { item: "Specialist Visits",              totalCost: 1200.00 },
  { item: "Hospitalization Coverage",        totalCost: 4000.00 },
  { item: "Patient Education & Support",     totalCost: 600.00 },
  { item: "Telehealth / Virtual Services",   totalCost: 500.00 }
];

const QALY_SCENARIOS = {
  low: 0.02,
  moderate: 0.05,
  high: 0.10
};
const VALUE_PER_QALY = 50000;

function renderCostsBenefits() {
  const scn = buildScenarioFromInputs() || null;
  let uptake = currentUptakeProbability;
  if (!scn) {
    // fallback scenario or 0 uptake if nothing valid
    uptake = 0;
  }
  const fraction = uptake / 100;

  let totalCost = 0;
  costComponents.forEach(c => totalCost += c.totalCost);

  // apply fraction to all except "Plan Administration & Management" as an example
  costComponents.forEach(c => {
    if (c.item !== "Plan Administration & Management") {
      totalCost += c.totalCost * fraction;
    }
  });

  const scenarioSel = document.getElementById("qalySelect") ? document.getElementById("qalySelect").value : "moderate";
  const qalyGain = QALY_SCENARIOS[scenarioSel] || 0.05;
  const participants = Math.round(701 * fraction);
  const totalQALY = participants * qalyGain;
  const monetizedBenefits = totalQALY * VALUE_PER_QALY;
  const netBenefit = monetizedBenefits - totalCost;

  const cont = document.getElementById("costsBenefitsResults");
  cont.innerHTML = "";

  // Display cost items as cards
  const cardsDiv = document.createElement("div");
  cardsDiv.className = "cost-cards";

  costComponents.forEach(c => {
    const card = document.createElement("div");
    card.className = "cost-card";
    card.innerHTML = `
      <h4>${c.item}</h4>
      <p>Base Cost: $${c.totalCost.toFixed(2)}</p>
    `;
    cardsDiv.appendChild(card);
  });
  cont.appendChild(cardsDiv);

  // Summary block
  const summaryDiv = document.createElement("div");
  summaryDiv.className = "calculation-info";
  summaryDiv.innerHTML = `
    <h4>Cost &amp; Benefits Summary</h4>
    <p><strong>Predicted Uptake Probability:</strong> ${uptake.toFixed(2)}%</p>
    <p><strong>Participants (out of 701):</strong> ${participants}</p>
    <p><strong>Total Treatment Cost:</strong> $${totalCost.toFixed(2)}</p>
    <p><strong>Total QALY Gains:</strong> ${totalQALY.toFixed(2)}</p>
    <p><strong>Monetised Benefits:</strong> $${monetizedBenefits.toLocaleString()}</p>
    <p><strong>Net Benefit:</strong> $${netBenefit.toLocaleString()}</p>
  `;
  cont.appendChild(summaryDiv);

  // cost & benefits chart
  const chartDiv = document.createElement("div");
  chartDiv.className = "chart-grid";

  const costBox = document.createElement("div");
  costBox.className = "chart-box";
  costBox.innerHTML = `<h3>Total Insurance Cost</h3><canvas id="costChart"></canvas>`;
  chartDiv.appendChild(costBox);

  const benefitBox = document.createElement("div");
  benefitBox.className = "chart-box";
  benefitBox.innerHTML = `<h3>Monetised QALY Benefits</h3><canvas id="benefitChart"></canvas>`;
  chartDiv.appendChild(benefitBox);

  cont.appendChild(chartDiv);

  // Chart 1: cost
  const ctxCost = document.getElementById("costChart").getContext("2d");
  if (costsChartInstance) costsChartInstance.destroy();
  costsChartInstance = new Chart(ctxCost, {
    type: "bar",
    data: {
      labels: ["Total Cost"],
      datasets: [{
        label: "USD",
        data: [totalCost],
        backgroundColor: "rgba(231,76,60,0.6)",
        borderColor: "rgba(192,57,43,1)",
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Total Insurance Cost",
          font: { size: 16 }
        }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });

  // Chart 2: benefits
  const ctxBenefit = document.getElementById("benefitChart").getContext("2d");
  if (benefitsChartInstance) benefitsChartInstance.destroy();
  benefitsChartInstance = new Chart(ctxBenefit, {
    type: "bar",
    data: {
      labels: ["QALY Benefits"],
      datasets: [{
        label: "USD",
        data: [monetizedBenefits],
        backgroundColor: "rgba(52,152,219,0.6)",
        borderColor: "rgba(52,152,219,1)",
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Monetised QALY Benefits",
          font: { size: 16 }
        }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

/** On page load */
window.addEventListener("load", () => {
  loadSavedResults();
  document.getElementById("experimentSelect").addEventListener("change", toggleExperimentAttributes);
});
