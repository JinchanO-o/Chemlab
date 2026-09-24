import { isConfigured, signIn, signUp, signInWithProvider, sendMagicLink, resetPassword, getCloudProgress } from './supabase.js';

const email = document.querySelector('#authEmail');
const password = document.querySelector('#authPassword');
const status = document.querySelector('#authStatus');
const setStatus = (message, error = false) => { status.textContent = message; status.classList.toggle('calc-error', error); };
const run = (action) => action().then(({ error }) => { if (error) throw error; setStatus('Request completed. Check your email if needed.'); }).catch((error) => setStatus(error.message, true));
async function mergeCloudProgress() {
  const cloud = await getCloudProgress();
  if (!cloud) return;
  const localHistory = JSON.parse(localStorage.getItem('chem:quiz-history') || '[]');
  const localCards = JSON.parse(localStorage.getItem('chem:flashcards') || '{}');
  const history = [...localHistory, ...(cloud.quiz_history || [])].filter((item, index, all) => all.findIndex((candidate) => candidate.date === item.date && candidate.score === item.score && candidate.total === item.total) === index).slice(-100);
  const cards = { ...(cloud.flashcard_progress || {}), ...localCards };
  Object.entries(cloud.flashcard_progress || {}).forEach(([symbol, value]) => { if (value === 'known') cards[symbol] = 'known'; });
  localStorage.setItem('chem:quiz-history', JSON.stringify(history));
  localStorage.setItem('chem:flashcards', JSON.stringify(cards));
  setStatus('Cloud progress merged with local progress.');
}

if (!isConfigured()) {
  document.querySelector('#authAvailability').textContent = 'Cloud sync is not configured. Local progress remains available.';
  document.querySelector('#authForm').hidden = true;
  document.querySelectorAll('#githubAuth, #googleAuth, #magicLink, #resetPassword').forEach((button) => { button.hidden = true; });
} else {
  document.querySelector('#authForm').addEventListener('submit', async (event) => { event.preventDefault(); try { const result = await signIn(email.value, password.value); if (result.error) throw result.error; await mergeCloudProgress(); } catch (error) { setStatus(error.message, true); } });
  document.querySelector('#signUp').addEventListener('click', () => run(() => signUp(email.value, password.value)));
  document.querySelector('#githubAuth').addEventListener('click', () => run(() => signInWithProvider('github')));
  document.querySelector('#googleAuth').addEventListener('click', () => run(() => signInWithProvider('google')));
  document.querySelector('#magicLink').addEventListener('click', () => run(() => sendMagicLink(email.value)));
  document.querySelector('#resetPassword').addEventListener('click', () => run(() => resetPassword(email.value)));
}
