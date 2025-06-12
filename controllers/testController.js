const { mongoConnect } = require("../mongoConnect.js");
let yearsSuffix = "_passouts";
const { Test } = require('../models/testModel');
const { getStudentModelByYear } = require('../models/Student');


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
    const tests = await Test.find({}, "testName categories.categoryName categories.questions");
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
