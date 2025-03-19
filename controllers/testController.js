const { Test } = require('../models/testModel');

const validCategories = ["Coding", "Math", "Behavioral", "Aptitude"];

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

  // Parse questionsText (textarea format)
  const parsedQuestions = [];
  const blocks = questionsText.split('\n\n').filter(block => block.trim());

  for (const block of blocks) {
    const lines = block.split('\n').filter(line => line.trim());
    const questionLine = lines[0];

    if (!questionLine) {
      return res.status(400).json({ message: "Each block must start with a question line." });
    }

    const options = [];
    let correctAnswer = null;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('(') && line.endsWith(')')) {
        options.push(line.slice(1, -1).trim());
      } else if (line.startsWith('[') && line.endsWith(']')) {
        correctAnswer = line.slice(1, -1).trim();
      }
    }

    if (options.length !== 4) {
      return res.status(400).json({ message: `Question "${questionLine}" must have exactly 4 options.` });
    }

    if (!correctAnswer) {
      return res.status(400).json({ message: `Question "${questionLine}" must have a correct answer marked as [answer].` });
    }

    if (!options.includes(correctAnswer)) {
      return res.status(400).json({ message: `Correct answer "${correctAnswer}" must be one of the 4 options for question "${questionLine}".` });
    }

    parsedQuestions.push({
      question: questionLine.trim(),
      options,
      correctAnswer,
    });
  }

  try {
    let test = await Test.findOne({ testName: trimmedTestName });

    if (!test) {
      test = await Test.create({
        testName: trimmedTestName,
        categories: [{ categoryName: trimmedCategoryName, questions: parsedQuestions }]
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

// Student API: Get 20 Random Questions from a category inside a test
exports.getRandomQuestions = async (req, res) => {
  const { categoryName, testName } = req.params;

  const trimmedTestName = testName.trim();
  const trimmedCategoryName = categoryName.trim();

  if (!validCategories.map(c => c.toLowerCase()).includes(trimmedCategoryName.toLowerCase())) {
    return res.status(400).json({ message: `Invalid category. Allowed categories: ${validCategories.join(", ")}` });
  }

  try {
    const test = await Test.findOne({ testName: trimmedTestName });
    if (!test) {
      return res.status(404).json({ message: "Test not found." });
    }

    const category = test.categories.find(
      cat => cat.categoryName.toLowerCase() === trimmedCategoryName.toLowerCase()
    );
    if (!category || !category.questions.length) {
      return res.status(404).json({ message: "Category not found or has no questions." });
    }

    // Shuffle & select
    const shuffled = [...category.questions].sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, 20);

    res.json({ questions: selectedQuestions });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
exports.getAllTests = async (req, res) => {
  try {
    const tests = await Test.find({}, "testName categoryName"); // Only return testName & categoryName
    res.status(200).json(tests);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tests", error });
  }
};