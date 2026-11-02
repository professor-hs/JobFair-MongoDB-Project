const express = require("express");
function crudRouter(Model, options = {}) {
  const router = express.Router();
  const populate = options.populate || [];
  router.get("/", async (req, res, next) => {
    try {
      const filter = {};
      if (req.query.search && options.searchFields?.length) {
        const rx = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        filter.$or = options.searchFields.map((field) => ({ [field]: rx }));
      }
      if (req.query.status && options.statusField) filter[options.statusField] = req.query.status;
      const docs = await Model.find(filter).populate(populate).sort({ createdAt: -1 }).limit(500);
      res.json(docs);
    } catch (err) { next(err); }
  });
  router.post("/", async (req, res, next) => {
    try {
      const doc = await Model.create(req.body);
      const result = await Model.findById(doc._id).populate(populate);
      res.status(201).json(result);
    } catch (err) { next(err); }
  });
  router.get("/:id", async (req, res, next) => {
    try {
      const doc = await Model.findById(req.params.id).populate(populate);
      if (!doc) return res.status(404).json({ message: "Record not found" });
      res.json(doc);
    } catch (err) { next(err); }
  });
  router.put("/:id", async (req, res, next) => {
    try {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate(populate);
      if (!doc) return res.status(404).json({ message: "Record not found" });
      res.json(doc);
    } catch (err) { next(err); }
  });
  router.delete("/:id", async (req, res, next) => {
    try {
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ message: "Record not found" });
      res.json({ message: "Deleted successfully", id: req.params.id });
    } catch (err) { next(err); }
  });
  return router;
}
module.exports = crudRouter;
