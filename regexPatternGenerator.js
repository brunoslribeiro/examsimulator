// Generates regex patterns for question prompts, options and answers
// based on a sample question block.

const sampleQuestion = `NEW QUESTION 5
- (Exam Topic 1)
Question text here...
A. Option A text
B. Option B text
C. Option C text
D. Option D text
Answer: A`;

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}

function generatePatterns(example) {
  const lines = example.trim().split(/\r?\n/);

  // Determine question header prefix
  const headerMatch = lines[0].match(/^(.*?)(\d+)/);
  const headerPrefix = headerMatch ? escapeRegExp(headerMatch[1].trim()) : '.*?';

  // Locate option and answer lines
  const answerIndex = lines.findIndex(l => /^(?:Correct Answer|Answer):/i.test(l));
  const optionStart = lines.findIndex(l => /^([A-Z]|\d+)[.)]\s/.test(l));
  const optionLines = lines.slice(optionStart, answerIndex > -1 ? answerIndex : undefined);

  // Detect option style (letters or numbers)
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

// Example usage
const patterns = generatePatterns(sampleQuestion);
console.log(patterns);

module.exports = generatePatterns;

