const jwt = require('jsonwebtoken');
const { getStudentModelByYear } = require('../models/Student');

// Register a new student
const register = async (req, res, next) => {
  const { rollno, email, password, name, year, branch, section, semester } = req.body;

  console.log('Register Request:', req.body);
  try {
    const Student = getStudentModelByYear(year);

    const existingStudent = await Student.findOne({ $or: [{ rollno }, { email }] });
    if (existingStudent) {
      return res.status(400).json({ message: 'Student with this roll number or email already exists' });
    }

    const student = new Student({
      rollno,
      email,
      password,
      name,
      year,
      branch,
      section,
      semester,
      assignedTests: []
    });

    await student.save();
    console.log("Student saved:", student);

    res.json({ message: 'Registration successful' });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ message: 'Registration failed, please try again.', error: error.message });
    next(error);
  }
};

// Login with an existing student
const login = async (req, res, next) => {
  console.log('Login Started');
  const { rollno, password, year } = req.body;

  if (!year) {
    return res.status(400).json({ message: 'Year is required to login' });
  }

  try {
    const Student = getStudentModelByYear(year);

    const student = await Student.findOne({ rollno });
    if (!student) {
      console.log('Student not found');
      return res.status(404).json({ message: 'Student not found' });
    }

    const passwordMatch = await student.comparePassword(password);
    console.log('Password Match Result:', passwordMatch);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    const token = jwt.sign({ userId: student._id, year: student.year }, process.env.SECRET_KEY, {
      expiresIn: '1 hour'
    });

    res.json({ token, student });
  } catch (error) {
    console.error('Error during login:', error);
    next(error);
  }
};

module.exports = { register, login };
