const api = (u, o={}) => fetch(u, o).then(r => r.json());
const examId = new URLSearchParams(location.search).get('examId');
if (!examId) { document.body.querySelector('.container').insertAdjacentHTML('beforeend','<p class="card">examId obrigatório.</p>'); throw new Error('no examId'); }

async function load() {
  const data = await api('/api/exams/' + examId);
  document.getElementById('info').textContent = data.exam.title + (data.exam.description ? ' — ' + data.exam.description : '');
  const form = document.getElementById('form'); form.innerHTML = '';
  (data.questions || []).forEach((q, i) => {
    const div = document.createElement('div'); div.className = 'card'; div.id = 'q'+i;
    const opts = q.options.map((o, idx) => `
      <li>
        <label>
          <input type="${q.type === 'multiple' ? 'checkbox':'radio'}" name="q-${q._id}" value="${idx}">
          ${o.text ? '<span>' + o.text + '</span>' : ''}
          ${o.imagePath ? '<img class="preview" src="${o.imagePath}"/>' : ''}
        </label>
      </li>`).join('');
    div.innerHTML = `
      <div><strong>Q${i+1}.</strong> ${q.text || ''} <span class="muted">[${q.type}]</span></div>
      <ul>${opts}</ul>
    `;
    form.appendChild(div);
  });
  const btn = document.createElement('button'); btn.textContent = 'Enviar respostas'; btn.type = 'submit';
  form.appendChild(btn);

  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const answers = data.questions.map(q => {
      const inputs = form.querySelectorAll('[name="q-' + q._id + '"]');
      const arr = []; inputs.forEach(inp => { if (inp.checked) arr.push(parseInt(inp.value,10)); });
      return { questionId: q._id, selectedIndices: arr };
    });
    const res = await api('/api/attempts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ examId, answers }) });
    show(res, data.questions);
  };
}

function show(res, questions) {
  const out = document.getElementById('result');
  if (res.error) { out.innerHTML = '<div class="card">'+res.error+'</div>'; return; }
  const { score, details } = res;
  out.innerHTML = '<div class="card"><strong>Resultado:</strong> ' + score.correct + '/' + score.total + ' ('+score.percent+'%)</div>';
  details.forEach((d, i) => {
    const div = document.getElementById('q'+i);
    div.classList.remove('ok','bad');
    div.classList.add(d.correct ? 'ok' : 'bad');
  });
}

load();