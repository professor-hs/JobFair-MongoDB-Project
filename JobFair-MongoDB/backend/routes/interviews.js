const Interview = require("../models/Interview");
const crud = require("./_crud");
module.exports = crud(Interview, { populate: [{ path: "application", populate: [{ path: "student", select: "name regNo" }, { path: "job", select: "title" }] }], statusField: "status" });
