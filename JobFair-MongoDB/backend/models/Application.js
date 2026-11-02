const mongoose = require("mongoose");
const applicationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  status: { type: String, enum: ["Applied", "Under Review", "Shortlisted", "Interview Scheduled", "Selected", "Rejected"], default: "Applied" },
  appliedAt: { type: Date, default: Date.now },
  notes: { type: String, default: "" }
}, { timestamps: true });
applicationSchema.index({ student: 1, job: 1 }, { unique: true });
module.exports = mongoose.model("Application", applicationSchema);
