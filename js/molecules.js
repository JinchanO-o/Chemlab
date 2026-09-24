let molecules = [];
let selected = null;
let viewer = null;
let currentStyle = 'stick';
let spinning = false;
const $ = (id) => document.getElementById(id);
const language = () => document.documentElement.lang === 'vi' ? 'vi' : 'en';
const nameOf = (molecule) => language() === 'vi' ? molecule.nameVi : molecule.nameEn;
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character])); }
function calculateMass(formula) { const known = { H: 1.008, C: 12.011, N: 14.007, O: 15.999, Na: 22.99, Cl: 35.45, S: 32.06 }; return [...formula.matchAll(/([A-Z][a-z]?)(\d*)/g)].reduce((sum, match) => sum + (known[match[1]] || 0) * Number(match[2] || 1), 0); }
function renderList() { const query = $('moleculeSearch').value.toLowerCase(); $('moleculeList').innerHTML = molecules.filter((molecule) => `${molecule.nameEn} ${molecule.nameVi} ${molecule.formula}`.toLowerCase().includes(query)).map((molecule) => `<button type="button" data-id="${molecule.id}" class="${selected?.id === molecule.id ? 'is-selected' : ''}">${escapeHtml(nameOf(molecule))} <span class="calc-muted">${molecule.formula}</span></button>`).join('') || '<p class="calc-muted">No molecules found.</p>'; document.querySelectorAll('#moleculeList [data-id]').forEach((button) => button.addEventListener('click', () => selectMolecule(molecules.find((molecule) => molecule.id === button.dataset.id)))); }
function showFallback(message) { $('moleculeViewer').innerHTML = `<div class="viewer-fallback"><div><svg viewBox="0 0 360 220" role="img" aria-label="2D molecular structure placeholder"><line x1="110" y1="110" x2="180" y2="80" stroke="#7dd3fc" stroke-width="8"/><line x1="180" y1="80" x2="250" y2="110" stroke="#7dd3fc" stroke-width="8"/><circle cx="110" cy="110" r="30" fill="#ef4444"/><circle cx="180" cy="80" r="30" fill="#64748b"/><circle cx="250" cy="110" r="30" fill="#ef4444"/><text x="99" y="116" fill="white">O</text><text x="171" y="86" fill="white">C</text><text x="239" y="116" fill="white">O</text></svg><p>${escapeHtml(message)}</p></div></div>`; }
function renderViewer(smiles) { if (!window.$3Dmol) return showFallback('3Dmol.js is unavailable. Showing a 2D placeholder.'); try { $('moleculeViewer').innerHTML = ''; viewer = window.$3Dmol.createViewer('moleculeViewer', { backgroundColor: '#101827' }); viewer.addModel(smiles, 'smi'); applyStyle(); viewer.zoomTo(); viewer.render(); } catch (error) { showFallback('This browser cannot render the 3D viewer.'); } }
function applyStyle() { if (!viewer) return; viewer.setStyle({}, currentStyle === 'ball' ? { stick: {}, sphere: { scale: .28 } } : { [currentStyle]: {} }); viewer.render(); }
function selectMolecule(molecule) { selected = molecule; $('smilesInput').value = molecule.smiles; renderList(); renderViewer(molecule.smiles); $('moleculeInfo').innerHTML = `<h2>${escapeHtml(nameOf(molecule))}</h2><p>${escapeHtml(molecule.nameEn)} / ${escapeHtml(molecule.nameVi)}</p><p><strong>Formula:</strong> ${escapeHtml(molecule.formula)}<br><strong>Molar mass:</strong> ${calculateMass(molecule.formula).toFixed(3)} g/mol</p><p>${escapeHtml(language() === 'vi' ? molecule.descriptionVi : molecule.descriptionEn)}</p>`; }
$('moleculeSearch').addEventListener('input', renderList);
$('styleSelect').addEventListener('change', (event) => { currentStyle = event.target.value; applyStyle(); });
$('spinToggle').addEventListener('click', () => { spinning = !spinning; if (viewer) viewer.spin(spinning); $('spinToggle').textContent = spinning ? 'Stop spin' : 'Spin'; });
$('resetCamera').addEventListener('click', () => { if (viewer) { viewer.stopAnimate(); viewer.zoomTo(); viewer.render(); } });
$('smilesForm').addEventListener('submit', (event) => { event.preventDefault(); const smiles = $('smilesInput').value.trim(); if (smiles) renderViewer(smiles); });
document.addEventListener('languagechange', () => { renderList(); if (selected) selectMolecule(selected); });
fetch('data/molecules.json', { cache: 'no-store' }).then((response) => response.json()).then((data) => { molecules = data; selected = molecules[0]; renderList(); selectMolecule(selected); }).catch(() => showFallback('Unable to load molecule data.'));
