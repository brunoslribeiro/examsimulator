const api = (u, o={}) => fetch(u, o).then(r => r.json());

let editingId = null;
const titleInput = document.getElementById('title');
const descInput = document.getElementById('description');
const saveBtn = document.getElementById('saveExam');
const cancelBtn = document.getElementById('cancelEdit');

function resetForm(){
  editingId = null;
  document.getElementById('examId').value = '';
  titleInput.value = '';
  descInput.value = '';
  saveBtn.textContent = 'Salvar';
  cancelBtn.style.display = 'none';
}

function startEdit(exam){
  editingId = exam._id;
  document.getElementById('examId').value = exam._id;
  titleInput.value = exam.title;
  descInput.value = exam.description || '';
  saveBtn.textContent = 'Atualizar';
  cancelBtn.style.display = 'inline-block';
  window.scrollTo({top:0, behavior:'smooth'});
}

cancelBtn.onclick = resetForm;

async function load() {
  const list = await api('/api/exams');
  const box = document.getElementById('exams');
  if (!list.length) { box.innerHTML = '<p class="muted">Nenhuma prova ainda.</p>'; return; }
  box.innerHTML = '';
  list.forEach(e => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <div class="row between">
        <div>
          <strong style="font-size:18px">${e.title}</strong><br/>
          <span class="muted">${new Date(e.createdAt).toLocaleString()}</span>
        </div>
        <div class="actions">
          <a href="questions.html?examId=${e._id}">Gerenciar questões</a>
          <a href="take.html?examId=${e._id}">Aplicar prova</a>
          <button data-edit="${e._id}" class="secondary">Editar</button>
          <button data-del="${e._id}" class="secondary">Excluir</button>
        </div>
      </div>
      ${e.description ? `<p style="margin:8px 0 0">${e.description}</p>` : ''}
    `;
    div.querySelector('[data-edit]').onclick = () => startEdit(e);
    div.querySelector('[data-del]').onclick = async () => {
      if (!confirm('Excluir a prova e suas questões?')) return;
      await api('/api/exams/' + e._id, { method: 'DELETE' });
      toast('Prova excluída');
      load();
    };
    box.appendChild(div);
  });
}

document.getElementById('examForm').onsubmit = async (ev) => {
  ev.preventDefault();
  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  if (!title) { alert('Informe um título'); return; }
  const method = editingId ? 'PUT' : 'POST';
  const url = editingId ? '/api/exams/' + editingId : '/api/exams';
  await api(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description })
  });
  toast(editingId ? 'Prova atualizada' : 'Prova criada');
  resetForm();
  load();
};

resetForm();
load();
