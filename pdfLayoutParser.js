let pdfjsLib;
let pdfjsPath = '';
try {
  pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  pdfjsPath = 'pdfjs-dist/legacy/build/pdf.js';
} catch (e1) {
  try {
    pdfjsLib = require('pdfjs-dist/build/pdf.js');
    pdfjsPath = 'pdfjs-dist/build/pdf.js';
  } catch (e2) {
    try {
      require.resolve('pdfjs-dist/legacy/build/pdf.mjs');
      pdfjsPath = 'pdfjs-dist/legacy/build/pdf.mjs';
    } catch (e3) {
      try {
        require.resolve('pdfjs-dist/build/pdf.mjs');
        pdfjsPath = 'pdfjs-dist/build/pdf.mjs';
      } catch (e4) {
        console.warn('pdfjs-dist not installed; PDF import disabled. Run "npm install pdfjs-dist" to enable.');
      }
    }
  }
}

const isAvailable = !!pdfjsPath;

async function ensurePdfjs() {
  if (pdfjsLib) return pdfjsLib;
  if (!pdfjsPath) throw new Error('pdfjs-dist not installed');
  pdfjsLib = await import(pdfjsPath);
  return pdfjsLib;
}

async function extractText(buffer) {
  const pdfjsLib = await ensurePdfjs();
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  let text = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    for (const item of content.items) {
      text += item.str + '\n';
    }
    text += '\n';
  }
  return text;
}

function parseTextByPatterns(text, patterns = {}) {
  const { question, option, answer } = patterns;
  const qRe = question ? new RegExp(question, 'i') : null;
  const oRe = option ? new RegExp(option, 'i') : null;
  const aRe = answer ? new RegExp(answer, 'i') : null;
  const lines = text.split(/\r?\n/);
  const questions = [];
  let current = null;
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (qRe) {
      const qMatch = trimmed.match(qRe);
      if (qMatch) {
        if (current) questions.push(current);
        const rest = trimmed.replace(qRe, '').trim();
        current = { prompt: rest, choices: [], answer: [] };
        continue;
      }
    }
    if (current && oRe) {
      const m = trimmed.match(oRe);
      if (m) {
        const label = m[1] || String.fromCharCode(65 + current.choices.length);
        const text = m[2] || trimmed;
        current.choices.push({ label, text });
        continue;
      }
    }
    if (current && aRe) {
      const m = trimmed.match(aRe);
      if (m) {
        const letters = m[1] ? m[1].match(/[A-Z]/g) : null;
        current.answer = letters || [];
        continue;
      }
    }
    if (current) {
      current.prompt += ' ' + trimmed;
    }
  }
  if (current) questions.push(current);
  return questions.map(q => ({ ...q, confidence: q.choices.length ? 1 : 0.3 }));
}

async function parsePdfWithPatterns(buffer, patterns = {}) {
  let text = await extractText(buffer);
  if (patterns.question) {
    const detect = patterns.question.replace(/^\^/, '');
    try {
      const re = new RegExp(detect, 'g');
      text = text.replace(re, '\n$&');
    } catch (e) {
      /* ignore invalid regex */
    }
  }
  if (patterns.option) {
    const detect = patterns.option.replace(/^\^/, '');
    try {
      const re = new RegExp(detect, 'g');
      text = text.replace(re, '\n$&');
    } catch (e) {
      /* ignore invalid regex */
    }
  }
  if (patterns.answer) {
    const detect = patterns.answer.replace(/^\^/, '');
    try {
      const re = new RegExp(detect, 'g');
      text = text.replace(re, '\n$&');
    } catch (e) {
      /* ignore invalid regex */
    }
  }
  return parseTextByPatterns(text, patterns);
}

module.exports = {
  parsePdfWithPatterns,
  isAvailable,
};
