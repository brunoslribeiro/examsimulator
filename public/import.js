const jsonForm = document.getElementById('importJsonForm');
const fileInput = document.getElementById('jsonFile');
const resultBox = document.getElementById('result');
const sampleBox = document.getElementById('sampleJson');

const pdfForm = document.getElementById('importPdfForm');
const pdfFile = document.getElementById('pdfFile');
const pdfTitle = document.getElementById('pdfTitle');
const pdfResult = document.getElementById('pdfResult');

if (sampleBox) {
  fetch('sample-import.json')
    .then(res => res.text())
    .then(text => sampleBox.textContent = text)
    .catch(() => {
      sampleBox.textContent = '{\n  "exams": []\n}';
    });
}

jsonForm.onsubmit = async (ev) => {
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

pdfForm.onsubmit = async ev => {
  ev.preventDefault();
  const file = pdfFile.files[0];
  const title = pdfTitle.value.trim();
  if (!file || !title) { alert('Informe título e arquivo'); return; }
  const fd = new FormData();
  fd.append('file', file);
  fd.append('title', title);
  try {
    const res = await fetch('/api/import-pdf', { method: 'POST', body: fd });
    const json = await res.json();
    if (res.ok) {
      pdfResult.textContent = `Importados: ${json.imported}`;
      toast('Importação PDF concluída');
    } else {
      const msg = json.error ?
        (json.details ? `${json.error}: ${json.details}` : json.error) :
        'Erro desconhecido';
      pdfResult.textContent = msg;
      toast('Erro na importação PDF');
    }
  } catch (e) {
    console.error('PDF upload failed', e);
    pdfResult.textContent = 'Falha ao conectar ao servidor';
    toast('Erro na importação PDF');
  }
};
