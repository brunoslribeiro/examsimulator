const api = (u, o={}) => fetch(u, o).then(r => r.json());
const examId = new URLSearchParams(location.search).get('examId');
if (!examId) { document.body.innerHTML = '<p class="card">examId obrigatório.</p>'; throw new Error('no examId'); }

function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }

const answersKey = `answers-${examId}`;
const flaggedKey = `flagged-${examId}`;
const idxKey = `index-${examId}`;
const timeKey = `time-${examId}`;
const settingsKey = `settings-${examId}`;

const state = {
  currentIndex: 0,
  answers: {},
  flagged: new Set(),
  started: false,
  paused: true,
  elapsedSec: 0,
  timer: null,
  data: null,
  settings: {},
  mode: 'exam',
  duration: 3600
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
  end: document.getElementById('end'),
  settingsModal: document.getElementById('settings-modal'),
  settingsForm: document.getElementById('settings-form'),
  setCount: document.getElementById('set-count'),
  setRandom: document.getElementById('set-random'),
  setShuffle: document.getElementById('set-shuffle'),
  setSidebar: document.getElementById('set-sidebar'),
  toggleSidebar: document.getElementById('toggle-sidebar'),
  help: document.getElementById('shortcut-help'),
  closeHelp: document.getElementById('close-help'),
  pauseOverlay: document.getElementById('pause-overlay')
};

function updateTimer(){
  const remaining = Math.max(0, state.duration - state.elapsedSec);
  const m = String(Math.floor(remaining/60)).padStart(2,'0');
  const s = String(remaining%60).padStart(2,'0');
  els.timer.textContent = m+':'+s;
  els.timer.classList.toggle('warning', remaining<=300 && remaining>60);
  els.timer.classList.toggle('danger', remaining<=60);
}

function tick(){
  if(state.elapsedSec < state.duration){ state.elapsedSec++; localStorage.setItem(timeKey,state.elapsedSec); updateTimer(); }
  else endTimer();
}

function startTimer(){
  if (state.timer) return;
  state.timer = setInterval(tick, 1000);
  state.started = true; state.paused = false;
  document.body.classList.remove('paused');
}
function pauseTimer(){
  if (!state.timer) return;
  clearInterval(state.timer); state.timer = null; state.paused = true;
  localStorage.setItem(timeKey,state.elapsedSec);
  document.body.classList.add('paused');
}
function endTimer(){
  if (state.timer) clearInterval(state.timer);
  state.timer = null; state.started = false; state.paused = true; state.elapsedSec = 0; updateTimer();
  localStorage.removeItem(timeKey);
  document.body.classList.add('paused');
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
  Array.from(els.qnums.children).forEach((el, idx)=>{
    const q = state.data.questions[idx];
    const ans = state.answers[q._id];
    const answered = Array.isArray(ans) ? ans.length>0 : ans !== undefined;
    el.classList.toggle('answered', answered);
    el.classList.toggle('flagged', state.flagged.has(q._id));
    el.classList.toggle('current', idx === state.currentIndex);
    if(state.mode==='practice' && answered){
      const correct = isAnswerCorrect(q, ans);
      el.classList.toggle('correct', correct);
      el.classList.toggle('wrong', !correct);
    } else {
      el.classList.remove('correct','wrong');
    }
  });
  filterQnums(document.querySelector('.filter.active').dataset.filter);
}

function updateProgress(){
  const total = state.data.questions.length;
  const answered = Object.keys(state.answers).length;
  els.progressText.textContent = `Q${state.currentIndex+1} of ${total}`;
  els.progressBar.style.width = (answered/total*100)+'%';
}

function showCorrectness(q){
  const ans = state.answers[q._id];
  Array.from(els.form.querySelectorAll('.option-card')).forEach((label, idx)=>{
    const opt = q.options[idx];
    label.classList.remove('correct','wrong');
    if(opt.isCorrect) label.classList.add('correct');
    const chosen = Array.isArray(ans) ? ans.includes(idx) : ans === idx;
    if(chosen && !opt.isCorrect) label.classList.add('wrong');
  });
  let exp = els.form.querySelector('.explain');
  if(!exp){ exp = document.createElement('div'); exp.className='explain'; els.form.appendChild(exp); }
  exp.textContent = 'Explanation placeholder';
}

function shouldCheck(q){
  const ans = state.answers[q._id];
  if(q.type==='multiple'){
    if(!Array.isArray(ans)) return false;
    const needed = q.options.filter(o=>o.isCorrect).length;
    return ans.length >= needed;
  }
  return ans !== undefined;
}

function isAnswerCorrect(q, ans){
  if(q.type==='multiple'){
    if(!Array.isArray(ans)) return false;
    const correctIdx = q.options.map((o,i)=>o.isCorrect?i:null).filter(i=>i!==null);
    return ans.length===correctIdx.length && ans.every(i=>correctIdx.includes(i));
  }
  return q.options[ans] && q.options[ans].isCorrect;
}

function renderQuestion(){
  const q = state.data.questions[state.currentIndex];
  els.form.innerHTML='<div class="skeleton"></div>';
  setTimeout(()=>{
    els.form.innerHTML='';
    const fs = document.createElement('fieldset');
    const legend = document.createElement('legend'); legend.textContent = q.text || '';
    fs.appendChild(legend);
    const hasCode = q.options.some(o=>o.code);
    if(hasCode){
      const layout=document.createElement('div'); layout.className='code-layout';
      const list=document.createElement('div'); list.className='option-list'; list.setAttribute('role','listbox');
      const viewer=document.createElement('div'); viewer.className='code-viewer'; viewer.setAttribute('aria-label','Code viewer');
      const pre=document.createElement('pre'); const code=document.createElement('code'); pre.appendChild(code); viewer.appendChild(pre);
      const controls=document.createElement('div'); controls.className='code-controls';
      const copyBtn=document.createElement('button'); copyBtn.type='button'; copyBtn.textContent='Copy'; copyBtn.title='Copy to clipboard';
      const wrapBtn=document.createElement('button'); wrapBtn.type='button'; wrapBtn.textContent='Wrap'; wrapBtn.title='Toggle wrap';
      const fullBtn=document.createElement('button'); fullBtn.type='button'; fullBtn.textContent='Full'; fullBtn.title='Toggle fullscreen';
      controls.append(copyBtn, wrapBtn, fullBtn); viewer.appendChild(controls);
      let currentIdx=null;

      function showCode(idx){
        const opt=q.options[idx];
        code.textContent=opt.code||'';
        code.className='';
        if(opt.language) code.classList.add('language-'+opt.language);
        pre.scrollTop=0;
        if(window.hljs){
          code.removeAttribute('data-highlighted');
          hljs.highlightElement(code);
          if(window.hljs.lineNumbersBlock) hljs.lineNumbersBlock(code);
        }
        currentIdx=idx;
      }

      function createLabel(o,idx){
        const label=document.createElement('label'); label.className='option-preview'; label.tabIndex=0; label.dataset.index=idx; label.setAttribute('role','option');
        const inp=document.createElement('input');
        inp.type=q.type==='multiple'?'checkbox':'radio';
        inp.name='opt'; inp.value=idx;
        const ans=state.answers[q._id];
        if(Array.isArray(ans)?ans.includes(idx):ans===idx) inp.checked=true;
        label.appendChild(inp);
        //const preview=document.createElement('pre'); preview.className='code-preview'; preview.textContent=(o.code||'').split('\n').slice(0,5).join('\n');
        //label.appendChild(preview);
        //const chev=document.createElement('span'); chev.className='chevron'; chev.textContent='▸'; label.appendChild(chev);
        label.addEventListener('click', e=>{ if(e.target!==inp){ inp.checked=q.type==='multiple'? !inp.checked : true; inp.dispatchEvent(new Event('change',{bubbles:true})); } showCode(idx); if(window.innerWidth<768) viewer.requestFullscreen(); });
        label.addEventListener('keydown', e=>{ if(e.key===' '){ e.preventDefault(); label.classList.toggle('expanded'); } });
        inp.addEventListener('change', ()=>{ showCode(idx); });
        return label;
      }

      const itemHeight=90;
      if(q.options.length>20){
        const inner=document.createElement('div'); inner.style.position='relative'; inner.style.height=q.options.length*itemHeight+'px'; list.appendChild(inner);
        function renderList(){ const scrollTop=list.scrollTop; const start=Math.floor(scrollTop/itemHeight); const end=Math.min(q.options.length, start+Math.ceil(list.clientHeight/itemHeight)+1); inner.innerHTML=''; for(let i=start;i<end;i++){ const lbl=createLabel(q.options[i],i); lbl.style.position='absolute'; lbl.style.top=(i*itemHeight)+'px'; inner.appendChild(lbl);} }
        list.addEventListener('scroll', ()=>requestAnimationFrame(renderList));
        renderList();
      } else {
        q.options.forEach((o,idx)=>list.appendChild(createLabel(o,idx)));
      }

      function toggleWrap(){ viewer.classList.toggle('wrap'); }
      function toggleFull(){ if(!document.fullscreenElement) viewer.requestFullscreen(); else document.exitFullscreen(); }
      function copyCode(){ if(currentIdx!=null){ navigator.clipboard.writeText(q.options[currentIdx].code||''); showToast('Copied'); } }
      copyBtn.addEventListener('click', copyCode);
      wrapBtn.addEventListener('click', toggleWrap);
      fullBtn.addEventListener('click', toggleFull);
      if(window.innerWidth<768) viewer.classList.add('wrap');
      layout.append(list, viewer);
      fs.appendChild(layout);
      let initial=0; const prev=state.answers[q._id]; if(prev!==undefined){ initial=Array.isArray(prev)?prev[0]:prev; }
      showCode(initial);
      state.viewer={toggleWrap, toggleFull};
    } else {
      q.options.forEach((o, idx)=>{
        const label=document.createElement('label'); label.className='option-card'; label.tabIndex=0; label.dataset.index=idx; label.setAttribute('role','option');
        const inp=document.createElement('input');
        inp.type=q.type==='multiple'?'checkbox':'radio';
        inp.name='opt'; inp.value=idx;
        const ans=state.answers[q._id];
        if(Array.isArray(ans)?ans.includes(idx):ans===idx) inp.checked=true;
        label.appendChild(inp);
        const span=document.createElement('span'); span.textContent=o.text||'';
        label.appendChild(span);
        label.addEventListener('click', e=>{ if(e.target!==inp){ inp.checked=q.type==='multiple'? !inp.checked : true; inp.dispatchEvent(new Event('change',{bubbles:true})); } });
        fs.appendChild(label);
      });
      state.viewer=null;
    }
    els.form.appendChild(fs);
    els.form.classList.add('fade');
    if(window.hljs){
      els.form.querySelectorAll('pre code').forEach(block=>{
        if(!block.dataset.highlighted){
          hljs.highlightElement(block);
          if(window.hljs.lineNumbersBlock) hljs.lineNumbersBlock(block);
        }
      });
    }
    if(state.mode==='practice' && shouldCheck(q)) showCorrectness(q);
    updateSidebar(); updateProgress();
    setTimeout(()=>els.form.classList.remove('fade'),300);
  },300);
}

function saveCurrent(){
  const q = state.data.questions[state.currentIndex];
  const checked = Array.from(els.form.querySelectorAll('input[name="opt"]:checked'));
  if(q.type==='multiple'){
    const vals = checked.map(c=>parseInt(c.value,10));
    if(vals.length) state.answers[q._id]=vals; else delete state.answers[q._id];
  } else {
    const c = checked[0];
    if(c) state.answers[q._id]=parseInt(c.value,10); else delete state.answers[q._id];
  }
  localStorage.setItem(answersKey, JSON.stringify(state.answers));
  localStorage.setItem(idxKey, state.currentIndex);
  updateSidebar(); updateProgress();
  if(state.mode==='practice' && shouldCheck(q)) showCorrectness(q);
}

function filterQnums(type){
  Array.from(els.qnums.children).forEach((el, idx)=>{
    const q = state.data.questions[idx];
    const ans = state.answers[q._id];
    const answered = Array.isArray(ans) ? ans.length>0 : ans !== undefined;
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
  if (state.currentIndex>0){ state.currentIndex--; localStorage.setItem(idxKey,state.currentIndex); renderQuestion(); }
});

els.saveNext.addEventListener('click', ()=>{
  saveCurrent();
  if (state.currentIndex < state.data.questions.length-1){ state.currentIndex++; localStorage.setItem(idxKey,state.currentIndex); renderQuestion(); }
});

els.mark.addEventListener('click', ()=>{
  const q = state.data.questions[state.currentIndex];
  if (state.flagged.has(q._id)) state.flagged.delete(q._id); else state.flagged.add(q._id);
  localStorage.setItem(flaggedKey, JSON.stringify([...state.flagged]));
  updateSidebar();
});

els.submit.addEventListener('click', async ()=>{
  saveCurrent();
  const total = state.data.questions.length;
  const answered = Object.keys(state.answers).length;
  const blank = total - answered;
  const flagged = state.flagged.size;
  let correct=0, wrong=0;
  if(state.mode==='practice'){
    state.data.questions.forEach(q=>{
      const ans = state.answers[q._id];
      if(ans!==undefined){
        if(isAnswerCorrect(q, ans)) correct++; else wrong++;
      }
    });
  }
  let msg = `Submit?\nAnswered: ${answered}\nBlank: ${blank}\nFlagged: ${flagged}`;
  if(state.mode==='practice') msg += `\nCorrect: ${correct}\nWrong: ${wrong}`;
  if (!confirm(msg)) return;
  if(state.mode==='exam'){
    const payload = Object.entries(state.answers).map(([id, idx])=>({questionId:id, selectedIndices: Array.isArray(idx)?idx:(idx!=null?[idx]:[])}));
    const res = await api('/api/attempts', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({examId, answers:payload})});
    els.result.innerHTML = '<div class="card">'+(res.error || `Score: ${res.score.correct}/${res.score.total}`)+'</div>';
  } else {
    els.result.innerHTML = `<div class="card">Score: ${correct}/${total}</div>`;
  }
});

els.start.addEventListener('click', startTimer);
els.pause.addEventListener('click', pauseTimer);
els.end.addEventListener('click', endTimer);

  function handleKey(e){
    if (!state.data) return;
    const q = state.data.questions[state.currentIndex];
    const opts = Array.from(els.form.querySelectorAll('.option-preview, .option-card'));
    if (e.key === 'ArrowDown'){ e.preventDefault(); const i = (opts.indexOf(document.activeElement)+1)%opts.length; opts[i].focus(); }
    else if (e.key === 'ArrowUp'){ e.preventDefault(); const i = (opts.indexOf(document.activeElement)-1+opts.length)%opts.length; opts[i].focus(); }
    else if (/^[1-9]$/.test(e.key)){ const idx=parseInt(e.key,10)-1; const opt=opts[idx]; if(opt){ const inp=opt.querySelector('input'); if(inp){ if(q.type==='multiple') inp.checked=!inp.checked; else inp.checked=true; inp.dispatchEvent(new Event('change',{bubbles:true})); opt.focus(); } } }
    else if (e.key === 'Enter'){ const opt=document.activeElement.closest('.option-preview, .option-card'); if(opt){ const inp=opt.querySelector('input'); if(inp){ if(q.type==='multiple') inp.checked=!inp.checked; else inp.checked=true; inp.dispatchEvent(new Event('change',{bubbles:true})); } } }
    else if (e.key === ' '){ const opt=document.activeElement.closest('.option-preview'); if(opt){ e.preventDefault(); opt.classList.toggle('expanded'); } }
    else if (e.key.toLowerCase()==='f' && state.viewer){ e.preventDefault(); state.viewer.toggleFull(); }
    else if (e.key.toLowerCase()==='w' && state.viewer){ e.preventDefault(); state.viewer.toggleWrap(); }
    else if (e.key.toLowerCase()==='m'){ els.mark.click(); }
    else if (e.key.toLowerCase()==='n'){ els.saveNext.click(); }
    else if (e.key.toLowerCase()==='b'){ els.back.click(); }
    else if (e.key === '?'){ e.preventDefault(); els.help.classList.remove('hidden'); }
  }

document.addEventListener('keydown', handleKey);
els.toggleSidebar.addEventListener('click', ()=>{ document.body.classList.toggle('sidebar-hidden'); });
els.closeHelp.addEventListener('click', ()=> els.help.classList.add('hidden'));

function applySettings(){
  state.data = { exam: state.raw.exam, questions: [...state.raw.questions] };
  if(state.settings.random) shuffle(state.data.questions);
  if(state.settings.count && state.settings.count < state.data.questions.length) state.data.questions = state.data.questions.slice(0,state.settings.count);
  if(state.settings.shuffle) state.data.questions.forEach(q=>shuffle(q.options));
  state.answers = JSON.parse(localStorage.getItem(answersKey)||'{}');
  state.flagged = new Set(JSON.parse(localStorage.getItem(flaggedKey)||'[]'));
  state.currentIndex = parseInt(localStorage.getItem(idxKey)||'0',10);
  state.elapsedSec = parseInt(localStorage.getItem(timeKey)||'0',10);
  state.mode = state.settings.mode || 'exam';
  updateTimer();
  buildSidebar();
  if(state.currentIndex >= state.data.questions.length) state.currentIndex = 0;
  renderQuestion();
}

els.settingsForm.addEventListener('submit', e=>{
  e.preventDefault();
  const s = {
    count: Math.min(parseInt(els.setCount.value,10)||state.raw.questions.length, state.raw.questions.length),
    random: els.setRandom.checked,
    shuffle: els.setShuffle.checked,
    hideSidebar: els.setSidebar.checked,
    mode: els.settingsForm.mode.value
  };
  state.settings = s;
  state.mode = s.mode;
  els.pauseOverlay.style.display = 'none';  
  startTimer();
  localStorage.setItem(settingsKey, JSON.stringify(s));
  els.settingsModal.classList.add('hidden');
  if(s.hideSidebar) document.body.classList.add('sidebar-hidden'); else document.body.classList.remove('sidebar-hidden');
  applySettings();
});

async function load(){
  document.body.classList.add('paused');
  state.raw = await api('/api/exams/' + examId);
  els.examTitle.textContent = state.raw.exam.title;
  state.duration = state.raw.exam.duration || state.duration;
  els.setCount.max = state.raw.questions.length;
  els.setCount.value = state.raw.questions.length;
  const saved = JSON.parse(localStorage.getItem(settingsKey)||'{}');
  if(saved.count) els.setCount.value = saved.count;
  els.setRandom.checked = !!saved.random;
  els.setShuffle.checked = !!saved.shuffle;
  els.setSidebar.checked = !!saved.hideSidebar;
  if(saved.mode){ const r = els.settingsForm.querySelector(`input[name="mode"][value="${saved.mode}"]`); if(r) r.checked=true; }
  state.settings = saved;
}

load();

window.addEventListener('beforeunload', e=>{
  if(state.started && !state.paused){ e.preventDefault(); e.returnValue=''; }
});
