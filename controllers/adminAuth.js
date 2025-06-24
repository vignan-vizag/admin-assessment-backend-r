const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { getStudentModelByYear } = require('../models/Student');

// Admin login
const adminLogin = async (req, res, next) => {
  console.log('Admin Login Started');
  const { username, password } = req.body;

  try {
    // Find admin by username
    const admin = await Admin.findOne({ username });
    if (!admin) {
      console.log('Admin not found');
      return res.status(404).json({ message: 'Invalid credentials' });
    }

    // Check password
    const passwordMatch = await admin.comparePassword(password);
    console.log('Password Match Result:', passwordMatch);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        adminId: admin._id, 
        username: admin.username, 
        role: admin.role,
        type: 'admin'
      }, 
      process.env.SECRET_KEY, 
      { expiresIn: '8h' } // Longer session for admin
    );

    res.json({ 
      token, 
      admin: {
        id: admin._id,
        username: admin.username,
        role: admin.role
      },
      message: 'Admin login successful'
    });
  } catch (error) {
    console.error('Error during admin login:', error);
    next(error);
  }
};

// Create default admin accounts (for initial setup)
const createDefaultAdmins = async () => {
  try {
    const adminCount = await Admin.countDocuments();
    
    if (adminCount === 0) {
      console.log('Creating default admin accounts...');
      
      const defaultAdmins = [
        {
          username: 'principal-viit',
          password: 'principal-viit',
          role: 'principal'
        },
        {
          username: 'csehod-viit',
          password: 'csehod-viit',
          role: 'hod'
        }
      ];

      for (const adminData of defaultAdmins) {
        const admin = new Admin(adminData);
        await admin.save();
        console.log(`Created admin: ${adminData.username}`);
      }
      
      console.log('Default admin accounts created successfully!');
    }
  } catch (error) {
    console.error('Error creating default admin accounts:', error);
  }
};

// Get admin profile
const getAdminProfile = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin._id).select('-password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    res.json({ admin });
  } catch (error) {
    console.error('Error getting admin profile:', error);
    next(error);
  }
};

// Get leaderboard - top 25 students by total scores across all tests
const getLeaderboard = async (req, res, next) => {
  try {
    const { year } = req.params;
    
    if (!year) {
      return res.status(400).json({ message: 'Year parameter is required' });
    }

    const Student = getStudentModelByYear(year);
    
    // Get all students who have completed at least one test
    const students = await Student.find({
      'assignedTests.status': 'completed'
    }).select('name rollno branch section assignedTests totalmarks');

    if (!students || students.length === 0) {
      return res.status(404).json({ message: 'No students found with completed tests for this year' });
    }

    // Calculate detailed scores for each student (for category breakdown)
    const studentScores = students.map(student => {
      let totalTests = 0;
      let categoryTotals = { coding: 0, aptitude: 0, reasoning: 0, verbal: 0 };

      student.assignedTests.forEach(assignedTest => {
        if (assignedTest.status === 'completed' && assignedTest.marks) {
          // Sum up scores from all categories in this test for breakdown
          const marksObj = assignedTest.marks.toObject();
          
          // Update category totals
          Object.keys(marksObj).forEach(category => {
            const categoryScore = marksObj[category] || 0;
            
            // Update category totals (normalize case)
            const categoryLower = category.toLowerCase();
            if (categoryTotals.hasOwnProperty(categoryLower)) {
              categoryTotals[categoryLower] += categoryScore;
            }
          });
          
          totalTests += 1;
        }
      });

      // Use the totalmarks field from database instead of calculating
      const totalScore = student.totalmarks || 0;

      return {
        studentId: student._id,
        name: student.name,
        rollno: student.rollno,
        branch: student.branch,
        section: student.section,
        totalScore: totalScore,
        totalTests: totalTests,
        averageScore: totalTests > 0 ? (totalScore / totalTests).toFixed(2) : 0,
        categoryBreakdown: categoryTotals
      };
    });

    // Sort by total score (highest first) and take top 25
    const leaderboard = studentScores
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 25)
      .map((student, index) => ({
        rank: index + 1,
        ...student
      }));

    res.json({
      year: year,
      leaderboard: leaderboard,
      totalStudentsEvaluated: studentScores.length,
      categories: ['Coding', 'Aptitude', 'Reasoning', 'Verbal'],
      message: `Top ${leaderboard.length} students leaderboard for year ${year}`
    });

  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ message: 'Failed to get leaderboard', error: error.message });
    next(error);
  }
};

// Validate admin token and get admin info
const validateAdminToken = async (req, res, next) => {
  try {
    // If we reach here, the authenticateAdmin middleware has passed
    // This means the token is valid and req.admin is populated
    res.json({
      valid: true,
      admin: {
        id: req.admin._id,
        username: req.admin.username,
        role: req.admin.role
      },
      message: 'Admin token is valid'
    });
  } catch (error) {
    console.error('Error validating admin token:', error);
    res.status(500).json({ 
      valid: false,
      message: 'Admin token validation failed',
      error: error.message 
    });
  }
};

module.exports = { 
  adminLogin, 
  createDefaultAdmins,
  getAdminProfile,
  getLeaderboard,
  validateAdminToken
};
