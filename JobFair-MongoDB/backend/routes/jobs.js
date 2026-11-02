const Job = require("../models/Job");
const crud = require("./_crud");
module.exports = crud(Job, { populate: [{ path: "company", select: "name industry" }], searchFields: ["title", "department", "location"], statusField: "status" });
