const { mongoConnect } = require("../mongoConnect.js");
let yearsSuffix = "_passouts";
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

  // Parse questionsText (new format)
  const parsedQuestions = [];
  const lines = questionsText.split('\n').filter(line => line.trim());

  for (const line of lines) {
    const match = line.match(/^(.*?)\s*\((.*?)\)\s*\[(.*?)\]$/);
    if (!match) {
      return res.status(400).json({ message: `Invalid format on line: "${line}". Follow: Question (opt1, opt2, opt3, opt4) [correct]` });
    }

    const question = match[1].trim();
    const options = match[2].split(',').map(opt => opt.trim());
    const correctAnswer = match[3].trim();

    if (options.length !== 4) {
      return res.status(400).json({ message: `Question "${question}" must have exactly 4 options.` });
    }

    if (!options.includes(correctAnswer)) {
      return res.status(400).json({ message: `Correct answer "${correctAnswer}" must be one of the 4 options for question "${question}".` });
    }

    parsedQuestions.push({
      question,
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
      categoriesSumArray = ["$marks.aptitude", "$marks.reasoning", "$marks.cognitive_skills"];
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
          aptitude: "$marks.aptitude",
          reasoning: "$marks.reasoning",
          cognitive_skills: "$marks.cognitive_skills",
          totalMarks: 1,
        }
      },
      {
        $sort: {
          totalMarks: -1
        }
      }
    ];
    let marksDocs = await db.collection(collectionName)
      .aggregate(pipeline).toArray();
    let rank = 1;
    marksDocs.map((a) => {
      a.rank = rank;
      rank = rank + 1;
    });
    res.json({ studentsRanks: marksDocs });
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

    const shuffled = [...category.questions].sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, 20);

    res.json({ questions: selectedQuestions });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getAllTests = async (req, res) => {
  try {
    const tests = await Test.find({}, "testName categories.categoryName");
    res.status(200).json(tests);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tests", error });
  }
};
