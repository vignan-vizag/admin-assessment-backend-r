const cron = require('node-cron');
const Exam = require('../models/Exam');
const { Test } = require('../models/testModel');
const { getStudentModelByYear } = require('../models/Student');
const mongoose = require('mongoose');

// Store active exam timers
const activeExamTimers = new Map();

// Function to mark absent students when exam goes offline
const markAbsentStudents = async (examName) => {
  try {
    // Find the corresponding test by name
    const test = await Test.findOne({ testName: examName });
    if (!test) {
      console.log(`  - No corresponding test found for exam: ${examName}`);
      return;
    }

    // Get all student collections (all years)
    const collections = await mongoose.connection.db.listCollections().toArray();
    const yearCollections = collections
      .filter(col => /^\d{4}_students$/.test(col.name))
      .map(col => col.name);

    let totalAbsentMarked = 0;

    for (const collectionName of yearCollections) {
      const yearFromCollection = parseInt(collectionName.split('_')[0]);
      const Student = getStudentModelByYear(yearFromCollection);

      // Find students with pending status for this test
      const studentsWithPendingTest = await Student.find({
        'assignedTests': {
          $elemMatch: {
            testId: test._id,
            status: 'pending'
          }
        }
      });

      if (studentsWithPendingTest.length > 0) {
        // Mark these students as absent with -1 marks
        const result = await Student.updateMany(
          {
            'assignedTests.testId': test._id,
            'assignedTests.status': 'pending'
          },
          {
            $set: {
              'assignedTests.$.status': 'completed',
              'assignedTests.$.marks': { absent: -1 },
              'assignedTests.$.submittedAt': new Date()
            }
          }
        );

        totalAbsentMarked += result.modifiedCount;
        console.log(`  - Marked ${result.modifiedCount} students as absent in ${collectionName}`);
        
        // Log individual student details for debugging
        studentsWithPendingTest.forEach(student => {
          console.log(`    - Student ${student.rollno} (${student.name}) marked absent`);
        });
      }
    }

    if (totalAbsentMarked > 0) {
      console.log(`  - Total students marked absent for ${examName}: ${totalAbsentMarked}`);
    }
  } catch (error) {
    console.error(`  - Error marking absent students for ${examName}:`, error);
  }
};

// Function to set a specific exam offline and mark absent students
const setExamOfflineAndMarkAbsent = async (examId, examName) => {
  try {
    console.log(`[${new Date().toISOString()}] Setting exam "${examName}" to offline after 3.5 hours`);
    
    // Mark absent students first
    await markAbsentStudents(examName);
    
    // Set exam to offline and clear timestamp
    await Exam.findByIdAndUpdate(examId, {
      examLive: false,
      examLiveTimestamp: null
    });
    
    // Remove the timer from active timers
    activeExamTimers.delete(examId);
    
    console.log(`[${new Date().toISOString()}] Exam "${examName}" successfully set to offline and absent students processed`);
  } catch (error) {
    console.error(`[Exam Scheduler] Error setting exam "${examName}" offline:`, error);
  }
};

// Function to schedule an exam to go offline after 3.5 hours
const scheduleExamOffline = (examId, examName, liveTimestamp) => {
  // Clear any existing timer for this exam
  if (activeExamTimers.has(examId)) {
    clearTimeout(activeExamTimers.get(examId));
    console.log(`[Exam Scheduler] Cleared existing timer for exam: ${examName}`);
  }
  
  // Calculate delay until 3.5 hours from when exam was set live
  const now = new Date();
  const offlineTime = new Date(liveTimestamp.getTime() + (3.5 * 60 * 60 * 1000)); // 3.5 hours from live time
  const delay = offlineTime.getTime() - now.getTime();
  
  if (delay <= 0) {
    // If delay is negative or zero, set offline immediately
    console.log(`[Exam Scheduler] Exam "${examName}" should already be offline, setting offline immediately`);
    setExamOfflineAndMarkAbsent(examId, examName);
    return;
  }
  
  // Schedule the exam to go offline
  const timer = setTimeout(() => {
    setExamOfflineAndMarkAbsent(examId, examName);
  }, delay);
  
  // Store the timer reference
  activeExamTimers.set(examId, timer);
  
  const hours = Math.floor(delay / (1000 * 60 * 60));
  const minutes = Math.floor((delay % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((delay % (1000 * 60)) / 1000);
  
  console.log(`[Exam Scheduler] Exam "${examName}" scheduled to go offline in ${hours}h ${minutes}m ${seconds}s at ${offlineTime.toISOString()}`);
};

// Function to cancel a scheduled exam (when manually set offline)
const cancelExamSchedule = (examId, examName) => {
  if (activeExamTimers.has(examId)) {
    clearTimeout(activeExamTimers.get(examId));
    activeExamTimers.delete(examId);
    console.log(`[Exam Scheduler] Cancelled scheduled offline for exam: ${examName}`);
  }
};

// Function to initialize the exam scheduler
const initializeExamScheduler = async () => {
  try {
    // Check for any exams that are currently live and reschedule them
    const liveExams = await Exam.find({ 
      examLive: true, 
      examLiveTimestamp: { $exists: true } 
    });
    
    if (liveExams.length > 0) {
      console.log(`[Exam Scheduler] Found ${liveExams.length} live exam(s) on startup, rescheduling timers...`);
      
      for (const exam of liveExams) {
        scheduleExamOffline(exam._id.toString(), exam.testName, exam.examLiveTimestamp);
      }
    }
    
    console.log('[Exam Scheduler] Dynamic exam offline scheduler initialized');
    console.log('[Exam Scheduler] Each exam will be automatically scheduled when set to live');
    console.log('[Exam Scheduler] Will mark students with pending status as absent (-1 marks) when exams go offline');
  } catch (error) {
    console.error('[Exam Scheduler] Error initializing exam scheduler:', error);
  }
};

// Function to get active exam timers info (for monitoring)
const getActiveTimersInfo = () => {
  return {
    activeExamsCount: activeExamTimers.size,
    activeExamIds: Array.from(activeExamTimers.keys())
  };
};

module.exports = { 
  initializeExamScheduler, 
  scheduleExamOffline, 
  cancelExamSchedule,
  getActiveTimersInfo 
};
