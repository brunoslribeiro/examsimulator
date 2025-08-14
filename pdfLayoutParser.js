let pdfjsLib;
try {
  pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
} catch (e1) {
  try {
    pdfjsLib = require('pdfjs-dist/build/pdf.js');
  } catch (e2) {
    console.warn('pdfjs-dist not installed; PDF layout parsing disabled');
  }
}

async function extractParagraphs(buffer, opts = {}) {
  if (!pdfjsLib) throw new Error('pdfjs-dist not installed');
  const {
    yTolerance = 2,
    paragraphGap = 8,
  } = opts;

  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  const spans = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const styles = content.styles || {};
    for (const item of content.items) {
      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
      const x = tx[4];
      const y = viewport.height - tx[5];
      const font = styles[item.fontName] || {};
      const fontSize = Math.hypot(item.transform[0], item.transform[1]);
      spans.push({
        text: item.str,
        x,
        y,
        fontSize,
        fontName: font.fontFamily || '',
        width: item.width,
        height: item.height,
        page: pageNum,
      });
    }
  }
  spans.sort((a, b) => a.y - b.y || a.x - b.x);

  const lines = [];
  for (const span of spans) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(span.y - last.y) <= yTolerance) {
      last.text += (last.text ? ' ' : '') + span.text;
      last.width += span.width;
    } else {
      lines.push({
        text: span.text,
        x: span.x,
        y: span.y,
        width: span.width,
        height: span.height,
        fontSize: span.fontSize,
        page: span.page,
      });
    }
  }

  lines.sort((a, b) => a.y - b.y);
  const paragraphs = [];
  for (const line of lines) {
    const last = paragraphs[paragraphs.length - 1];
    if (last && Math.abs(line.y - (last.y + last.height)) <= paragraphGap) {
      last.text += '\n' + line.text;
      last.height = line.y - last.y + line.height;
      last.lines.push(line);
      last.width = Math.max(last.width, line.x + line.width - last.x);
    } else {
      paragraphs.push({
        text: line.text,
        x: line.x,
        y: line.y,
        width: line.width,
        height: line.height,
        fontSize: line.fontSize,
        lines: [line],
        page: line.page,
      });
    }
  }

  return paragraphs;
}

function detectQuestions(paragraphs, opts = {}) {
  const {
    optionIndentRange = [10, 40],
    optionLineMaxChars = 120,
  } = opts;

  const questions = [];
  let i = 0;
  while (i < paragraphs.length) {
    const prompt = paragraphs[i];
    i++;
    const choices = [];
    while (i < paragraphs.length) {
      const p = paragraphs[i];
      const indent = p.x - prompt.x;
      if (
        indent >= optionIndentRange[0] &&
        indent <= optionIndentRange[1] &&
        p.text.length <= optionLineMaxChars
      ) {
        const m = p.text.match(/^([A-Z0-9]+)[\).\s]+(.*)$/);
        if (m) {
          choices.push({ label: m[1], text: m[2] });
        } else {
          const label = String.fromCharCode(65 + choices.length);
          choices.push({ label, text: p.text });
        }
        i++;
      } else {
        break;
      }
    }
    let answer = [];
    if (i < paragraphs.length) {
      const p = paragraphs[i];
      if (/Answer/i.test(p.text) || /Correct/i.test(p.text)) {
        const m = p.text.match(/([A-Z])\b/);
        if (m) answer = [m[1]];
        i++;
      }
    }
    const confidence = choices.length ? 1 : 0.3;
    questions.push({
      prompt: prompt.text.replace(/\s+/g, ' ').trim(),
      choices,
      answer,
      confidence,
    });
  }
  return questions;
}

async function parsePdfQuestions(buffer, opts = {}) {
  if (!pdfjsLib) throw new Error('pdfjs-dist not installed');
  const paragraphs = await extractParagraphs(buffer, opts);
  return detectQuestions(paragraphs, opts);
}

module.exports = {
  extractParagraphs,
  detectQuestions,
  parsePdfQuestions,
  isAvailable: !!pdfjsLib,
};
