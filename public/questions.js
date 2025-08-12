const api = (u, o={}) => fetch(u, o).then(r => r.json());
const examId = new URLSearchParams(location.search).get('examId');

if (!examId) { document.body.innerHTML = '<p class="container">examId obrigatório.</p>'; throw new Error('no examId'); }

async function loadExam() {
  const data = await api('/api/exams/' + examId);
  document.getElementById('crumbExam').textContent = data.exam.title;
}

function addOptRow(data={}) {
  const div = document.createElement('div');
  div.className = 'opt';
  div.innerHTML = `
    <div class="row">
      <label>Texto <input class="t" value="${data.text || ''}"/></label>
      <label>Imagem <input type="file" class="f" accept="image/*"/></label>
      <label>Correta? <input type="checkbox" class="c" ${data.isCorrect ? 'checked':''}/></label>
    </div>
    <img class="preview" ${data.imagePath ? 'src="'+data.imagePath+'"' : 'style="display:none"'} />
  `;
  const file = div.querySelector('.f');
  const img = div.querySelector('.preview');
  file.onchange = async () => {
    const f = file.files && file.files[0]; if (!f) return;
    const fd = new FormData(); fd.append('file', f);
    const res = await fetch('/api/upload', { method:'POST', body: fd }).then(r=>r.json());
    if (res.path) { div.dataset.imagePath = res.path; img.src = res.path; img.style.display='block'; toast('Imagem enviada'); }
  };
  if (data.imagePath) div.dataset.imagePath = data.imagePath;
  document.getElementById('opts').appendChild(div);
}

function resetForm() {
  document.getElementById('qid').value = '';
  document.getElementById('qForm').reset();
  document.getElementById('opts').innerHTML='';
  addOptRow(); addOptRow();
}

async function loadList() {
  const list = await api('/api/questions?examId=' + examId);
  const box = document.getElementById('list'); box.innerHTML='';
  if (!list.length) { box.innerHTML = '<p class="muted">Sem questões.</p>'; return; }
  list.forEach(q => {
    const wrap = document.createElement('div');
    wrap.className = 'card';
    const opts = q.options.map((o,i)=>{
      const parts = [];
      if (o.text) parts.push(o.text);
      if (o.imagePath) parts.push('[img]');
      if (o.isCorrect) parts.push('(correta)');
      return (i+1) + '. ' + parts.join(' ');
    }).join('<br/>');
    wrap.innerHTML = `
      <div class="row between">
        <div>
          <strong>${q.text}</strong> <span class="muted">[${q.type}]</span>
        </div>
        <div class="actions">
          <button data-edit="${q._id}" class="secondary">Editar</button>
          <button data-del="${q._id}" class="danger">Excluir</button>
        </div>
      </div>
      <div class="muted" style="margin:6px 0">${opts}</div>
    `;
    wrap.querySelector('[data-edit]').onclick = () => {
      document.getElementById('qid').value = q._id;
      document.getElementById('qtext').value = q.text || '';
      document.getElementById('qtype').value = q.type || 'single';
      document.getElementById('opts').innerHTML='';
      (q.options||[]).forEach(o=> addOptRow(o));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    wrap.querySelector('[data-del]').onclick = async () => {
      if (!confirm('Excluir questão?')) return;
      await api('/api/questions/' + q._id, { method: 'DELETE' });
      toast('Questão excluída');
      loadList();
    };
    box.appendChild(wrap);
  });
}

document.getElementById('qForm').onsubmit = async (ev) => {
  ev.preventDefault();
  const id = document.getElementById('qid').value;
  const text = document.getElementById('qtext').value.trim();
  const type = document.getElementById('qtype').value;
  const options = [...document.querySelectorAll('#opts .opt')].map(div => ({
    text: (div.querySelector('.t').value || '').trim(),
    imagePath: div.dataset.imagePath || '',
    isCorrect: div.querySelector('.c').checked
  }));
  if (!options.length) { alert('Adicione pelo menos uma opção'); return; }
  for (const o of options) { if (!o.text && !o.imagePath) { alert('Cada opção precisa de texto ou imagem'); return; } }
  const payload = { text, type, options };
  if (id) {
    await api('/api/questions/' + id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    toast('Questão atualizada');
  } else {
    await api('/api/questions', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ examId, ...payload }) });
    toast('Questão criada');
  }
  resetForm(); loadList();
};

document.getElementById('addOpt').onclick = () => addOptRow();
document.getElementById('cancel').onclick = resetForm;

loadExam(); resetForm(); loadList();