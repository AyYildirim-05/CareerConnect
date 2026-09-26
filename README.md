# CareerConnect — Job Search & Application Tracking Platform

[![Course](https://img.shields.io/badge/SOEN-341_Software_Process-blue.svg)](https://www.concordia.ca/)
[![Sprint](https://img.shields.io/badge/Sprint-1_Delivery-green.svg)](#)

> **Repository URL**: [https://github.com/AyYildirim-05/CareerConnect](https://github.com/AyYildirim-05/CareerConnect)  
> **Course**: SOEN 341 — Software Process (Fall 2026)  
> **Target Audience / Primary Users**: Job Seekers and Recruiters

---

## Table of Contents
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
    - [Team-Generated Original Features](#team-generated-original-features)
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
* **Fragmented Job Tracking**: Job seekers apply across disparate job boards, resulting in disorganized records, missed deadlines, and lost follow-up opportunities.
* **Resume Misalignment & Manual Ingestion**: Applicants struggle to align their resumes with job requirements, while manually re-entering employment history into application forms causes excessive friction.
* **Recruiter Screening Inefficiencies**: Recruiters face large volumes of unstructured candidate submissions, requiring tedious manual reviews and repetitive questionnaire administration.

### The Proposed Solution
* **Unified Application Dashboard**: A Kanban and tabular pipeline that centralizes application statuses, reminders, and historical data in real time.
* **Intelligent Resume Ingestion**: Automated extraction of work experiences and education from uploaded PDF resumes into editable profile records.
* **Screening Question Ecosystem**: A centralized question library allowing recruiters to attach standardized prompts to postings and enabling seekers to maintain reusable responses that auto-fill applications.
* **GenAI-Powered Optimization Engine**: Automated tailoring, ATS gap analysis, and candidate-job match evaluation powered by large language models.

---

## System Architecture & Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | React.js, Tailwind CSS | Responsive, component-driven client architecture |
| **Backend / API** | Node.js, Express.js | RESTful API architecture handling business logic and auth |
| **Database** | PostgreSQL | Relational database modeling users, postings, questions, and applications |
| **Authentication** | JWT (JSON Web Tokens) & BCrypt | Role-Based Access Control (RBAC) separating Job Seekers and Recruiters |
| **Document Processing** | `pdf-parse` / PDF Extraction Service | Ingestion and structured extraction of PDF resumes |
| **AI Integration** | OpenAI API / Google Gemini API | LLM integration for resume evaluation and job matching |
| **Version Control & CI/CD** | Git, GitHub, GitHub Projects | Automated linting, test suites, branch protection, and Agile Kanban boards |

---

## Key Features

### Core Features
1. **Role-Based Authentication & Profiles**: Secure registration and login separating Job Seekers and Recruiters with role-specific views.
2. **Resume Management**: Upload, preview, update, and manage candidate resumes in PDF format.
3. **Recruiter Job Posting Portal**: Full CRUD management of job listings with criteria, salary ranges, deadlines, and employment types.
4. **Job Search & Advanced Filters**: Multi-parameter search by keyword, location, remote status, job type, and experience level.
5. **Application Funnel Tracking**: End-to-end status tracking (`Applied` $\to$ `Interview` $\to$ `Offered` $\to$ `Rejected`).
6. **Notifications & Deadlines**: In-app alert system reminding users of upcoming deadlines and application status updates.
7. **Saved Favourites**: Bookmark jobs for later review and application.

### Generative AI Feature
* **AI-Assisted Resume Feedback & Match Analyzer**: An LLM-powered module evaluating candidate resumes against target job postings, generating an ATS compatibility score, identifying missing keywords, and suggesting concrete resume revisions.

### Team-Generated Original Features
*(Formulated through internal team brainstorming to exceed baseline AI outputs)*
1. **Automated Resume Parsing & Editable Experience Extraction (US-21)**: Automated parsing of uploaded PDF resumes that maps unstructured career text into structured database fields (work history, skills, education) which applicants can review, modify, or extend manually.
2. **Recruiter Screening Question Template Library (US-22)**: A centralized repository where recruiters can define, store, and attach standardized screening questions across active job postings.
3. **Candidate Screening Bank, Auto-Fill & Question Badges (US-23)**: A dedicated questionnaire hub where seekers can answer recruiter screening questions in advance; matching questions auto-populate during job applications, while an unread notification counter alerts seekers to newly introduced recruiter questions.

---

## Development Setup & Installation

### Prerequisites
* **Node.js**: `v18.x` or higher
* **npm** (`v9.x` or higher)
* **Git** installed locally
* **PostgreSQL**: Local instance running on port 5432 or a valid remote connection URI

### 1. Clone the Repository
```bash
git clone [https://github.com/AyYildirim-05/CareerConnect.git](https://github.com/AyYildirim-05/CareerConnect.git)
cd CareerConnect
```

### 2. Environment Variables Configuration
Create a `.env` file in `/server` and `/client`:

**`/server/.env`**:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/careerconnect
JWT_SECRET=your_super_secret_jwt_key
GEMINI_API_KEY=your_gemini_or_openai_api_key
```

**`/client/.env`**:
```env
REACT_APP_API_BASE_URL=http://localhost:5000/api
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
npm start
```
The application will launch at `http://localhost:3000`.

---

## Team Process & Agile Governance

### Branching & Pull Request Strategy
* **Protected Branches**:
  * `main`: Production-ready release code. Direct pushes are disabled.
  * `develop`: Integration branch for sprint deliverables.
* **Feature Branches**:
  * Format: `feature/US-<id>-<short-description>` (e.g., `feature/US-01-user-auth`)
  * Bugfixes: `bugfix/<issue-id>-<short-description>`
* **Pull Request (PR) Requirements**:
  1. PR must link to its corresponding GitHub Issue (`Closes #IssueNumber`).
  2. At least **one peer code review approval** is mandatory before merging.
  3. All automated CI checks must pass.
  4. Branches must be merged into `develop` via squashed/rebased commits.

### Definition of Ready (DoR)
A User Story is ready for sprint backlog inclusion when:
- [ ] It follows standard Agile syntax: *"As a `<role>`, I want `<feature>` so that `<benefit>`"*.
- [ ] Explicit Acceptance Criteria are defined.
- [ ] Effort estimation (story points) has been assigned.
- [ ] Technical dependencies and schema impacts are documented.
- [ ] Assigned team member has reviewed and accepted the scope.

### Definition of Done (DoD)
A task or user story is considered Done when:
- [ ] Code is fully implemented adhering to project style guidelines.
- [ ] Unit and integration tests pass locally and on GitHub Actions CI.
- [ ] Code has been reviewed and approved by at least one peer.
- [ ] Feature branch merges into `develop` without conflicts.
- [ ] Acceptance criteria have been verified in the running application.
- [ ] Any GenAI interactions involved are documented in the member's `/AI_Log/<Name>/` report.

### Code Review Guidelines
* **Readability**: Logic is modular, clean, and well-commented where complex.
* **Security**: Input validation, password hashing, and token checks are enforced.
* **Scope Verification**: Implements all acceptance criteria stated in the linked user story without unnecessary scope creep.

---

## Sprint 1 Scope & Demo

### Deliverables
* **Repository Architecture**: Initialized repository, GitHub Projects Kanban board, labels, milestones, and issue tracking.
* **User Stories & Tasks**: Comprehensive backlog containing at least 15 user stories and broken-down child tasks with assignees and priorities.
* **Team Process Definition**: Formal branching policy, PR review gates, DoR, and DoD.
* **AI Usage Documentation**: `AI_Log/` directory containing individual member subdirectories and Sprint 1 PDF logs.

### Sprint 1 Code Demonstration (Two Basic Features)
1. **Feature 1: User Registration & Authentication (US-01)**
   - Role-based registration (`Job Seeker` vs. `Recruiter`).
   - Secure login endpoint utilizing salted password hashes and JWT token issuance.
2. **Feature 2: Profile Management & Resume Parsing Ingestion (US-02 & US-21)**
   - Candidate profile view with contact, bio, and education fields.
   - Multipart PDF upload that extracts work experience blocks directly into editable form fields before profile persistence.

---

## Repository Directory Structure

```text
CareerConnect/
├── .github/
│   ├── workflows/             # CI/CD automation pipelines
│   └── PULL_REQUEST_TEMPLATE.md
├── AI_Log/                    # GenAI tracking reports
│   ├── Student_A/             #
│   │   └── Sprint1_AI_Log.pdf #
│   ├── Student_B/             #
│   │   └── Sprint1_AI_Log.pdf #
│   └── ...                    #
├── docs/                      # Sprint documentation
│   ├── meeting_minutes/       # Weekly meeting minutes & attendance
│   ├── sprint_backlog.md      # Sprint 1 work plan & effort estimates
│   └── user_stories.md        # Comprehensive backlog of user stories
├── client/                    # React frontend client
│   ├── public/
│   └── src/
├── server/                    # Node/Express backend API
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   └── config/
├── .gitignore
├── package.json
└── README.md                  #
```

---

## Team Members & Contributions

| Member Name | Student ID | GitHub Handle | Primary Role / Responsibility | Sprint 1 Contributions |
|---|---|---|---|---|
| *Ahmet Yusuf Yildirim* | *40340020* | `@AyYildirim-05` | Scrum Master | Repository setup, board initialization, registration UI/API, finalizing user stories |
| *Full Name 2* | *Concordia ID* | `@github2` | Backend Lead | Database schemas, JWT authentication, Express routing |
| *Full Name 3* | *Concordia ID* | `@github3` | Frontend Lead | Profile dashboard view, editable experience UI components |
| *Full Name 4* | *Concordia ID* | `@github4` | Backend / AI Specialist | PDF parsing ingestion pipeline, AI log documentation |
| *Full Name 5* | *Concordia ID* | `@github5` | QA / DevOps / Product Owner | README documentation, DoD/DoR definitions, CI pipeline |