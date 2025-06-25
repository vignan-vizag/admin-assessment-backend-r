const express = require("express");
const connectDB = require("./db");
const cors = require("cors");
require("dotenv").config();

// Import Routes
const authRoutes = require('./routes/auth');
const adminAuthRoutes = require('./routes/adminAuth');
const examRoutes = require("./routes/examRoutes");
const questionRoutes = require("./routes/questionRoutes");
const studentRoutes = require('./routes/student');
// const studentRoutes = require("./routes/studentRoutes");
const testRoutes = require('./routes/testRoutes');

// Import admin controller for creating default accounts
const { createDefaultAdmins } = require('./controllers/adminAuth');

// Import exam scheduler
const { initializeExamScheduler } = require('./services/examScheduler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminAuthRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/students", studentRoutes);
app.use('/api/tests', testRoutes);


app.get("/", (req, res) => {
  res.json({ message: "Server is running" });
});

// Start Server
const PORT = process.env.PORT || 3000;
connectDB().then(() => {
  // Create default admin accounts after DB connection
  createDefaultAdmins();
  
  // Initialize the exam scheduler
  initializeExamScheduler();
  
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
