const jsonForm = document.getElementById('importJsonForm');
const fileInput = document.getElementById('jsonFile');
const resultBox = document.getElementById('result');
const sampleBox = document.getElementById('sampleJson');

const pdfForm = document.getElementById('importPdfForm');
const pdfFile = document.getElementById('pdfFile');
const pdfTitle = document.getElementById('pdfTitle');
const pdfResult = document.getElementById('pdfResult');
const qPattern = document.getElementById('qPattern');
const oPattern = document.getElementById('oPattern');
const aPattern = document.getElementById('aPattern');
const sampleQuestion = document.getElementById('sampleQuestion');
const genBtn = document.getElementById('generatePatterns');

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

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}

function generatePatterns(example) {
  const lines = example.trim().split(/\r?\n/);

  const headerMatch = lines[0].match(/^(.*?)(\d+)/);
  const headerPrefix = headerMatch ? escapeRegExp(headerMatch[1].trim()) : '.*?';

  const answerIndex = lines.findIndex(l => /^(?:Correct Answer|Answer):/i.test(l));
  const optionStart = lines.findIndex(l => /^([A-Z]|\d+)[.)]\s/.test(l));
  const optionLines = lines.slice(optionStart, answerIndex > -1 ? answerIndex : undefined);

  const optMatch =
    optionLines[0].match(/^([A-Z])([.)])\s/) || optionLines[0].match(/^(\d+)([.)])\s/);
  const optDelim = optMatch[2];
  const isLetter = /^[A-Z]$/.test(optMatch[1]);

  let optionLead;
  if (isLetter) {
    let first = optMatch[1];
    let last = first;
    optionLines.forEach(l => {
      const m = l.match(/^([A-Z])[.)]\s/);
      if (m && m[1] > last) last = m[1];
    });
    const letterClass = `[${first}-${last}]`;
    optionLead = `${letterClass}[${optDelim === '.' ? '\\.' : '\\)'}]`;
  } else {
    optionLead = `\\d+[${optDelim === '.' ? '\\.' : '\\)'}]`;
  }

  const delimClass = optDelim === '.' ? '\\.' : '\\)';

  const regexEnunciado = `^\\s*(?:${headerPrefix}\\s*\\d+\\n)?(?:-\\s*\\([^\\n]*\\)\\n)?([\\s\\S]*?)(?=\\n${optionLead}|\\s*(?:Answer|Correct\\s*Answer):)`;

  const regexOpcoes =
    `^(?:([A-Z])[${delimClass}]|(\\d+)[${delimClass}])\\s+([\\s\\S]*?)(?=\\n(?:[A-Z][${delimClass}]|\\d+[${delimClass}]|(?:Answer|Correct\\s*Answer)|$))`;

  const regexResposta = `(?:Answer|Correct\\s*Answer):\\s*([A-Z\\d]+)`;

  return { regexEnunciado, regexOpcoes, regexResposta };
}

if (genBtn) {
  genBtn.onclick = () => {
    const example = sampleQuestion.value.trim();
    if (!example) { alert('Cole uma questão de exemplo'); return; }
    try {
      const patterns = generatePatterns(example);
      qPattern.value = patterns.regexEnunciado;
      oPattern.value = patterns.regexOpcoes;
      aPattern.value = patterns.regexResposta;
    } catch (e) {
      alert('Falha ao gerar padrões: ' + e.message);
    }
  };
}

pdfForm.onsubmit = async ev => {
  ev.preventDefault();
  const file = pdfFile.files[0];
  const title = pdfTitle.value.trim();
  if (!file || !title) { alert('Informe título e arquivo'); return; }
  if (!qPattern.value || !oPattern.value) {
    alert('Informe os padrões de enunciado e opções');
    return;
  }
  const fd = new FormData();
  fd.append('file', file);
  fd.append('title', title);
  fd.append('qPattern', qPattern.value);
  fd.append('oPattern', oPattern.value);
  if (aPattern.value) fd.append('aPattern', aPattern.value);
  try {
    const res = await fetch('/api/import-pdf', { method: 'POST', body: fd });
    const json = await res.json();
    if (res.ok) {
      pdfResult.textContent = `Importados: ${json.imported}`;
      toast('Importação PDF concluída');
    } else {
      const msg = json.error || 'Erro desconhecido';
      pdfResult.textContent = msg;
      toast('Erro na importação PDF');
    }
  } catch (e) {
    console.error('PDF upload failed', e);
    pdfResult.textContent = 'Falha ao conectar ao servidor';
    toast('Erro na importação PDF');
  }
};
