const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
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

      // Use the totalmarks field from database, but if it's 0 or not set, calculate from categoryTotals
      let totalScore = student.totalmarks || 0;
      
      // If totalmarks is 0 but student has completed tests, calculate from marks
      if (totalScore === 0 && totalTests > 0) {
        totalScore = Object.values(categoryTotals).reduce((sum, score) => sum + score, 0);
      }

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

// Get overall leaderboard - top 25 students for a specific graduation year with filters
const getOverallLeaderboard = async (req, res, next) => {
  try {
    const { year } = req.params;
    const { branch, section, limit } = req.query;
    
    if (!year) {
      return res.status(400).json({ message: 'Graduation year parameter is required' });
    }

    // Parse limit with default of 25
    const resultLimit = limit ? parseInt(limit) : 25;
    if (resultLimit <= 0 || resultLimit > 100) {
      return res.status(400).json({ message: 'Limit must be between 1 and 100' });
    }

    // Use the specified graduation year only
    const Student = getStudentModelByYear(year);

    // Build query conditions for filtering
    let queryConditions = {
      'assignedTests.status': 'completed'
    };

    // Add branch filter if specified
    if (branch) {
      queryConditions.branch = branch;
    }

    // Add section filter if specified (only works with branch)
    if (section) {
      if (!branch) {
        return res.status(400).json({ message: 'Branch filter is required when using section filter' });
      }
      queryConditions.section = section;
    }

    // Get filtered students who have completed at least one test
    const students = await Student.find(queryConditions)
      .select('name rollno branch section assignedTests totalmarks year');

    if (!students || students.length === 0) {
      return res.status(200).json({ 
        graduationYear: year,
        overallLeaderboard: [],
        appliedFilters: {
          graduationYear: year,
          branch: branch || 'All branches',
          section: section || 'All sections',
          limit: resultLimit
        },
        totalStudentsEvaluated: 0,
        totalStudentsInYear: 0,
        categories: ['Coding', 'Aptitude', 'Reasoning', 'Verbal'],
        message: `No students found with completed tests for year ${year}${branch ? ` in branch ${branch}` : ''}${section ? ` section ${section}` : ''}`
      });
    }

    // Process students to get their scores and category breakdown
    const studentScores = students.map(student => {
      let totalTests = 0;
      let categoryTotals = { coding: 0, aptitude: 0, reasoning: 0, verbal: 0 };

      student.assignedTests.forEach(assignedTest => {
        if (assignedTest.status === 'completed' && assignedTest.marks) {
          const marksObj = assignedTest.marks.toObject();
          
          // Update category totals
          Object.keys(marksObj).forEach(category => {
            const categoryScore = marksObj[category] || 0;
            const categoryLower = category.toLowerCase();
            if (categoryTotals.hasOwnProperty(categoryLower)) {
              categoryTotals[categoryLower] += categoryScore;
            }
          });
          
          totalTests += 1;
        }
      });

      // Use the totalmarks field from database, but if it's 0 or not set, calculate from categoryTotals
      let totalScore = student.totalmarks || 0;
      
      // If totalmarks is 0 but student has completed tests, calculate from marks
      if (totalScore === 0 && totalTests > 0) {
        totalScore = Object.values(categoryTotals).reduce((sum, score) => sum + score, 0);
      }

      return {
        studentId: student._id,
        name: student.name,
        rollno: student.rollno,
        branch: student.branch,
        section: student.section,
        year: parseInt(year),
        totalScore: totalScore,
        totalTests: totalTests,
        averageScore: totalTests > 0 ? (totalScore / totalTests).toFixed(2) : 0,
        categoryBreakdown: categoryTotals
      };
    });

    // Only include students with scores > 0
    const studentsWithScores = studentScores.filter(student => student.totalScore > 0);

    if (studentsWithScores.length === 0) {
      return res.status(200).json({ 
        graduationYear: year,
        overallLeaderboard: [],
        appliedFilters: {
          graduationYear: year,
          branch: branch || 'All branches',
          section: section || 'All sections',
          limit: resultLimit
        },
        totalStudentsEvaluated: 0,
        totalStudentsInYear: students.length,
        categories: ['Coding', 'Aptitude', 'Reasoning', 'Verbal'],
        message: `No students found with scores > 0 for year ${year}${branch ? ` in branch ${branch}` : ''}${section ? ` section ${section}` : ''}`
      });
    }

    // Sort by total score (highest first) and take top N (based on limit)
    const overallLeaderboard = studentsWithScores
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, resultLimit)
      .map((student, index) => ({
        rank: index + 1,
        ...student
      }));

    // Build filter summary
    const appliedFilters = {
      graduationYear: year,
      branch: branch || 'All branches',
      section: section || 'All sections',
      limit: resultLimit
    };

    res.json({
      graduationYear: year,
      overallLeaderboard: overallLeaderboard,
      appliedFilters: appliedFilters,
      totalStudentsEvaluated: studentsWithScores.length,
      totalStudentsInYear: students.length,
      categories: ['Coding', 'Aptitude', 'Reasoning', 'Verbal'],
      message: `Top ${overallLeaderboard.length} students overall leaderboard for graduation year ${year}${branch ? ` (Branch: ${branch}${section ? `, Section: ${section}` : ''})` : ''}`
    });

  } catch (error) {
    console.error('Error getting overall leaderboard:', error);
    res.status(500).json({ message: 'Failed to get overall leaderboard', error: error.message });
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
  getOverallLeaderboard,
  validateAdminToken
};
