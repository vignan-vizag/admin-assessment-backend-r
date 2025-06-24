const { mongoConnect } = require("../mongoConnect.js");
let yearsSuffix = "_passouts";
const { Test } = require('../models/testModel');
const { getStudentModelByYear } = require('../models/Student');


const validCategories = ["Coding", "Aptitude", "Reasoning", "Verbal"];
// Admin API: Create or Update Category inside a Test
exports.createTest = async (req, res) => {
  const { testName, categoryName, questionsText } = req.body;

  if (!testName || !categoryName || !questionsText) {
    return res.status(400).json({ message: "Test name, category, and questions are required" });
  }

  const trimmedTestName = testName.trim();
  const trimmedCategoryName = categoryName.trim();

  if (!validCategories.map(c => c.toLowerCase()).includes(trimmedCategoryName.toLowerCase())) {
    return res.status(400).json({ message: `Invalid category. Allowed categories: ${validCategories.join(", ")}` });
  }

  const parsedQuestions = [];
  const lines = questionsText.split('\n').map(l => l.trim()).filter(Boolean);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // --- FORMAT 1: Inline: "What is ...? (opt1, opt2, opt3, opt4) [answer]"
    const inlineMatch = line.match(/^(.*?)\s*\((.*?)\)\s*\[(.*?)\]$/);
    if (inlineMatch) {
      const question = inlineMatch[1].trim();
      const options = inlineMatch[2].split(',').map(o => o.trim());
      const correctAnswer = inlineMatch[3].trim();

      if (options.length !== 4) {
        return res.status(400).json({ message: `Question "${question}" must have exactly 4 options.` });
      }
      if (!options.includes(correctAnswer)) {
        return res.status(400).json({ message: `Correct answer "${correctAnswer}" must be one of the 4 options for question "${question}".` });
      }

      parsedQuestions.push({ question, options, correctAnswer });
      i++;
      continue;
    }

    // --- FORMAT 2: Block format: Question: ...\n A)...B)... \n Answer: ...
    if (line.startsWith("Question:")) {
      const question = line.replace("Question:", "").trim();
      const optionsLine = lines[i + 1];
      const answerLine = lines[i + 2];

      if (!optionsLine || !answerLine || !answerLine.startsWith("Answer:")) {
        return res.status(400).json({ message: `Invalid format near question: "${question}"` });
      }

      const optMatch = optionsLine.match(/A\)\s*(.*?)\s*B\)\s*(.*?)\s*C\)\s*(.*?)\s*D\)\s*(.*)/);
      if (!optMatch) {
        return res.status(400).json({ message: `Invalid options format for question: "${question}"` });
      }

      const options = optMatch.slice(1, 5).map(opt => opt.trim());
      const correctAnswer = answerLine.replace("Answer:", "").trim();

      if (!options.includes(correctAnswer)) {
        return res.status(400).json({ message: `Correct answer "${correctAnswer}" must be one of the 4 options for question "${question}".` });
      }

      parsedQuestions.push({ question, options, correctAnswer });
      i += 3;
      continue;
    }

    // handle unrecognized format
    return res.status(400).json({ message: `Invalid format on line: "${line}". Use "Question (opt1, opt2, opt3, opt4) [correct]" or block format.` });
  }

  try {
    let test = await Test.findOne({ testName: trimmedTestName });

    if (!test) {
      test = await Test.create({
        testName: trimmedTestName,
        categories: [{ categoryName: trimmedCategoryName, questions: parsedQuestions }],
        status: 'offline' // New tests are offline by default
      });
    } else {
      const categoryIndex = test.categories.findIndex(
        c => c.categoryName.toLowerCase() === trimmedCategoryName.toLowerCase()
      );

      if (categoryIndex > -1) {
        test.categories[categoryIndex].questions = parsedQuestions;
      } else {
        test.categories.push({ categoryName: trimmedCategoryName, questions: parsedQuestions });
      }
      await test.save();
    }

    res.status(201).json({ message: "Test and category saved successfully", test });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


exports.getStudentsRanks = async (req, res) => {
  try {
    let db = await mongoConnect();
    const { year, testName, branch, section, category } = req.body;
    if (!year) {
      return res.status(500).json({ message: "Mention year mandatorily" });
    }

    let collectionName = `${year}${yearsSuffix}`;
    let matchCond = {};
    let categoriesSumArray = [];

    if (testName) {
      matchCond.testName = testName;
    }
    if (branch) {
      matchCond.branch = branch;
      if (section) {
        matchCond.section = section;
      }
    }
    if (category) {
      categoriesSumArray.push(`$marks.${category}`);
    } else {
      categoriesSumArray = ["$marks.coding", "$marks.aptitude", "$marks.reasoning", "$marks.verbal"];
    }
    let pipeline = [
      {
        $match: matchCond
      },
      {
        $addFields: {
          totalMarks: {
            $sum: categoriesSumArray
          }
        }
      },
      {
        $project: {
          _id: 0,
          reg_no: 1,
          name: 1,
          coding: "$marks.coding",
          aptitude: "$marks.aptitude",
          reasoning: "$marks.reasoning",
          verbal: "$marks.verbal",
          totalMarks: 1,
        }
      },
      {
        $sort: {
          totalMarks: -1
        }
      }
      // No $limit stage - returns ALL students who match the criteria
    ];
    
    // Fetch ALL matching students from the database
    let marksDocs = await db.collection(collectionName)
      .aggregate(pipeline).toArray();
    
    // Assign ranks to ALL students
    let rank = 1;
    marksDocs.map((a) => {
      a.rank = rank;
      rank = rank + 1;
    });
    
    // Return ALL students with their ranks
    res.json({ 
      studentsRanks: marksDocs,
      totalCount: marksDocs.length,
      message: `Returning all ${marksDocs.length} students who match the criteria`
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Student API: Get 20 Random Questions from a category inside a test
exports.getRandomQuestions = async (req, res) => {
  const { categoryName, testName } = req.params;

  const trimmedTestName = testName.trim();
  const trimmedCategoryName = categoryName.trim();

  if (!validCategories.map(c => c.toLowerCase()).includes(trimmedCategoryName.toLowerCase())) {
    return res.status(400).json({ message: `Invalid category. Allowed categories: ${validCategories.join(", ")}` });
  }

  try {
    const test = await Test.findOne({ testName: trimmedTestName, status: 'live' });
    if (!test) {
      return res.status(404).json({ message: "Test not found or not available." });
    }

    const category = test.categories.find(
      cat => cat.categoryName.toLowerCase() === trimmedCategoryName.toLowerCase()
    );
    if (!category || !category.questions.length) {
      return res.status(404).json({ message: "Category not found or has no questions." });
    }

    const shuffled = [...category.questions].sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, 20);

    res.json({ questions: selectedQuestions });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getAllTests = async (req, res) => {
  try {
    const tests = await Test.find({}, "testName categories.categoryName categories.questions status createdAt updatedAt");
    res.status(200).json(tests);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tests", error });
  }
};

exports.getTestById = async (req, res) => {
  try {
    const { testId } = req.params;
    const test = await Test.findById(testId);

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    res.status(200).json(test);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update an existing test
exports.updateTest = async (req, res) => {
  const { testId } = req.params;
  const { testName } = req.body;

  if (!testId) {
    return res.status(400).json({ message: "Test ID is required" });
  }

  try {
    const updateData = {};
    if (testName) {
      updateData.testName = testName.trim();
    }
    updateData.updatedAt = new Date();

    const updatedTest = await Test.findByIdAndUpdate(
      testId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedTest) {
      return res.status(404).json({ message: "Test not found" });
    }

    res.status(200).json({ 
      message: "Test updated successfully", 
      test: updatedTest 
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Test name already exists" });
    }
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Update a specific category within a test
exports.updateCategory = async (req, res) => {
  const { testId, categoryId } = req.params;
  const { categoryName, questionsText } = req.body;

  if (!testId || !categoryId) {
    return res.status(400).json({ message: "Test ID and Category ID are required" });
  }

  try {
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    const categoryIndex = test.categories.findIndex(cat => cat._id.toString() === categoryId);
    if (categoryIndex === -1) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Update category name if provided
    if (categoryName) {
      const trimmedCategoryName = categoryName.trim();
      if (!validCategories.map(c => c.toLowerCase()).includes(trimmedCategoryName.toLowerCase())) {
        return res.status(400).json({ message: `Invalid category. Allowed categories: ${validCategories.join(", ")}` });
      }
      test.categories[categoryIndex].categoryName = trimmedCategoryName;
    }

    // Update questions if provided
    if (questionsText) {
      const parsedQuestions = [];
      const lines = questionsText.split('\n').map(l => l.trim()).filter(Boolean);
      let i = 0;

      while (i < lines.length) {
        const line = lines[i];

        // FORMAT 1: Inline format
        const inlineMatch = line.match(/^(.*?)\s*\((.*?)\)\s*\[(.*?)\]$/);
        if (inlineMatch) {
          const question = inlineMatch[1].trim();
          const options = inlineMatch[2].split(',').map(o => o.trim());
          const correctAnswer = inlineMatch[3].trim();

          if (options.length !== 4) {
            return res.status(400).json({ message: `Question "${question}" must have exactly 4 options.` });
          }
          if (!options.includes(correctAnswer)) {
            return res.status(400).json({ message: `Correct answer "${correctAnswer}" must be one of the 4 options.` });
          }

          parsedQuestions.push({ question, options, correctAnswer });
          i++;
          continue;
        }

        // FORMAT 2: Block format
        if (line.startsWith("Question:")) {
          const question = line.replace("Question:", "").trim();
          const optionsLine = lines[i + 1];
          const answerLine = lines[i + 2];

          if (!optionsLine || !answerLine || !answerLine.startsWith("Answer:")) {
            return res.status(400).json({ message: `Invalid format near question: "${question}"` });
          }

          const optMatch = optionsLine.match(/A\)\s*(.*?)\s*B\)\s*(.*?)\s*C\)\s*(.*?)\s*D\)\s*(.*)/);
          if (!optMatch) {
            return res.status(400).json({ message: `Invalid options format for question: "${question}"` });
          }

          const options = optMatch.slice(1, 5).map(opt => opt.trim());
          const correctAnswer = answerLine.replace("Answer:", "").trim();

          if (!options.includes(correctAnswer)) {
            return res.status(400).json({ message: `Correct answer "${correctAnswer}" must be one of the 4 options.` });
          }

          parsedQuestions.push({ question, options, correctAnswer });
          i += 3;
          continue;
        }

        return res.status(400).json({ message: `Invalid format on line: "${line}"` });
      }

      test.categories[categoryIndex].questions = parsedQuestions;
    }

    await test.save();
    res.status(200).json({ 
      message: "Category updated successfully", 
      test: test 
    });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Add a new category to an existing test
exports.addCategory = async (req, res) => {
  const { testId } = req.params;
  const { categoryName, questionsText } = req.body;

  if (!testId || !categoryName) {
    return res.status(400).json({ message: "Test ID and category name are required" });
  }

  const trimmedCategoryName = categoryName.trim();

  if (!validCategories.map(c => c.toLowerCase()).includes(trimmedCategoryName.toLowerCase())) {
    return res.status(400).json({ message: `Invalid category. Allowed categories: ${validCategories.join(", ")}` });
  }

  try {
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    // Check if category already exists
    const existingCategory = test.categories.find(
      cat => cat.categoryName.toLowerCase() === trimmedCategoryName.toLowerCase()
    );
    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists in this test" });
    }

    const newCategory = { categoryName: trimmedCategoryName, questions: [] };

    // Parse questions if provided
    if (questionsText) {
      // ... (same parsing logic as above)
      const parsedQuestions = [];
      const lines = questionsText.split('\n').map(l => l.trim()).filter(Boolean);
      let i = 0;

      while (i < lines.length) {
        const line = lines[i];
        const inlineMatch = line.match(/^(.*?)\s*\((.*?)\)\s*\[(.*?)\]$/);
        if (inlineMatch) {
          const question = inlineMatch[1].trim();
          const options = inlineMatch[2].split(',').map(o => o.trim());
          const correctAnswer = inlineMatch[3].trim();

          if (options.length !== 4) {
            return res.status(400).json({ message: `Question "${question}" must have exactly 4 options.` });
          }
          if (!options.includes(correctAnswer)) {
            return res.status(400).json({ message: `Correct answer "${correctAnswer}" must be one of the 4 options.` });
          }

          parsedQuestions.push({ question, options, correctAnswer });
          i++;
          continue;
        }

        if (line.startsWith("Question:")) {
          const question = line.replace("Question:", "").trim();
          const optionsLine = lines[i + 1];
          const answerLine = lines[i + 2];

          if (!optionsLine || !answerLine || !answerLine.startsWith("Answer:")) {
            return res.status(400).json({ message: `Invalid format near question: "${question}"` });
          }

          const optMatch = optionsLine.match(/A\)\s*(.*?)\s*B\)\s*(.*?)\s*C\)\s*(.*?)\s*D\)\s*(.*)/);
          if (!optMatch) {
            return res.status(400).json({ message: `Invalid options format for question: "${question}"` });
          }

          const options = optMatch.slice(1, 5).map(opt => opt.trim());
          const correctAnswer = answerLine.replace("Answer:", "").trim();

          if (!options.includes(correctAnswer)) {
            return res.status(400).json({ message: `Correct answer "${correctAnswer}" must be one of the 4 options.` });
          }

          parsedQuestions.push({ question, options, correctAnswer });
          i += 3;
          continue;
        }

        return res.status(400).json({ message: `Invalid format on line: "${line}"` });
      }

      newCategory.questions = parsedQuestions;
    }

    test.categories.push(newCategory);
    await test.save();

    res.status(201).json({ 
      message: "Category added successfully", 
      test: test,
      addedCategory: newCategory
    });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Delete a category from a test
exports.deleteCategory = async (req, res) => {
  const { testId, categoryId } = req.params;

  if (!testId || !categoryId) {
    return res.status(400).json({ message: "Test ID and Category ID are required" });
  }

  try {
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    const categoryIndex = test.categories.findIndex(cat => cat._id.toString() === categoryId);
    if (categoryIndex === -1) {
      return res.status(404).json({ message: "Category not found" });
    }

    test.categories.splice(categoryIndex, 1);
    await test.save();

    res.status(200).json({ 
      message: "Category deleted successfully", 
      test: test 
    });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Update test status (live/offline)
exports.updateTestStatus = async (req, res) => {
  const { testId } = req.params;
  const { status } = req.body;

  if (!testId) {
    return res.status(400).json({ message: "Test ID is required" });
  }

  if (!status || !['live', 'offline'].includes(status)) {
    return res.status(400).json({ message: "Status must be either 'live' or 'offline'" });
  }

  try {
    const updatedTest = await Test.findByIdAndUpdate(
      testId,
      { 
        status,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!updatedTest) {
      return res.status(404).json({ message: "Test not found" });
    }

    res.status(200).json({ 
      message: `Test status updated to '${status}' successfully`, 
      test: updatedTest 
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get all live tests (for students)
exports.getLiveTests = async (req, res) => {
  try {
    const liveTests = await Test.find({ status: 'live' }, "testName categories.categoryName categories.questions status createdAt updatedAt");
    res.status(200).json({
      message: "Live tests retrieved successfully",
      tests: liveTests,
      count: liveTests.length
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching live tests", error });
  }
};

// Get all tests with status (for admin management)
exports.getAllTestsWithStatus = async (req, res) => {
  try {
    const tests = await Test.find({}, "testName categories.categoryName categories.questions status createdAt updatedAt");
    res.status(200).json({
      message: "All tests retrieved successfully",
      tests: tests,
      count: tests.length
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching tests", error });
  }
};

// Update a specific question within a category
exports.updateQuestion = async (req, res) => {
  const { testId, categoryId, questionId } = req.params;
  const { question, options, correctAnswer } = req.body;

  if (!testId || !categoryId || !questionId) {
    return res.status(400).json({ message: "Test ID, Category ID, and Question ID are required" });
  }

  try {
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    const category = test.categories.find(cat => cat._id.toString() === categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const questionIndex = category.questions.findIndex(q => q._id.toString() === questionId);
    if (questionIndex === -1) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Update question fields if provided
    if (question) category.questions[questionIndex].question = question.trim();
    if (options && Array.isArray(options)) {
      if (options.length !== 4) {
        return res.status(400).json({ message: "Must have exactly 4 options" });
      }
      category.questions[questionIndex].options = options.map(opt => opt.trim());
    }
    if (correctAnswer) {
      const currentOptions = category.questions[questionIndex].options;
      if (!currentOptions.includes(correctAnswer.trim())) {
        return res.status(400).json({ message: "Correct answer must be one of the 4 options" });
      }
      category.questions[questionIndex].correctAnswer = correctAnswer.trim();
    }

    await test.save();

    res.status(200).json({ 
      message: "Question updated successfully", 
      test: test,
      updatedQuestion: category.questions[questionIndex]
    });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Delete a specific question from a category
exports.deleteQuestion = async (req, res) => {
  const { testId, categoryId, questionId } = req.params;

  if (!testId || !categoryId || !questionId) {
    return res.status(400).json({ message: "Test ID, Category ID, and Question ID are required" });
  }

  try {
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    const category = test.categories.find(cat => cat._id.toString() === categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const questionIndex = category.questions.findIndex(q => q._id.toString() === questionId);
    if (questionIndex === -1) {
      return res.status(404).json({ message: "Question not found" });
    }

    category.questions.splice(questionIndex, 1);
    await test.save();

    res.status(200).json({ 
      message: "Question deleted successfully", 
      test: test 
    });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Delete an entire test
exports.deleteTest = async (req, res) => {
  const { testId } = req.params;

  if (!testId) {
    return res.status(400).json({ message: "Test ID is required" });
  }

  try {
    const deletedTest = await Test.findByIdAndDelete(testId);
    if (!deletedTest) {
      return res.status(404).json({ message: "Test not found" });
    }

    res.status(200).json({ 
      message: "Test deleted successfully", 
      deletedTest: deletedTest 
    });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Add a single question to an existing category
exports.addQuestion = async (req, res) => {
  const { testId, categoryId } = req.params;
  const { question, options, correctAnswer } = req.body;

  if (!testId || !categoryId) {
    return res.status(400).json({ message: "Test ID and Category ID are required" });
  }

  if (!question || !options || !correctAnswer) {
    return res.status(400).json({ message: "Question, options, and correct answer are required" });
  }

  if (!Array.isArray(options) || options.length !== 4) {
    return res.status(400).json({ message: "Must provide exactly 4 options" });
  }

  const trimmedOptions = options.map(opt => opt.trim());
  const trimmedCorrectAnswer = correctAnswer.trim();

  if (!trimmedOptions.includes(trimmedCorrectAnswer)) {
    return res.status(400).json({ message: "Correct answer must be one of the 4 options" });
  }

  try {
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    const category = test.categories.find(cat => cat._id.toString() === categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const newQuestion = {
      question: question.trim(),
      options: trimmedOptions,
      correctAnswer: trimmedCorrectAnswer
    };

    category.questions.push(newQuestion);
    await test.save();

    res.status(201).json({ 
      message: "Question added successfully", 
      test: test,
      addedQuestion: newQuestion
    });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
