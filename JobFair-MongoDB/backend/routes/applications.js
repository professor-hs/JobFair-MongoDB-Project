const Application = require("../models/Application");
const crud = require("./_crud");
module.exports = crud(Application, { populate: [
  { path: "student", select: "name regNo email department cgpa" },
  { path: "job", populate: { path: "company", select: "name" } }
], statusField: "status" });
