const api = (u, o={}) => fetch(u, o).then(r => r.json());
const examId = new URLSearchParams(location.search).get('examId');
if (!examId) { document.body.innerHTML = '<p class="card">examId obrigatório.</p>'; throw new Error('no examId'); }

const state = {
  currentIndex: 0,
  answers: {},
  flagged: new Set(),
  started: false,
  paused: true,
  elapsedSec: 0,
  timer: null,
  data: null
};

const els = {
  examTitle: document.getElementById('exam-title'),
  progressText: document.getElementById('progress-text'),
  progressBar: document.getElementById('progress-bar'),
  timer: document.getElementById('timer'),
  qnums: document.getElementById('qnums'),
  form: document.getElementById('question-form'),
  result: document.getElementById('result'),
  toast: document.getElementById('toast'),
  back: document.getElementById('back'),
  saveNext: document.getElementById('save-next'),
  mark: document.getElementById('mark'),
  submit: document.getElementById('submit'),
  filters: document.querySelectorAll('.filter'),
  start: document.getElementById('start'),
  pause: document.getElementById('pause'),
  end: document.getElementById('end')
};

function updateTimer() {
  const m = String(Math.floor(state.elapsedSec/60)).padStart(2,'0');
  const s = String(state.elapsedSec%60).padStart(2,'0');
  els.timer.textContent = m+':'+s;
}

function tick() {
  state.elapsedSec++; updateTimer();
}

function startTimer(){
  if (state.timer) return;
  state.timer = setInterval(tick, 1000);
  state.started = true; state.paused = false;
}
function pauseTimer(){
  if (!state.timer) return;
  clearInterval(state.timer); state.timer = null; state.paused = true;
}
function endTimer(){
  if (state.timer) clearInterval(state.timer);
  state.timer = null; state.started = false; state.paused = true; state.elapsedSec = 0; updateTimer();
}

function showToast(msg='Saved just now'){
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  setTimeout(()=>els.toast.classList.remove('show'), 1500);
}

function buildSidebar(){
  els.qnums.innerHTML='';
  state.data.questions.forEach((q, idx)=>{
    const b = document.createElement('button');
    b.type='button'; b.className='qnum'; b.textContent=idx+1; b.dataset.index=idx;
    b.onclick=()=>{ saveCurrent(); state.currentIndex=idx; renderQuestion(); };
    els.qnums.appendChild(b);
  });
  updateSidebar();
}

function updateSidebar(){
  const total = state.data.questions.length;
  Array.from(els.qnums.children).forEach((el, idx)=>{
    const q = state.data.questions[idx];
    el.classList.toggle('answered', state.answers[q._id] !== undefined);
    el.classList.toggle('flagged', state.flagged.has(q._id));
    el.classList.toggle('current', idx === state.currentIndex);
  });
  filterQnums(document.querySelector('.filter.active').dataset.filter);
}

function updateProgress(){
  const total = state.data.questions.length;
  const answered = Object.keys(state.answers).length;
  els.progressText.textContent = `Q${state.currentIndex+1} of ${total}`;
  els.progressBar.style.width = (answered/total*100)+'%';
}

function renderQuestion(){
  const q = state.data.questions[state.currentIndex];
  els.form.innerHTML='';
  const fs = document.createElement('fieldset');
  const legend = document.createElement('legend'); legend.textContent = q.text || '';
  fs.appendChild(legend);
  q.options.forEach((o, idx)=>{
    const label = document.createElement('label'); label.className='option-card';
    const inp = document.createElement('input'); inp.type='radio'; inp.name='opt'; inp.value=idx;
    if (state.answers[q._id] === idx) inp.checked = true;
    label.appendChild(inp);
    const span = document.createElement('span'); span.textContent = o.text || '';
    label.appendChild(span);
    fs.appendChild(label);
  });
  els.form.appendChild(fs);
  updateSidebar(); updateProgress();
}

function saveCurrent(){
  const q = state.data.questions[state.currentIndex];
  const checked = els.form.querySelector('input[name="opt"]:checked');
  if (checked) state.answers[q._id] = parseInt(checked.value,10); else delete state.answers[q._id];
  updateSidebar(); updateProgress();
}

function filterQnums(type){
  Array.from(els.qnums.children).forEach((el, idx)=>{
    const q = state.data.questions[idx];
    const answered = state.answers[q._id] !== undefined;
    const flagged = state.flagged.has(q._id);
    let show = true;
    if (type==='blank') show = !answered;
    else if (type==='flagged') show = flagged;
    el.style.display = show ? '' : 'none';
  });
}

els.filters.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    els.filters.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    filterQnums(btn.dataset.filter);
  });
});

els.form.addEventListener('change', e=>{
  if (e.target.name==='opt') {
    saveCurrent();
    showToast();
  }
});

els.back.addEventListener('click', ()=>{
  saveCurrent();
  if (state.currentIndex>0){ state.currentIndex--; renderQuestion(); }
});

els.saveNext.addEventListener('click', ()=>{
  saveCurrent();
  if (state.currentIndex < state.data.questions.length-1){ state.currentIndex++; renderQuestion(); }
});

els.mark.addEventListener('click', ()=>{
  const q = state.data.questions[state.currentIndex];
  if (state.flagged.has(q._id)) state.flagged.delete(q._id); else state.flagged.add(q._id);
  updateSidebar();
});

els.submit.addEventListener('click', async ()=>{
  saveCurrent();
  const total = state.data.questions.length;
  const answered = Object.keys(state.answers).length;
  const blank = total - answered;
  const flagged = state.flagged.size;
  if (!confirm(`Submit?\nAnswered: ${answered}\nBlank: ${blank}\nFlagged: ${flagged}`)) return;
  const payload = Object.entries(state.answers).map(([id, idx])=>({questionId:id, selectedIndices: idx!=null?[idx]:[]}));
  const res = await api('/api/attempts', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({examId, answers:payload})});
  els.result.innerHTML = '<div class="card">'+(res.error || `Score: ${res.score.correct}/${res.score.total}`)+'</div>';
});

els.start.addEventListener('click', startTimer);
els.pause.addEventListener('click', pauseTimer);
els.end.addEventListener('click', endTimer);

function handleKey(e){
  if (e.target.tagName === 'INPUT') return;
  const q = state.data.questions[state.currentIndex];
  const opts = Array.from(els.form.querySelectorAll('input[name="opt"]'));
  if (e.key === 'ArrowDown'){ e.preventDefault(); const i = (opts.indexOf(document.activeElement)+1)%opts.length; opts[i].focus(); }
  else if (e.key === 'ArrowUp'){ e.preventDefault(); const i = (opts.indexOf(document.activeElement)-1+opts.length)%opts.length; opts[i].focus(); }
  else if (/^[1-9]$/.test(e.key)){ const idx = parseInt(e.key,10)-1; if (opts[idx]) { opts[idx].checked = true; opts[idx].dispatchEvent(new Event('change',{bubbles:true})); } }
  else if (e.key.toLowerCase()==='m'){ els.mark.click(); }
  else if (e.key.toLowerCase()==='n'){ els.saveNext.click(); }
  else if (e.key.toLowerCase()==='b'){ els.back.click(); }
}

document.addEventListener('keydown', handleKey);

async function load(){
  state.data = await api('/api/exams/' + examId);
  els.examTitle.textContent = state.data.exam.title;
  buildSidebar();
  renderQuestion();
  updateTimer();
}

load();
