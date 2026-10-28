const bcrypt = require('bcryptjs');

/**
 * In-Memory Firestore Provider
 * Provides a Firestore-compatible API with pre-seeded demo data for seamless local development
 * and professor evaluations without requiring external cloud IAM credentials.
 */
function createMockFirestore() {
  const store = {
    users: new Map(),
    jobSeekers: new Map(),
    recruiters: new Map(),
    companies: new Map(),
    jobPostings: new Map(),
    savedJobs: new Map()
  };

  function getMap(coll) {
    if (!store[coll]) store[coll] = new Map();
    return store[coll];
  }

  function createDocRef(coll, id) {
    const map = getMap(coll);
    return {
      id,
      async get() {
        const item = map.get(id);
        return {
          id,
          exists: Boolean(item),
          data: () => (item ? { ...item } : undefined)
        };
      },
      async set(data) {
        map.set(id, { ...data, id });
      },
      async update(data) {
        const existing = map.get(id) || {};
        map.set(id, { ...existing, ...data, id });
      },
      async delete() {
        map.delete(id);
      }
    };
  }

  function createQuery(coll, filters = [], limitNum = null) {
    return {
      where(field, op, val) {
        return createQuery(coll, [...filters, { field, op, val }], limitNum);
      },
      limit(n) {
        return createQuery(coll, filters, n);
      },
      async get() {
        const map = getMap(coll);
        let items = Array.from(map.values());

        for (const f of filters) {
          if (f.op === '==') {
            items = items.filter((item) => String(item[f.field]) === String(f.val));
          }
        }

        if (typeof limitNum === 'number' && limitNum > 0) {
          items = items.slice(0, limitNum);
        }

        const docs = items.map((item) => ({
          id: item.id,
          exists: true,
          data: () => ({ ...item }),
          ref: createDocRef(coll, item.id)
        }));

        return {
          empty: docs.length === 0,
          size: docs.length,
          docs
        };
      }
    };
  }

  const firestore = {
    collection(name) {
      return {
        doc(id) {
          const docId = id ? String(id) : `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          return createDocRef(name, docId);
        },
        where(field, op, val) {
          return createQuery(name, [{ field, op, val }]);
        },
        async get() {
          return createQuery(name, []).get();
        }
      };
    },
    batch() {
      const operations = [];
      return {
        update(ref, data) {
          operations.push(() => ref.update(data));
        },
        async commit() {
          for (const op of operations) {
            await op();
          }
        }
      };
    }
  };

  // Pre-seed demo data
  seedDemoData(store);

  return firestore;
}

function seedDemoData(store) {
  const hash = bcrypt.hashSync('Password123!', 10);
  const now = new Date().toISOString();

  // 1. Recruiter user & company
  const recruiterUser = {
    id: 'user_recruiter_1',
    email: 'recruiter@careerconnect.com',
    password_hash: hash,
    role: 'Recruiter',
    created_at: now,
    updated_at: now
  };
  store.users.set(recruiterUser.id, recruiterUser);

  const recruiterProfile = {
    id: 'user_recruiter_1',
    fullName: 'Sarah Jenkins',
    position: 'Lead Talent Partner',
    companyName: 'CloudScale Technologies',
    created_at: now,
    updated_at: now
  };
  store.recruiters.set(recruiterProfile.id, recruiterProfile);

  const company = {
    id: 'comp_cloudscale_1',
    ownerId: 'user_recruiter_1',
    name: 'CloudScale Technologies',
    industry: 'Cloud Computing & AI',
    size: '250-500',
    location: 'Montreal, QC',
    website: 'https://cloudscale.example.com',
    description: 'Leading provider of next-generation distributed cloud infrastructure and developer tooling.',
    created_at: now,
    updated_at: now
  };
  store.companies.set(company.id, company);

  // 2. Job Seeker user
  const seekerUser = {
    id: 'user_seeker_1',
    email: 'jobseeker@careerconnect.com',
    password_hash: hash,
    role: 'Job Seeker',
    created_at: now,
    updated_at: now
  };
  store.users.set(seekerUser.id, seekerUser);

  const seekerProfile = {
    id: 'user_seeker_1',
    fullName: 'Alex Mercer',
    email: 'jobseeker@careerconnect.com',
    phone: '(514) 789-0123',
    location: 'Montreal, QC',
    bio: 'Software Engineering student with passion for full-stack web and cloud systems.',
    skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'],
    created_at: now,
    updated_at: now
  };
  store.jobSeekers.set(seekerProfile.id, seekerProfile);

  // 3. Comprehensive Demo Job Postings (52 unique jobs across Canada)
  const postings = [
    {
      id: 'job_post_1',
      title: 'Senior Full Stack Developer',
      companyId: company.id,
      companyName: 'CloudScale Technologies',
      recruiterId: recruiterUser.id,
      department: 'Core Platform Engineering',
      location: 'Montreal, QC',
      jobType: 'Full-time',
      workMode: 'Hybrid',
      description: 'Join our distributed platforms team building high-performance APIs and interactive dashboards with Node.js, Express, and React.',
      requirements: '3+ years experience with JavaScript/TypeScript, Express, React, and cloud architectures.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_2',
      title: 'Junior Frontend Engineer',
      companyId: company.id,
      companyName: 'DesignSpark Labs',
      recruiterId: recruiterUser.id,
      department: 'Product Design',
      location: 'Toronto, ON',
      jobType: 'Full-time',
      workMode: 'Remote',
      description: 'Develop responsive, accessible, and high-quality UI components in React and modern CSS.',
      requirements: 'Proficiency in React, HTML5, CSS3, modern JavaScript, and component-driven development.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_3',
      title: 'Data Analyst & Insights Intern',
      companyId: company.id,
      companyName: 'FinMetrics Global',
      recruiterId: recruiterUser.id,
      department: 'Business Intelligence',
      location: 'Montreal, QC',
      jobType: 'Internship',
      workMode: 'On-site',
      description: 'Support financial analytics modeling, SQL database querying, and data visualization pipelines.',
      requirements: 'Pursuing a degree in Software Engineering, Computer Science, or Statistics. Familiarity with SQL and Python.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_4',
      title: 'DevOps & Cloud Infrastructure Specialist',
      companyId: company.id,
      companyName: 'ScaleGrid Systems',
      recruiterId: recruiterUser.id,
      department: 'Operations',
      location: 'Vancouver, BC',
      jobType: 'Contract',
      workMode: 'Remote',
      description: 'Manage automated CI/CD deployment pipelines, containerized clusters, and monitoring telemetry.',
      requirements: 'Experience with Docker, Kubernetes, Linux servers, and cloud providers (AWS/GCP).',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_5',
      title: 'Backend Node.js & Microservices Engineer',
      companyId: company.id,
      companyName: 'CloudScale Technologies',
      recruiterId: recruiterUser.id,
      department: 'Platform Services',
      location: 'Montreal, QC',
      jobType: 'Full-time',
      workMode: 'On-site',
      description: 'Architect resilient backend services, event-driven message brokers, and secure RESTful endpoints.',
      requirements: 'Solid knowledge of Node.js, Express, async programming, database optimization, and REST security.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_6',
      title: 'Software Engineering Co-op / Intern',
      companyId: company.id,
      companyName: 'NexGen Mobility',
      recruiterId: recruiterUser.id,
      department: 'Autonomous Systems',
      location: 'Ottawa, ON',
      jobType: 'Internship',
      workMode: 'Hybrid',
      description: 'Contribute to embedded software testing, simulation environments, and telemetry dashboards.',
      requirements: 'Curious, proactive software engineering student. Knowledge of Git, JavaScript or Python.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_7',
      title: 'Machine Learning Engineer',
      companyId: company.id,
      companyName: 'NeuroSynthetica AI',
      recruiterId: recruiterUser.id,
      department: 'Applied AI',
      location: 'Toronto, ON',
      jobType: 'Full-time',
      workMode: 'Remote',
      description: 'Deploy deep learning models for NLP and computer vision inference pipelines at scale.',
      requirements: 'Python, PyTorch, TensorFlow, Docker, MLOps, vector embeddings.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_8',
      title: 'iOS Mobile App Developer',
      companyId: company.id,
      companyName: 'SwiftWave Apps',
      recruiterId: recruiterUser.id,
      department: 'Mobile Engineering',
      location: 'Vancouver, BC',
      jobType: 'Full-time',
      workMode: 'Hybrid',
      description: 'Architect smooth and intuitive consumer mobile applications using SwiftUI and Combine.',
      requirements: 'Swift, SwiftUI, iOS SDK, RESTful API integration, App Store deployment.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_9',
      title: 'Android Engineer (Kotlin)',
      companyId: company.id,
      companyName: 'MobileWorks Studio',
      recruiterId: recruiterUser.id,
      department: 'Mobile Core',
      location: 'Montreal, QC',
      jobType: 'Contract',
      workMode: 'Remote',
      description: 'Build native Android apps utilizing Jetpack Compose and clean architecture patterns.',
      requirements: 'Kotlin, Jetpack Compose, Coroutines, Gradle, MVVM.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_10',
      title: 'Cybersecurity & SOC Analyst',
      companyId: company.id,
      companyName: 'CyberShield Canada',
      recruiterId: recruiterUser.id,
      department: 'Security Operations',
      location: 'Ottawa, ON',
      jobType: 'Full-time',
      workMode: 'On-site',
      description: 'Monitor enterprise SIEM alerts, conduct vulnerability scanning, and coordinate threat response.',
      requirements: 'Security+, CISSP, network protocols, Wireshark, Splunk, incident response.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_11',
      title: 'Site Reliability Engineer (SRE)',
      companyId: company.id,
      companyName: 'CloudScale Technologies',
      recruiterId: recruiterUser.id,
      department: 'Infrastructure Reliability',
      location: 'Toronto, ON',
      jobType: 'Full-time',
      workMode: 'Remote',
      description: 'Maintain 99.99% system availability through automated observability, chaos experiments, and SLO monitoring.',
      requirements: 'Prometheus, Grafana, Terraform, Linux internals, Golang or Python.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 11).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_12',
      title: 'UI/UX Product Designer',
      companyId: company.id,
      companyName: 'DesignSpark Labs',
      recruiterId: recruiterUser.id,
      department: 'Product Design',
      location: 'Vancouver, BC',
      jobType: 'Full-time',
      workMode: 'Hybrid',
      description: 'Lead discovery research, design systems, and wireframing for web and mobile platforms.',
      requirements: 'Figma, user research, wireframing, interactive prototyping, typography.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_13',
      title: 'QA Automation Engineer',
      companyId: company.id,
      companyName: 'TestCraft Solutions',
      recruiterId: recruiterUser.id,
      department: 'Quality Engineering',
      location: 'Montreal, QC',
      jobType: 'Full-time',
      workMode: 'Remote',
      description: 'Design and execute comprehensive automated end-to-end testing suites for web APIs and user flows.',
      requirements: 'Cypress, Playwright, Jest, Selenium, CI/CD integration.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 13).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_14',
      title: 'Cloud Data Architect (Snowflake & AWS)',
      companyId: company.id,
      companyName: 'FinMetrics Global',
      recruiterId: recruiterUser.id,
      department: 'Data Platform',
      location: 'Calgary, AB',
      jobType: 'Contract',
      workMode: 'Remote',
      description: 'Design data lakes, ETL pipelines, and analytical data warehouses handling terabytes of financial logs.',
      requirements: 'Snowflake, dbt, Apache Airflow, Python, AWS Redshift, SQL optimization.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_15',
      title: 'Full Stack Web Developer Intern',
      companyId: company.id,
      companyName: 'CodeCraft Academy',
      recruiterId: recruiterUser.id,
      department: 'EdTech Tools',
      location: 'Montreal, QC',
      jobType: 'Internship',
      workMode: 'On-site',
      description: 'Assist in developing interactive coding exercises, grading systems, and student dashboards in React.',
      requirements: 'Familiarity with HTML, CSS, JavaScript, React, Git, Node.js.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_16',
      title: 'Product Manager - Enterprise SaaS',
      companyId: company.id,
      companyName: 'NorthStar Software',
      recruiterId: recruiterUser.id,
      department: 'Product Management',
      location: 'Toronto, ON',
      jobType: 'Full-time',
      workMode: 'Hybrid',
      description: 'Define sprint backlogs, analyze customer retention metrics, and ship enterprise B2B features.',
      requirements: '2+ years product management, Agile/Scrum, roadmapping, Jira, product analytics.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 16).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_17',
      title: 'Embedded Firmware Developer',
      companyId: company.id,
      companyName: 'NexGen Mobility',
      recruiterId: recruiterUser.id,
      department: 'Hardware Systems',
      location: 'Waterloo, ON',
      jobType: 'Full-time',
      workMode: 'On-site',
      description: 'Program real-time microcontroller firmware for automotive sensors, CAN bus, and IoT modules.',
      requirements: 'C, C++, RTOS, microcontroller debugging, oscilloscopes, SPI/I2C.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 17).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_18',
      title: 'AI Research Scientist (NLP & LLMs)',
      companyId: company.id,
      companyName: 'DeepLogic Labs',
      recruiterId: recruiterUser.id,
      department: 'Research & Innovation',
      location: 'Montreal, QC',
      jobType: 'Full-time',
      workMode: 'Hybrid',
      description: 'Fine-tune large language models, implement RAG architectures, and publish AI research findings.',
      requirements: 'PhD or MSc in CS/AI, transformers, LangChain, vector databases, PyTorch.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_19',
      title: 'Database Administrator (PostgreSQL)',
      companyId: company.id,
      companyName: 'DataSphere Systems',
      recruiterId: recruiterUser.id,
      department: 'Data Infrastructure',
      location: 'Calgary, AB',
      jobType: 'Contract',
      workMode: 'Remote',
      description: 'Optimize high-traffic PostgreSQL database clusters, query planning, replication, and backup routines.',
      requirements: 'PostgreSQL, query tuning, indexing strategies, backup recovery, WAL archiving.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 19).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_20',
      title: 'Technical Support Specialist',
      companyId: company.id,
      companyName: 'CloudScale Technologies',
      recruiterId: recruiterUser.id,
      department: 'Customer Success',
      location: 'Halifax, NS',
      jobType: 'Part-time',
      workMode: 'Remote',
      description: 'Troubleshoot customer API integration questions, inspect server logs, and document technical solutions.',
      requirements: 'Excellent communication, REST APIs, HTTP status codes, browser developer tools.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_21',
      title: 'React Native Developer',
      companyId: company.id,
      companyName: 'AppLaunch Co',
      recruiterId: recruiterUser.id,
      department: 'Mobile Delivery',
      location: 'Toronto, ON',
      jobType: 'Contract',
      workMode: 'Remote',
      description: 'Build cross-platform mobile apps using React Native, Expo, and state management libraries.',
      requirements: 'React Native, Expo, Redux / Zustand, JavaScript/TypeScript, mobile debugging.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_22',
      title: 'Blockchain Protocol Engineer',
      companyId: company.id,
      companyName: 'CryptoLedger Labs',
      recruiterId: recruiterUser.id,
      department: 'Core Protocol',
      location: 'Vancouver, BC',
      jobType: 'Full-time',
      workMode: 'Remote',
      description: 'Design smart contract architectures, consensus mechanisms, and cryptographic validation engines.',
      requirements: 'Solidity, Rust, EVM, zero-knowledge proofs, cryptography fundamentals.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 22).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_23',
      title: 'Frontend Vue.js Developer',
      companyId: company.id,
      companyName: 'PixelCraft Interactive',
      recruiterId: recruiterUser.id,
      department: 'Creative Tech',
      location: 'Quebec City, QC',
      jobType: 'Full-time',
      workMode: 'Hybrid',
      description: 'Build modern interactive SPAs using Vue 3, Pinia, and Nuxt.js with dynamic animations.',
      requirements: 'Vue 3, Nuxt, TypeScript, Pinia, Tailwind CSS, animation libraries.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 23).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_24',
      title: 'Cloud Security Architect',
      companyId: company.id,
      companyName: 'CyberShield Canada',
      recruiterId: recruiterUser.id,
      department: 'Cloud Security',
      location: 'Ottawa, ON',
      jobType: 'Contract',
      workMode: 'Remote',
      description: 'Architect Zero-Trust security postures, IAM permissions, and automated compliance policies across multi-cloud.',
      requirements: 'AWS Security Specialty, Azure Security, IAM, encryption, SOC2 compliance.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 24).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_25',
      title: 'Data Engineering Intern',
      companyId: company.id,
      companyName: 'FinMetrics Global',
      recruiterId: recruiterUser.id,
      department: 'Data Pipelines',
      location: 'Toronto, ON',
      jobType: 'Internship',
      workMode: 'Hybrid',
      description: 'Build automated data pipelines for cleansing, aggregating, and transforming unstructured financial records.',
      requirements: 'Python, SQL, Pandas, basic understanding of ETL concepts and databases.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_26',
      title: 'Scrum Master & Agile Coach',
      companyId: company.id,
      companyName: 'AgileVelocity',
      recruiterId: recruiterUser.id,
      department: 'Agile Delivery',
      location: 'Montreal, QC',
      jobType: 'Full-time',
      workMode: 'Remote',
      description: 'Facilitate sprint planning, daily standups, backlog refinement, and retrospectives across cross-functional teams.',
      requirements: 'CSM or PSM certification, 2+ years Agile coaching, sprint metrics, Jira.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 26).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_27',
      title: 'Game Engine Programmer (C++)',
      companyId: company.id,
      companyName: 'Frostbite Studios',
      recruiterId: recruiterUser.id,
      department: 'Game Tech',
      location: 'Montreal, QC',
      jobType: 'Full-time',
      workMode: 'On-site',
      description: 'Program real-time rendering systems, physics calculations, and performance profiling in C++.',
      requirements: 'C++, linear algebra, 3D graphics, OpenGL/DirectX or Unreal Engine.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 27).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_28',
      title: 'Technical Content Writer & Developer Advocate',
      companyId: company.id,
      companyName: 'DevRel Global',
      recruiterId: recruiterUser.id,
      department: 'Developer Relations',
      location: 'Toronto, ON',
      jobType: 'Part-time',
      workMode: 'Remote',
      description: 'Produce developer tutorials, API documentation, blog guides, and open-source starter repos.',
      requirements: 'Technical writing experience, ability to code in JavaScript or Python, Git, Markdown.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 28).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_29',
      title: 'Junior Python Developer',
      companyId: company.id,
      companyName: 'DataPulse Analytics',
      recruiterId: recruiterUser.id,
      department: 'Analytics Services',
      location: 'Waterloo, ON',
      jobType: 'Full-time',
      workMode: 'Hybrid',
      description: 'Develop automation scripts, data scraping bots, and REST microservices in FastAPI and Flask.',
      requirements: 'Python 3, FastAPI or Django/Flask, relational databases, Git.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 29).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_30',
      title: 'Cloud Systems Administrator',
      companyId: company.id,
      companyName: 'ScaleGrid Systems',
      recruiterId: recruiterUser.id,
      department: 'SysAdmin Ops',
      location: 'Edmonton, AB',
      jobType: 'Full-time',
      workMode: 'On-site',
      description: 'Manage on-premise server racks and hybrid cloud connections, user permissions, and network firewalls.',
      requirements: 'Linux (Ubuntu/RHEL), Active Directory, Bash scripting, network troubleshooting.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_31',
      title: 'Computer Vision Researcher',
      companyId: company.id,
      companyName: 'NeuroSynthetica AI',
      recruiterId: recruiterUser.id,
      department: 'Vision AI',
      location: 'Montreal, QC',
      jobType: 'Full-time',
      workMode: 'Hybrid',
      description: 'Conduct research on object detection, real-time segmentation, and edge device model optimization.',
      requirements: 'OpenCV, PyTorch, YOLO, image processing algorithms, Python, C++.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 31).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_32',
      title: 'Growth Marketing Analyst',
      companyId: company.id,
      companyName: 'MetricFlow Digital',
      recruiterId: recruiterUser.id,
      department: 'Growth & Acquisition',
      location: 'Vancouver, BC',
      jobType: 'Full-time',
      workMode: 'Remote',
      description: 'Analyze user funnel conversion, cohort retention, and Google Analytics attribution pipelines.',
      requirements: 'Google Analytics 4, SQL, Tableau, conversion rate optimization, A/B testing.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 32).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_33',
      title: 'Bio-Informatics Software Engineer',
      companyId: company.id,
      companyName: 'Genomix Canada',
      recruiterId: recruiterUser.id,
      department: 'Life Sciences Tech',
      location: 'Montreal, QC',
      jobType: 'Full-time',
      workMode: 'On-site',
      description: 'Process genomic DNA sequencing datasets, build biological data parsers, and maintain scientific computing pipelines.',
      requirements: 'Python, R, Nextflow, bioinformatics workflows, Unix tools, Git.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 33).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_34',
      title: 'IT Helpdesk Technician',
      companyId: company.id,
      companyName: 'EnterpriseIT Care',
      recruiterId: recruiterUser.id,
      department: 'Internal Support',
      location: 'Ottawa, ON',
      jobType: 'Part-time',
      workMode: 'On-site',
      description: 'Provide desktop troubleshooting, workstation hardware provisioning, and printer/network configuration.',
      requirements: 'Windows 11, macOS troubleshooting, hardware replacement, customer service skills.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 34).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_35',
      title: 'Senior Java / Spring Boot Architect',
      companyId: company.id,
      companyName: 'FinMetrics Global',
      recruiterId: recruiterUser.id,
      department: 'Banking Engines',
      location: 'Toronto, ON',
      jobType: 'Full-time',
      workMode: 'Hybrid',
      description: 'Lead architecture of mission-critical banking ledger services and transactional message queues.',
      requirements: 'Java 17+, Spring Boot, Kafka, Hibernate, PostgreSQL, JUnit, microservices design.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 35).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_36',
      title: 'Robotics Software Co-op',
      companyId: company.id,
      companyName: 'AutoBotics Labs',
      recruiterId: recruiterUser.id,
      department: 'Motion Planning',
      location: 'Waterloo, ON',
      jobType: 'Internship',
      workMode: 'On-site',
      description: 'Implement trajectory planning and obstacle avoidance algorithms for autonomous mobile warehouse robots.',
      requirements: 'ROS / ROS2, C++, Python, kinematics understanding, simulation in Gazebo.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 36).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_37',
      title: 'React & Next.js Web Engineer',
      companyId: company.id,
      companyName: 'DesignSpark Labs',
      recruiterId: recruiterUser.id,
      department: 'Web Experiences',
      location: 'Montreal, QC',
      jobType: 'Contract',
      workMode: 'Remote',
      description: 'Build fast, SEO-optimized web portals using Next.js 14, server components, and Tailwind CSS.',
      requirements: 'React, Next.js (App Router), TypeScript, SSR, web performance optimization.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 37).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_38',
      title: 'Infrastructure Security Specialist',
      companyId: company.id,
      companyName: 'CyberShield Canada',
      recruiterId: recruiterUser.id,
      department: 'Defense Operations',
      location: 'Calgary, AB',
      jobType: 'Full-time',
      workMode: 'Remote',
      description: 'Conduct penetration testing, implement firewall policies, and secure container runtimes.',
      requirements: 'Kali Linux, Metasploit, network defense, penetration testing, security certifications.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 38).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_39',
      title: 'Associate Product Marketing Manager',
      companyId: company.id,
      companyName: 'NorthStar Software',
      recruiterId: recruiterUser.id,
      department: 'Marketing Strategy',
      location: 'Vancouver, BC',
      jobType: 'Full-time',
      workMode: 'Hybrid',
      description: 'Execute go-to-market strategies, produce product release notes, and conduct competitor intelligence.',
      requirements: 'Product marketing experience, strong copywriting, launch coordination, presentation skills.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 39).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_40',
      title: 'Cloud Network Engineer',
      companyId: company.id,
      companyName: 'ScaleGrid Systems',
      recruiterId: recruiterUser.id,
      department: 'Networking',
      location: 'Toronto, ON',
      jobType: 'Contract',
      workMode: 'On-site',
      description: 'Design VPC topologies, direct connect links, BGP routing, and VPN tunnels between data centers.',
      requirements: 'CCNA/CCNP, BGP, AWS Direct Connect, VPC peering, Cisco routers, DNS management.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_41',
      title: 'Quantum Computing Algorithm Intern',
      companyId: company.id,
      companyName: 'Q-Sphere Tech',
      recruiterId: recruiterUser.id,
      department: 'Quantum Algorithms',
      location: 'Waterloo, ON',
      jobType: 'Internship',
      workMode: 'Hybrid',
      description: 'Simulate quantum circuits and optimize quantum Fourier transform algorithms using Qiskit.',
      requirements: 'Enrolled in Physics, Math or CS. Python, linear algebra, quantum computing basics (Qiskit/Cirq).',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 41).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_42',
      title: 'Senior Golang Backend Engineer',
      companyId: company.id,
      companyName: 'HyperStream Networks',
      recruiterId: recruiterUser.id,
      department: 'Streaming Services',
      location: 'Vancouver, BC',
      jobType: 'Full-time',
      workMode: 'Remote',
      description: 'Engineer high-throughput real-time video streaming relays and WebSockets servers in Go.',
      requirements: 'Golang, concurrency, Goroutines, WebSockets, gRPC, distributed caching (Redis).',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 42).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_43',
      title: 'Business Intelligence Developer',
      companyId: company.id,
      companyName: 'FinMetrics Global',
      recruiterId: recruiterUser.id,
      department: 'BI Reporting',
      location: 'Montreal, QC',
      jobType: 'Full-time',
      workMode: 'On-site',
      description: 'Build executive KPI dashboards, automated reporting triggers, and data modeling structures.',
      requirements: 'PowerBI or Tableau, DAX, complex SQL queries, database indexing, business acumen.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 43).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_44',
      title: 'Salesforce CRM Developer',
      companyId: company.id,
      companyName: 'CloudConsult Group',
      recruiterId: recruiterUser.id,
      department: 'Enterprise Solutions',
      location: 'Toronto, ON',
      jobType: 'Contract',
      workMode: 'Remote',
      description: 'Customize Salesforce Sales Cloud, implement Apex triggers, and design Lightning Web Components (LWC).',
      requirements: 'Salesforce Certified Developer, Apex, SOQL, Lightning Web Components, workflow automation.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 44).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_45',
      title: 'Computer Systems Hardware Tester',
      companyId: company.id,
      companyName: 'NexGen Mobility',
      recruiterId: recruiterUser.id,
      department: 'Validation QA',
      location: 'Ottawa, ON',
      jobType: 'Part-time',
      workMode: 'On-site',
      description: 'Perform physical environmental stress testing, voltage checks, and hardware burn-in diagnostics.',
      requirements: 'Hardware diagnostics, soldering, multi-meters, test benches, documentation.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_46',
      title: 'UX Researcher & Usability Specialist',
      companyId: company.id,
      companyName: 'DesignSpark Labs',
      recruiterId: recruiterUser.id,
      department: 'User Experience',
      location: 'Montreal, QC',
      jobType: 'Full-time',
      workMode: 'Hybrid',
      description: 'Moderate customer interviews, run unmoderated card-sorting tests, and synthesize design recommendations.',
      requirements: 'Qualitative research, usability testing platforms, persona synthesis, customer journey maps.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 46).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_47',
      title: 'Solutions Architect (AWS & Cloud)',
      companyId: company.id,
      companyName: 'CloudScale Technologies',
      recruiterId: recruiterUser.id,
      department: 'Customer Architecture',
      location: 'Calgary, AB',
      jobType: 'Full-time',
      workMode: 'Remote',
      description: 'Design enterprise cloud adoption blueprints, serverless architectures, and technical migration plans.',
      requirements: 'AWS Certified Solutions Architect, microservices, cost optimization, pre-sales architecture.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 47).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_48',
      title: 'Junior QA Manual & API Tester',
      companyId: company.id,
      companyName: 'TestCraft Solutions',
      recruiterId: recruiterUser.id,
      department: 'Quality Verification',
      location: 'Toronto, ON',
      jobType: 'Full-time',
      workMode: 'Hybrid',
      description: 'Create detailed test plans, write bug reproduction tickets, and perform REST API verification using Postman.',
      requirements: 'Postman, REST APIs, Jira bug reporting, test plan creation, attention to detail.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 48).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_49',
      title: 'Web Accessibility (a11y) Consultant',
      companyId: company.id,
      companyName: 'AccessWeb Canada',
      recruiterId: recruiterUser.id,
      department: 'Compliance',
      location: 'Vancouver, BC',
      jobType: 'Contract',
      workMode: 'Remote',
      description: 'Audit enterprise websites against WCAG 2.1 AA standards using screen readers and automated scanners.',
      requirements: 'WCAG 2.1 AA, NVDA/JAWS/VoiceOver screen readers, semantic HTML, ARIA landmarks.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 49).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_50',
      title: 'Deep Learning Vision Intern',
      companyId: company.id,
      companyName: 'NeuroSynthetica AI',
      recruiterId: recruiterUser.id,
      department: 'Research Co-op',
      location: 'Toronto, ON',
      jobType: 'Internship',
      workMode: 'Remote',
      description: 'Experiment with vision transformers and synthetic dataset generation for autonomous defect recognition.',
      requirements: 'Python, PyTorch, Convolutional Neural Networks, OpenCV, Git.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 50).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_51',
      title: 'Senior Distributed Systems Engineer',
      companyId: company.id,
      companyName: 'ScaleGrid Systems',
      recruiterId: recruiterUser.id,
      department: 'Core Infrastructure',
      location: 'Montreal, QC',
      jobType: 'Full-time',
      workMode: 'Remote',
      description: 'Build fault-tolerant distributed storage systems, consensus algorithms, and ultra low-latency messaging backbones.',
      requirements: 'Distributed consensus (Raft/Paxos), C++ or Rust or Go, Linux socket programming.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 51).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: 'job_post_52',
      title: 'Junior IT Operations Associate',
      companyId: company.id,
      companyName: 'EnterpriseIT Care',
      recruiterId: recruiterUser.id,
      department: 'Operations Support',
      location: 'Halifax, NS',
      jobType: 'Full-time',
      workMode: 'On-site',
      description: 'Provision cloud virtual machines, configure backup policies, and monitor system health metrics.',
      requirements: 'Operating systems basics, Bash/PowerShell commands, willingness to learn cloud tooling.',
      status: 'published',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 52).toISOString(),
      created_at: now,
      updated_at: now
    }
  ];

  postings.forEach((job) => {
    store.jobPostings.set(job.id, job);
  });
}

module.exports = createMockFirestore;
