const mongoose = require("mongoose");
const companySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  industry: { type: String, default: "Technology" },
  location: { type: String, default: "" },
  website: { type: String, default: "" },
  contactEmail: { type: String, default: "" },
  status: { type: String, enum: ["Active", "Pending", "Inactive"], default: "Active" }
}, { timestamps: true });
module.exports = mongoose.model("Company", companySchema);
