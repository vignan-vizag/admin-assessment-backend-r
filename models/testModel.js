const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: String,
  options: [String],
  correctAnswer: String
});

const categorySchema = new mongoose.Schema({
  categoryName: { type: String, required: true }, // "Coding", "Aptitude", "Reasoning", "Verbal"
  questions: [questionSchema]
});

const testSchema = new mongoose.Schema({
  testName: { type: String, required: true, unique: true }, // Only 1 document per testName
  categories: [categorySchema], // Array of categories inside a single testName
  status: { type: String, enum: ['live', 'offline'], default: 'offline' }, // Test status - offline by default
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Test = mongoose.model('Test', testSchema);

module.exports = { Test };