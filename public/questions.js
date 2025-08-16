const api = (u, o={}) => fetch(u, o).then(r => r.json());
const examId = new URLSearchParams(location.search).get('examId');

if (!examId) { document.body.innerHTML = '<p class="container">examId obrigatório.</p>'; throw new Error('no examId'); }

let allQuestions = [];
let currentPage = 1;
let perPage = 10;

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
  allQuestions = await api('/api/questions?examId=' + examId);
  document.getElementById('qCount').textContent = 'Total: ' + allQuestions.length;
  renderList();
}

function renderList() {
  const term = (document.getElementById('search').value || '').trim().toLowerCase();
  const filtered = term ? allQuestions.filter(q => (q.text || '').toLowerCase().includes(term)) : allQuestions;
  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage);
  const jqBox = $('#list');
  jqBox.fadeOut(200, () => {
    const box = document.getElementById('list');
    box.innerHTML = '';
    if (!pageItems.length) {
      box.innerHTML = `<p class="muted">${allQuestions.length ? 'Nenhuma questão encontrada.' : 'Sem questões.'}</p>`;
      jqBox.fadeIn(200);
      renderPagination(totalPages);
      return;
    }
    pageItems.forEach(q => {
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
            <button data-edit="${q._id}" class="warning">✏️ Editar</button>
            <button data-del="${q._id}" class="danger">🗑️ Excluir</button>
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
    jqBox.fadeIn(200);
    renderPagination(totalPages);
  });
}

function renderPagination(totalPages) {
  const box = document.getElementById('pagination');
  if (totalPages <= 1) { box.innerHTML = ''; return; }
  box.innerHTML = '';
  const prev = document.createElement('button');
  prev.textContent = '◀️';
  prev.className = 'secondary';
  prev.disabled = currentPage === 1;
  prev.onclick = () => { if (currentPage > 1) { currentPage--; renderList(); } };
  box.appendChild(prev);

  const info = document.createElement('span');
  info.textContent = `Página ${currentPage} de ${totalPages}`;
  box.appendChild(info);

  const next = document.createElement('button');
  next.textContent = '▶️';
  next.className = 'secondary';
  next.disabled = currentPage === totalPages;
  next.onclick = () => { if (currentPage < totalPages) { currentPage++; renderList(); } };
  box.appendChild(next);
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
document.getElementById('search').oninput = () => { currentPage = 1; renderList(); };
document.getElementById('perPage').onchange = () => {
  perPage = parseInt(document.getElementById('perPage').value, 10) || 10;
  currentPage = 1;
  renderList();
};

let previewCount = 0;
document.getElementById('previewReplace').onclick = async () => {
  const find = document.getElementById('findTerm').value.trim();
  const replace = document.getElementById('replaceTerm').value || '';
  if (!find) { alert('Informe o termo a buscar'); return; }
  const res = await api('/api/questions/replace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ examId, find, replace })
  });
  const box = document.getElementById('replacePreview');
  if (res.error) {
    box.textContent = res.error;
    document.getElementById('applyReplace').style.display = 'none';
    return;
  }
  previewCount = res.count || 0;
  if (!previewCount) {
    box.textContent = 'Nenhuma questão afetada.';
    document.getElementById('applyReplace').style.display = 'none';
    return;
  }
  box.innerHTML = res.questions.map(q => `<p><strong>${q.before}</strong><br/>➡️ ${q.after}</p>`).join('');
  document.getElementById('applyReplace').style.display = 'inline-block';
};

document.getElementById('applyReplace').onclick = async () => {
  const find = document.getElementById('findTerm').value.trim();
  const replace = document.getElementById('replaceTerm').value || '';
  if (!find) return;
  if (!confirm('Aplicar substituição em ' + previewCount + ' questões?')) return;
  const res = await api('/api/questions/replace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ examId, find, replace, confirm: true })
  });
  toast('Atualizado em ' + res.updated + ' questões');
  document.getElementById('replacePreview').textContent = '';
  document.getElementById('applyReplace').style.display = 'none';
  loadList();
};

loadExam(); resetForm(); loadList();