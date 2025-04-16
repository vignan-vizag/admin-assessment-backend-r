const express = require('express');
const { authenticate } = require('../middlewares/auth');
// const Student = require("../models/Student");
const { Test } = require("../models/testModel");
const { getAllStudents, getStudentById, getStudentRankByTest } = require('../controllers/students');

const router = express.Router();

// Get a student by its ID
router.get('/:studentId', getStudentById);

// Get a student Rank by studentID and testID
router.get('/rank/:studentId', getStudentRankByTest);

// Get a student Rank by studentID and testID
router.get('/startTest/:studentId', getStudentRankByTest);

// Route for the student dashboard
router.get('/dashboard', authenticate, (req, res) => {
  res.json({ message: `Welcome ${req.student.rollno}` });
});

router.get('/', getAllStudents);

// Student submits exam
router.post("/submit", authenticate, async (req, res) => {
  try {
    const { examId, answers } = req.body;
    const student = req.student;

    // find the assigned test for the student
    const assignedTest = student.assignedTests.find(test => test.testId.toString() === examId);
    if (!assignedTest || assignedTest.status === 'completed') {
      return res.status(400).json({ error: "Test either not assigned or already completed." });
    }

    // fetch the test with categories and questions
    const test = await Test.findById(examId);
    if (!test) {
      return res.status(404).json({ error: "Test not found." });
    }

    let score = 0;

    // calculate score based on the answers
    for (let answer of answers) {
      const category = test.categories.find(cat => cat.questions.some(q => q._id.toString() === answer.questionId));
      if (category) {
        const question = category.questions.find(q => q._id.toString() === answer.questionId);
        if (question && question.correctAnswer === answer.answer) {
          score += 1;
        }
      }
    }

    // update assigned test status and score
    assignedTest.status = 'completed';
    assignedTest.score = score;
    assignedTest.submittedAt = new Date();

    await student.save();

    res.status(200).json({ message: "Exam submitted successfully", score });
  } catch (error) {
    res.status(500).json({ error: "Error submitting exam", details: error.message });
  }
});

module.exports = router;
