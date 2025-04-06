const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const studentSchema = new mongoose.Schema({
  rollno:   { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name:     { type: String, required: true },
  year:     { type: Number, required: true },
  branch:   { type: String, required: true },
  section:  { type: String, required: true },
  semester: { type: Number, required: true },
  assignedTests: [{
    testId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
    status:      { type: String, enum: ['pending', 'completed'], default: 'pending' },
    marks:       { type: Map, of: Number, default: {}, required: function () { return this.status === 'completed'; } },
    submittedAt: { type: Date, required: function () { return this.status === 'completed'; } }
  }]
}, { timestamps: true });

// Password Hashing
studentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    return next(error);
  }
});

// Compare Password
studentSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

// Dynamic model creation: only year-based collections
const getStudentModelByYear = (year) => {
  const collectionName = `${year}_students`;
  return mongoose.models[collectionName] || mongoose.model(collectionName, studentSchema, collectionName);
};

module.exports = { getStudentModelByYear };
