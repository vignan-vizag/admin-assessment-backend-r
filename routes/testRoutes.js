const express = require('express');
const router = express.Router();
const { 
  createTest, 
  updateTest, 
  updateCategory, 
  addCategory, 
  deleteCategory, 
  updateQuestion, 
  addQuestion,
  deleteQuestion, 
  deleteTest, 
  getStudentsRanks, 
  getRandomQuestions, 
  getAllTests, 
  getTestById,
  updateTestStatus,
  getLiveTests,
  getAllTestsWithStatus
} = require('../controllers/testController');
const { assignTestsToStudent, submitTestMarks, startTest } = require('../controllers/students');
// Admin: Create/Update test and its categories with questions
router.post('/create', createTest);

// Admin: Get all tests with status information (for management)
router.get('/admin/all', getAllTestsWithStatus);

// Student: Get only live tests (for students)
router.get('/live', getLiveTests);

// Get all tests (backward compatibility)
router.get("/all", getAllTests);

// Updated: Use POST for getStudentsRanks
router.post('/getStudentsRanks', getStudentsRanks);

// Student: Get 20 random questions from a specific category inside a test
router.get('/get-random/:testName/:categoryName', getRandomQuestions);

// Admin: Update test status (live/offline)
router.put('/:testId/status', updateTestStatus);

// Admin: Update existing test
router.put('/:testId', updateTest);

// Admin: Update a specific category within a test
router.put('/:testId/categories/:categoryId', updateCategory);

// Admin: Add a new category to an existing test
router.post('/:testId/categories', addCategory);

// Admin: Delete a category from a test
router.delete('/:testId/categories/:categoryId', deleteCategory);

// Admin: Add a single question to an existing category
router.post('/:testId/categories/:categoryId/questions', addQuestion);

// Admin: Update a specific question within a category
router.put('/:testId/categories/:categoryId/questions/:questionId', updateQuestion);

// Admin: Delete a specific question from a category
router.delete('/:testId/categories/:categoryId/questions/:questionId', deleteQuestion);

// Admin: Delete an entire test
router.delete('/:testId', deleteTest);

// Updated: Use POST for getStudentsRanks
router.post('/getStudentsRanks', getStudentsRanks);

// POST /tests/:testId/assign
router.post('/:testId/assign', assignTestsToStudent);

// POST /tests/:testId/submit
router.post('/:testId/start', startTest);

// POST /tests/:testId/submit
router.post('/:testId/submit', submitTestMarks);

// Student: Get 20 random questions from a specific category inside a test
router.get('/get-random/:testName/:categoryName', getRandomQuestions);
router.get("/all", getAllTests);

// Get a test by its ID
router.get('/:testId', getTestById);

module.exports = router;
