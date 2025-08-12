const api = (u, o={}) => fetch(u, o).then(r => r.json());

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
          <button data-del="${e._id}" class="secondary">Excluir</button>
        </div>
      </div>
      ${e.description ? `<p style="margin:8px 0 0">${e.description}</p>` : ''}
    `;
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
  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  if (!title) { alert('Informe um título'); return; }
  await api('/api/exams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description })
  });
  ev.target.reset();
  toast('Prova criada');
  load();
};

load();