const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: String,
  options: [String],
  correctAnswer: String
});

const categorySchema = new mongoose.Schema({
  categoryName: { type: String, required: true }, // "Coding", "Aptitude", etc.
  questions: [questionSchema]
});

const testSchema = new mongoose.Schema({
  testName: { type: String, required: true, unique: true }, // Only 1 document per testName
  categories: [categorySchema] // Array of categories inside a single testName
});

const Test = mongoose.model('Test', testSchema);

module.exports = { Test };