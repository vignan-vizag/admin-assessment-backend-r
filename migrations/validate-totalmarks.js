const mongoose = require('mongoose');
const { getStudentModelByYear } = require('../models/Student');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for validation');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

// Validation function to check totalmarks accuracy
const validateTotalMarks = async () => {
  try {
    // Get all collections in the database
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    // Filter for student collections (ending with '_students')
    const studentCollections = collections
      .filter(col => col.name.endsWith('_students'))
      .map(col => col.name);

    console.log(`Validating student collections: ${studentCollections.join(', ')}\n`);

    let totalValidated = 0;
    let totalErrors = 0;

    for (const collectionName of studentCollections) {
      const yearMatch = collectionName.match(/^(\d{4})_students$/);
      if (!yearMatch) continue;
      
      const year = parseInt(yearMatch[1]);
      const Student = getStudentModelByYear(year);
      
      console.log(`Validating collection: ${collectionName}`);
      
      // Get all students with their totalmarks and assignedTests
      const students = await Student.find({}).select('rollno name totalmarks assignedTests');
      
      console.log(`Found ${students.length} students in ${collectionName}`);
      
      for (const student of students) {
        let calculatedTotal = 0;
        
        // Calculate expected total from completed tests
        if (student.assignedTests && Array.isArray(student.assignedTests)) {
          student.assignedTests.forEach(assignedTest => {
            if (assignedTest.status === 'completed') {
              // Handle both marks (Map) and score (Number) fields
              if (assignedTest.marks) {
                if (assignedTest.marks instanceof Map) {
                  // If marks is a Map, sum all values
                  for (const score of assignedTest.marks.values()) {
                    calculatedTotal += (score || 0);
                  }
                } else if (typeof assignedTest.marks === 'object') {
                  // If marks is a plain object, sum all values
                  Object.values(assignedTest.marks).forEach(score => {
                    calculatedTotal += (score || 0);
                  });
                }
              } else if (assignedTest.score && typeof assignedTest.score === 'number') {
                // If score is a direct number, add it
                calculatedTotal += assignedTest.score;
              }
            }
          });
        }
        
        const storedTotal = student.totalmarks || 0;
        
        if (calculatedTotal !== storedTotal) {
          console.log(`❌ MISMATCH - Student ${student.rollno}: stored=${storedTotal}, calculated=${calculatedTotal}`);
          totalErrors++;
        } else if (calculatedTotal > 0) {
          console.log(`✅ CORRECT - Student ${student.rollno}: totalmarks=${storedTotal}`);
        }
        
        totalValidated++;
      }
      
      console.log(`Completed validation for ${collectionName}\n`);
    }
    
    console.log(`\n=== VALIDATION SUMMARY ===`);
    console.log(`Total students validated: ${totalValidated}`);
    console.log(`Total errors found: ${totalErrors}`);
    
    if (totalErrors === 0) {
      console.log(`✅ All totalmarks fields are correct!`);
    } else {
      console.log(`❌ Found ${totalErrors} mismatches that need attention`);
    }
    
  } catch (error) {
    console.error('Validation failed:', error);
    throw error;
  }
};

// Run validation
const runValidation = async () => {
  try {
    await connectDB();
    await validateTotalMarks();
    console.log('\nValidation completed');
  } catch (error) {
    console.error('Validation error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Check if this script is being run directly
if (require.main === module) {
  runValidation();
}

module.exports = { validateTotalMarks };
