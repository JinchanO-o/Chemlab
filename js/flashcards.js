import { getLanguage } from './i18n.js';
import { getFlashcardProgress, setFlashcardStatus } from './progress.js';

const state = { all: [], deck: [], index: 0, flipped: false };
const $ = (id) => document.getElementById(id);
const card = $('flashcard');
function nameOf(element) { return getLanguage() === 'vi' ? element.nameVi : element.name; }
function shuffle(items) { return [...items].sort(() => Math.random() - 0.5); }
function current() { return state.deck[state.index]; }
function render() {
  const element = current();
  if (!element) return;
  state.flipped = false;
  card.classList.remove('is-flipped');
  $('cardSymbol').textContent = element.symbol;
  $('cardNumber').textContent = `#${element.atomicNumber}`;
  $('cardName').textContent = nameOf(element);
  $('cardMass').textContent = element.atomicMass ?? '—';
  $('cardCategory').textContent = element.category;
  $('cardGroup').textContent = element.group ?? '—';
  $('cardPeriod').textContent = element.period ?? '—';
  $('cardConfig').textContent = element.electronConfiguration ?? '—';
  $('cardApplication').textContent = element.applications?.[0] ?? '—';
  $('cardPosition').textContent = `${state.index + 1} / ${state.deck.length}`;
  const known = Object.values(getFlashcardProgress()).filter((status) => status === 'known').length;
  $('knownCount').textContent = known;
  $('knownProgress').style.width = `${state.deck.length ? Math.min(100, (known / state.deck.length) * 100) : 0}%`;
}
function buildDeck() {
  const mode = $('deckMode').value;
  let deck = state.all;
  if (mode === 'category') deck = deck.filter((item) => item.category === $('deckCategory').value);
  if (mode === 'period') deck = deck.filter((item) => Number(item.period) === Number($('deckPeriod').value));
  if (mode === 'range') {
    const start = Number($('rangeStart').value) || 1;
    const end = Number($('rangeEnd').value) || 118;
    deck = deck.filter((item) => item.atomicNumber >= start && item.atomicNumber <= end);
  }
  state.deck = deck;
  state.index = 0;
  render();
}
function flip() { state.flipped = !state.flipped; card.classList.toggle('is-flipped', state.flipped); }
$('flashcard').addEventListener('click', flip);
$('flipCard').addEventListener('click', flip);
$('previousCard').addEventListener('click', () => { state.index = (state.index - 1 + state.deck.length) % state.deck.length; render(); });
$('nextCard').addEventListener('click', () => { state.index = (state.index + 1) % state.deck.length; render(); });
$('shuffleDeck').addEventListener('click', () => { state.deck = shuffle(state.deck); state.index = 0; render(); });
$('markKnown').addEventListener('click', () => { const element = current(); setFlashcardStatus(element.symbol, 'known'); render(); });
$('deckMode').addEventListener('change', () => { $('categoryChoice').hidden = $('deckMode').value !== 'category'; $('periodChoice').hidden = $('deckMode').value !== 'period'; $('rangeChoice').hidden = $('deckMode').value !== 'range'; buildDeck(); });
['deckCategory', 'deckPeriod', 'rangeStart', 'rangeEnd'].forEach((id) => $(id).addEventListener('change', buildDeck));
document.addEventListener('languagechange', render);
document.addEventListener('keydown', (event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); flip(); } if (event.key === 'ArrowLeft') $('previousCard').click(); if (event.key === 'ArrowRight') $('nextCard').click(); });
fetch('data/elements.json', { cache: 'no-store' }).then((response) => response.json()).then((elements) => { state.all = elements; const categories = [...new Set(elements.map((item) => item.category))].sort(); $('deckCategory').innerHTML = categories.map((category) => `<option value="${category}">${category}</option>`).join(''); buildDeck(); }).catch(() => { $('flashcardError').hidden = false; });
