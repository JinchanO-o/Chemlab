const PREFIX = 'chem:';
const memoryStore = new Map();
let warned = false;
let syncTimer;
import { syncProgressToCloud } from './supabase.js';

function getStore() {
  try {
    const key = `${PREFIX}probe`;
    localStorage.setItem(key, 'ok');
    localStorage.removeItem(key);
    return localStorage;
  } catch (error) {
    if (!warned) {
      console.warn('localStorage is unavailable; progress will last for this session only.');
      warned = true;
    }
    return {
      getItem: (key) => memoryStore.get(key) ?? null,
      setItem: (key, value) => memoryStore.set(key, value),
      removeItem: (key) => memoryStore.delete(key),
    };
  }
}

function read(key, fallback) {
  try {
    const value = getStore().getItem(`${PREFIX}${key}`);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function write(key, value) {
  try {
    getStore().setItem(`${PREFIX}${key}`, JSON.stringify(value));
  } catch (error) {
    console.warn('Unable to save chemistry progress.', error);
  }
}

function scheduleCloudSync() {
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => syncProgressToCloud({ quiz_history: getQuizHistory(), flashcard_progress: getFlashcardProgress(), stats: getStats() }).catch(() => {}), 1000);
}

export function getQuizHistory() {
  return read('quiz-history', []);
}

export function saveQuizResult(result) {
  const history = getQuizHistory();
  history.push({ ...result, date: result.date || new Date().toISOString() });
  write('quiz-history', history.slice(-100));
  scheduleCloudSync();
}

export function getFlashcardProgress() {
  return read('flashcards', {});
}

export function setFlashcardStatus(symbol, status) {
  const progress = getFlashcardProgress();
  progress[symbol] = status === 'known' ? 'known' : 'unknown';
  write('flashcards', progress);
  scheduleCloudSync();
}

export function getStats() {
  const history = getQuizHistory();
  const progress = getFlashcardProgress();
  const scores = history.map((item) => Number(item.score) / Math.max(Number(item.total), 1) * 100);
  const quizDays = new Set(history.map((item) => String(item.date).slice(0, 10)));
  let streak = 0;
  const day = new Date();
  while (quizDays.has(day.toISOString().slice(0, 10))) {
    streak += 1;
    day.setDate(day.getDate() - 1);
  }

  return {
    quizzesTaken: history.length,
    avgScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
    elementsKnown: Object.values(progress).filter((status) => status === 'known').length,
    streak,
  };
}
