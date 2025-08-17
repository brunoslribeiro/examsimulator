const form = document.getElementById('jsonForm');
const fileInput = document.getElementById('jsonFile');
const resultBox = document.getElementById('jsonResult');
const sampleBox = document.getElementById('sampleJson');

if (sampleBox) {
  fetch('sample-import.json')
    .then(res => res.text())
    .then(text => sampleBox.textContent = text)
    .catch(() => {
      sampleBox.textContent = '{\n  "exams": []\n}';
    });
}

form.onsubmit = async (ev) => {
  ev.preventDefault();
  const file = fileInput.files[0];
  if (!file) { alert('Selecione um arquivo'); return; }
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (res.ok) {
      resultBox.textContent = `Importados: ${json.imported}`;
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
