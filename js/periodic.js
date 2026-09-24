const STORAGE_KEY = 'study-forum-periodic-filters';
const THEME_KEY = 'study-forum-theme';

const tableContainer = document.querySelector('#periodicTable');
const modal = document.querySelector('#elementModal');
const modalTitle = document.querySelector('#modalName');
const modalNumber = document.querySelector('#modalNumber');
const modalMass = document.querySelector('#modalMass');
const modalGroup = document.querySelector('#modalGroup');
const modalPeriod = document.querySelector('#modalPeriod');
const modalCategory = document.querySelector('#modalCategory');
const searchInput = document.querySelector('#elementSearch');
const categoryFilter = document.querySelector('#categoryFilter');
const periodFilter = document.querySelector('#periodFilter');
const blockFilter = document.querySelector('#blockFilter');
const themeToggle = document.querySelector('#themeToggle');
const resetButton = document.querySelector('#resetFilters');

const state = {
  elements: [],
  filters: {
    query: '',
    category: 'all',
    period: 'all',
    block: 'all',
  },
};

function createLabelFromCategory(category) {
  return category
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function applyTheme(theme) {
  const nextTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', nextTheme);
  if (themeToggle) {
    themeToggle.textContent = nextTheme === 'dark' ? '☀️' : '🌙';
    themeToggle.setAttribute('aria-label', nextTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
  try {
    localStorage.setItem(THEME_KEY, nextTheme);
  } catch (error) {
    console.warn('Unable to persist theme preference.', error);
  }
}

function getPreferredTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  } catch (error) {
    console.warn('Unable to read theme preference.', error);
  }

  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

function readPersistedFilters() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { ...state.filters };
    }

    const parsed = JSON.parse(stored);
    return {
      query: typeof parsed.query === 'string' ? parsed.query : '',
      category: typeof parsed.category === 'string' ? parsed.category : 'all',
      period: typeof parsed.period === 'string' ? parsed.period : 'all',
      block: typeof parsed.block === 'string' ? parsed.block : 'all',
    };
  } catch (error) {
    console.warn('Unable to read persisted filters.', error);
    return { ...state.filters };
  }
}

function persistFilters() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.filters));
  } catch (error) {
    console.warn('Unable to persist filters.', error);
  }
}

function syncControlValues() {
  if (searchInput) {
    searchInput.value = state.filters.query;
  }

  if (categoryFilter) {
    categoryFilter.value = state.filters.category;
  }

  if (periodFilter) {
    periodFilter.value = state.filters.period;
  }

  if (blockFilter) {
    blockFilter.value = state.filters.block;
  }
}

function populateFilterOptions() {
  if (!categoryFilter || !periodFilter) {
    return;
  }

  const categories = [...new Set(state.elements.map((element) => element.category).filter(Boolean))].sort();
  categoryFilter.innerHTML = '<option value="all">All categories</option>' + categories
    .map((category) => `<option value="${category}">${createLabelFromCategory(category)}</option>`)
    .join('');

  const periods = [...new Set(state.elements.map((element) => Number(element.period)).filter(Number.isFinite))].sort((a, b) => a - b);
  periodFilter.innerHTML = '<option value="all">All periods</option>' + periods
    .map((period) => `<option value="${period}">Period ${period}</option>`)
    .join('');

  syncControlValues();
}

function matchesFilters(element) {
  const query = state.filters.query.trim().toLowerCase();

  if (query) {
    const haystack = [
      element.name,
      element.symbol,
      element.category,
      String(element.atomicNumber),
    ].filter(Boolean).join(' ').toLowerCase();

    if (!haystack.includes(query)) {
      return false;
    }
  }

  if (state.filters.category !== 'all' && element.category !== state.filters.category) {
    return false;
  }

  if (state.filters.period !== 'all' && Number(element.period) !== Number(state.filters.period)) {
    return false;
  }

  if (state.filters.block !== 'all' && element.block !== state.filters.block) {
    return false;
  }

  return true;
}

function createElementCard(element) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'element-card';
  button.dataset.category = element.category;
  button.style.gridColumn = String(element.group || 1);
  button.style.gridRow = String(element.period || 1);
  button.setAttribute('aria-label', `${element.name} (${element.symbol})`);
  button.innerHTML = `
    <span class="element-card__atomic-number">${element.atomicNumber}</span>
    <span class="element-card__symbol">${element.symbol}</span>
    <span class="element-card__name">${element.name}</span>
  `;
  button.addEventListener('click', () => openModal(element));
  return button;
}

function renderTable() {
  if (!tableContainer) return;

  const visible = state.elements.filter(matchesFilters);
  const fragment = document.createDocumentFragment();
  const lookup = new Map(visible.map((element) => [`${element.group}-${element.period}`, element]));

  for (let period = 1; period <= 7; period += 1) {
    for (let group = 1; group <= 18; group += 1) {
      const element = lookup.get(`${group}-${period}`);
      if (element) {
        fragment.appendChild(createElementCard(element));
      }
    }
  }

  const lanthanides = visible.filter((element) => element.category === 'lanthanide');
  const actinides = visible.filter((element) => element.category === 'actinide');

  lanthanides.forEach((element, index) => {
    const card = createElementCard(element);
    card.style.gridColumn = String(index + 4);
    card.style.gridRow = '8';
    fragment.appendChild(card);
  });

  actinides.forEach((element, index) => {
    const card = createElementCard(element);
    card.style.gridColumn = String(index + 4);
    card.style.gridRow = '9';
    fragment.appendChild(card);
  });

  if (visible.length === 0) {
    tableContainer.innerHTML = '<div class="empty-state">No elements match the current filters.</div>';
    return;
  }

  tableContainer.innerHTML = '';
  tableContainer.appendChild(fragment);
}

function openModal(element) {
  if (!modal || !modalTitle || !modalNumber || !modalMass || !modalGroup || !modalPeriod || !modalCategory) {
    return;
  }

  modalTitle.textContent = `${element.name} (${element.symbol})`;
  modalNumber.textContent = element.atomicNumber;
  modalMass.textContent = element.atomicMass ?? '—';
  modalGroup.textContent = element.group ?? '—';
  modalPeriod.textContent = element.period ?? '—';
  modalCategory.textContent = createLabelFromCategory(element.category);
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
}

function updateFiltersFromControls() {
  state.filters.query = searchInput ? searchInput.value : '';
  state.filters.category = categoryFilter ? categoryFilter.value : 'all';
  state.filters.period = periodFilter ? periodFilter.value : 'all';
  state.filters.block = blockFilter ? blockFilter.value : 'all';

  persistFilters();
  renderTable();
}

function resetFilters() {
  state.filters = { query: '', category: 'all', period: 'all', block: 'all' };
  syncControlValues();
  persistFilters();
  renderTable();
}

function bindFilterControls() {
  if (searchInput) {
    let timeoutId = null;
    searchInput.addEventListener('input', (event) => {
      state.filters.query = event.target.value;
      persistFilters();

      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => renderTable(), 150);
    });

    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        state.filters.query = '';
        searchInput.value = '';
        persistFilters();
        renderTable();
      }
    });
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', updateFiltersFromControls);
  }

  if (periodFilter) {
    periodFilter.addEventListener('change', updateFiltersFromControls);
  }

  if (blockFilter) {
    blockFilter.addEventListener('change', updateFiltersFromControls);
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  if (resetButton) {
    resetButton.addEventListener('click', resetFilters);
  }
}

async function loadElements() {
  try {
    const response = await fetch('data/elements.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Unable to load periodic table data.');
    }

    state.elements = await response.json();
    state.filters = readPersistedFilters();
    populateFilterOptions();
    bindFilterControls();
    applyTheme(getPreferredTheme());
    renderTable();
  } catch (error) {
    if (tableContainer) {
      tableContainer.innerHTML = '<div class="empty-state">Unable to load the periodic table right now.</div>';
    }
    console.error(error);
  }
}

if (modal) {
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  const closeButton = modal.querySelector('.modal__close');
  if (closeButton) {
    closeButton.addEventListener('click', closeModal);
  }
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal && modal.classList.contains('is-open')) {
    closeModal();
  }
});

loadElements();
