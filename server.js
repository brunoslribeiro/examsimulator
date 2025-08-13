const path = require('path');
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');

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
    const { examId, text, type, options, imagePath, imageBase64 } = req.body;
    if (!examId) return res.status(400).json({ error: 'examId is required' });
    let qImagePath = imagePath || '';
    if (imageBase64) qImagePath = saveBase64Image(imageBase64);
    const parsedOptions = Array.isArray(options) ? options : [];
    const q = await Question.create({
      examId,
      text,
      imagePath: qImagePath,
      type: ['single','multiple'].includes(type) ? type : 'single',
      options: parsedOptions.map(o => ({
        text: o.text || '',
        imagePath: o.imageBase64 ? saveBase64Image(o.imageBase64) : (o.imagePath || ''),
        isCorrect: !!o.isCorrect
      }))
    });
    res.json(q);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/questions', async (req, res) => {
  const { examId } = req.query;
  const query = examId ? { examId } : {};
  const list = await Question.find(query).sort({ createdAt: -1 });
  res.json(list);
});

app.put('/api/questions/:id', async (req, res) => {
  try {
    const { text, type, options, imagePath, imageBase64 } = req.body;
    let qImagePath = imagePath || '';
    if (imageBase64) qImagePath = saveBase64Image(imageBase64);
    const parsedOptions = Array.isArray(options) ? options : [];
    const q = await Question.findByIdAndUpdate(
      req.params.id,
      {
        text,
        imagePath: qImagePath,
        type: ['single','multiple'].includes(type) ? type : 'single',
        options: parsedOptions.map(o => ({
          text: o.text || '',
          imagePath: o.imageBase64 ? saveBase64Image(o.imageBase64) : (o.imagePath || ''),
          isCorrect: !!o.isCorrect
        }))
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
    const q = await Question.findByIdAndDelete(req.params.id);
    if (!q) return res.status(404).json({ error: 'Question not found' });
    res.json({ ok: true });
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
