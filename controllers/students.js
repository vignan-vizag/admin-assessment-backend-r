const mongoose = require('mongoose');
const { getStudentModelByYear } = require('../models/Student');

const getStudentById = async (req, res, next) => {
    const { studentId, year } = req.params;

    if (!studentId || !year) {
        return res.status(400).json({ message: 'StudentId and year are required' });
    }

    try {
        // Get the student model for the specific year
        const Student = getStudentModelByYear(year);

        // Ensure the studentId is in a valid MongoDB ObjectId format
        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({ message: 'Invalid studentId format' });
        }

        // Log to debug the query and model
        console.log(`Looking for student with _id: ${studentId} and year: ${year}`);

        // Fetch the student by matching both _id and year
        const student = await Student.findOne({ _id: studentId }).select('-password');

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Return the student details
        res.json(student);
    } catch (error) {
        console.error('Error fetching student:', error);
        res.status(500).json({ message: 'Failed to fetch student', error: error.message });
        next(error);
    }
};

// Fetch all students or by specific year
const getAllStudents = async (req, res, next) => {
    const year = parseInt(req.query.year);

    try {
        if (year) {
            // Fetch students from a specific year
            const Student = getStudentModelByYear(year);
            const students = await Student.find().select('-password');
            return res.json(students);
        }

        // Fetch students from all year_* collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        const yearCollections = collections
            .filter(col => /^\d{4}_students$/.test(col.name))
            .map(col => col.name);

        const allStudents = [];

        for (const collectionName of yearCollections) {
            const yearFromCollection = parseInt(collectionName.split('_')[0]);
            const StudentModel = getStudentModelByYear(yearFromCollection);
            const students = await StudentModel.find().select('-password');
            allStudents.push(...students);
        }

        res.json(allStudents);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ message: 'Failed to fetch students', error: error.message });
        next(error);
    }
};

const assignTestsToStudent = async (req, res, next) => {
    const { testId } = req.params;
    const { studentIds, year } = req.body; // year-based collection and student _ids to update

    if (!testId || !Array.isArray(studentIds) || !year) {
        return res.status(400).json({ message: 'testId, studentIds array, and year are required' });
    }

    try {
        const Student = getStudentModelByYear(year);

        const updateResult = await Student.updateMany(
            { _id: { $in: studentIds }, 'assignedTests.testId': { $ne: testId } },
            {
                $push: {
                    assignedTests: {
                        testId,
                        status: 'pending',
                        marks: {},
                        submittedAt: null
                    }
                }
            }
        );

        res.json({
            message: `Test assigned to ${updateResult.modifiedCount} students`,
            modifiedCount: updateResult.modifiedCount
        });
    } catch (error) {
        console.error('Error assigning test:', error);
        res.status(500).json({ message: 'Failed to assign test', error: error.message });
        next(error);
    }
};

const submitTestMarks = async (req, res, next) => {
    const { studentId, testId, year, marks } = req.body;

    if (!studentId || !testId || !year || typeof marks !== 'object' || Array.isArray(marks)) {
        return res.status(400).json({ message: 'studentId, testId, year, and a valid marks object are required' });
    }

    try {
        const Student = getStudentModelByYear(year);

        // Always overwrite marks and mark test as completed
        const result = await Student.updateOne(
            { _id: studentId, 'assignedTests.testId': testId },
            {
                $set: {
                    'assignedTests.$.marks': marks,
                    'assignedTests.$.status': 'completed',
                    'assignedTests.$.submittedAt': new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Assigned test not found for the student' });
        }

        res.json({ message: 'Test marks submitted and overwritten successfully', modifiedCount: result.modifiedCount });
    } catch (error) {
        console.error('Error submitting test marks:', error);
        res.status(500).json({ message: 'Failed to submit test marks', error: error.message });
        next(error);
    }
};


const getStudentRankByTest = async (req, res, next) => {
    const { testId, studentId, year } = req.params;

    if (!testId || !studentId || !year) {
        return res.status(400).json({ message: 'TestId, studentId, and year are required' });
    }

    try {
        const Student = getStudentModelByYear(year);

        const students = await Student.find({ 'assignedTests.testId': testId, 'assignedTests.status': 'completed' }).select('assignedTests.name assignedTests.marks');

        if (!students || students.length === 0) {
            return res.status(404).json({ message: 'No students have completed the test yet' });
        }

        const studentsWithRank = students.map(student => {
            const assignedTest = student.assignedTests.find(test => test.testId.toString() === testId);
            const marks = assignedTest.marks;

            const totalMarks = Object.values(marks).reduce((sum, categoryMarks) => sum + categoryMarks, 0);

            const totalQuestions = Object.keys(marks).length;
            const percentage = (totalMarks / totalQuestions) * 100;

            return {
                studentId: student._id,
                name: student.name,
                totalMarks,
                totalQuestions,
                percentage
            };
        });

        studentsWithRank.sort((a, b) => b.percentage - a.percentage);

        const studentRank = studentsWithRank.findIndex(student => student.studentId.toString() === studentId) + 1;

        if (studentRank === 0) {
            return res.status(404).json({ message: 'Requested student has not completed the test' });
        }

        const studentDetails = studentsWithRank.find(student => student.studentId.toString() === studentId);
        res.json({
            rank: studentRank,
            percentage: studentDetails.percentage,
            totalMarks: studentDetails.totalMarks,
            totalQuestions: studentDetails.totalQuestions
        });

    } catch (error) {
        console.error('Error fetching student rank:', error);
        res.status(500).json({ message: 'Failed to fetch student rank', error: error.message });
        next(error);
    }
};


module.exports = { getStudentById, getAllStudents, assignTestsToStudent, submitTestMarks, getStudentRankByTest };
