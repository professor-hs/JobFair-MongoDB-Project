const Student = require("../models/Student");
const crud = require("./_crud");
module.exports = crud(Student, { searchFields: ["name", "regNo", "email", "department"] });
