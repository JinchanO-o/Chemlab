const chartDefinitions = [
  ['radiusChart', 'Atomic radius vs atomic number', 'atomicRadius', 'scatter'],
  ['electronegativityChart', 'Electronegativity vs atomic number', 'electronegativity', 'scatter'],
  ['ionizationChart', 'Ionization energy vs atomic number', 'ionizationEnergy', 'scatter'],
  ['meltingChart', 'Melting point vs atomic number', 'meltingPoint', 'scatter'],
  ['periodThreeChart', 'Atomic radius across period 3', 'atomicRadius', 'line'],
  ['halogenChart', 'Electronegativity down group 17', 'electronegativity', 'line'],
];
const colors = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#4f46e5', '#65a30d', '#c2410c'];
const charts = [];
let elements = [];
let categories = [];

function valueOf(element, property) { return element[property] === null || element[property] === undefined ? null : Number(element[property]); }
function pointFor(element, property) { const value = valueOf(element, property); return value === null || Number.isNaN(value) ? null : { x: element.atomicNumber, y: value, symbol: element.symbol, name: element.name }; }
function groupedDatasets(source, property) {
  return categories.map((category, index) => ({ label: category, data: source.filter((element) => element.category === category).map((element) => pointFor(element, property)).filter(Boolean), backgroundColor: colors[index % colors.length], borderColor: colors[index % colors.length], pointRadius: 4, showLine: false }));
}
function chartOptions() {
  return { responsive: true, maintainAspectRatio: false, animation: false, scales: { x: { type: 'linear', title: { display: true, text: 'Atomic number' } }, y: { beginAtZero: false } }, plugins: { tooltip: { callbacks: { label: (context) => `${context.raw.symbol}: ${context.raw.y}` } }, legend: { position: 'bottom' } }, onClick: (_event, active, chart) => { const item = active[0]; const point = item ? chart.data.datasets[item.datasetIndex].data[item.index] : null; if (point?.symbol) location.href = `element.html?symbol=${point.symbol}`; } };
}
function createChart(id, title, property, type, source) {
  const card = document.createElement('article');
  card.className = 'chart-card';
  card.innerHTML = `<h2>${title}</h2><div class="chart-wrap"><canvas id="${id}" aria-label="${title}" role="img"></canvas></div>`;
  document.querySelector('#chartGrid').appendChild(card);
  const datasets = type === 'scatter' ? groupedDatasets(source, property) : [{ label: title, data: source.map((element) => pointFor(element, property)).filter(Boolean), borderColor: '#2563eb', backgroundColor: 'rgba(37, 99, 235, .18)', tension: .25, pointRadius: 5, parsing: false }];
  const chart = new Chart(document.getElementById(id), { type, data: { datasets }, options: { ...chartOptions(), scales: { x: { type: 'linear', title: { display: true, text: 'Atomic number' }, ticks: { precision: 0 } }, y: { beginAtZero: false } } } });
  charts.push(chart);
}
function renderCategoryControls() {
  document.querySelector('#categoryControls').innerHTML = categories.map((category) => `<label><input type="checkbox" checked data-category="${category}"> ${category}</label>`).join('');
  document.querySelectorAll('[data-category]').forEach((checkbox) => checkbox.addEventListener('change', () => {
    const visible = new Set([...document.querySelectorAll('[data-category]:checked')].map((input) => input.dataset.category));
    charts.forEach((chart) => chart.data.datasets.forEach((dataset) => { if (dataset.label && categories.includes(dataset.label)) dataset.hidden = !visible.has(dataset.label); }));
    charts.forEach((chart) => chart.update());
  }));
}
fetch('data/elements.json', { cache: 'no-store' }).then((response) => response.json()).then((data) => {
  elements = data;
  categories = [...new Set(elements.map((element) => element.category))].sort();
  renderCategoryControls();
  createChart('radiusChart', chartDefinitions[0][1], chartDefinitions[0][2], chartDefinitions[0][3], elements);
  createChart('electronegativityChart', chartDefinitions[1][1], chartDefinitions[1][2], chartDefinitions[1][3], elements);
  createChart('ionizationChart', chartDefinitions[2][1], chartDefinitions[2][2], chartDefinitions[2][3], elements);
  createChart('meltingChart', chartDefinitions[3][1], chartDefinitions[3][2], chartDefinitions[3][3], elements);
  createChart('periodThreeChart', chartDefinitions[4][1], chartDefinitions[4][2], chartDefinitions[4][3], elements.filter((element) => element.period === 3));
  createChart('halogenChart', chartDefinitions[5][1], chartDefinitions[5][2], chartDefinitions[5][3], elements.filter((element) => element.group === 17));
}).catch(() => { document.querySelector('#chartGrid').innerHTML = '<p class="empty-state">Unable to load trend data.</p>'; });
