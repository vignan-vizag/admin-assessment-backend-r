const express = require("express");
const Exam = require("../models/Exam");
const { authenticateAdmin, hodOrPrincipal } = require("../middlewares/adminAuth");
const { scheduleExamOffline, cancelExamSchedule } = require("../services/examScheduler");

const router = express.Router();

// Create a new exam (Admin only)
router.post("/create", authenticateAdmin, hodOrPrincipal, async (req, res) => {
  try {
    const { testName, categories, duration } = req.body;

    const newExam = new Exam({ testName, categories, duration });
    await newExam.save();

    res.status(201).json({ message: "Exam created successfully", newExam });
  } catch (error) {
    res.status(500).json({ error: "Error creating exam" });
  }
});

// Start/Stop Exam (Admin only)
router.post("/toggle-exam", authenticateAdmin, hodOrPrincipal, async (req, res) => {
  try {
    const { testName, status } = req.body;

    const updateData = { examLive: status };
    
    // If setting exam to live, record the timestamp
    if (status) {
      updateData.examLiveTimestamp = new Date();
    } else {
      // If setting exam to offline, clear the timestamp
      updateData.examLiveTimestamp = null;
    }

    const updatedExam = await Exam.findOneAndUpdate({ testName }, updateData, { new: true });
    
    if (!updatedExam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    // Handle scheduling based on status
    if (status) {
      // Schedule exam to go offline after 3.5 hours
      scheduleExamOffline(updatedExam._id.toString(), updatedExam.testName, updateData.examLiveTimestamp);
    } else {
      // Cancel any existing schedule for this exam
      cancelExamSchedule(updatedExam._id.toString(), updatedExam.testName);
    }

    res.json({ message: `Exam ${testName} is now ${status ? "live" : "stopped"}` });
  } catch (error) {
    console.error("Error in toggle-exam:", error);
    res.status(500).json({ error: "Failed to update exam status" });
  }
});

// Get Live Exams
router.get("/live", async (req, res) => {
  try {
    const liveExams = await Exam.find({ examLive: true }).select("testName categories duration");
    res.json({ liveExams });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch live exams" });
  }
});

// Get Live Exams with remaining time
router.get("/live-with-time", async (req, res) => {
  try {
    const liveExams = await Exam.find({ examLive: true }).select("testName categories duration examLiveTimestamp");
    
    const examsWithRemainingTime = liveExams.map(exam => {
      const now = new Date();
      const liveTime = new Date(exam.examLiveTimestamp);
      const elapsedMinutes = Math.floor((now - liveTime) / (1000 * 60));
      const remainingMinutes = Math.max(0, (3.5 * 60) - elapsedMinutes); // 3.5 hours = 210 minutes
      
      return {
        ...exam.toObject(),
        elapsedMinutes,
        remainingMinutes,
        willGoOfflineAt: new Date(liveTime.getTime() + (3.5 * 60 * 60 * 1000))
      };
    });
    
    res.json({ liveExams: examsWithRemainingTime });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch live exams with time info" });
  }
});

// Get Active Exam Timers (Admin only - for monitoring)
router.get("/active-timers", authenticateAdmin, async (req, res) => {
  try {
    const { getActiveTimersInfo } = require("../services/examScheduler");
    const timerInfo = getActiveTimersInfo();
    
    // Get detailed info about active live exams
    const liveExams = await Exam.find({ 
      examLive: true, 
      examLiveTimestamp: { $exists: true } 
    }).select("testName examLiveTimestamp");
    
    const examsWithTimeInfo = liveExams.map(exam => {
      const now = new Date();
      const liveTime = new Date(exam.examLiveTimestamp);
      const elapsedMinutes = Math.floor((now - liveTime) / (1000 * 60));
      const remainingMinutes = Math.max(0, (3.5 * 60) - elapsedMinutes); // 3.5 hours = 210 minutes
      
      return {
        _id: exam._id,
        testName: exam.testName,
        examLiveTimestamp: exam.examLiveTimestamp,
        elapsedMinutes,
        remainingMinutes,
        willGoOfflineAt: new Date(liveTime.getTime() + (3.5 * 60 * 60 * 1000))
      };
    });
    
    res.json({ 
      ...timerInfo,
      liveExams: examsWithTimeInfo 
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch active timers" });
  }
});

module.exports = router;
