const express = require('express');
const { authenticate } = require('../middlewares/auth');
// const Student = require("../models/Student");
const { Test } = require("../models/testModel");
const { getAllStudents, getStudentById, getStudentRankByTest, getAllStudentRanksByTest } = require('../controllers/students');

const router = express.Router();

// Get a student by its ID
router.get('/:studentId', getStudentById);

// Get a student Rank by studentID and testID
router.get('/rank/:studentId', getStudentRankByTest);

// Get ALL student rankings for a specific test (for complete reports)
router.get('/rankings/:testId/:year', getAllStudentRanksByTest);

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

    // Get previous score if test was already completed (for re-submission handling)
    const previousScore = assignedTest.status === 'completed' ? (assignedTest.score || 0) : 0;

    // update assigned test status and score
    assignedTest.status = 'completed';
    assignedTest.score = score;
    assignedTest.submittedAt = new Date();

    // Update total marks: remove previous score (if any) and add new score
    student.totalmarks = (student.totalmarks || 0) - previousScore + score;

    await student.save();

    res.status(200).json({ 
      message: "Exam submitted successfully", 
      score,
      totalmarks: student.totalmarks 
    });
  } catch (error) {
    res.status(500).json({ error: "Error submitting exam", details: error.message });
  }
});

module.exports = router;
