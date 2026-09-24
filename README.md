# CareerConnect

# CareerConnect — Job Search & Application Tracking Platform

[![Course](https://img.shields.io/badge/SOEN-341_Software_Process-blue.svg)](https://www.concordia.ca/)
[![Sprint](https://img.shields.io/badge/Sprint-1_Delivery-green.svg)](#)


> **Repository URL**: [https://github.com/AyYildirim-05/CareerConnect](https://github.com/AyYildirim-05/CareerConnect)  
> **Course**: SOEN 341 — Software Process (Fall 2026)  
> **Target Audience / Primary Users**: Job Seekers and Recruiters

---

## Table of Contents
- [CareerConnect](#careerconnect)
- [CareerConnect — Job Search \& Application Tracking Platform](#careerconnect--job-search--application-tracking-platform)
  - [Table of Contents](#table-of-contents)
  - [Project Overview](#project-overview)
  - [Identified Problem \& Proposed Solution](#identified-problem--proposed-solution)
    - [The Problem](#the-problem)
    - [The Proposed Solution](#the-proposed-solution)
  - [System Architecture \& Tech Stack](#system-architecture--tech-stack)
  - [Key Features](#key-features)
    - [Core Features](#core-features)
    - [Generative AI Feature](#generative-ai-feature)
    - [Original Team-Generated Features](#original-team-generated-features)
  - [Development Setup \& Installation](#development-setup--installation)
    - [Prerequisites](#prerequisites)
    - [1. Clone the Repository](#1-clone-the-repository)
    - [2. Environment Variables Configuration](#2-environment-variables-configuration)
    - [3. Backend Setup](#3-backend-setup)
    - [4. Frontend Setup](#4-frontend-setup)
  - [Team Process \& Agile Governance](#team-process--agile-governance)
    - [Branching \& Pull Request Strategy](#branching--pull-request-strategy)
    - [Definition of Ready (DoR)](#definition-of-ready-dor)
    - [Definition of Done (DoD)](#definition-of-done-dod)
    - [Code Review Guidelines](#code-review-guidelines)
  - [Sprint 1 Scope \& Demo](#sprint-1-scope--demo)
    - [Deliverables](#deliverables)
    - [Sprint 1 Code Demonstration (Two Basic Features)](#sprint-1-code-demonstration-two-basic-features)
  - [Repository Directory Structure](#repository-directory-structure)
  - [Team Members \& Contributions](#team-members--contributions)

---

## Project Overview

**CareerConnect** is a centralized, full-stack web application designed to simplify and optimize the employment lifecycle for both job candidates and talent acquisition teams. The platform equips candidates with tools to store resumes, monitor recruitment funnels (Applied $\to$ Interview $\to$ Offer $\to$ Rejection), and receive intelligent resume/job-matching insights. Simultaneously, recruiters are provided with intuitive dashboards to publish openings, screen candidate pools, and streamline communication.

---

## Identified Problem & Proposed Solution

### The Problem
* **Fragmented Job Tracking**: Job seekers often apply across multiple distinct platforms (LinkedIn, Indeed, company portals, email threads), leading to disorganized application records, missed deadlines, and lost follow-up opportunities.
* **Resume Misalignment**: Applicants struggle to identify whether their credentials align with Automated Tracking Systems (ATS) and specific job postings before submitting applications.
* **Recruiter Inefficiency**: Recruiters are inundated with unstructured, unvetted applications, slowing down candidate screening and interview scheduling.

### The Proposed Solution
* **Unified Application Dashboard**: A Kanban and tabular pipeline that centralizes application statuses, reminders, and historical data in real time.
* **Recruiter Management Portal**: An end-to-end portal allowing recruiters to create postings, set qualification filters, and update applicant statuses directly.
* **GenAI-Powered Optimization Engine**: Automated tailoring and keyword gap analysis between a candidate's uploaded resume and target job descriptions to increase interview conversion rates.

---

## System Architecture & Tech Stack

*(Update this section to match your team's agreed tech stack)*

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | React.js / Next.js / Javascript, Tailwind CSS | Responsive, component-driven UI with client-side state handling |
| **Backend / API** | Node.js + Express.js | RESTful API architecture handling business logic and auth |
| **Database** | PostgreSQL / MongoDB | Persistent relational/document storage for users, jobs, and applications |
| **Authentication** | JWT (JSON Web Tokens) & BCrypt | Role-Based Access Control (RBAC) separating Seekers and Recruiters |
| **AI Integration** | OpenAI API / Google Gemini API / HuggingFace | LLM integration for resume evaluation and job matching |
| **Version Control & CI/CD** | GitHub, GitHub Actions, GitHub Projects | Automated linting, testing, branch protection, and Agile boards |

---

## Key Features

### Core Features
1. **Role-Based Authentication & Profiles**: Secure sign-up/login for Job Seekers and Recruiters, complete with profile customizers.
2. **Resume Management**: Upload, store, preview, and update multiple resume versions (PDF/DOCX).
3. **Recruiter Job Posting Portal**: Full CRUD capabilities for job listings (requirements, salary ranges, deadlines, location type).
4. **Job Search & Advanced Filters**: Multi-parameter search by keyword, location, remote status, job type, and experience level.
5. **Application Funnel Tracking**: Status management tracking stages: `Applied` $\to$ `Reviewing` $\to$ `Interviewing` $\to$ `Offered` $\to$ `Rejected`.
6. **Notifications & Deadlines**: In-app alert system reminding users of upcoming interviews and pending deadlines.
7. **Saved Favourites**: Bookmark jobs for future consideration.

### Generative AI Feature
* **AI-Assisted Resume & Job Match Analyzer**: An LLM-powered module that evaluates candidate resumes against selected job postings, outputting an ATS match percentage, identifying missing keywords, and generating actionable tailoring suggestions.

### Original Team-Generated Features
*(Differentiated from standard template/AI suggestions)*
1. **Interactive Interview Simulator & Feedback Coach**: An AI-driven interactive prompt module that generates role-specific behavioral and technical interview questions based on the job posting, scoring candidate responses on clarity and relevance.
2. **Application Analytics & Salary Insights**: A visual telemetry dashboard showing application response rates over time and estimating salary distributions relative to current industry benchmarks.

---

## Development Setup & Installation

### Prerequisites
* **Node.js**: `v18.x` or higher
* **npm** or **yarn**
* **Git** installed on your local machine
* **Database**: PostgreSQL / MongoDB running locally or cloud-hosted URI

### 1. Clone the Repository
```bash
git clone https://github.com/AyYildirim-05/CareerConnect.git
cd CareerConnect
```

### 2. Environment Variables Configuration
Create a `.env` file in the root directory (or respective `/client` and `/server` folders):
```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/careerconnect
JWT_SECRET=your_super_secret_jwt_key
OPENAI_API_KEY=your_openai_or_gemini_api_key
```

### 3. Backend Setup
```bash
cd server
npm install
npm run dev
```

### 4. Frontend Setup
```bash
cd ../client
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to test the client interface.

---

## Team Process & Agile Governance

### Branching & Pull Request Strategy
* **Protected Branches**:
  * `main`: Production-ready, stable releases. Direct pushes are disabled.
  * `develop`: Active integration branch for sprint deliverables.
* **Feature Branches**:
  * Format: `feature/US-<id>-<short-description>` (e.g., `feature/US-01-user-auth`)
  * Bugfix branches: `bugfix/<issue-id>-<short-description>`
* **Pull Request (PR) Requirements**:
  1. Each PR must link to its corresponding GitHub Issue (`Closes #IssueNumber`).
  2. At least **one peer code review approval** is mandatory prior to merging.
  3. All automated CI checks (linting, tests) must pass.
  4. Squashed or rebased commits are preferred when merging into `develop`.

### Definition of Ready (DoR)
A User Story is ready for sprint backlog inclusion when:
- [ ] User story follows the standard template: *"As a `<role>`, I want `<feature>` so that `<benefit>`"*.
- [ ] Explicit Acceptance Criteria (Given-When-Then format) are defined.
- [ ] Story has been estimated using story points / planning poker.
- [ ] Technical dependencies and external API blockers are identified.
- [ ] Assigned team member has reviewed and accepted the scope.

### Definition of Done (DoD)
A task or user story is considered Done when:
- [ ] Code is fully written, adheres to formatting standards, and contains no debug logs.
- [ ] Unit / Integration tests are implemented and passing.
- [ ] Code has been reviewed and approved by at least one peer on GitHub.
- [ ] Feature branch is merged into `develop` without conflicts.
- [ ] Acceptance criteria have been verified in the local/staging environment.
- [ ] Any relevant AI interactions involved are documented in the member's `AI_Log/` entry.

### Code Review Guidelines
* **Readability**: Code is self-explanatory, clean, and avoids deep nesting.
* **Security**: Input validation is enforced; no hardcoded credentials or API keys exist.
* **Completeness**: Implements all acceptance criteria stated in the linked user story.

---

## Sprint 1 Scope & Demo

### Deliverables
* **Repository Architecture**: Established directory tree, GitHub Projects Kanban board, labels, and issue tracking.
* **User Stories**: A minimum of 15 fully articulated user stories tracked in GitHub Issues with assignees, priorities, and effort estimations.
* **Team Process Definition**: Established DoR, DoD, branching model, and review policies.
* **AI Usage Documentation**: `AI_Log/` directory populated with individual student folders detailing prompts, outputs, and validation evidence.

### Sprint 1 Code Demonstration (Two Basic Features)
1. **Feature 1: User Registration & Authentication (US-01)**
   - Secure registration endpoint with hashed passwords.
   - Login endpoint returning signed JWTs with role distinction (`Job Seeker` vs. `Recruiter`).
2. **Feature 2: User Profile & Resume Upload Management (US-02)**
   - Profile view allowing users to input contact details, skills, and summary.
   - Multipart file upload allowing resume files (`.pdf`) to be stored and referenced.

---

## Repository Directory Structure

```text
CareerConnect/
├── .github/
│   ├── workflows/             # CI/CD action pipelines
│   └── PULL_REQUEST_TEMPLATE.md
├── AI_Log/                    # GenAI tracking reports
│   ├── Student_A/
│   │   └── Sprint1_AI_Log.pdf
│   ├── Student_B/
│   │   └── Sprint1_AI_Log.pdf
│   └── ...
├── docs/                      # Sprint planning & requirements
│   ├── meeting_minutes/       # Weekly meeting minutes & attendance
│   ├── sprint_backlog.md      # Sprint 1 backlog & effort estimates
│   └── user_stories.md        # Comprehensive list of user stories
├── client/                    # Frontend client application
│   ├── public/
│   └── src/
├── server/                    # Backend API application
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   └── config/
├── .gitignore
├── package.json
└── README.md
```

---

## Team Members & Contributions

| Member Name | Student ID | GitHub Handle | Primary Role / Responsibility | Sprint 1 Contributions |
|---|---|---|---|---|
| **Member 1** | 40340020 | `@member1` | Frontend Lead / Scrum Master | UI scaffolding, User Story breakdown, meeting minutes |
| **Member 2** | 40000002 | `@member2` | Backend Lead | Auth API (Login/Signup), DB Schema design |
| **Member 3** | 40000003 | `@member3` | Full Stack Developer | Profile management & file upload handling |
| **Member 4** | 40000004 | `@member4` | QA / DevOps & AI Specialist | CI pipeline setup, AI prompt elicitation & logs |
| **Member 5** | 40000005 | `@member5` | Product Owner / UI/UX | Wireframing, README documentation, DoR/DoD specifications |