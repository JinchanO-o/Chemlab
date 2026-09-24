const translations = {
  en: {
    home: 'Home', periodic: 'Periodic Table', tools: 'Tools', quiz: 'Quiz', flashcards: 'Flashcards', calculators: 'Calculators', trends: 'Trends', molecules: 'Molecules',
    language: 'VI', dark: 'Switch to dark mode', light: 'Switch to light mode', progress: 'Your progress', quizzesTaken: 'Quizzes taken', averageScore: 'Average score', elementsKnown: 'Elements known', dailyStreak: 'Daily streak',
  },
  vi: {
    home: 'Trang chủ', periodic: 'Bảng tuần hoàn', tools: 'Dụng cụ', quiz: 'Trắc nghiệm', flashcards: 'Thẻ ghi nhớ', calculators: 'Máy tính', trends: 'Xu hướng', molecules: 'Phân tử',
    language: 'EN', dark: 'Bật chế độ tối', light: 'Bật chế độ sáng', progress: 'Tiến độ của bạn', quizzesTaken: 'Số bài đã làm', averageScore: 'Điểm trung bình', elementsKnown: 'Nguyên tố đã biết', dailyStreak: 'Chuỗi ngày',
  },
};

let language = (() => {
  try {
    const saved = localStorage.getItem('chem:lang');
    if (saved === 'en' || saved === 'vi') return saved;
  } catch (error) { /* private mode is handled by the fallback */ }
  return navigator.language.toLowerCase().startsWith('vi') ? 'vi' : 'en';
})();

export function getLanguage() { return language; }
export function t(key) { return translations[language][key] || key; }
export function setLanguage(next) {
  language = next === 'vi' ? 'vi' : 'en';
  try { localStorage.setItem('chem:lang', language); } catch (error) { /* session fallback */ }
  document.documentElement.lang = language;
  document.dispatchEvent(new CustomEvent('languagechange', { detail: language }));
}
