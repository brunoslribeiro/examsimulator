const form = document.getElementById('pdfForm');
const fileInput = document.getElementById('pdfFile');
const examSelect = document.getElementById('examSelect');
const newExamDiv = document.getElementById('newExam');
const titleInput = document.getElementById('title');
const descInput = document.getElementById('description');
const resultBox = document.getElementById('result');
const templateSelect = document.getElementById('template');

async function loadExams() {
  try {
    const res = await fetch('/api/exams');
    const exams = await res.json();
    exams.forEach(ex => {
      const opt = document.createElement('option');
      opt.value = ex._id;
      opt.textContent = ex.title;
      examSelect.appendChild(opt);
    });
  } catch (e) {
    console.error('Falha ao carregar provas', e);
  }
}

examSelect.addEventListener('change', () => {
  if (examSelect.value) {
    newExamDiv.style.display = 'none';
    titleInput.required = false;
  } else {
    newExamDiv.style.display = 'block';
    titleInput.required = true;
  }
});

loadExams();

form.onsubmit = async (ev) => {
  ev.preventDefault();
  const file = fileInput.files[0];
  if (!file) { alert('Selecione um arquivo'); return; }
  try {
    const fd = new FormData();
    fd.append('file', file);
    if (examSelect.value) {
      fd.append('examId', examSelect.value);
    } else {
      fd.append('title', titleInput.value);
      fd.append('description', descInput.value);
    }
    fd.append('template', templateSelect.value);
    const res = await fetch('/api/import/pdf', {
      method: 'POST',
      body: fd
    });
    const json = await res.json();
    if (res.ok) {
      resultBox.textContent = `Importadas: ${json.imported}`;
      toast('Importação concluída');
    } else {
      resultBox.textContent = json.error || 'Erro desconhecido';
      toast('Erro na importação');
    }
  } catch (e) {
    resultBox.textContent = e.message;
    toast('Erro na importação');
  }
};
