import { getLanguage, setLanguage, t } from './i18n.js';
import { getStats } from './progress.js';
import { isConfigured, getUser, signOut } from './supabase.js';

const navItems = [
  ['home', 'index.html'],
  ['periodic', 'chemistry.html'],
  ['tools', 'chemistry-tools.html'],
  ['quiz', 'quiz.html'],
  ['flashcards', 'flashcards.html'],
  ['calculators', 'calculator.html'],
  ['trends', 'trends.html'],
  ['molecules', 'molecules.html'],
];

function currentPage() {
  return location.pathname.split('/').pop() || 'index.html';
}

function addMeta(name, content) {
  if (!document.head.querySelector(`meta[name="${name}"]`)) {
    const meta = document.createElement('meta');
    meta.name = name;
    meta.content = content;
    document.head.appendChild(meta);
  }
}

function initPageShell() {
  const main = document.querySelector('main');
  if (main && !main.id) main.id = 'main-content';
  if (!document.querySelector('.skip-link')) {
    const skip = document.createElement('a');
    skip.className = 'skip-link';
    skip.href = '#main-content';
    skip.textContent = 'Skip to content';
    document.body.prepend(skip);
  }
  if (!document.querySelector('link[rel="manifest"]')) {
    const manifest = document.createElement('link');
    manifest.rel = 'manifest';
    manifest.href = 'manifest.webmanifest';
    document.head.appendChild(manifest);
  }
  if (!document.querySelector('link[href="css/pwa.css"]')) {
    const pwaStyles = document.createElement('link');
    pwaStyles.rel = 'stylesheet';
    pwaStyles.href = 'css/pwa.css';
    document.head.appendChild(pwaStyles);
  }
  const pageName = document.title || 'Chemistry Study';
  addMeta('description', `${pageName} - interactive chemistry learning tools and reference material.`);
  addMeta('theme-color', '#020817');
  const canonical = document.createElement('link');
  canonical.rel = 'canonical';
  canonical.href = new URL(location.pathname, location.origin).href;
  document.head.appendChild(canonical);
  [['og:title', pageName], ['og:description', `Explore ${pageName}.`], ['og:image', new URL('icons/icon-512.svg', location.href).href], ['og:type', 'website'], ['og:url', canonical.href], ['twitter:card', 'summary_large_image']].forEach(([property, content]) => {
    if (!document.head.querySelector(`meta[property="${property}"], meta[name="${property}"]`)) {
      const meta = document.createElement('meta');
      meta.setAttribute(property.startsWith('og:') ? 'property' : 'name', property);
      meta.content = content;
      document.head.appendChild(meta);
    }
  });
}

function initKeyboardHelp() {
  const dialog = document.createElement('dialog');
  dialog.className = 'help-dialog';
  dialog.innerHTML = '<button class="button secondary help-dialog__close" type="button" aria-label="Close keyboard help">Close</button><h2>Keyboard help</h2><p>Press <kbd>?</kbd> to open this guide. Use Tab to move between controls and Enter or Space to activate them.</p>';
  document.body.appendChild(dialog);
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  document.addEventListener('keydown', (event) => {
    if (event.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) dialog.showModal();
    if (event.key === 'Escape' && dialog.open) dialog.close();
  });
}

function initInstallPrompt() {
  let promptEvent;
  const mount = document.querySelector('#siteNavMount');
  if (!mount) return;
  const button = document.createElement('button');
  button.className = 'button secondary install-button';
  button.type = 'button';
  button.textContent = 'Install app';
  mount.appendChild(button);
  window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); promptEvent = event; button.style.display = 'inline-flex'; });
  button.addEventListener('click', async () => { if (!promptEvent) return; promptEvent.prompt(); await promptEvent.userChoice; promptEvent = null; button.style.display = 'none'; });
  window.addEventListener('appinstalled', () => { button.style.display = 'none'; });
}

async function initAuthNav() {
  if (!isConfigured()) return;
  const mount = document.querySelector('#siteNavMount');
  const user = await getUser().catch(() => null);
  if (!mount) return;
  const link = document.createElement('button');
  link.className = 'button secondary';
  link.type = 'button';
  link.textContent = user ? 'Sign out' : 'Sign in';
  link.addEventListener('click', async () => {
    if (user) { await signOut(); location.reload(); }
    else location.href = 'auth.html';
  });
  mount.appendChild(link);
}

function initOfflineNotice() {
  window.addEventListener('offline', () => { const toast = document.createElement('div'); toast.className = 'offline-toast'; toast.setAttribute('role', 'status'); toast.textContent = 'You are offline'; document.body.appendChild(toast); window.setTimeout(() => toast.remove(), 4000); });
}

function initModalAccessibility() {
  let previousFocus;
  const getFocusable = (modal) => [...modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')];
  const observer = new MutationObserver(() => document.querySelectorAll('.modal.is-open').forEach((modal) => {
    if (!previousFocus) previousFocus = document.activeElement;
    const close = modal.querySelector('.modal__close');
    close?.focus();
  }));
  observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
  document.addEventListener('keydown', (event) => {
    const modal = document.querySelector('.modal.is-open');
    if (!modal || event.key !== 'Tab') return;
    const focusable = getFocusable(modal);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  document.addEventListener('click', () => {
    if (!document.querySelector('.modal.is-open') && previousFocus?.isConnected) { previousFocus.focus(); previousFocus = null; }
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js').catch((error) => console.warn('Service worker registration failed.', error)));
}

function renderNav() {
  const mount = document.querySelector('#siteNavMount');
  if (!mount) return;
  mount.innerHTML = `<button class="site-nav-toggle button secondary" type="button" aria-expanded="false" aria-controls="siteNav">Menu</button><nav id="siteNav" class="site-nav" aria-label="Primary navigation">${navItems.map(([key, href]) => `<a href="${href}" class="${currentPage() === href ? 'is-current' : ''}">${t(key)}</a>`).join('')}<button id="languageToggle" class="button secondary" type="button" aria-label="Change language">${t('language')}</button><button id="sharedThemeToggle" class="theme-toggle" type="button"></button></nav>`;
  const toggle = mount.querySelector('.site-nav-toggle');
  const nav = mount.querySelector('#siteNav');
  toggle.addEventListener('click', () => { const open = nav.classList.toggle('is-open'); toggle.setAttribute('aria-expanded', String(open)); });
  mount.querySelector('#languageToggle').addEventListener('click', () => setLanguage(getLanguage() === 'en' ? 'vi' : 'en'));
  mount.querySelector('#sharedThemeToggle').addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  updateThemeButton();
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
  try { localStorage.setItem('theme', document.documentElement.dataset.theme); } catch (error) { /* session fallback */ }
  updateThemeButton();
}

function updateThemeButton() {
  const button = document.querySelector('#sharedThemeToggle');
  if (!button) return;
  const dark = document.documentElement.dataset.theme === 'dark';
  button.textContent = dark ? '☀️' : '🌙';
  button.setAttribute('aria-label', dark ? t('light') : t('dark'));
}

function initTheme() {
  let theme = 'light';
  try { theme = localStorage.getItem('theme') || 'light'; } catch (error) { /* session fallback */ }
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
}

function renderProgress() {
  const mount = document.querySelector('#progressDashboard');
  if (!mount) return;
  const stats = getStats();
  mount.innerHTML = `<h2>${t('progress')}</h2><div class="stats-grid"><a class="stat-link" href="quiz.html"><strong>${stats.quizzesTaken}</strong>${t('quizzesTaken')}</a><a class="stat-link" href="quiz.html"><strong>${stats.avgScore}%</strong>${t('averageScore')}</a><a class="stat-link" href="flashcards.html"><strong>${stats.elementsKnown}</strong>${t('elementsKnown')}</a><a class="stat-link" href="quiz.html"><strong>${stats.streak}</strong>${t('dailyStreak')}</a></div>`;
}

initTheme();
initPageShell();
renderNav();
renderProgress();
initInstallPrompt();
initAuthNav();
initKeyboardHelp();
initOfflineNotice();
initModalAccessibility();
registerServiceWorker();
document.addEventListener('languagechange', () => { renderNav(); renderProgress(); updateThemeButton(); });
