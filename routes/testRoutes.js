const express = require('express');
const router = express.Router();
const { createTest, getStudentsRanks, getRandomQuestions, getAllTests, getTestById } = require('../controllers/testController');

// Admin: Create/Update test and its categories with questions
router.post('/create', createTest);

// Updated: Use POST for getStudentsRanks
router.post('/getStudentsRanks', getStudentsRanks);

// Student: Get 20 random questions from a specific category inside a test
router.get('/get-random/:testName/:categoryName', getRandomQuestions);
router.get("/all", getAllTests);

// Get a test by its ID
router.get('/:testId', getTestById);

module.exports = router;
