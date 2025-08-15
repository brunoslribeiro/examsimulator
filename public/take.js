const api = (u, o={}) => fetch(u, o).then(r => r.json());
const examId = new URLSearchParams(location.search).get('examId');
if (!examId) { document.body.querySelector('.container').insertAdjacentHTML('beforeend','<p class="card">examId obrigatório.</p>'); throw new Error('no examId'); }
const clock = document.getElementById('clock');
const startBtn = document.getElementById('start');
const pauseBtn = document.getElementById('pause');
const stopBtn = document.getElementById('stop');
const randChk = document.getElementById('random');
const countInput = document.getElementById('count');
const maxTimeInput = document.getElementById('maxTime');
const configBox = document.querySelector('.config');
let timer = null;
let seconds = 0;
let remaining = null;

function renderClock() {
  const sec = remaining !== null ? remaining : seconds;
  const m = String(Math.floor(sec/60)).padStart(2,'0');
  const s = String(sec%60).padStart(2,'0');
  clock.textContent = m + ':' + s;
}

function startTimer() {
  if (timer) return;
  timer = setInterval(() => {
    if (remaining !== null) {
      remaining--; renderClock();
      if (remaining <= 0) { clearInterval(timer); timer = null; autoSubmit(); }
    } else {
      seconds++; renderClock();
    }
  }, 1000);
}

startBtn.onclick = () => {
  if (timer) return;
  if (configBox.style.display !== 'none') applyConfig();
  startTimer();
};

pauseBtn.onclick = () => {
  if (!timer) return;
  clearInterval(timer); timer = null;
};

stopBtn.onclick = () => {
  if (timer) { clearInterval(timer); timer = null; }
  seconds = 0;
  remaining = maxTimeInput.value ? parseInt(maxTimeInput.value,10) * 60 : null;
  renderClock();
  configBox.style.display = '';
};

renderClock();
let data = null;
let current = 0;
const answers = [];

function saveCurrent() {
  const q = data.questions[current];
  const form = document.getElementById('form');
  const inputs = form.querySelectorAll('[name="q-' + q._id + '"]');
  const arr = [];
  inputs.forEach(inp => { if (inp.checked) arr.push(parseInt(inp.value,10)); });
  answers[current] = { questionId: q._id, selectedIndices: arr };
}

function renderQuestion() {
  const form = document.getElementById('form'); form.innerHTML = '';
  const q = data.questions[current];
  const div = document.createElement('div'); div.className = 'card'; div.id = 'q'+current;
  const opts = q.options.map((o, idx) => `
    <label class="choice">
      <input type="${q.type === 'multiple' ? 'checkbox':'radio'}" name="q-${q._id}" value="${idx}">
      ${o.text ? '<span>' + o.text + '</span>' : ''}
      ${o.imagePath ? '<img class="preview" src="${o.imagePath}"/>' : ''}
    </label>`).join('');
  div.innerHTML = `
    <div><strong>Q${current+1}.</strong> ${q.text || ''} <span class="muted">[${q.type}]</span></div>
    <div class="options">${opts}</div>
  `;
  form.appendChild(div);

  // restore previous selections if available
  if (answers[current]) {
    const prev = new Set(answers[current].selectedIndices);
    div.querySelectorAll('input').forEach(inp => {
      if (prev.has(parseInt(inp.value, 10))) inp.checked = true;
    });
  }

  const nav = document.createElement('div');
  nav.className = 'row';

  if (current > 0) {
    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.textContent = '⬅️ Voltar';
    backBtn.onclick = () => { saveCurrent(); current--; renderQuestion(); };
    nav.appendChild(backBtn);
  }

  const btn = document.createElement('button');
  if (current < data.questions.length - 1) {
    btn.textContent = '➡️ Next'; btn.type = 'button';
    btn.onclick = () => { saveCurrent(); current++; renderQuestion(); };
    form.onsubmit = null;
  } else {
    btn.textContent = '📤 Enviar respostas'; btn.type = 'submit';
    form.onsubmit = async (ev) => {
      ev.preventDefault();
      saveCurrent();
      const res = await api('/api/attempts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ examId, answers }) });
      show(res);
    };
  }
  nav.appendChild(btn);
  form.appendChild(nav);
}

async function load() {
  data = await api('/api/exams/' + examId);
  document.getElementById('exam-title').textContent = data.exam.title;
  document.getElementById('info').textContent = data.exam.description || '';
  current = 0;
  answers.length = 0;
}

function show(res) {
  const out = document.getElementById('result');
  if (res.error) { out.innerHTML = '<div class="card">'+res.error+'</div>'; return; }
  const { score, details } = res;
  const wrong = score.total - score.correct;
  const list = details
    .map((d, idx) => `<li>Q${idx+1}: ${d.correct ? '✅' : '❌'}</li>`)
    .join('');
  out.innerHTML = `<div class="card"><strong>Resultado:</strong> ${score.correct}/${score.total} (${score.percent}%)<br/>Certas: ${score.correct} | Erradas: ${wrong}<ul>${list}</ul></div>`;
}

function applyConfig() {
  if (randChk.checked) {
    data.questions.sort(() => Math.random() - 0.5);
  }
  const cnt = parseInt(countInput.value, 10);
  if (cnt > 0) {
    data.questions = data.questions.slice(0, cnt);
  }
  const max = parseInt(maxTimeInput.value, 10);
  remaining = max > 0 ? max * 60 : null;
  seconds = 0;
  renderClock();
  configBox.style.display = 'none';
  renderQuestion();
}

async function autoSubmit() {
  saveCurrent();
  const res = await api('/api/attempts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ examId, answers }) });
  show(res);
  document.getElementById('form').innerHTML = '';
}

load();
