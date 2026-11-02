const express = require("express");
const Company = require("../models/Company");
const Job = require("../models/Job");
const Student = require("../models/Student");
const Application = require("../models/Application");
const Interview = require("../models/Interview");
const router = express.Router();
router.get("/summary", async (req, res, next) => {
  try {
    const [companies, students, jobs, applications, shortlisted, interviews, selected, jobsByStatus, appsByStatus] = await Promise.all([
      Company.countDocuments(), Student.countDocuments(), Job.countDocuments(), Application.countDocuments(),
      Application.countDocuments({ status: "Shortlisted" }), Interview.countDocuments(),
      Application.countDocuments({ status: "Selected" }),
      Job.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Application.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
    ]);
    res.json({ companies, students, jobs, applications, shortlisted, interviews, selected, jobsByStatus, appsByStatus });
  } catch (err) { next(err); }
});
module.exports = router;
