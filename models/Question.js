const mongoose = require('mongoose');
const OptionSchema = new mongoose.Schema({
  text: { type: String, default: '' },
  imagePath: { type: String, default: '' }, // e.g., '/uploads/xyz.png'
  isCorrect: { type: Boolean, default: false }
}, { _id: false });

const QuestionSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  text: { type: String, default: '' },
  type: { type: String, enum: ['single','multiple'], default: 'single' },
  options: { type: [OptionSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Question', QuestionSchema);
