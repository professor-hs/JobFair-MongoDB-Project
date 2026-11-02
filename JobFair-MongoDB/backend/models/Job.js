const mongoose = require("mongoose");
const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  department: { type: String, default: "Engineering" },
  location: { type: String, default: "Hybrid" },
  jobType: { type: String, enum: ["Full-time", "Internship", "Part-time", "Contract"], default: "Full-time" },
  salary: { type: String, default: "Not disclosed" },
  minCgpa: { type: Number, min: 0, max: 10, default: 6 },
  deadline: { type: Date },
  description: { type: String, default: "" },
  skills: [{ type: String }],
  status: { type: String, enum: ["Open", "Paused", "Closed"], default: "Open" }
}, { timestamps: true });
module.exports = mongoose.model("Job", jobSchema);
