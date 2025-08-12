(function(){
  const KEY = 'exams_theme';
  function applyTheme(t){
    document.documentElement.setAttribute('data-theme', t);
    const btn = document.getElementById('theme-toggle');
    if(btn){ btn.textContent = t === 'dark' ? '☀️' : '🌙'; }
  }
  function initTheme(){
    const saved = localStorage.getItem(KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(initial);
    localStorage.setItem(KEY, initial);
  }
  function setupToggle(){
    const btn = document.getElementById('theme-toggle');
    if(!btn) return;
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'light' ? 'dark' : 'light';
      applyTheme(next);
      localStorage.setItem(KEY, next);
    });
  }

  async function injectHeader(){
    const holder = document.getElementById('app-header');
    if(!holder) { initTheme(); return; }
    try{
      const res = await fetch('/partials/header.html', {cache:'no-store'});
      holder.innerHTML = await res.text();
      const path = location.pathname.replace(/\\/g,'/');
      const links = holder.querySelectorAll('.nav a');
      links.forEach(a=>{
        if(path === '/' && a.getAttribute('href') === '/'){ a.classList.add('active'); }
        else if(path.endsWith(a.getAttribute('href'))){ a.classList.add('active'); }
      });
      initTheme();
      setupToggle();
    }catch(e){ console.error('header load failed', e); initTheme(); }
  }

  window.toast = function(msg, ms=1800){
    let t = document.querySelector('.toast'); if(!t){ t = document.createElement('div'); t.className='toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), ms);
  }

  injectHeader();
})();