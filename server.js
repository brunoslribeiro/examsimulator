const path = require('path');
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Config ---
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/examdb';
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function saveBase64Image(data) {
  if (typeof data !== 'string') return '';
  const match = data.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!match) return '';
  const ext = match[1].split('/')[1];
  const filename = Date.now() + '-' + Math.round(Math.random() * 1e9) + '.' + ext;
  const filepath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(filepath, Buffer.from(match[2], 'base64'));
  return '/uploads/' + filename;
}

// Parse text extracted from PDF into question objects using a template
function parsePdfQuestions(text, template = 'default') {
  const parsers = {
    // Original parser used for questions starting with "NEW QUESTION" blocks
    default: (t) => {
      const lines = t.split(/\r?\n/).map(l => l.trim());
      const questions = [];
      let current = null;
      const optionRegex = /^([A-Z])[\).]\s*(.+)$/;
      const answerRegex = /^Answer:\s*([A-Z]+)$/i;
      for (const line of lines) {
        if (!line) continue;
        if (/^NEW QUESTION/i.test(line)) {
          if (current) questions.push(current);
          current = { text: '', options: [], answers: [] };
          continue;
        }
        if (!current) continue;
        if (/^\(Exam Topic/i.test(line)) continue;
        const ansMatch = line.match(answerRegex);
        if (ansMatch) {
          current.answers = ansMatch[1].toUpperCase().split('').map(c => c.charCodeAt(0) - 65);
          continue;
        }
        const optMatch = line.match(optionRegex);
        if (optMatch) {
          current.options.push(optMatch[2].trim());
          continue;
        }
        current.text = current.text ? current.text + ' ' + line : line;
      }
      if (current) questions.push(current);
      return questions;
    },
    // More flexible parser that supports various headings and answer formats
    flex: (t) => {
      const lines = t.split(/\r?\n/).map(l => l.trim());
      const questions = [];
      let current = null;
      const startRegex = /^(NEW QUESTION|QUESTION|Q\.?\d+|QUESTION #)/i;
      const optionRegex = /^([A-Z])[\).]\s*(.+)$/;
      const answerRegex = /^Answers?:\s*([A-Z ,]+)$/i;
      for (const line of lines) {
        if (!line) continue;
        if (startRegex.test(line)) {
          if (current) questions.push(current);
          current = { text: '', options: [], answers: [] };
          continue;
        }
        if (!current) continue;
        if (/^(\(Exam Topic|Section:)/i.test(line)) continue;
        const ansMatch = line.match(answerRegex);
        if (ansMatch) {
          const letters = ansMatch[1].toUpperCase().replace(/[^A-Z]/g, '');
          current.answers = letters.split('').map(c => c.charCodeAt(0) - 65);
          continue;
        }
        const optMatch = line.match(optionRegex);
        if (optMatch) {
          current.options.push(optMatch[2].trim());
          continue;
        }
        current.text = current.text ? current.text + ' ' + line : line;
      }
      if (current) questions.push(current);
      return questions;
    }
  };
  const parser = parsers[template] || parsers.default;
  return parser(text);
}

// --- App ---
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, 'public')));

// --- Multer for uploads ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '';
    cb(null, unique + ext);
  }
});
const upload = multer({ storage });

// --- Models ---
const Exam = require('./models/Exam');
const Question = require('./models/Question');

// --- Routes ---
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Upload single file, returns public path
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  return res.json({ path: '/uploads/' + req.file.filename });
});

// Exams
app.post('/api/exams', async (req, res) => {
  try {
    const { title, description } = req.body;
    const exam = await Exam.create({ title, description });
    res.json(exam);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/exams', async (req, res) => {
  const exams = await Exam.find().sort({ createdAt: -1 });
  res.json(exams);
});

app.get('/api/exams/:id', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    const questions = await Question.find({ examId: exam._id });
    res.json({ exam, questions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/exams/:id', async (req, res) => {
  try {
    const { title, description } = req.body;
    const exam = await Exam.findByIdAndUpdate(req.params.id, { title, description }, { new: true });
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    res.json(exam);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/exams/:id', async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    // delete related questions
    await Question.deleteMany({ examId: exam._id });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Questions
app.post('/api/questions', async (req, res) => {
  try {
    const { examId, text, type, options, imagePath, imageBase64, topic, status, explanation } = req.body;
    if (!examId) return res.status(400).json({ error: 'examId is required' });
    let qImagePath = imagePath || '';
    if (imageBase64) qImagePath = saveBase64Image(imageBase64);
    const parsedOptions = Array.isArray(options) ? options : [];
    const q = await Question.create({
      examId,
      text,
      imagePath: qImagePath,
      type: ['single','multiple'].includes(type) ? type : 'single',
      topic: topic || '',
      status: ['draft','published'].includes(status) ? status : 'draft',
      options: parsedOptions.map(o => ({
        text: o.text || '',
        imagePath: o.imageBase64 ? saveBase64Image(o.imageBase64) : (o.imagePath || ''),
        code: o.code || '',
        language: o.language || '',
        isCorrect: !!o.isCorrect
      })),
      explanation: explanation || ''
    });
    res.json(q);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/questions', async (req, res) => {
  const { examId, q, topic, status, hasImage, since, sort = 'recent', page = 1 } = req.query;
  const query = { deleted: { $ne: true } };
  if (examId) query.examId = examId;
  if (topic) query.topic = new RegExp(topic, 'i');
  if (status) query.status = status;
  if (hasImage === '1') query.imagePath = { $ne: '' };
  if (hasImage === '0') query.imagePath = { $in: ['', null] };
  if (since) query.updatedAt = { $gte: new Date(since) };
  if (q) query.text = new RegExp(q, 'i');

  const limit = 20;
  const skip = (Number(page) - 1) * limit;
  const sortObj = sort === 'az' ? { text: 1 } : { updatedAt: -1 };
  const [items, total] = await Promise.all([
    Question.find(query).sort(sortObj).skip(skip).limit(limit),
    Question.countDocuments(query)
  ]);
  res.json({ items, total, page: Number(page) });
});

app.put('/api/questions/:id', async (req, res) => {
  try {
    const { text, type, options, imagePath, imageBase64, topic, status, explanation } = req.body;
    let qImagePath = imagePath || '';
    if (imageBase64) qImagePath = saveBase64Image(imageBase64);
    const parsedOptions = Array.isArray(options) ? options : [];
    const q = await Question.findByIdAndUpdate(
      req.params.id,
      {
        text,
        imagePath: qImagePath,
        type: ['single','multiple'].includes(type) ? type : 'single',
        topic: topic || '',
        status: ['draft','published'].includes(status) ? status : 'draft',
        options: parsedOptions.map(o => ({
          text: o.text || '',
          imagePath: o.imageBase64 ? saveBase64Image(o.imageBase64) : (o.imagePath || ''),
          code: o.code || '',
          language: o.language || '',
          isCorrect: !!o.isCorrect
        })),
        explanation: explanation || ''
      },
      { new: true }
    );
    if (!q) return res.status(404).json({ error: 'Question not found' });
    res.json(q);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/questions/:id', async (req, res) => {
  try {
    const q = await Question.findByIdAndUpdate(req.params.id, { deleted: true });
    if (!q) return res.status(404).json({ error: 'Question not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/questions/bulk', async (req, res) => {
  try {
    const { ids = [], action } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids required' });
    if (action === 'delete') {
      await Question.updateMany({ _id: { $in: ids } }, { deleted: true });
    } else if (action === 'publish') {
      await Question.updateMany({ _id: { $in: ids } }, { status: 'published' });
    } else if (action === 'unpublish') {
      await Question.updateMany({ _id: { $in: ids } }, { status: 'draft' });
    }
    res.json({ updated: ids.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// /api/questions/replace
app.post('/api/questions/replace', async (req, res) => {
  try {
    const { examId, confirm } = req.body;

    // 👇 sempre como string
    const findStr = String(req.body.find ?? '');
    const replaceStr = String(req.body.replace ?? '');

    // 👇 validação por string vazia (aceita "0")
    if (findStr.trim() === '') {
      return res.status(400).json({ error: 'find is required' });
    }

    const escaped = findStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const findRegex = new RegExp(escaped, 'i');
    const replaceRegex = new RegExp(escaped, 'gi');

    const query = { text: findRegex };
    if (examId) query.examId = examId;

    const questions = await Question.find(query).select('_id text').lean();

    const impacted = questions.map(q => {
      const before = String(q.text ?? '');
      const after  = before.replace(replaceRegex, replaceStr); // 👈 usa replaceStr
      return { id: q._id, before, after };
    }).filter(q => q.before !== q.after);

    if (!confirm) {
      return res.json({ count: impacted.length, questions: impacted });
    }

    // opcional: bulkWrite em vez de N updates
    await Question.bulkWrite(
      impacted.map(q => ({
        updateOne: { filter: { _id: q.id }, update: { $set: { text: q.after } } }
      })),
      { ordered: false }
    );

    res.json({ updated: impacted.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});



// --- ChatGPT integrations ---
// Generate new questions for an exam using OpenAI
app.post('/api/gpt/generate', async (req, res) => {
  try {
    const { examId, prompt, count = 5 } = req.body;
    if (!examId || !prompt) {
      return res.status(400).json({ error: 'examId and prompt required' });
    }
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You generate multiple choice exam questions and return JSON {questions:[{text,type,options:[{text,code,language,isCorrect}],explanation}]}'
        },
        {
          role: 'user',
          content: `Create ${count} questions about ${prompt}. Include programming topics when appropriate.`
        }
      ],
      response_format: { type: 'json_object' }
    });
    const payload = JSON.parse(completion.choices[0].message.content || '{}');
    const questions = Array.isArray(payload.questions) ? payload.questions : [];
    const docs = await Question.insertMany(
      questions.map(q => ({
        examId,
        text: q.text || '',
        type: ['single', 'multiple'].includes(q.type) ? q.type : 'single',
        options: Array.isArray(q.options)
          ? q.options.map(o => ({
              text: o.text || '',
              code: o.code || '',
              language: o.language || '',
              isCorrect: !!o.isCorrect
            }))
          : [],
        explanation: q.explanation || ''
      }))
    );
    res.json({ created: docs.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Verify a question's answers using OpenAI
app.post('/api/gpt/verify', async (req, res) => {
  try {
    const { questionId } = req.body;
    if (!questionId) return res.status(400).json({ error: 'questionId required' });
    const q = await Question.findById(questionId);
    if (!q) return res.status(404).json({ error: 'Question not found' });
    const prompt = `Question: ${q.text}\nOptions:\n${q.options
      .map((o, i) => `${i + 1}. ${o.text}`)
      .join('\n')}`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Given a multiple choice question, respond with JSON {correctIndices:[number], explanation:string} where indices are 0-based.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    });
    const data = JSON.parse(completion.choices[0].message.content || '{}');
    const expected = q.options.map((o, idx) => (o.isCorrect ? idx : -1)).filter(i => i >= 0);
    const gpt = Array.isArray(data.correctIndices) ? data.correctIndices : [];
    const matches = expected.length === gpt.length && expected.every(i => gpt.includes(i));
    if (!q.explanation && data.explanation) {
      q.explanation = data.explanation;
      await q.save();
    }
    res.json({ matches, expected, gpt });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Generate or return an explanation for a question
app.post('/api/gpt/explain', async (req, res) => {
  try {
    const { questionId } = req.body;
    if (!questionId) return res.status(400).json({ error: 'questionId required' });
    const q = await Question.findById(questionId);
    if (!q) return res.status(404).json({ error: 'Question not found' });
    if (q.explanation) return res.json({ explanation: q.explanation });
    const prompt = `Provide a concise explanation for why the correct answer is correct.\nQuestion: ${q.text}\nOptions:\n${q.options
      .map((o, i) => `${i + 1}. ${o.text}${o.isCorrect ? ' (correct)' : ''}`)
      .join('\n')}`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You explain exam answers succinctly.' },
        { role: 'user', content: prompt }
      ]
    });
    const explanation = completion.choices[0].message.content.trim();
    q.explanation = explanation;
    await q.save();
    res.json({ explanation });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Import questions from a PDF. Accepts multipart/form-data with field 'file'.
// Optional body fields: examId to append to an existing exam, title/description to create a new one
app.post('/api/import/pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' });
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdf = await pdfParse(dataBuffer);
    fs.unlinkSync(req.file.path);
    const template = req.body.template || 'default';
    const parsed = parsePdfQuestions(pdf.text, template);
    if (!parsed.length) return res.status(400).json({ error: 'No questions found in PDF' });

    let exam = null;
    if (req.body.examId) {
      exam = await Exam.findById(req.body.examId);
    }
    if (!exam) {
      const title = req.body.title || 'Imported Exam';
      exam = await Exam.create({ title, description: req.body.description || '' });
    }

    const docs = parsed.map(q => ({
      examId: exam._id,
      text: q.text,
      type: q.answers.length > 1 ? 'multiple' : 'single',
      options: q.options.map((opt, idx) => ({ text: opt, code: '', language: '', isCorrect: q.answers.includes(idx) }))
    }));
    await Question.insertMany(docs);
    res.json({ imported: docs.length, examId: exam._id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Import exams/questions from JSON
app.post('/api/import', async (req, res) => {
  try {
    const payload = Array.isArray(req.body?.exams)
      ? req.body.exams
      : Array.isArray(req.body)
      ? req.body
      : [req.body];
    const imported = [];
    for (const ex of payload) {
      if (!ex || !ex.title) continue;
      const exam = await Exam.create({
        title: ex.title,
        description: ex.description || ''
      });
      if (Array.isArray(ex.questions) && ex.questions.length) {
        const qs = ex.questions.map(q => ({
          examId: exam._id,
          text: q.text || '',
          imagePath: q.imageBase64 ? saveBase64Image(q.imageBase64) : (q.imagePath || ''),
          type: ['single', 'multiple'].includes(q.type) ? q.type : 'single',
          options: Array.isArray(q.options)
            ? q.options.map(o => ({
                text: o.text || '',
                imagePath: o.imageBase64 ? saveBase64Image(o.imageBase64) : (o.imagePath || ''),
                code: o.code || '',
                language: o.language || '',
                isCorrect: !!o.isCorrect
              }))
            : []
        }));
        await Question.insertMany(qs);
      }
      imported.push(exam._id);
    }
    res.json({ imported: imported.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Attempts (grading)
// body: { examId, answers: [{ questionId, selectedIndices: number[] }] }
app.post('/api/attempts', async (req, res) => {
  try {
    const { examId, answers } = req.body;
    if (!examId || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'examId and answers[] required' });
    }
    const questions = await Question.find({ examId });
    const byId = new Map(questions.map(q => [String(q._id), q]));
    let correct = 0;
    const details = answers.map(a => {
      const q = byId.get(String(a.questionId));
      if (!q) return { questionId: a.questionId, correct: false, message: 'Questão não encontrada' };
      const selected = Array.isArray(a.selectedIndices) ? a.selectedIndices : [];
      // expected correct set
      const expected = q.options.map((o, idx) => o.isCorrect ? idx : -1).filter(i => i >= 0);
      const ok = expected.length === selected.length && expected.every(idx => selected.includes(idx));
      if (ok) correct += 1;
      return { questionId: q._id, correct: ok, expected, selected };
    });
    const score = { total: questions.length, correct, percent: questions.length ? Math.round((correct / questions.length) * 100) : 0 };
    res.json({ score, details });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- DB & start ---
async function start() {
  await mongoose.connect(MONGO_URL, { dbName: undefined });
  console.log('Connected to MongoDB:', MONGO_URL);
  app.listen(PORT, () => console.log('Server running on http://localhost:' + PORT));
}
start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
