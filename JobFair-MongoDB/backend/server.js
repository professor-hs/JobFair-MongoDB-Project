require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const Company = require("./models/Company");
const Job = require("./models/Job");
const Student = require("./models/Student");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

const frontendPath = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendPath));

mongoose.set("strictQuery", true);
mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/jobfair_db", {
  serverSelectionTimeoutMS: 3000
})
  .then(() => console.log("✓ Connected to MongoDB"))
  .catch((err) => {
    console.warn("MongoDB connection unavailable (Frontend will use Public APIs + Local Persistence mode):", err.message);
  });

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "JobFair Nexus API", database: mongoose.connection.readyState });
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const u = String(username || "").trim();
  const p = String(password || "");
  if (u === "Admin1" && p === "Admin@1234") {
    return res.json({ ok: true, username: "Admin1", role: "Administrator", isAdmin: true });
  }
  const m = /^student(\d+)$/i.exec(u);
  if (m) {
    const num = m[1];
    if (u === `student${num}` && p === `Student@${num}`) {
      return res.json({ ok: true, username: u, studentNumber: Number(num), role: "Student", isAdmin: false });
    }
  }
  return res.status(401).json({ ok: false, message: "Invalid username or password." });
});

app.post("/api/public-sync", async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "MongoDB not connected; using frontend Public API mode" });
    }
    const [dummyRes, randomRes] = await Promise.all([
      fetch("https://dummyjson.com/users?limit=8").then((r) => r.json()),
      fetch("https://randomuser.me/api/?results=6&nat=in,us").then((r) => r.json())
    ]);
    const users = dummyRes?.users || [];
    const randUsers = randomRes?.results || [];

    const createdCompanies = [];
    for (const u of users.slice(0, 4)) {
      if (u.company?.name) {
        const c = await Company.findOneAndUpdate(
          { name: u.company.name },
          {
            name: u.company.name,
            industry: "Technology",
            location: u.company?.address?.city || "Bengaluru, India",
            website: `https://${u.company.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.io`,
            contactEmail: u.email,
            status: "Active"
          },
          { upsert: true, new: true }
        );
        createdCompanies.push(c);
      }
    }

    for (let i = 0; i < createdCompanies.length; i++) {
      const comp = createdCompanies[i];
      const u = users[i];
      await Job.create({
        title: u?.company?.title || "Software Engineer",
        company: comp._id,
        department: u?.company?.department || "Engineering",
        location: comp.location,
        jobType: "Full-time",
        salary: "₹12–18 LPA",
        minCgpa: 7.0,
        skills: ["JavaScript", "Node.js", "MongoDB", "React"],
        status: "Open",
        description: `Synced via DummyJSON Public API for ${comp.name}.`
      });
    }

    for (let i = 0; i < randUsers.length; i++) {
      const ru = randUsers[i];
      const regNo = `24BCS${Math.floor(1000 + Math.random() * 8999)}`;
      await Student.create({
        name: `${ru.name.first} ${ru.name.last}`,
        regNo,
        email: ru.email,
        department: "Computer Science",
        graduationYear: 2027,
        cgpa: Number((7.5 + Math.random() * 2.1).toFixed(2)),
        skills: ["Python", "React", "MongoDB"]
      });
    }

    res.json({ ok: true, syncedCompanies: createdCompanies.length, syncedStudents: randUsers.length });
  } catch (err) {
    next(err);
  }
});

app.use("/api/companies", require("./routes/companies"));
app.use("/api/jobs", require("./routes/jobs"));
app.use("/api/students", require("./routes/students"));
app.use("/api/applications", require("./routes/applications"));
app.use("/api/interviews", require("./routes/interviews"));
app.use("/api/reports", require("./routes/reports"));

app.get("*", (req, res) => res.sendFile(path.join(frontendPath, "index.html")));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

app.listen(PORT, () => console.log(`✓ JobFair Nexus running at http://localhost:${PORT}`));
