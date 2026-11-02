const mongoose = require("mongoose");
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  regNo: { type: String, required: true, trim: true, unique: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  department: { type: String, default: "Computer Science" },
  graduationYear: { type: Number, default: 2027 },
  cgpa: { type: Number, min: 0, max: 10, default: 8 },
  skills: [{ type: String }],
  resumeUrl: { type: String, default: "" }
}, { timestamps: true });
module.exports = mongoose.model("Student", studentSchema);
