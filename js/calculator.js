const $ = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return Math.abs(a) || 1; };
const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);

class Fraction {
  constructor(numerator = 0, denominator = 1) {
    if (denominator === 0) throw new Error('Division by zero');
    const sign = denominator < 0 ? -1 : 1;
    const divisor = gcd(numerator, denominator);
    this.n = sign * numerator / divisor;
    this.d = sign * denominator / divisor;
  }
  add(other) { return new Fraction(this.n * other.d + other.n * this.d, this.d * other.d); }
  sub(other) { return this.add(new Fraction(-other.n, other.d)); }
  mul(other) { return new Fraction(this.n * other.n, this.d * other.d); }
  div(other) { return new Fraction(this.n * other.d, this.d * other.n); }
  neg() { return new Fraction(-this.n, this.d); }
  isZero() { return this.n === 0; }
}

let elements = [];
let masses = new Map();
fetch('data/elements.json', { cache: 'no-store' }).then((response) => response.json()).then((data) => {
  elements = data;
  masses = new Map(data.map((element) => [element.symbol, Number(element.atomicMass)]));
  calculateMolarMass();
}).catch(() => showError('molarResult', 'Unable to load element data.'));

function parseFormula(formula) {
  const normalized = formula.replace(/[·]/g, '.').replace(/\s+/g, '');
  if (!normalized) throw new Error('Enter a chemical formula.');
  const total = {};
  const add = (target, source, multiplier = 1) => Object.entries(source).forEach(([symbol, count]) => { target[symbol] = (target[symbol] || 0) + count * multiplier; });
  const parsePart = (text, start = 0, stopAtClose = false) => {
    const counts = {};
    let position = start;
    while (position < text.length) {
      if (text[position] === ')') {
        if (!stopAtClose) throw new Error('Unbalanced parentheses.');
        return { counts, position: position + 1 };
      }
      if (text[position] === '(') {
        const nested = parsePart(text, position + 1, true);
        position = nested.position;
        const number = readNumber(text, position);
        position = number.position;
        add(counts, nested.counts, number.value || 1);
        continue;
      }
      const symbolMatch = text.slice(position).match(/^[A-Z][a-z]?/);
      if (!symbolMatch) throw new Error(`Invalid formula near "${text.slice(position)}".`);
      const symbol = symbolMatch[0];
      if (!masses.has(symbol)) throw new Error(`Unknown element: ${symbol}.`);
      position += symbol.length;
      const number = readNumber(text, position);
      position = number.position;
      counts[symbol] = (counts[symbol] || 0) + (number.value || 1);
    }
    if (stopAtClose) throw new Error('Unbalanced parentheses.');
    return { counts, position };
  };
  const parts = normalized.split('.');
  parts.forEach((part) => {
    if (!part) throw new Error('Invalid hydrate separator.');
    const prefix = part.match(/^\d+/);
    const multiplier = prefix ? Number(prefix[0]) : 1;
    const body = prefix ? part.slice(prefix[0].length) : part;
    add(total, parsePart(body).counts, multiplier);
  });
  return total;
}

function readNumber(text, position) {
  const match = text.slice(position).match(/^\d+/);
  return { value: match ? Number(match[0]) : 0, position: position + (match ? match[0].length : 0) };
}

function calculateMolarMass() {
  const formula = $('formulaInput').value.trim();
  if (!formula) return clearResult('molarResult');
  try {
    const counts = parseFormula(formula);
    const rows = Object.entries(counts).map(([symbol, count]) => ({ symbol, count, mass: masses.get(symbol), subtotal: count * masses.get(symbol) }));
    const total = rows.reduce((sum, row) => sum + row.subtotal, 0);
    setResult('molarResult', `<strong>${escapeHtml(formula)}: ${total.toFixed(3)} g/mol</strong><table class="calc-table"><thead><tr><th>Element</th><th>Count</th><th>Atomic mass</th><th>Subtotal</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${row.symbol}</td><td>${row.count}</td><td>${row.mass}</td><td>${row.subtotal.toFixed(3)}</td></tr>`).join('')}</tbody></table>`);
  } catch (error) { showError('molarResult', error.message); }
}

function parseCompound(compound) {
  const match = compound.trim().match(/^(?:(\d+)\s*)?(.+)$/);
  if (!match) throw new Error('Invalid compound.');
  return { coefficient: Number(match[1] || 1), formula: match[2].trim(), counts: parseFormula(match[2].trim()) };
}
function parseEquation(value) {
  const sides = value.split(/(?:->|→|=)/);
  if (sides.length !== 2) throw new Error('Use an arrow such as Fe + O2 -> Fe2O3.');
  const left = sides[0].split('+').map(parseCompound);
  const right = sides[1].split('+').map(parseCompound);
  if (!left.length || !right.length || left.some((item) => !item.formula) || right.some((item) => !item.formula)) throw new Error('Both sides need compounds.');
  return { left, right };
}
function rref(matrix) {
  const rows = matrix.length;
  const columns = matrix[0].length;
  let pivotRow = 0;
  const pivots = [];
  for (let column = 0; column < columns && pivotRow < rows; column += 1) {
    let selected = pivotRow;
    while (selected < rows && matrix[selected][column].isZero()) selected += 1;
    if (selected === rows) continue;
    [matrix[pivotRow], matrix[selected]] = [matrix[selected], matrix[pivotRow]];
    const pivot = matrix[pivotRow][column];
    matrix[pivotRow] = matrix[pivotRow].map((cell) => cell.div(pivot));
    for (let row = 0; row < rows; row += 1) {
      if (row === pivotRow || matrix[row][column].isZero()) continue;
      const factor = matrix[row][column];
      matrix[row] = matrix[row].map((cell, index) => cell.sub(matrix[pivotRow][index].mul(factor)));
    }
    pivots.push(column);
    pivotRow += 1;
  }
  return { matrix, pivots };
}
function balanceEquation(value) {
  const equation = parseEquation(value);
  const compounds = [...equation.left, ...equation.right];
  const symbols = [...new Set(compounds.flatMap((compound) => Object.keys(compound.counts)))];
  const matrix = symbols.map((symbol) => compounds.map((compound, index) => new Fraction((index < equation.left.length ? 1 : -1) * (compound.counts[symbol] || 0))));
  const result = rref(matrix.map((row) => [...row]));
  const freeColumn = compounds.length - 1;
  if (result.pivots.length === compounds.length) throw new Error('Cannot balance this equation.');
  const values = Array.from({ length: compounds.length }, () => new Fraction(0));
  values[freeColumn] = new Fraction(1);
  result.pivots.forEach((pivot, row) => { values[pivot] = result.matrix[row][freeColumn].neg(); });
  const multiplier = values.reduce((current, value) => lcm(current, value.d), 1);
  let integers = values.map((value) => value.n * (multiplier / value.d));
  const sign = integers.find((value) => value !== 0) < 0 ? -1 : 1;
  integers = integers.map((value) => value * sign);
  const common = integers.reduce((current, value) => gcd(current, Math.abs(value)), 0) || 1;
  integers = integers.map((value) => value / common);
  if (integers.some((value) => value <= 0)) throw new Error('Cannot balance this equation.');
  const formatSide = (items, offset) => items.map((item, index) => `${integers[offset + index] === 1 ? '' : `${integers[offset + index]} `}${item.formula}`).join(' + ');
  const text = `${formatSide(equation.left, 0)} -> ${formatSide(equation.right, equation.left.length)}`;
  const table = symbols.map((symbol) => `<tr><td>${symbol}</td><td>${equation.left.reduce((sum, compound, index) => sum + (compound.counts[symbol] || 0) * integers[index], 0)}</td><td>${equation.right.reduce((sum, compound, index) => sum + (compound.counts[symbol] || 0) * integers[equation.left.length + index], 0)}</td></tr>`).join('');
  setResult('balanceResult', `<strong>${escapeHtml(text)}</strong><table class="calc-table"><thead><tr><th>Element</th><th>Reactants</th><th>Products</th></tr></thead><tbody>${table}</tbody></table>`);
}

function calculatePh() {
  const concentration = Number($('phConcentration').value);
  const constant = Number($('phConstant').value);
  const equivalents = Number($('phProtons').value);
  if (!(concentration > 0)) return showError('phResult', 'Enter a positive concentration.');
  const type = $('phType').value;
  let hydrogen;
  if (type === 'strong-acid') hydrogen = concentration * equivalents;
  else if (type === 'strong-base') hydrogen = 1e-14 / (concentration * equivalents);
  else {
    if (!(constant > 0)) return showError('phResult', 'Enter a positive Ka or Kb.');
    const ion = Math.sqrt(constant * concentration);
    hydrogen = type === 'weak-acid' ? ion : 1e-14 / ion;
  }
  const pH = -Math.log10(hydrogen);
  const pOH = 14 - pH;
  setResult('phResult', `<strong>pH ${pH.toFixed(2)}</strong><br>[H+] = ${hydrogen.toExponential(3)} M<br>[OH−] = ${Math.pow(10, -pOH).toExponential(3)} M<br>pOH = ${pOH.toFixed(2)}<br><span class="calc-muted">${pH < 7 ? 'Acidic' : pH > 7 ? 'Basic' : 'Neutral'}</span>`);
}
function calculateSolution() {
  const mode = $('solutionMode').value;
  if (mode === 'dilution') {
    const c1 = Number($('c1').value), v1 = Number($('v1').value), c2 = Number($('c2').value), v2 = Number($('v2').value);
    if (!(c1 > 0 && v1 > 0 && c2 > 0)) return showError('solutionResult', 'Enter positive C1, V1, and C2 values.');
    if (v2 > 0) setResult('solutionResult', `<strong>C1V1 = C2V2</strong><br>Resulting concentration: ${(c1 * v1 / v2).toFixed(4)} M<br>Conversion: ${v2.toFixed(2)} mL = ${(v2 / 1000).toFixed(4)} L`);
    else setResult('solutionResult', `<strong>V2 = ${(c1 * v1 / c2).toFixed(2)} mL</strong><br>Conversion: ${((c1 * v1 / c2) / 1000).toFixed(4)} L`);
  } else if (mode === 'percent') {
    const solute = Number($('soluteMass').value), solvent = Number($('solventMass').value);
    if (!(solute >= 0 && solvent > 0)) return showError('solutionResult', 'Enter a non-negative solute mass and positive solvent mass.');
    setResult('solutionResult', `<strong>${(solute / (solute + solvent) * 100).toFixed(3)}% w/w</strong><br>Total solution mass: ${(solute + solvent).toFixed(3)} g`);
  } else {
    const mass = Number($('solutionMass').value), molarMass = Number($('solutionMolarMass').value), volume = Number($('solutionVolume').value);
    if (!(mass >= 0 && molarMass > 0 && volume > 0)) return showError('solutionResult', 'Enter valid mass, molar mass, and volume values.');
    setResult('solutionResult', `<strong>${(mass / molarMass / volume).toFixed(4)} M</strong><br>Moles: ${(mass / molarMass).toFixed(5)} mol`);
  }
}

const unitDefinitions = {
  amount: { units: ['mol', 'g', 'particles'] }, concentration: { units: ['mol/L', 'g/L', '% w/v'] }, temperature: { units: ['°C', 'K', '°F'] }, pressure: { units: ['atm', 'kPa', 'mmHg', 'bar'] },
};
function updateUnitOptions() {
  const mode = $('unitMode').value;
  $('unitInput').innerHTML = unitDefinitions[mode].units.map((unit) => `<option>${unit}</option>`).join('');
  $('unitMolarMassLabel').hidden = !['amount', 'concentration'].includes(mode);
  calculateUnits();
}
function calculateUnits() {
  const mode = $('unitMode').value, value = Number($('unitValue').value), input = $('unitInput').value;
  if (!Number.isFinite(value)) return showError('unitResult', 'Enter a numeric value.');
  let values;
  if (mode === 'amount') { const mol = input === 'mol' ? value : input === 'g' ? value / Number($('unitMolarMass').value) : value / 6.02214076e23; values = { mol, g: mol * Number($('unitMolarMass').value), particles: mol * 6.02214076e23 }; }
  if (mode === 'concentration') { const molarMass = Number($('unitMolarMass').value); const molar = input === 'mol/L' ? value : input === 'g/L' ? value / molarMass : value / (100 * molarMass); values = { 'mol/L': molar, 'g/L': molar * molarMass, '% w/v': molar * molarMass / 10 }; }
  if (mode === 'temperature') { const celsius = input === '°C' ? value : input === 'K' ? value - 273.15 : (value - 32) * 5 / 9; values = { '°C': celsius, K: celsius + 273.15, '°F': celsius * 9 / 5 + 32 }; }
  if (mode === 'pressure') { const atm = input === 'atm' ? value : input === 'kPa' ? value / 101.325 : input === 'mmHg' ? value / 760 : value / 1.01325; values = { atm, kPa: atm * 101.325, mmHg: atm * 760, bar: atm * 1.01325 }; }
  setResult('unitResult', Object.entries(values).map(([unit, converted]) => `<strong>${converted.toPrecision(7)} ${unit}</strong>`).join('<br>'));
}
function setResult(id, html) { const element = $(id); element.className = 'calc-result'; element.innerHTML = html; }
function showError(id, message) { const element = $(id); element.className = 'calc-result calc-error'; element.textContent = message; }
function clearResult(id) { $(id).className = 'calc-result'; $(id).innerHTML = ''; }
function copyResult(id) { const text = $(id).innerText; if (text) navigator.clipboard?.writeText(text); }

$('formulaInput').addEventListener('input', calculateMolarMass);
$('equationInput').addEventListener('input', () => { try { balanceEquation($('equationInput').value); } catch (error) { showError('balanceResult', error.message); } });
['phType', 'phConcentration', 'phConstant', 'phProtons'].forEach((id) => $(id).addEventListener('input', calculatePh));
['solutionMode', 'c1', 'v1', 'c2', 'v2', 'soluteMass', 'solventMass', 'solutionMass', 'solutionMolarMass', 'solutionVolume'].forEach((id) => $(id).addEventListener('input', () => { $('dilutionFields').hidden = $('solutionMode').value !== 'dilution'; $('percentFields').hidden = $('solutionMode').value !== 'percent'; $('molarityFields').hidden = $('solutionMode').value !== 'molarity'; calculateSolution(); }));
$('unitMode').addEventListener('change', updateUnitOptions); $('unitValue').addEventListener('input', calculateUnits); $('unitInput').addEventListener('change', calculateUnits); $('unitMolarMass').addEventListener('input', calculateUnits);
$('molarCopy').addEventListener('click', () => copyResult('molarResult')); $('balanceCopy').addEventListener('click', () => copyResult('balanceResult'));
document.querySelectorAll('[data-clear]').forEach((button) => button.addEventListener('click', () => { button.dataset.clear.split(',').forEach((id) => { $(id).value = ''; }); clearResult(button.dataset.result); }));
updateUnitOptions(); calculatePh(); calculateSolution();
