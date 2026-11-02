/* JobFair Nexus Frontend — Compulsory Login + Hybrid Express/MongoDB REST API + Live Public APIs Engine */
const API = "/api";
const STORAGE_KEY = "jobfair_nexus_db_v2";
const SESSION_KEY = "jobfair_nexus_session_v1";

const PUBLIC_APIS = {
  dummyUsers: {
    name: "DummyJSON Users & Employers API",
    url: "https://dummyjson.com/users?limit=14",
    category: "Companies, Jobs & Students",
    docs: "https://dummyjson.com/docs/users"
  },
  randomUser: {
    name: "RandomUser.me Candidate Generator API",
    url: "https://randomuser.me/api/?results=8&nat=in,us,gb",
    category: "Student Profiles & Avatars",
    docs: "https://randomuser.me/documentation"
  },
  remotiveJobs: {
    name: "Remotive Live Remote Jobs API",
    url: "https://remotive.com/api/remote-jobs?limit=10",
    category: "Live Tech Job Openings",
    docs: "https://github.com/remotive-com/remote-jobs-api"
  },
  arbeitnowJobs: {
    name: "Arbeitnow Public Job Board API",
    url: "https://www.arbeitnow.com/api/job-board-api",
    category: "Global Job Postings",
    docs: "https://documenter.getpostman.com/view/18545278/UVJbJdKh"
  },
  jsonPlaceholder: {
    name: "JSONPlaceholder Enterprise Directory API",
    url: "https://jsonplaceholder.typicode.com/users",
    category: "Employer Contacts & Companies",
    docs: "https://jsonplaceholder.typicode.com/"
  }
};

const state = {
  page: "dashboard",
  records: {},
  editing: null,
  modal: null,
  query: "",
  status: "",
  backendOnline: false,
  apiMetrics: {},
  liveFeedJobs: [],
  user: null
};

/* ==================== COMPULSORY AUTHENTICATION VALIDATOR ==================== */
function validateCredentials(username, password) {
  const u = String(username || "").trim();
  const p = String(password || "");

  // 1. Admin login: Admin1 / Admin@1234
  if (u === "Admin1" && p === "Admin@1234") {
    return {
      username: "Admin1",
      name: "Placement Admin (Admin1)",
      role: "Administrator",
      isAdmin: true
    };
  }

  // 2. Student login pattern: student1 / Student@1, student2 / Student@2, studentN / Student@N
  const studentMatch = /^student(\d+)$/i.exec(u);
  if (studentMatch) {
    const num = studentMatch[1];
    const expectedUsername = `student${num}`;
    const expectedPassword = `Student@${num}`;
    if (u === expectedUsername && p === expectedPassword) {
      return {
        username: expectedUsername,
        studentNumber: Number(num),
        name: `Student ${num} (${expectedUsername})`,
        role: "Student",
        isAdmin: false
      };
    }
  }

  return null;
}

const config = {
  companies: {
    title: "Companies",
    singular: "Company",
    subtitle: "Build and maintain your employer network synced with public directories.",
    icon: "bi-buildings",
    endpoint: "companies",
    fields: [
      { name: "name", label: "Company name", required: true, placeholder: "e.g. Northstar Technologies" },
      { name: "industry", label: "Industry", type: "select", options: ["Technology", "Finance", "Consulting", "Healthcare", "Manufacturing", "Education", "Other"], required: true },
      { name: "location", label: "Headquarters", placeholder: "e.g. Bengaluru, India" },
      { name: "website", label: "Website", placeholder: "https://company.com" },
      { name: "contactEmail", label: "Recruiter email", type: "email", placeholder: "recruiter@company.com" },
      { name: "status", label: "Status", type: "select", options: ["Active", "Pending", "Inactive"], required: true }
    ]
  },
  jobs: {
    title: "Job openings",
    singular: "Job",
    subtitle: "Publish roles, import live openings from Public APIs, and track eligibility.",
    icon: "bi-briefcase",
    endpoint: "jobs",
    fields: [
      { name: "title", label: "Job title", required: true, placeholder: "e.g. Software Engineer" },
      { name: "company", label: "Company", type: "selectDynamic", source: "companies", required: true },
      { name: "department", label: "Department", type: "select", options: ["Engineering", "Data Science", "Product", "Design", "Business", "Marketing", "Operations", "Other"] },
      { name: "location", label: "Work location", placeholder: "Chennai / Hybrid / Remote" },
      { name: "jobType", label: "Employment type", type: "select", options: ["Full-time", "Internship", "Part-time", "Contract"] },
      { name: "salary", label: "Salary / CTC", placeholder: "e.g. ₹10–16 LPA or $95k/yr" },
      { name: "minCgpa", label: "Minimum CGPA", type: "number", min: 0, max: 10, step: 0.1, placeholder: "6.5" },
      { name: "deadline", label: "Application deadline", type: "date" },
      { name: "skills", label: "Required skills", placeholder: "JavaScript, Node.js, MongoDB, React", hint: "Separate skills with commas." },
      { name: "status", label: "Status", type: "select", options: ["Open", "Paused", "Closed"] },
      { name: "description", label: "Job description", type: "textarea", full: true, placeholder: "Responsibilities, requirements and benefits…" }
    ]
  },
  students: {
    title: "Students",
    singular: "Student",
    subtitle: "Manage student profiles, skills and placement readiness.",
    icon: "bi-people",
    endpoint: "students",
    fields: [
      { name: "name", label: "Full name", required: true, placeholder: "Student name" },
      { name: "regNo", label: "Registration number", required: true, placeholder: "e.g. 24BCS0001" },
      { name: "email", label: "Email address", type: "email", required: true, placeholder: "student@example.com" },
      { name: "department", label: "Department", type: "select", options: ["Computer Science", "Information Technology", "Data Science", "Electronics", "Mechanical", "Civil", "Business", "Other"] },
      { name: "graduationYear", label: "Graduation year", type: "number", required: true, placeholder: "2027" },
      { name: "cgpa", label: "CGPA (out of 10)", type: "number", min: 0, max: 10, step: 0.01, placeholder: "8.45" },
      { name: "skills", label: "Skills", placeholder: "Python, SQL, React", hint: "Separate skills with commas." },
      { name: "resumeUrl", label: "Resume URL", placeholder: "https://…" }
    ]
  },
  applications: {
    title: "Applications",
    singular: "Application",
    subtitle: "Review applicants and move candidates through your hiring pipeline.",
    icon: "bi-file-earmark-check",
    endpoint: "applications",
    fields: [
      { name: "student", label: "Student", type: "selectDynamic", source: "students", required: true },
      { name: "job", label: "Job opening", type: "selectDynamic", source: "jobs", required: true },
      { name: "status", label: "Application status", type: "select", options: ["Applied", "Under Review", "Shortlisted", "Interview Scheduled", "Selected", "Rejected"], required: true },
      { name: "notes", label: "Recruiter notes", type: "textarea", full: true, placeholder: "Optional evaluation notes…" }
    ]
  },
  interviews: {
    title: "Interviews",
    singular: "Interview",
    subtitle: "Coordinate interview rounds, dates and candidate outcomes.",
    icon: "bi-calendar2-week",
    endpoint: "interviews",
    fields: [
      { name: "application", label: "Candidate application", type: "selectDynamic", source: "applications", required: true },
      { name: "round", label: "Interview round", type: "select", options: ["HR Round", "Technical Round", "Coding Assessment", "Managerial Round", "Final Round"], required: true },
      { name: "scheduledAt", label: "Date and time", type: "datetime-local", required: true },
      { name: "mode", label: "Interview mode", type: "select", options: ["Online", "On-site", "Phone"] },
      { name: "venue", label: "Meeting link / venue", placeholder: "Google Meet / Zoom URL or campus hall" },
      { name: "interviewer", label: "Interviewer", placeholder: "Interviewer name" },
      { name: "status", label: "Status", type: "select", options: ["Scheduled", "Completed", "Cancelled"] },
      { name: "feedback", label: "Feedback", type: "textarea", full: true, placeholder: "Optional interview feedback…" }
    ]
  }
};

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function idOf(v) {
  return v && typeof v === "object" ? v._id : v;
}
function labelOf(v) {
  return v && typeof v === "object" ? (v.name || v.title || v.regNo || v._id) : (v || "—");
}
function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function toast(message, type = "success") {
  const id = "t" + Date.now() + Math.random().toString(36).slice(2, 5);
  const icon = type === "success" ? "bi-check-circle-fill text-success" : type === "info" ? "bi-cloud-check-fill text-primary" : "bi-exclamation-circle-fill text-danger";
  const html = `<div id="${id}" class="toast align-items-center toast-${type === "error" ? "error" : "success"}" role="alert"><div class="d-flex"><div class="toast-body"><i class="bi ${icon} me-2"></i>${esc(message)}</div><button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast"></button></div></div>`;
  $("#toastArea").append(html);
  const el = document.getElementById(id);
  const t = new bootstrap.Toast(el, { delay: 3400 });
  t.show();
  el.addEventListener("hidden.bs.toast", () => el.remove());
}

/* ==================== LOCAL STORE & PUBLIC API SYNC ENGINE ==================== */
function getLocalDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.companies) && parsed.companies.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Local storage read error:", e);
  }
  return null;
}

function saveLocalDB(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.warn("Local storage write error:", e);
  }
}

function hydrateRelations(db) {
  const companyMap = Object.fromEntries((db.companies || []).map((c) => [c._id, c]));
  const studentMap = Object.fromEntries((db.students || []).map((s) => [s._id, s]));
  const jobs = (db.jobs || []).map((j) => ({
    ...j,
    company: companyMap[idOf(j.company)] || j.company
  }));
  const jobMap = Object.fromEntries(jobs.map((j) => [j._id, j]));
  const applications = (db.applications || []).map((a) => ({
    ...a,
    student: studentMap[idOf(a.student)] || a.student,
    job: jobMap[idOf(a.job)] || a.job
  }));
  const appMap = Object.fromEntries(applications.map((a) => [a._id, a]));
  const interviews = (db.interviews || []).map((i) => ({
    ...i,
    application: appMap[idOf(i.application)] || i.application
  }));
  return {
    companies: db.companies || [],
    students: db.students || [],
    jobs,
    applications,
    interviews
  };
}

async function fetchWithTiming(key, url) {
  const t0 = performance.now();
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.apiMetrics[key] = { ok: true, ms: Math.round(performance.now() - t0), updatedAt: new Date().toLocaleTimeString() };
    return data;
  } catch (err) {
    state.apiMetrics[key] = { ok: false, ms: Math.round(performance.now() - t0), error: err.message };
    return null;
  }
}

async function seedFromPublicAPIs(forceReset = false) {
  const existing = getLocalDB();
  if (existing && !forceReset) return existing;

  const [dummyData, randomUsersData, remotiveData, arbeitnowData] = await Promise.all([
    fetchWithTiming("dummyUsers", PUBLIC_APIS.dummyUsers.url),
    fetchWithTiming("randomUser", PUBLIC_APIS.randomUser.url),
    fetchWithTiming("remotiveJobs", PUBLIC_APIS.remotiveJobs.url),
    fetchWithTiming("arbeitnowJobs", PUBLIC_APIS.arbeitnowJobs.url)
  ]);

  const users = dummyData?.users || [];
  const randomUsers = randomUsersData?.results || [];
  const remotiveJobs = remotiveData?.jobs || [];
  const arbeitJobs = arbeitnowData?.data || [];

  state.liveFeedJobs = [
    ...remotiveJobs.slice(0, 6).map((j) => ({
      title: j.title,
      companyName: j.company_name,
      location: j.candidate_required_location || "Remote",
      jobType: j.job_type === "full_time" ? "Full-time" : "Contract",
      salary: j.salary || "₹12–20 LPA (Remote)",
      category: j.category || "Engineering",
      url: j.url,
      source: "Remotive API",
      tags: (j.tags || []).slice(0, 4)
    })),
    ...arbeitJobs.slice(0, 6).map((j) => ({
      title: j.title,
      companyName: j.company_name,
      location: j.location || (j.remote ? "Remote" : "Hybrid"),
      jobType: "Full-time",
      salary: "₹10–18 LPA",
      category: (j.tags && j.tags[0]) || "Engineering",
      url: j.url,
      source: "Arbeitnow API",
      tags: (j.tags || []).slice(0, 4)
    }))
  ];

  const industries = ["Technology", "Finance", "Consulting", "Healthcare", "Manufacturing", "Education"];
  const companies = [];
  const seenCompanies = new Set();

  for (const rj of state.liveFeedJobs.slice(0, 5)) {
    if (rj.companyName && !seenCompanies.has(rj.companyName)) {
      seenCompanies.add(rj.companyName);
      companies.push({
        _id: uid("comp"),
        name: rj.companyName,
        industry: "Technology",
        location: rj.location || "Remote / Global",
        website: rj.url || `https://${rj.companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
        contactEmail: `careers@${rj.companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
        status: "Active",
        sourceApi: rj.source,
        createdAt: new Date(Date.now() - companies.length * 86400000 * 3).toISOString()
      });
    }
  }

  for (const u of users) {
    const cName = u.company?.name;
    if (cName && !seenCompanies.has(cName) && companies.length < 10) {
      seenCompanies.add(cName);
      companies.push({
        _id: uid("comp"),
        name: cName,
        industry: industries[companies.length % industries.length],
        location: `${u.company?.address?.city || u.address?.city || "Bengaluru"}, ${u.address?.state || "India"}`,
        website: `https://${cName.toLowerCase().replace(/[^a-z0-9]/g, "")}.io`,
        contactEmail: u.email || `hr@${cName.toLowerCase().replace(/[^a-z0-9]/g, "")}.io`,
        status: companies.length % 5 === 4 ? "Pending" : "Active",
        sourceApi: "DummyJSON API",
        createdAt: new Date(Date.now() - companies.length * 86400000 * 2).toISOString()
      });
    }
  }

  if (companies.length === 0) {
    companies.push(
      { _id: uid("comp"), name: "Northstar Cloud Systems", industry: "Technology", location: "Bengaluru, India", website: "https://northstar.dev", contactEmail: "talent@northstar.dev", status: "Active", createdAt: new Date().toISOString() },
      { _id: uid("comp"), name: "FinVerse Analytics", industry: "Finance", location: "Mumbai, India", website: "https://finverse.io", contactEmail: "careers@finverse.io", status: "Active", createdAt: new Date().toISOString() }
    );
  }

  const departments = ["Engineering", "Data Science", "Product", "Design", "Business", "Marketing"];
  const skillSets = [
    ["JavaScript", "Node.js", "MongoDB", "React"],
    ["Python", "Machine Learning", "SQL", "TensorFlow"],
    ["TypeScript", "Next.js", "GraphQL", "AWS"],
    ["Java", "Spring Boot", "Microservices", "Docker"],
    ["Product Strategy", "SQL", "Figma", "Analytics"],
    ["Go", "Kubernetes", "PostgreSQL", "Redis"]
  ];
  const salaries = ["₹12–18 LPA", "₹15–24 LPA", "₹8–12 LPA", "₹18–28 LPA", "₹10–14 LPA", "₹60,000/mo Internship"];

  const jobs = [];
  state.liveFeedJobs.slice(0, 5).forEach((lj, idx) => {
    const comp = companies.find((c) => c.name === lj.companyName) || companies[idx % companies.length];
    jobs.push({
      _id: uid("job"),
      title: lj.title,
      company: comp._id,
      department: departments[idx % departments.length],
      location: lj.location || comp.location,
      jobType: lj.jobType || "Full-time",
      salary: lj.salary || salaries[idx % salaries.length],
      minCgpa: Number((6.5 + (idx % 4) * 0.5).toFixed(1)),
      deadline: new Date(Date.now() + (10 + idx * 5) * 86400000).toISOString().slice(0, 10),
      skills: lj.tags?.length ? lj.tags : skillSets[idx % skillSets.length],
      status: "Open",
      description: `Live opening imported via ${lj.source}. Looking for strong problem solvers excited to build scalable systems at ${comp.name}.`,
      sourceApi: lj.source,
      createdAt: new Date(Date.now() - idx * 86400000).toISOString()
    });
  });

  users.slice(0, 5).forEach((u, idx) => {
    const comp = companies[(idx + 2) % companies.length];
    jobs.push({
      _id: uid("job"),
      title: u.company?.title || "Full Stack Developer",
      company: comp._id,
      department: u.company?.department ? (departments.find((d) => d.toLowerCase() === u.company.department.toLowerCase()) || "Engineering") : departments[idx % departments.length],
      location: comp.location,
      jobType: idx % 4 === 3 ? "Internship" : "Full-time",
      salary: salaries[(idx + 1) % salaries.length],
      minCgpa: 7.0,
      deadline: new Date(Date.now() + (14 + idx * 4) * 86400000).toISOString().slice(0, 10),
      skills: skillSets[(idx + 2) % skillSets.length],
      status: idx === 4 ? "Paused" : "Open",
      description: `Campus recruitment drive role for ${u.company?.title || "Software Engineer"} at ${comp.name}.`,
      sourceApi: "DummyJSON API",
      createdAt: new Date(Date.now() - (idx + 3) * 86400000).toISOString()
    });
  });

  const studentDepts = ["Computer Science", "Information Technology", "Data Science", "Electronics", "Mechanical"];
  const students = [];

  randomUsers.forEach((ru, idx) => {
    const fullName = `${ru.name.first} ${ru.name.last}`;
    students.push({
      _id: uid("stu"),
      username: `student${idx + 1}`,
      name: fullName,
      regNo: `23BCS${String(101 + idx).padStart(4, "0")}`,
      email: ru.email,
      avatar: ru.picture?.thumbnail || "",
      department: studentDepts[idx % studentDepts.length],
      graduationYear: 2026 + (idx % 2),
      cgpa: Number((7.4 + ((idx * 0.37) % 2.4)).toFixed(2)),
      skills: skillSets[idx % skillSets.length],
      resumeUrl: `https://portfolio.campus.edu/${ru.login?.username || "student" + (idx + 1)}`,
      sourceApi: "RandomUser API",
      createdAt: new Date(Date.now() - idx * 43200000).toISOString()
    });
  });

  users.slice(0, 4).forEach((u, idx) => {
    const n = students.length + 1;
    students.push({
      _id: uid("stu"),
      username: `student${n}`,
      name: `${u.firstName} ${u.lastName}`,
      regNo: `23BIT${String(200 + n).padStart(4, "0")}`,
      email: u.email,
      avatar: u.image || "",
      department: studentDepts[(idx + 1) % studentDepts.length],
      graduationYear: 2026,
      cgpa: Number((7.8 + ((idx * 0.41) % 2.0)).toFixed(2)),
      skills: skillSets[(idx + 1) % skillSets.length],
      resumeUrl: `https://github.com/${u.username}`,
      sourceApi: "DummyJSON API",
      createdAt: new Date(Date.now() - n * 43200000).toISOString()
    });
  });

  const appStatuses = ["Selected", "Shortlisted", "Interview Scheduled", "Under Review", "Applied", "Shortlisted", "Selected", "Applied", "Rejected"];
  const applications = [];
  for (let i = 0; i < Math.min(students.length, 9); i++) {
    const stu = students[i];
    const job = jobs[i % jobs.length];
    const st = appStatuses[i % appStatuses.length];
    applications.push({
      _id: uid("app"),
      student: stu._id,
      job: job._id,
      status: st,
      appliedAt: new Date(Date.now() - (9 - i) * 86400000).toISOString(),
      notes: `Synced candidate profile (${stu.cgpa} CGPA) matched for ${job.title}.`,
      createdAt: new Date(Date.now() - (9 - i) * 86400000).toISOString()
    });
  }

  const rounds = ["Technical Round", "Coding Assessment", "Final Round", "HR Round", "Managerial Round"];
  const modes = ["Online", "On-site", "Online", "Phone"];
  const interviews = [];
  applications
    .filter((a) => ["Shortlisted", "Interview Scheduled", "Selected"].includes(a.status))
    .forEach((app, idx) => {
      interviews.push({
        _id: uid("int"),
        application: app._id,
        round: rounds[idx % rounds.length],
        scheduledAt: new Date(Date.now() + (idx - 1) * 86400000 + 3600000 * 10).toISOString(),
        mode: modes[idx % modes.length],
        venue: modes[idx % modes.length] === "Online" ? "https://meet.google.com/jfn-live-drive" : "Placement Cell Auditorium, Block A",
        interviewer: users[idx]?.firstName ? `${users[idx].firstName} ${users[idx].lastName}` : "Senior Engineering Panel",
        status: app.status === "Selected" ? "Completed" : "Scheduled",
        feedback: app.status === "Selected" ? "Strong system design and coding fundamentals. Recommended for offer." : "Technical evaluation scheduled.",
        createdAt: new Date().toISOString()
      });
    });

  const db = { companies, jobs, students, applications, interviews };
  saveLocalDB(db);
  return db;
}

/* ==================== UNIFIED API ADAPTER (EXPRESS + PUBLIC API FALLBACK) ==================== */
async function localApiHandler(path, options = {}) {
  const rawDb = getLocalDB() || (await seedFromPublicAPIs(false));
  const method = (options.method || "GET").toUpperCase();
  const cleanPath = path.split("?")[0].replace(/^\/+/, "");
  const parts = cleanPath.split("/");

  if (cleanPath === "health") {
    return { ok: true, service: "JobFair Nexus Public API Engine", mode: "public-api", database: 1 };
  }

  if (cleanPath === "reports/summary") {
    const db = hydrateRelations(rawDb);
    const statusMap = {};
    db.applications.forEach((a) => {
      statusMap[a.status] = (statusMap[a.status] || 0) + 1;
    });
    const jobStatusMap = {};
    db.jobs.forEach((j) => {
      jobStatusMap[j.status] = (jobStatusMap[j.status] || 0) + 1;
    });
    return {
      companies: db.companies.length,
      students: db.students.length,
      jobs: db.jobs.length,
      applications: db.applications.length,
      shortlisted: db.applications.filter((a) => a.status === "Shortlisted").length,
      interviews: db.interviews.length,
      selected: db.applications.filter((a) => a.status === "Selected").length,
      jobsByStatus: Object.entries(jobStatusMap).map(([_id, count]) => ({ _id, count })),
      appsByStatus: Object.entries(statusMap).map(([_id, count]) => ({ _id, count }))
    };
  }

  const col = parts[0];
  const id = parts[1];
  if (!["companies", "jobs", "students", "applications", "interviews"].includes(col)) {
    throw new Error(`Unknown endpoint: ${path}`);
  }

  if (method === "GET") {
    const hydrated = hydrateRelations(rawDb)[col] || [];
    if (id) {
      const item = hydrated.find((r) => r._id === id);
      if (!item) throw new Error("Record not found");
      return item;
    }
    return hydrated;
  }

  const body = options.body ? JSON.parse(options.body) : {};
  if (method === "POST") {
    const newDoc = {
      _id: uid(col.slice(0, 3)),
      ...body,
      appliedAt: col === "applications" ? body.appliedAt || new Date().toISOString() : undefined,
      createdAt: new Date().toISOString()
    };
    rawDb[col] = [newDoc, ...(rawDb[col] || [])];
    saveLocalDB(rawDb);
    return hydrateRelations(rawDb)[col].find((r) => r._id === newDoc._id);
  }

  if (method === "PUT") {
    const idx = (rawDb[col] || []).findIndex((r) => r._id === id);
    if (idx === -1) throw new Error("Record not found");
    rawDb[col][idx] = { ...rawDb[col][idx], ...body, updatedAt: new Date().toISOString() };
    saveLocalDB(rawDb);
    return hydrateRelations(rawDb)[col].find((r) => r._id === id);
  }

  if (method === "DELETE") {
    rawDb[col] = (rawDb[col] || []).filter((r) => r._id !== id);
    saveLocalDB(rawDb);
    return { message: "Deleted successfully", id };
  }
}

async function api(path, options = {}) {
  if (state.backendOnline) {
    try {
      const res = await fetch(`${API}${path}`, {
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
        ...options
      });
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        return await res.json();
      }
      if (!res.ok && contentType.includes("application/json")) {
        const errData = await res.json();
        throw new Error(errData.message || `Request failed (${res.status})`);
      }
    } catch (err) {
      state.backendOnline = false;
      setConnection(true, "Public APIs Live");
    }
  }
  return localApiHandler(path, options);
}

function setConnection(ok, text) {
  $("#connectionText").text(text);
  $("#connectionPill").toggleClass("offline", !ok);
  $(".pulse-dot").css("background", ok ? "#25b77a" : "#d65360");
}

async function checkHealth() {
  try {
    const res = await fetch(`${API}/health`, { headers: { Accept: "application/json" } });
    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const data = await res.json();
      if (data && data.ok && data.database === 1) {
        state.backendOnline = true;
        setConnection(true, "MongoDB + Public APIs");
        return;
      }
    }
  } catch (e) {}
  state.backendOnline = false;
  await seedFromPublicAPIs(false);
  setConnection(true, "Public APIs Connected");
}

/* ==================== UI RENDERING ==================== */
function pageHeading(title, subtitle, action) {
  $("#pageCrumb").text(title);
  $("#pageHeading").html(
    `<div><div class="eyebrow">PLACEMENT MANAGEMENT · ${state.user?.isAdmin ? "ADMIN WORKSPACE" : "STUDENT PORTAL"}</div><h1 class="page-title">${esc(
      title
    )}</h1><p class="page-subtitle">${esc(subtitle)}</p></div>${action ? `<div class="heading-actions">${action}</div>` : ""}`
  );
}
function addButton(label, icon, action = "addRecord") {
  return `<button class="btn btn-primary" data-action="${action}"><i class="bi ${icon} me-1"></i>${label}</button>`;
}
function emptyState(title, desc) {
  return `<div class="empty-state"><i class="bi bi-inbox"></i><strong>${esc(title)}</strong><p>${esc(desc)}</p></div>`;
}
function badge(status) {
  const cls = String(status || "").toLowerCase().replace(/\s+/g, "-");
  return `<span class="status-badge status-${esc(cls)}">${esc(status || "—")}</span>`;
}
function entity(name, meta, avatarUrl = "") {
  const initials = (name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0] || "")
    .join("")
    .toUpperCase();
  const visual = avatarUrl
    ? `<img src="${esc(avatarUrl)}" alt="${esc(name)}" class="entity-avatar">`
    : `<div class="entity-logo"><span>${esc(initials || "—")}</span></div>`;
  return `<div class="entity-cell">${visual}<div><div class="entity-name">${esc(name || "—")}</div><div class="entity-meta">${esc(meta || "")}</div></div></div>`;
}
function actions(id, extraHtml = "") {
  return `<div class="row-actions">${extraHtml}<button class="mini-action" title="Edit" data-action="edit" data-id="${esc(id)}"><i class="bi bi-pencil"></i></button><button class="mini-action" title="Delete" data-action="delete" data-id="${esc(id)}"><i class="bi bi-trash3"></i></button></div>`;
}

function updateNavCounts() {
  const jobs = state.records.jobs || [];
  const companies = state.records.companies || [];
  const students = state.records.students || [];
  $("#navJobCount").text(jobs.filter((j) => j.status === "Open").length || jobs.length);
  $("#navCompanyCount").text(companies.length);
  $("#navStudentCount").text(students.length);
}

function tableShell(headers, rows, emptyTitle, emptyDesc) {
  const sourceLabel = state.backendOnline ? "MONGODB + PUBLIC API DATA" : "PUBLIC API + LOCAL PERSISTENCE";
  return `<div class="panel table-panel"><div class="panel-head"><div><h3 class="panel-title">All records</h3><div class="panel-subtitle">${rows.length} record${
    rows.length === 1 ? "" : "s"
  } available in workspace</div></div><span class="eyebrow">${sourceLabel}</span></div><div class="table-toolbar"><label class="search-box"><i class="bi bi-search"></i><input id="tableSearch" placeholder="Search records…" value="${esc(
    state.query
  )}"></label><div class="toolbar-right"><select id="statusFilter" class="form-select form-select-sm" style="width:auto"><option value="">All statuses</option>${[
    "Open",
    "Paused",
    "Closed",
    "Active",
    "Pending",
    "Inactive",
    "Applied",
    "Under Review",
    "Shortlisted",
    "Interview Scheduled",
    "Selected",
    "Rejected",
    "Scheduled",
    "Completed",
    "Cancelled"
  ]
    .map((s) => `<option ${state.status === s ? "selected" : ""} value="${esc(s)}">${esc(s)}</option>`)
    .join("")}</select><button class="btn btn-light btn-sm" id="exportBtn"><i class="bi bi-download me-1"></i> Export CSV</button></div></div><div class="table-responsive"><table class="table align-middle"><thead><tr>${headers
    .map((h) => `<th>${esc(h)}</th>`)
    .join("")}</tr></thead><tbody>${
    rows.length ? rows.join("") : `<tr><td colspan="${headers.length}">${emptyState(emptyTitle, emptyDesc)}</td></tr>`
  }</tbody></table></div></div>`;
}
function row(cells, id, extraActionHtml = "") {
  return `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}<td>${actions(id, extraActionHtml)}</td></tr>`;
}

async function loadCollection(key, force = false) {
  if (!force && state.records[key]) return state.records[key];
  state.records[key] = await api(`/${key}`);
  updateNavCounts();
  return state.records[key];
}

async function loadDashboard() {
  const u = state.user || { username: "Admin1", name: "Admin1", isAdmin: true };
  pageHeading(
    `Welcome, ${u.username} 👋`,
    u.isAdmin
      ? "Real-time campus placement metrics powered by Public APIs & persistent storage."
      : "Explore open campus drives, apply to top employers, and track your application status.",
    `<button class="btn btn-light" data-page="public-apis"><i class="bi bi-cloud-arrow-down me-1"></i> Live API Hub</button> ${
      u.isAdmin ? addButton("Create job", "bi-plus-lg", "quickAddJob") : `<button class="btn btn-primary" data-page="jobs"><i class="bi bi-briefcase me-1"></i> Browse Open Jobs</button>`
    }`
  );
  $("#pageView").html(`<div class="loading-state"><div class="spinner-border text-primary"></div><p>Loading live recruitment metrics…</p></div>`);
  try {
    const s = await api("/reports/summary");
    const [companies, jobs, apps, students] = await Promise.all([
      loadCollection("companies", true),
      loadCollection("jobs", true),
      loadCollection("applications", true),
      loadCollection("students", true)
    ]);
    updateNavCounts();
    const stat = (label, value, icon, tint, foot) =>
      `<div class="stat-card"><div class="stat-top"><span class="stat-label">${label}</span><span class="stat-icon ${tint}"><i class="bi ${icon}"></i></span></div><div class="stat-value">${value}</div><div class="stat-foot">${foot}</div></div>`;
    const max = Math.max(1, ...(s.appsByStatus || []).map((x) => x.count));
    const stages = ["Applied", "Under Review", "Shortlisted", "Interview Scheduled", "Selected", "Rejected"];
    const pipe = stages
      .map((x, i) => {
        const n = (s.appsByStatus || []).find((y) => y._id === x)?.count || 0;
        return `<div class="pipeline-row"><span class="pipeline-label">${x}</span><div class="pipeline-track"><div class="pipeline-fill" style="width:${Math.max(
          n ? 6 : 0,
          (n / max) * 100
        )}%;opacity:${1 - i * 0.07}"></div></div><span class="pipeline-number">${n}</span></div>`;
      })
      .join("");
    const recent = apps
      .slice(0, 5)
      .map((a) =>
        row(
          [
            entity(labelOf(a.student), labelOf(a.student?.regNo) || "Student", a.student?.avatar),
            `<span>${esc(labelOf(a.job))}</span>`,
            badge(a.status),
            fmtDate(a.appliedAt)
          ],
          a._id
        )
      )
      .join("");
    const monthLabels = ["May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
    const bars = monthLabels
      .map((m, i) => {
        const h = [42, 56, 48, 72, 64, 90, 82][i];
        return `<div class="chart-col"><div class="bar-pair"><div class="bar" style="height:${Math.round(
          h * 0.65
        )}%"></div><div class="bar primary" style="height:${h}%"></div></div><span class="chart-label">${m}</span></div>`;
      })
      .join("");
    $("#pageView").html(
      `<div class="stats-grid">${stat("Registered companies", s.companies, "bi-buildings", "tint-blue", "Synced employer network")}${stat(
        "Active job openings",
        jobs.filter((j) => j.status === "Open").length,
        "bi-briefcase",
        "tint-green",
        `${s.jobs} total job records`
      )}${stat("Student applications", s.applications, "bi-file-earmark-text", "tint-orange", `${s.students} registered students`)}${stat(
        "Shortlisted & Selected",
        s.shortlisted + s.selected,
        "bi-person-check",
        "tint-purple",
        `${s.selected} final offers extended`
      )}</div><div class="dashboard-grid"><div class="panel"><div class="panel-head"><div><h3 class="panel-title">Recruitment activity</h3><div class="panel-subtitle">Campus placement momentum · Applications vs Interviews</div></div><span class="badge rounded-pill text-bg-light">Live Metrics</span></div><div class="panel-body"><div class="chart-bars">${bars}</div><div class="chart-legend"><span><i class="legend-dot blue"></i>Applications</span><span><i class="legend-dot pale"></i>Interviews</span></div></div></div><div class="panel"><div class="panel-head"><div><h3 class="panel-title">Application pipeline</h3><div class="panel-subtitle">Current candidate funnel distribution</div></div><i class="bi bi-funnel text-secondary"></i></div><div class="panel-body"><div class="pipeline">${pipe}</div></div></div></div><div class="panel table-panel"><div class="panel-head"><div><h3 class="panel-title">Recent applications</h3><div class="panel-subtitle">Latest candidate activity across open roles</div></div><a class="text-link" href="#" data-page="applications">View all <i class="bi bi-arrow-right"></i></a></div><div class="table-responsive"><table class="table align-middle"><thead><tr><th>Candidate</th><th>Job opening</th><th>Status</th><th>Applied on</th><th>Actions</th></tr></thead><tbody>${
        recent || `<tr><td colspan="5">${emptyState("No applications yet", "Add students, jobs and applications to populate your dashboard.")}</td></tr>`
      }</tbody></table></div></div><div class="text-end small text-secondary">Logged in as: <strong>${esc(u.username)}</strong> (${esc(
        u.role
      )}) · Student profiles: ${s.students} · Interviews: ${s.interviews} · Selected: ${s.selected}</div>`
    );
  } catch (e) {
    $("#pageView").html(emptyState("Could not load dashboard", e.message));
    toast(e.message, "error");
  }
}

function renderSkills(skills) {
  if (!Array.isArray(skills) || !skills.length) return "—";
  return skills
    .slice(0, 3)
    .map((s) => `<span class="skill-pill">${esc(s)}</span>`)
    .join("");
}

function recordRows(key, records) {
  return records.map((r) => {
    switch (key) {
      case "companies":
        return row([entity(r.name, r.industry), esc(r.location || "—"), esc(r.contactEmail || "—"), badge(r.status), fmtDate(r.createdAt)], r._id);
      case "jobs": {
        const applyBtn =
          !state.user?.isAdmin && r.status === "Open"
            ? `<button class="btn btn-primary btn-sm py-1 px-2 me-1" data-action="quickApplyJob" data-id="${esc(r._id)}" title="Apply as ${esc(
                state.user?.username
              )}"><i class="bi bi-send-check me-1"></i>Apply</button>`
            : "";
        return row(
          [entity(r.title, labelOf(r.company)), esc(r.department || "—"), esc(r.location || "—"), esc(r.salary || "—"), badge(r.status), fmtDate(r.deadline)],
          r._id,
          applyBtn
        );
      }
      case "students":
        return row(
          [entity(r.name, r.regNo, r.avatar), esc(r.email), esc(r.department), `<strong>${esc(r.cgpa ?? "—")}</strong>`, renderSkills(r.skills)],
          r._id
        );
      case "applications":
        return row(
          [entity(labelOf(r.student), r.student?.regNo || "Student", r.student?.avatar), entity(labelOf(r.job), labelOf(r.job?.company)), badge(r.status), fmtDate(r.appliedAt)],
          r._id
        );
      case "interviews":
        return row(
          [entity(labelOf(r.application?.student), labelOf(r.application?.job)), esc(r.round), fmtDateTime(r.scheduledAt), esc(r.mode), badge(r.status)],
          r._id
        );
      default:
        return "";
    }
  });
}

async function loadTable(key) {
  const cfg = config[key];
  const extraBtn =
    key === "students"
      ? `<button class="btn btn-light" data-action="importRandomStudents"><i class="bi bi-cloud-plus me-1"></i> Import RandomUser API</button> `
      : key === "companies"
      ? `<button class="btn btn-light" data-action="importPlaceholderCompanies"><i class="bi bi-cloud-plus me-1"></i> Import JSONPlaceholder API</button> `
      : key === "jobs"
      ? `<button class="btn btn-light" data-page="public-apis"><i class="bi bi-cloud-arrow-down me-1"></i> Import Live Jobs</button> `
      : "";

  pageHeading(cfg.title, cfg.subtitle, `${extraBtn}${addButton(`Add ${cfg.singular.toLowerCase()}`, "bi-plus-lg")}`);
  $("#pageView").html(`<div class="loading-state"><div class="spinner-border text-primary"></div><p>Loading ${cfg.title.toLowerCase()}…</p></div>`);
  try {
    const records = await loadCollection(key, true);
    let filtered = records;
    if (state.query) filtered = filtered.filter((r) => JSON.stringify(r).toLowerCase().includes(state.query.toLowerCase()));
    if (state.status) filtered = filtered.filter((r) => r.status === state.status);
    let headers, emptyTitle, emptyDesc;
    switch (key) {
      case "companies":
        headers = ["Company", "Location", "Recruiter email", "Status", "Created", "Actions"];
        emptyTitle = "No companies yet";
        emptyDesc = "Register your first employer or import from Public APIs.";
        break;
      case "jobs":
        headers = ["Job opening", "Department", "Location", "Compensation", "Status", "Deadline", "Actions"];
        emptyTitle = "No job openings yet";
        emptyDesc = "Create a job opening or import live listings from Public APIs.";
        break;
      case "students":
        headers = ["Student", "Email", "Department", "CGPA", "Top Skills", "Actions"];
        emptyTitle = "No students yet";
        emptyDesc = "Add student profiles or import candidates from RandomUser API.";
        break;
      case "applications":
        headers = ["Candidate", "Job opening", "Status", "Applied on", "Actions"];
        emptyTitle = "No applications yet";
        emptyDesc = "Create student and job records first, then register an application.";
        break;
      default:
        headers = ["Candidate", "Interview round", "Date & time", "Mode", "Status", "Actions"];
        emptyTitle = "No interviews yet";
        emptyDesc = "Schedule an interview from a candidate application.";
    }
    const rows = recordRows(key, filtered);
    $("#pageView").html(tableShell(headers, rows, emptyTitle, emptyDesc));
    updateNavCounts();
  } catch (e) {
    $("#pageView").html(emptyState("Could not load records", e.message));
    toast(e.message, "error");
  }
}

async function quickApplyJob(jobId) {
  try {
    const students = await loadCollection("students", true);
    const jobs = await loadCollection("jobs", true);
    const job = jobs.find((j) => j._id === jobId);
    const sNum = state.user?.studentNumber || 1;
    let student = students[sNum - 1] || students[0];
    if (!student) {
      student = await api("/students", {
        method: "POST",
        body: JSON.stringify({
          name: state.user?.name || `Student ${sNum}`,
          regNo: `24BCS${String(100 + sNum).padStart(4, "0")}`,
          email: `${state.user?.username || "student1"}@campus.edu`,
          department: "Computer Science",
          graduationYear: 2027,
          cgpa: 8.5,
          skills: ["JavaScript", "Python", "SQL"]
        })
      });
    }
    await api("/applications", {
      method: "POST",
      body: JSON.stringify({
        student: student._id,
        job: jobId,
        status: "Applied",
        notes: `Submitted by ${state.user?.username || student.name} via Student Portal.`
      })
    });
    state.records.applications = null;
    toast(`Applied to "${job?.title || "Job"}" as ${student.name}!`);
    await navigate("applications");
  } catch (e) {
    toast(e.message, "error");
  }
}

async function loadReports() {
  pageHeading(
    "Reports & analytics",
    "Comprehensive placement statistics and conversion breakdown.",
    `<button class="btn btn-light" id="exportReportBtn"><i class="bi bi-download me-1"></i> Export summary CSV</button>`
  );
  try {
    const s = await api("/reports/summary");
    const apps = await loadCollection("applications", true);
    const jobs = await loadCollection("jobs", true);
    const rate = s.applications ? Math.round((s.selected / s.applications) * 100) : 0;
    const cards = [
      ["Total applications", s.applications, "All recorded applications"],
      ["Shortlisted candidates", s.shortlisted, "Candidates progressing"],
      ["Selection rate", rate + "%", "Selected / total applications"]
    ]
      .map((c) => `<div class="report-card"><div class="label">${c[0]}</div><div class="value">${c[1]}</div><div class="caption">${c[2]}</div></div>`)
      .join("");
    const byStatus = (s.appsByStatus || [])
      .map((x) => `<tr><td>${badge(x._id)}</td><td><strong>${x.count}</strong></td><td>${s.applications ? Math.round((x.count / s.applications) * 100) : 0}%</td></tr>`)
      .join("");
    const byJobs = jobs
      .map(
        (j) =>
          `<tr><td><strong>${esc(j.title)}</strong></td><td>${esc(labelOf(j.company))}</td><td>${badge(j.status)}</td><td>${
            apps.filter((a) => idOf(a.job) === j._id).length
          }</td></tr>`
      )
      .join("");
    $("#pageView").html(
      `<div class="report-cards">${cards}</div><div class="dashboard-grid"><div class="panel"><div class="panel-head"><div><h3 class="panel-title">Application status breakdown</h3><div class="panel-subtitle">Real-time stage metrics</div></div></div><div class="table-responsive"><table class="table"><thead><tr><th>Status</th><th>Count</th><th>Share</th></tr></thead><tbody>${
        byStatus || `<tr><td colspan="3">${emptyState("No report data", "Create applications to generate a breakdown.")}</td></tr>`
      }</tbody></table></div></div><div class="panel"><div class="panel-head"><div><h3 class="panel-title">Recruitment snapshot</h3><div class="panel-subtitle">Workspace totals</div></div></div><div class="panel-body"><div class="pipeline">${[
        ["Companies", s.companies],
        ["Students", s.students],
        ["Jobs", s.jobs],
        ["Interviews", s.interviews],
        ["Selected", s.selected]
      ]
        .map(
          (x) =>
            `<div class="pipeline-row"><span class="pipeline-label">${x[0]}</span><div class="pipeline-track"><div class="pipeline-fill" style="width:${Math.min(
              100,
              (x[1] / Math.max(1, s.jobs, s.students, s.applications)) * 100
            )}%"></div></div><span class="pipeline-number">${x[1]}</span></div>`
        )
        .join("")}</div></div></div></div><div class="panel table-panel"><div class="panel-head"><div><h3 class="panel-title">Job performance</h3><div class="panel-subtitle">Applications per job opening</div></div></div><div class="table-responsive"><table class="table"><thead><tr><th>Job</th><th>Company</th><th>Status</th><th>Applications</th></tr></thead><tbody>${
        byJobs || `<tr><td colspan="4">${emptyState("No jobs yet", "Create a job to see performance.")}</td></tr>`
      }</tbody></table></div></div>`
    );
  } catch (e) {
    $("#pageView").html(emptyState("Could not load reports", e.message));
    toast(e.message, "error");
  }
}

/* ==================== PUBLIC APIs INTEGRATION HUB ==================== */
async function loadPublicApisHub() {
  pageHeading(
    "Public APIs Integration Hub",
    "Connect, inspect and import live jobs, employer companies and candidate profiles from public REST APIs.",
    `<button class="btn btn-light" data-action="importRandomStudents"><i class="bi bi-people me-1"></i> +5 RandomUser Students</button> <button class="btn btn-primary" data-action="resyncAllPublic"><i class="bi bi-arrow-repeat me-1"></i> Sync All Public APIs</button>`
  );
  $("#pageView").html(`<div class="loading-state"><div class="spinner-border text-primary"></div><p>Fetching live streams from Remotive, Arbeitnow, DummyJSON &amp; RandomUser APIs…</p></div>`);

  if (!state.liveFeedJobs.length) {
    const [remotiveData, arbeitnowData] = await Promise.all([
      fetchWithTiming("remotiveJobs", PUBLIC_APIS.remotiveJobs.url),
      fetchWithTiming("arbeitnowJobs", PUBLIC_APIS.arbeitnowJobs.url)
    ]);
    const remotiveJobs = remotiveData?.jobs || [];
    const arbeitJobs = arbeitnowData?.data || [];
    state.liveFeedJobs = [
      ...remotiveJobs.slice(0, 6).map((j) => ({
        title: j.title,
        companyName: j.company_name,
        location: j.candidate_required_location || "Remote",
        jobType: "Full-time",
        salary: j.salary || "₹12–20 LPA (Remote)",
        category: j.category || "Engineering",
        url: j.url,
        source: "Remotive API",
        tags: (j.tags || []).slice(0, 4)
      })),
      ...arbeitJobs.slice(0, 6).map((j) => ({
        title: j.title,
        companyName: j.company_name,
        location: j.location || (j.remote ? "Remote" : "Hybrid"),
        jobType: "Full-time",
        salary: "₹10–18 LPA",
        category: (j.tags && j.tags[0]) || "Engineering",
        url: j.url,
        source: "Arbeitnow API",
        tags: (j.tags || []).slice(0, 4)
      }))
    ];
  }

  const apiCards = Object.entries(PUBLIC_APIS)
    .map(([key, info]) => {
      const m = state.apiMetrics[key];
      const statusBadge = m?.ok
        ? `<span class="status-badge status-open">Online · ${m.ms}ms</span>`
        : `<span class="status-badge status-shortlisted">Ready</span>`;
      return `<div class="api-card">
        <div>
          <div class="api-card-head">
            <div>
              <h4 class="panel-title">${esc(info.name)}</h4>
              <div class="panel-subtitle">${esc(info.category)}</div>
            </div>
            ${statusBadge}
          </div>
          <div class="api-endpoint mt-3">${esc(info.url)}</div>
        </div>
        <div class="d-flex justify-content-between align-items-center pt-1">
          <a href="${esc(info.docs)}" target="_blank" rel="noreferrer" class="text-link">API Docs <i class="bi bi-box-arrow-up-right"></i></a>
          <button class="btn btn-light btn-sm" data-action="testSingleApi" data-api-key="${esc(key)}"><i class="bi bi-lightning-charge me-1"></i> Test &amp; Fetch</button>
        </div>
      </div>`;
    })
    .join("");

  const liveJobRows = state.liveFeedJobs
    .map(
      (j, idx) => `<tr>
      <td>${entity(j.title, j.companyName)}</td>
      <td><span class="api-tag">${esc(j.source)}</span></td>
      <td>${esc(j.location)}</td>
      <td>${esc(j.salary)}</td>
      <td>${renderSkills(j.tags)}</td>
      <td>
        <button class="btn btn-primary btn-sm py-1 px-2" data-action="importLiveJob" data-idx="${idx}">
          <i class="bi bi-plus-circle me-1"></i> Import to Portal
        </button>
      </td>
    </tr>`
    )
    .join("");

  $("#pageView").html(`
    <div class="api-grid">${apiCards}</div>
    <div class="panel table-panel">
      <div class="panel-head">
        <div>
          <h3 class="panel-title">Live Global Job Stream (Remotive &amp; Arbeitnow Public APIs)</h3>
          <div class="panel-subtitle">Click "Import to Portal" to save any live job and its employer directly into your JobFair workspace</div>
        </div>
        <span class="eyebrow">REAL-TIME EXTERNAL FEED</span>
      </div>
      <div class="table-responsive">
        <table class="table align-middle">
          <thead>
            <tr>
              <th>Role &amp; Company</th>
              <th>Source API</th>
              <th>Location</th>
              <th>Compensation</th>
              <th>Skills / Tags</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${liveJobRows || `<tr><td colspan="6">${emptyState("No live feed items loaded", "Click Sync All Public APIs above to fetch live remote jobs.")}</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `);
}

async function importLiveJobByIndex(idx) {
  const item = state.liveFeedJobs[idx];
  if (!item) return;
  try {
    const companies = await loadCollection("companies", true);
    let comp = companies.find((c) => c.name.toLowerCase() === item.companyName.toLowerCase());
    if (!comp) {
      comp = await api("/companies", {
        method: "POST",
        body: JSON.stringify({
          name: item.companyName,
          industry: "Technology",
          location: item.location || "Remote",
          website: item.url || `https://${item.companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
          contactEmail: `careers@${item.companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
          status: "Active"
        })
      });
    }
    await api("/jobs", {
      method: "POST",
      body: JSON.stringify({
        title: item.title,
        company: comp._id,
        department: "Engineering",
        location: item.location || "Remote",
        jobType: item.jobType || "Full-time",
        salary: item.salary || "₹12–18 LPA",
        minCgpa: 6.5,
        deadline: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
        skills: item.tags?.length ? item.tags : ["JavaScript", "Cloud", "API"],
        status: "Open",
        description: `Imported from ${item.source} (${item.url || "Public API"}).`
      })
    });
    state.records.companies = null;
    state.records.jobs = null;
    await loadCollection("jobs", true);
    toast(`Imported "${item.title}" at ${item.companyName}!`, "info");
  } catch (e) {
    toast(e.message, "error");
  }
}

async function importRandomStudents() {
  try {
    toast("Fetching candidate profiles from RandomUser.me API…", "info");
    const data = await fetchWithTiming("randomUser", "https://randomuser.me/api/?results=5&nat=in,us,gb");
    const results = data?.results || [];
    if (!results.length) throw new Error("RandomUser API returned no profiles");
    const depts = ["Computer Science", "Data Science", "Information Technology", "Electronics"];
    const skillsPool = [
      ["Python", "FastAPI", "MongoDB"],
      ["React", "TypeScript", "Node.js"],
      ["Java", "Spring Boot", "AWS"],
      ["SQL", "PowerBI", "TensorFlow"]
    ];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      await api("/students", {
        method: "POST",
        body: JSON.stringify({
          name: `${r.name.first} ${r.name.last}`,
          regNo: `24BCS${Math.floor(1000 + Math.random() * 8999)}`,
          email: r.email,
          avatar: r.picture?.thumbnail || "",
          department: depts[i % depts.length],
          graduationYear: 2027,
          cgpa: Number((7.2 + Math.random() * 2.5).toFixed(2)),
          skills: skillsPool[i % skillsPool.length],
          resumeUrl: `https://campus.edu/cv/${r.login?.username || "student"}`
        })
      });
    }
    state.records.students = null;
    toast(`Imported ${results.length} student profiles from RandomUser.me API!`);
    if (state.page === "students" || state.page === "dashboard") await navigate(state.page);
    else updateNavCounts();
  } catch (e) {
    toast(e.message, "error");
  }
}

async function importPlaceholderCompanies() {
  try {
    toast("Fetching enterprise directory from JSONPlaceholder API…", "info");
    const users = await fetchWithTiming("jsonPlaceholder", PUBLIC_APIS.jsonPlaceholder.url);
    if (!Array.isArray(users) || !users.length) throw new Error("Could not reach JSONPlaceholder API");
    const industries = ["Technology", "Consulting", "Finance", "Healthcare"];
    let added = 0;
    for (const u of users.slice(0, 4)) {
      if (u.company?.name) {
        await api("/companies", {
          method: "POST",
          body: JSON.stringify({
            name: u.company.name,
            industry: industries[added % industries.length],
            location: `${u.address?.city || "Austin"}, Remote`,
            website: `https://${u.website || "company.org"}`,
            contactEmail: u.email,
            status: "Active"
          })
        });
        added++;
      }
    }
    state.records.companies = null;
    toast(`Imported ${added} companies from JSONPlaceholder API!`);
    if (state.page === "companies" || state.page === "dashboard") await navigate(state.page);
    else updateNavCounts();
  } catch (e) {
    toast(e.message, "error");
  }
}

async function navigate(page) {
  if (!["dashboard", "reports", "public-apis", ...Object.keys(config)].includes(page)) page = "dashboard";
  state.page = page;
  state.query = "";
  state.status = "";
  $(".side-nav .nav-link").removeClass("active");
  $(`.side-nav [data-page="${page}"]`).addClass("active");
  $("#sidebar").removeClass("open");
  if (page === "dashboard") return loadDashboard();
  if (page === "reports") return loadReports();
  if (page === "public-apis") return loadPublicApisHub();
  return loadTable(page);
}

/* ==================== FORMS & CRUD ==================== */
function valInput(f, value) {
  if (f.type === "select") {
    return `<select class="form-select" name="${f.name}" ${f.required ? "required" : ""}>${(f.options || [])
      .map((o) => `<option value="${esc(o)}" ${String(value ?? "") === o ? "selected" : ""}>${esc(o)}</option>`)
      .join("")}</select>`;
  }
  if (f.type === "selectDynamic") {
    const items = state.records[f.source] || [];
    return `<select class="form-select" name="${f.name}" ${f.required ? "required" : ""}><option value="">Choose ${esc(
      f.label.toLowerCase()
    )}</option>${items
      .map((o) => {
        const label =
          f.source === "companies"
            ? o.name
            : f.source === "students"
            ? `${o.name} (${o.regNo})`
            : f.source === "jobs"
            ? `${o.title} — ${labelOf(o.company)}`
            : `${labelOf(o.student)} — ${labelOf(o.job)}`;
        return `<option value="${esc(o._id)}" ${String(idOf(value) || "") === o._id ? "selected" : ""}>${esc(label)}</option>`;
      })
      .join("")}</select>`;
  }
  if (f.type === "textarea")
    return `<textarea class="form-control" name="${f.name}" rows="3" placeholder="${esc(f.placeholder || "")}" ${f.required ? "required" : ""}>${esc(
      Array.isArray(value) ? value.join(", ") : value || ""
    )}</textarea>`;
  let v = value ?? "";
  if (f.type === "date" && v) v = new Date(v).toISOString().slice(0, 10);
  if (f.type === "datetime-local" && v) {
    const d = new Date(v);
    v = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  if (f.name === "company" || f.name === "student" || f.name === "job" || f.name === "application") v = idOf(value) || "";
  return `<input class="form-control" name="${f.name}" type="${f.type || "text"}" value="${esc(v)}" placeholder="${esc(f.placeholder || "")}" ${
    f.required ? "required" : ""
  } ${f.min !== undefined ? `min="${f.min}"` : ""} ${f.max !== undefined ? `max="${f.max}"` : ""} ${f.step ? `step="${f.step}"` : ""}>`;
}

async function openRecordModal(key, id = null) {
  const cfg = config[key];
  if (!cfg) return;
  try {
    for (const f of cfg.fields) if (f.type === "selectDynamic") await loadCollection(f.source, true);
    const record = id ? (state.records[key] || []).find((r) => r._id === id) || (await api(`/${key}/${id}`)) : {};
    state.editing = { key, id };
    $("#modalTitle").text(`${id ? "Edit" : "Add"} ${cfg.singular}`);
    $("#formFields").html(
      cfg.fields
        .map(
          (f) =>
            `<div class="col-md-${f.full ? 12 : 6}"><label class="form-label">${esc(f.label)} ${
              f.required ? '<span class="required-star">*</span>' : ""
            }</label>${valInput(f, record[f.name])}${f.hint ? `<div class="form-hint">${esc(f.hint)}</div>` : ""}</div>`
        )
        .join("")
    );
    $("#saveBtn").prop("disabled", false).html('<i class="bi bi-check2 me-1"></i> Save changes');
    state.modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("recordModal"));
    state.modal.show();
  } catch (e) {
    toast(e.message, "error");
  }
}

function readForm(key) {
  const out = {};
  for (const f of config[key].fields) {
    const raw = $(`[name="${f.name}"]`).val();
    if (f.name === "skills") {
      out[f.name] = String(raw || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      continue;
    }
    if (f.type === "number") {
      out[f.name] = raw === "" ? undefined : Number(raw);
      continue;
    }
    if ((f.type === "date" || f.type === "datetime-local") && !raw) {
      out[f.name] = undefined;
      continue;
    }
    if (raw !== undefined && raw !== "") out[f.name] = raw;
  }
  return out;
}

async function saveRecord(event) {
  event.preventDefault();
  if (!state.editing) return;
  const { key, id } = state.editing;
  const cfg = config[key];
  const payload = readForm(key);
  $("#saveBtn").prop("disabled", true).html('<span class="spinner-border spinner-border-sm me-2"></span>Saving…');
  try {
    await api(`/${key}${id ? "/" + id : ""}`, { method: id ? "PUT" : "POST", body: JSON.stringify(payload) });
    for (const k of ["jobs", "applications", "companies", "students", "interviews"]) state.records[k] = null;
    state.modal.hide();
    toast(`${cfg.singular} ${id ? "updated" : "created"} successfully.`);
    await navigate(state.page === "dashboard" ? key : state.page);
  } catch (e) {
    toast(e.message, "error");
  } finally {
    $("#saveBtn").prop("disabled", false).html('<i class="bi bi-check2 me-1"></i> Save changes');
  }
}

async function deleteRecord(key, id) {
  const targetKey = config[key] ? key : "applications";
  const record = (state.records[targetKey] || []).find((r) => r._id === id);
  if (!confirm(`Delete this ${config[targetKey].singular.toLowerCase()}${record ? " (" + (record.name || record.title || record.regNo || "record") + ")" : ""}?`)) return;
  try {
    await api(`/${targetKey}/${id}`, { method: "DELETE" });
    state.records[targetKey] = null;
    toast("Record deleted.");
    await navigate(state.page);
  } catch (e) {
    toast(e.message, "error");
  }
}

function exportCSV() {
  const key = state.page;
  const rows = state.records[key] || [];
  if (!rows.length) return toast("There are no records to export.", "error");
  const keys = Object.keys(rows[0]).filter((k) => !k.startsWith("__v") && k !== "avatar");
  const csv = [
    keys.join(","),
    ...rows.map((r) =>
      keys
        .map((k) => {
          let v = r[k];
          if (v && typeof v === "object") v = Array.isArray(v) ? v.join("; ") : labelOf(v);
          return `"${String(v ?? "").replace(/"/g, '""')}"`;
        })
        .join(",")
    )
  ].join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `jobfair-${key}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ==================== COMPULSORY LOGIN PAGE FLOW ==================== */
function applyUserUI() {
  const u = state.user;
  if (!u) return;
  const initials = u.isAdmin ? "AD" : `S${u.studentNumber || 1}`;
  $("#sidebarUserName").text(u.username);
  $("#sidebarUserRole").text(u.role);
  $("#sidebarAvatar, #topAvatar").text(initials);
}

async function enterPortal(userSession) {
  state.user = userSession;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(userSession));
  applyUserUI();
  $("#loginScreen").addClass("d-none");
  $("#appShell").removeClass("d-none");
  state.modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("recordModal"));
  await checkHealth();
  await Promise.all([loadCollection("companies"), loadCollection("jobs"), loadCollection("students")]);
  await navigate("dashboard");
  toast(`Welcome ${userSession.username}! Signed in as ${userSession.role}.`);
}

function logoutPortal() {
  state.user = null;
  sessionStorage.removeItem(SESSION_KEY);
  $("#appShell").addClass("d-none");
  $("#loginScreen").removeClass("d-none");
  $("#loginPassword").val("");
  $("#loginError").addClass("d-none");
  toast("Signed out successfully.", "info");
}

/* ==================== EVENT LISTENERS ==================== */
$(document).on("click", "[data-role-tab]", function () {
  const role = $(this).data("role-tab");
  $("[data-role-tab]").removeClass("active");
  $(this).addClass("active");
  $("#loginError").addClass("d-none");
  if (role === "admin") {
    $("#loginUsername").attr("placeholder", "e.g. Admin1");
  } else {
    $("#loginUsername").attr("placeholder", "e.g. student1, student2, …");
  }
});

$(document).on("click", "[data-fill-user]", function () {
  const u = $(this).data("fill-user");
  const p = $(this).data("fill-pass");
  const r = $(this).data("fill-role");
  $("[data-role-tab]").removeClass("active");
  $(`[data-role-tab="${r}"]`).addClass("active");
  $("#loginUsername").val(u);
  $("#loginPassword").val(p);
  $("#loginError").addClass("d-none");
});

$("#togglePwdBtn").on("click", function () {
  const input = $("#loginPassword");
  const isPwd = input.attr("type") === "password";
  input.attr("type", isPwd ? "text" : "password");
  $(this).find("i").attr("class", isPwd ? "bi bi-eye-slash" : "bi bi-eye");
});

$("#loginPageForm").on("submit", async function (e) {
  e.preventDefault();
  const username = $("#loginUsername").val();
  const password = $("#loginPassword").val();
  const validated = validateCredentials(username, password);
  if (!validated) {
    $("#loginErrorText").text("Invalid credentials! Use Admin1 / Admin@1234 or student1 / Student@1, student2 / Student@2, …");
    $("#loginError").removeClass("d-none");
    return;
  }
  $("#loginError").addClass("d-none");
  await enterPortal(validated);
});

$("#logoutSidebarBtn, #logoutTopBtn").on("click", logoutPortal);

$(document).on("click", "[data-page]", function (e) {
  e.preventDefault();
  navigate($(this).data("page"));
});

$(document).on("click", "[data-action]", async function () {
  const action = $(this).data("action");
  if (action === "addRecord") return openRecordModal(state.page);
  if (action === "quickAddJob") return openRecordModal("jobs");
  if (action === "quickApplyJob") return quickApplyJob($(this).data("id"));
  if (action === "edit") return openRecordModal(config[state.page] ? state.page : "applications", $(this).data("id"));
  if (action === "delete") return deleteRecord(config[state.page] ? state.page : "applications", $(this).data("id"));
  if (action === "importLiveJob") return importLiveJobByIndex(Number($(this).data("idx")));
  if (action === "importRandomStudents") return importRandomStudents();
  if (action === "importPlaceholderCompanies") return importPlaceholderCompanies();
  if (action === "resyncAllPublic") {
    toast("Re-syncing workspace with live Public APIs…", "info");
    await seedFromPublicAPIs(true);
    state.records = {};
    await navigate(state.page);
    toast("Workspace synced with fresh Public API data!");
  }
  if (action === "testSingleApi") {
    const key = $(this).data("api-key");
    const info = PUBLIC_APIS[key];
    if (!info) return;
    toast(`Pinging ${info.name}…`, "info");
    await fetchWithTiming(key, info.url);
    const m = state.apiMetrics[key];
    if (m?.ok) toast(`${info.name} responded in ${m.ms}ms!`);
    else toast(`${info.name} failed: ${m?.error || "Error"}`, "error");
    if (state.page === "public-apis") loadPublicApisHub();
  }
});

$("#recordForm").on("submit", saveRecord);

$("#syncPublicBtn").on("click", async () => {
  toast("Syncing fresh records from Public APIs…", "info");
  await seedFromPublicAPIs(true);
  state.records = {};
  await navigate(state.page);
  toast("Public APIs synced successfully!");
});

$("#refreshBtn").on("click", async () => {
  state.records = {};
  await checkHealth();
  await navigate(state.page);
  toast("Workspace refreshed.");
});

$("#notifBtn").on("click", () => {
  const jobsCount = (state.records.jobs || []).length;
  const appsCount = (state.records.applications || []).length;
  toast(`Live Status: ${jobsCount} active job openings and ${appsCount} candidate applications synced.`, "info");
});

$("#mobileMenu").on("click", () => $("#sidebar").toggleClass("open"));

$(document).on("input", "#tableSearch", function () {
  state.query = $(this).val();
  const pos = this.selectionStart;
  loadTable(state.page).then(() => {
    const el = document.getElementById("tableSearch");
    if (el) {
      el.focus();
      el.setSelectionRange(pos, pos);
    }
  });
});

$(document).on("change", "#statusFilter", function () {
  state.status = $(this).val();
  loadTable(state.page);
});

$(document).on("click", "#exportBtn", exportCSV);

$(document).on("click", "#exportReportBtn", async () => {
  const s = await api("/reports/summary");
  const rows = [
    ["Metric", "Value"],
    ["Companies", s.companies],
    ["Students", s.students],
    ["Jobs", s.jobs],
    ["Applications", s.applications],
    ["Shortlisted", s.shortlisted],
    ["Interviews", s.interviews],
    ["Selected", s.selected],
    ...(s.appsByStatus || []).map((x) => ["Applications: " + x._id, x.count])
  ];
  const blob = new Blob(["\ufeff" + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n")], {
    type: "text/csv;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "jobfair-report.csv";
  a.click();
  URL.revokeObjectURL(url);
});

$(function () {
  // Always start on the compulsory Login Screen unless already authenticated in this tab session
  $("#appShell").addClass("d-none");
  $("#loginScreen").removeClass("d-none");
});
