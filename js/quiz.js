import { getLanguage } from './i18n.js';
import { saveQuizResult } from './progress.js';

const state = { questions: [], index: 0, answers: [], topic: 'mixed', difficulty: 'all' };
const $ = (id) => document.getElementById(id);
const setup = $('quizSetup');
const quiz = $('quizScreen');
const result = $('quizResult');

function languageValue(item, key) { return item[`${key}${getLanguage() === 'vi' ? 'Vi' : 'En'}`]; }
function shuffle(items) { return [...items].sort(() => Math.random() - 0.5); }
function labelTopic(topic) { return topic.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }

function renderQuestion() {
  const item = state.questions[state.index];
  if (!item) return renderResult();
  $('quizProgressText').textContent = `${state.index + 1} / ${state.questions.length}`;
  $('quizProgressBar').style.width = `${((state.index + 1) / state.questions.length) * 100}%`;
  $('quizTopic').textContent = labelTopic(item.topic);
  $('quizQuestion').textContent = languageValue(item, 'question');
  $('quizExplanation').hidden = true;
  $('quizNext').hidden = true;
  const list = $('quizAnswers');
  list.innerHTML = '';
  item.options.forEach((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'answer-button';
    button.textContent = `${index + 1}. ${option}`;
    button.addEventListener('click', () => answerQuestion(index));
    list.appendChild(button);
  });
}

function answerQuestion(selectedIndex) {
  if (state.answers[state.index] !== undefined) return;
  const item = state.questions[state.index];
  const correct = selectedIndex === item.correctIndex;
  state.answers[state.index] = { selectedIndex, correct };
  [...$('quizAnswers').children].forEach((button, index) => {
    button.disabled = true;
    if (index === item.correctIndex) button.classList.add('is-correct');
    if (index === selectedIndex && !correct) button.classList.add('is-wrong');
  });
  $('quizExplanation').textContent = languageValue(item, 'explanation');
  $('quizExplanation').hidden = false;
  $('quizNext').hidden = false;
}

function renderResult() {
  quiz.hidden = true;
  result.hidden = false;
  const score = state.answers.filter((answer) => answer?.correct).length;
  const percentage = Math.round((score / state.questions.length) * 100);
  $('resultScore').textContent = `${score} / ${state.questions.length}`;
  $('resultPercentage').textContent = `${percentage}%`;
  const topics = new Map();
  state.questions.forEach((item, index) => {
    const entry = topics.get(item.topic) || { correct: 0, total: 0 };
    entry.total += 1;
    entry.correct += state.answers[index]?.correct ? 1 : 0;
    topics.set(item.topic, entry);
  });
  $('topicBreakdown').innerHTML = [...topics.entries()].map(([topic, value]) => `<li><strong>${labelTopic(topic)}</strong>: ${value.correct}/${value.total}</li>`).join('');
  $('wrongAnswers').innerHTML = state.questions.map((item, index) => ({ item, answer: state.answers[index] })).filter(({ answer }) => !answer?.correct).map(({ item }) => `<li><strong>${languageValue(item, 'question')}</strong><br>${getLanguage() === 'vi' ? 'Đáp án đúng' : 'Correct answer'}: ${item.options[item.correctIndex]}<br>${languageValue(item, 'explanation')}</li>`).join('') || `<li>${getLanguage() === 'vi' ? 'Tuyệt vời, không có câu sai.' : 'Excellent, no incorrect answers.'}</li>`;
  saveQuizResult({ topic: state.topic, score, total: state.questions.length });
}

async function startQuiz({ wrongOnly = false } = {}) {
  const response = await fetch('data/quiz.json', { cache: 'no-store' });
  const allQuestions = await response.json();
  let pool = allQuestions.filter((item) => (state.topic === 'mixed' || item.topic === state.topic) && (state.difficulty === 'all' || item.difficulty === state.difficulty));
  if (wrongOnly) pool = state.questions.filter((item, index) => !state.answers[index]?.correct);
  const requested = $('questionCount')?.value || '10';
  const count = requested === 'all' ? pool.length : Math.min(Number(requested), pool.length);
  state.questions = shuffle(pool).slice(0, count);
  state.index = 0;
  state.answers = [];
  setup.hidden = true;
  result.hidden = true;
  quiz.hidden = false;
  renderQuestion();
}

$('startQuiz').addEventListener('click', () => { state.topic = $('topicSelect').value; state.difficulty = $('difficultySelect').value; startQuiz(); });
$('quizNext').addEventListener('click', () => { state.index += 1; renderQuestion(); });
$('newQuiz').addEventListener('click', () => { result.hidden = true; setup.hidden = false; });
$('retryWrong').addEventListener('click', () => startQuiz({ wrongOnly: true }));
document.addEventListener('languagechange', () => { if (!quiz.hidden) renderQuestion(); });
document.addEventListener('keydown', (event) => {
  if (!quiz.hidden && /^[1-4]$/.test(event.key)) answerQuestion(Number(event.key) - 1);
  if (!quiz.hidden && event.key === 'Enter' && !$('quizNext').hidden) $('quizNext').click();
  if (!quiz.hidden && event.key === 'Escape') { quiz.hidden = true; setup.hidden = false; }
});
