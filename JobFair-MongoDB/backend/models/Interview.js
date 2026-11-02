const mongoose = require("mongoose");
const interviewSchema = new mongoose.Schema({
  application: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true },
  round: { type: String, default: "Technical Round" },
  scheduledAt: { type: Date, required: true },
  mode: { type: String, enum: ["Online", "On-site", "Phone"], default: "Online" },
  venue: { type: String, default: "" },
  interviewer: { type: String, default: "" },
  status: { type: String, enum: ["Scheduled", "Completed", "Cancelled"], default: "Scheduled" },
  feedback: { type: String, default: "" }
}, { timestamps: true });
module.exports = mongoose.model("Interview", interviewSchema);
