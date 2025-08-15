const sampleQuestion = `NEW QUESTION 5
- (Exam Topic 1)
Question text here...
A. Option A text
B. Option B text
C. Option C text
D. Option D text
Answer: A`;

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function generatePatterns(example) {
  const lines = example.trim().split(/\r?\n/);
  const answerIndex = lines.findIndex(l => /^(?:Correct Answer|Answer):/i.test(l));
  const optionStart = lines.findIndex(l => /^[A-Z][.)]\s/.test(l));
  const optionLines = lines.slice(optionStart, answerIndex > 0 ? answerIndex : undefined);
  const optMatch = optionLines[0].match(/^([A-Z])([.)])\s/);
  const firstLetter = optMatch[1];
  const optDelim = optMatch[2];
  let lastLetter = firstLetter;
  optionLines.forEach(l => {
    const m = l.match(/^([A-Z])[.)]\s/);
    if (m && m[1] > lastLetter) lastLetter = m[1];
  });
  const letterClass = `[${firstLetter}-${lastLetter}]`;
  const optionPrefix = `${letterClass}[${optDelim === '.' ? '\\.' : '\\)'}]`;
  const headerLine = lines[0];
  const headerMatch = headerLine.match(/^(\D*?)\s*\d+/);
  const headerPrefix = headerMatch ? escapeRegExp(headerMatch[1].trim()) : '.*?';
  const questionHeader = `^${headerPrefix}\\s*\\d+`;
  const regexEnunciado = `${questionHeader}\\n(?:- \\(.+\\)\\n)?([\\s\\S]+?)\\n(?=${optionPrefix})`;
  const regexOpcoes = "^(" + letterClass + ")" + "[" + (optDelim === '.' ? '\\.' : '\\)') + "]" + "\\s+([\\s\\S]+?)(?=\\n" + optionPrefix + "|\\n(?:Answer|Correct Answer))";
  const regexResposta = `(?:Answer|Correct Answer):\\s*(${letterClass})`;
  return { regexEnunciado, regexOpcoes, regexResposta };
}

const patterns = generatePatterns(sampleQuestion);
console.log(patterns);

module.exports = generatePatterns;
