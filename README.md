# JobFair Nexus — Online Job Fair & Recruitment Management System

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/professor-hs/JobFair-MongoDB-Project)

A full-stack campus placement and job fair management system built with **HTML5, CSS3, Bootstrap 5, jQuery, Node.js, Express, MongoDB**, and integrated with **Live Public REST APIs** for instant cloud & static deployment on **Netlify**.

## 🔐 Compulsory Starting Login Credentials
- **Admin Login**:
  - **Username**: `Admin1`
  - **Password**: `Admin@1234`
- **Student Logins** (supports any `student<N>` / `Student@<N>`):
  - **Student 1**: `student1` / `Student@1`
  - **Student 2**: `student2` / `Student@2`
  - **Student 3**: `student3` / `Student@3`
  - **Student N**: `studentN` / `Student@N`

## ✨ Key Features
- **Compulsory Role-Based Login Gate**: Full-screen starting authentication for Placement Administrators and Students.
- **Interactive Placement Dashboard**: Live KPIs, monthly recruitment activity charts, and candidate pipeline distribution.
- **Live Public APIs Integration Hub**:
  - **Remotive Remote Jobs API** (`https://remotive.com/api/remote-jobs`) — real-time global tech job listings.
  - **Arbeitnow Public Job Board API** (`https://www.arbeitnow.com/api/job-board-api`) — live software & engineering job openings.
  - **DummyJSON Users & Employers API** (`https://dummyjson.com/users`) — employer companies, roles, departments, and candidate profiles.
  - **RandomUser.me Generator API** (`https://randomuser.me/api/`) — 1-click import of realistic student candidate profiles with avatars.
  - **JSONPlaceholder Enterprise API** (`https://jsonplaceholder.typicode.com/users`) — 1-click import of recruiter & employer directories.
- **Full CRUD Workflows**:
  - **Companies**: Register, edit, filter, and import employer networks.
  - **Job Openings**: Publish roles, set CGPA eligibility, skills, compensation, 1-click student apply, and import live jobs from external APIs.
  - **Students**: Manage candidate profiles, CGPA, graduation years, skills, and avatars.
  - **Applications**: Track candidates from *Applied → Under Review → Shortlisted → Interview Scheduled → Selected*.
  - **Interviews**: Coordinate HR, Technical, Coding, and Final rounds with meeting links/venues.
  - **Reports & Analytics**: Conversion rates, job performance metrics, and 1-click **CSV Export**.

## 🚀 Quick Start (Local Development)
```powershell
cd JobFair-MongoDB
npm install
npm run dev
```
Open `http://localhost:5000` in your browser.
