const Company = require("../models/Company");
const crud = require("./_crud");
module.exports = crud(Company, { searchFields: ["name", "industry", "location"], statusField: "status" });
