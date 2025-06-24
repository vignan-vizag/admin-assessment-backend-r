const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected for migration');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

// Migration function to add totalmarks field to all student collections
const migrateTotalMarks = async () => {
  try {
    // Get all collections in the database
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    // Filter for student collections (ending with '_students')
    const studentCollections = collections
      .filter(col => col.name.endsWith('_students'))
      .map(col => col.name);

    if (studentCollections.length === 0) {
      console.log('No student collections found');
      return;
    }

    console.log(`Found student collections: ${studentCollections.join(', ')}`);

    for (const collectionName of studentCollections) {
      const collection = mongoose.connection.db.collection(collectionName);
      
      console.log(`\nProcessing collection: ${collectionName}`);
      
      // Step 1: Add totalmarks field with default value 0 to all students who don't have it
      const addFieldResult = await collection.updateMany(
        { totalmarks: { $exists: false } },
        { $set: { totalmarks: 0 } }
      );
      
      console.log(`Added totalmarks field to ${addFieldResult.modifiedCount} students in ${collectionName}`);
      
      // Step 2: Calculate and update totalmarks for students with completed tests
      const studentsWithCompletedTests = await collection.find({
        'assignedTests.status': 'completed'
      }).toArray();
      
      console.log(`Found ${studentsWithCompletedTests.length} students with completed tests in ${collectionName}`);
      
      let updatedCount = 0;
      
      for (const student of studentsWithCompletedTests) {
        let totalMarks = 0;
        
        // Calculate total marks from all completed tests
        if (student.assignedTests && Array.isArray(student.assignedTests)) {
          student.assignedTests.forEach(assignedTest => {
            if (assignedTest.status === 'completed') {
              // Handle both marks (Map) and score (Number) fields for backwards compatibility
              if (assignedTest.marks) {
                if (assignedTest.marks instanceof Map) {
                  // If marks is a Map, sum all values
                  for (const score of assignedTest.marks.values()) {
                    totalMarks += (score || 0);
                  }
                } else if (typeof assignedTest.marks === 'object') {
                  // If marks is a plain object, sum all values
                  Object.values(assignedTest.marks).forEach(score => {
                    totalMarks += (score || 0);
                  });
                }
              } else if (assignedTest.score && typeof assignedTest.score === 'number') {
                // If score is a direct number, add it
                totalMarks += assignedTest.score;
              }
            }
          });
        }
        
        // Update the student's totalmarks
        await collection.updateOne(
          { _id: student._id },
          { $set: { totalmarks: totalMarks } }
        );
        
        updatedCount++;
        
        if (totalMarks > 0) {
          console.log(`Updated student ${student.rollno}: totalmarks = ${totalMarks}`);
        }
      }
      
      console.log(`Updated totalmarks for ${updatedCount} students in ${collectionName}`);
    }
    
    console.log('\nMigration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// Run migration
const runMigration = async () => {
  try {
    await connectDB();
    await migrateTotalMarks();
    console.log('Migration finished successfully');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Check if this script is being run directly
if (require.main === module) {
  runMigration();
}

module.exports = { migrateTotalMarks };
