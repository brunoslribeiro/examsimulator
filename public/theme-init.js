(function(){
  const saved = localStorage.getItem('exams_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  if(!saved){ localStorage.setItem('exams_theme', theme); }
})();
