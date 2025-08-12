const mongoose = require('mongoose');
const ExamSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' }
}, { timestamps: true });
module.exports = mongoose.model('Exam', ExamSchema);
