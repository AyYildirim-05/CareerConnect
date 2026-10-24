const test = require('node:test');
const assert = require('node:assert');
const ResumeParserService = require('../services/resumeParserService');

/**
 * Helper to construct a valid binary PDF buffer with exact cross-reference byte offsets
 * to avoid malformed xref warnings during PDF parser testing.
 */
function createValidPdf(textContent) {
  const contentStream = 'BT /F1 12 Tf 50 700 Td (' + textContent.replace(/[()\\\\]/g, '\\$&') + ') Tj ET';
  const streamLen = Buffer.byteLength(contentStream);

  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n';
  const obj4 = '4 0 obj\n<< /Length ' + streamLen + ' >>\nstream\n' + contentStream + '\nendstream\nendobj\n';
  const obj5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

  const header = '%PDF-1.4\n';
  const offsets = [0];
  let cur = header.length;
  for (const obj of [obj1, obj2, obj3, obj4, obj5]) {
    offsets.push(cur);
    cur += Buffer.byteLength(obj);
  }

  const body = header + obj1 + obj2 + obj3 + obj4 + obj5;
  const startXref = body.length;

  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) {
    xref += offsets[i].toString().padStart(10, '0') + ' 00000 n \n';
  }

  const trailer = 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + startXref + '\n%%EOF\n';
  return Buffer.from(body + xref + trailer, 'utf8');
}

test('ResumeParserService correctly parses comprehensive structured categories from resume text', () => {
  const sampleResume = `
Alexandre Tremblay
alexandre.tremblay@gmail.com | (514) 848-2424 | Montreal, QC | linkedin.com/in/alexandre-tremblay | github.com/atremblay

PROFESSIONAL SUMMARY
Results-driven Full-Stack Software Engineer with 4+ years of experience designing cloud-native architectures, distributed microservices, and reactive web applications using Node.js, TypeScript, and React. Passionate about developer tooling, API optimization, and scalable systems.

EDUCATION
Concordia University                                        2020 - 2024
Bachelor of Engineering in Software Engineering (GPA: 3.88/4.0)

WORK EXPERIENCE
Software Developer Intern                                   May 2023 - Aug 2023
Shopify
• Architected and shipped event-driven checkout services in TypeScript and Node.js serving over 2M merchants.
• Reduced 99th-percentile API response latency by 32% via Redis caching layers and PostgreSQL query indexing.

TECHNICAL PROJECTS
CareerConnect | React, Node.js, Express, PostgreSQL, Firebase
• Designed end-to-end recruitment platform featuring automated PDF resume parsing and role-based matching.
• Built interactive candidate profile dashboard with real-time Firestore synchronization and status tracking.

TECHNICAL SKILLS
Programming Languages: JavaScript, TypeScript, Python, Java, C++, SQL
Frameworks & Databases: React, Node.js, Express, PostgreSQL, Firebase, Redis, Docker

LEADERSHIP & EXTRACURRICULAR ACTIVITIES
Vice President of Technology                                2022 - 2023
Engineering Software Guild
• Mentored over 150 junior engineering students in full-stack development and system architecture.

VOLUNTEER EXPERIENCE
Volunteer Coding Mentor                                     2021 - 2022
Canada Learning Code
• Facilitated interactive weekly coding workshops for youth and underrepresented groups in tech.

CERTIFICATIONS & HONORS
AWS Certified Solutions Architect                           2023
Dean's Honor Roll                                           2022

LANGUAGES
English, French

INTERESTS
Open Source, Distributed Systems, Cycling
`;

  const parsed = ResumeParserService.parseText(sampleResume, {
    originalFilename: 'alexandre_tremblay_resume.pdf'
  });

  // Personal Info assertions
  assert.strictEqual(parsed.personalInfo.fullName, 'Alexandre Tremblay');
  assert.strictEqual(parsed.personalInfo.firstName, 'Alexandre');
  assert.strictEqual(parsed.personalInfo.lastName, 'Tremblay');
  assert.strictEqual(parsed.personalInfo.email, 'alexandre.tremblay@gmail.com');
  assert.strictEqual(parsed.personalInfo.phone, '(514) 848-2424');
  assert.strictEqual(parsed.personalInfo.location, 'Montreal, QC');
  assert.match(parsed.personalInfo.linkedin, /linkedin\.com\/in\/alexandre-tremblay/);
  assert.match(parsed.personalInfo.github, /github\.com\/atremblay/);
  assert.ok(parsed.personalInfo.summary.includes('Full-Stack Software Engineer'));

  // Work Experience assertions
  assert.strictEqual(parsed.workExperience.length, 1);
  assert.strictEqual(parsed.workExperience[0].title, 'Software Developer Intern');
  assert.strictEqual(parsed.workExperience[0].company, 'Shopify');
  assert.strictEqual(parsed.workExperience[0].dates, 'May 2023 - Aug 2023');
  assert.strictEqual(parsed.workExperience[0].bullets.length, 2);
  assert.ok(parsed.workExperience[0].bullets[0].includes('checkout services'));

  // Education assertions
  assert.strictEqual(parsed.education.length, 1);
  assert.strictEqual(parsed.education[0].institution, 'Concordia University');
  assert.ok(parsed.education[0].degree.includes('Bachelor of Engineering'));
  assert.strictEqual(parsed.education[0].gpa, '3.88/4.0');

  // Projects assertions
  assert.strictEqual(parsed.projects.length, 1);
  assert.strictEqual(parsed.projects[0].name, 'CareerConnect');
  assert.ok(parsed.projects[0].techStack.includes('React'));
  assert.ok(parsed.projects[0].techStack.includes('Node.js'));
  assert.ok(parsed.projects[0].techStack.includes('PostgreSQL'));

  // Skills assertions
  assert.ok(parsed.skills.all.includes('TypeScript'));
  assert.ok(parsed.skills.all.includes('Python'));
  assert.ok(parsed.skills.all.includes('PostgreSQL'));
  assert.ok(parsed.skills.all.includes('Docker'));
  assert.ok(parsed.skills.all.includes('Firebase'));

  // Extracurriculars assertions
  assert.strictEqual(parsed.extracurriculars.length, 1);
  assert.strictEqual(parsed.extracurriculars[0].title, 'Vice President of Technology');
  assert.strictEqual(parsed.extracurriculars[0].organization, 'Engineering Software Guild');

  // Volunteer assertions
  assert.strictEqual(parsed.volunteerExperience.length, 1);
  assert.strictEqual(parsed.volunteerExperience[0].role, 'Volunteer Coding Mentor');
  assert.strictEqual(parsed.volunteerExperience[0].organization, 'Canada Learning Code');

  // Certifications assertions
  assert.strictEqual(parsed.certifications.length, 2);
  assert.ok(parsed.certifications[0].name.includes('AWS Certified Solutions Architect'));
  assert.ok(parsed.certifications[1].name.includes("Dean's Honor Roll"));

  // Additional sections (Languages and Interests)
  assert.ok(parsed.additional);
  assert.ok(parsed.additional.languages.length > 0);
  assert.ok(parsed.additional.languages.some(l => l.includes('English')));
  assert.ok(parsed.additional.interests.length > 0);
  assert.ok(parsed.additional.interests.some(i => i.includes('Open Source')));

  // Metadata assertions
  assert.strictEqual(parsed.metadata.originalFilename, 'alexandre_tremblay_resume.pdf');
  assert.ok(parsed.metadata.parsedAt);
  assert.ok(parsed.metadata.totalSectionsDetected >= 6);
});

test('ResumeParserService handles edge cases: alternate section headings and missing optional categories', () => {
  const minimalResume = `
Maya Patel
maya.patel@outlook.com | (416) 555-0199 | Toronto, ON

ABOUT ME
Passionate Frontend Developer focused on creating accessible and performant React applications.

ACADEMIC BACKGROUND
University of Toronto                                       2019 - 2023
Honours Bachelor of Science in Computer Science

EMPLOYMENT HISTORY
Frontend Web Developer                                      Jan 2023 - Present
Klick Health
• Built responsive clinical trial dashboards using React, Redux, and TypeScript.
• Improved WCAG 2.1 AA accessibility compliance across core customer portal.

CORE COMPETENCIES
React, TypeScript, Next.js, Redux, Jest, CSS3, HTML5
`;

  const parsed = ResumeParserService.parseText(minimalResume, {
    originalFilename: 'maya_patel_resume.pdf'
  });

  assert.strictEqual(parsed.personalInfo.fullName, 'Maya Patel');
  assert.strictEqual(parsed.personalInfo.email, 'maya.patel@outlook.com');
  assert.strictEqual(parsed.personalInfo.location, 'Toronto, ON');
  assert.ok(parsed.personalInfo.summary.includes('Frontend Developer'));

  // Education with alternate heading "ACADEMIC BACKGROUND"
  assert.strictEqual(parsed.education.length, 1);
  assert.strictEqual(parsed.education[0].institution, 'University of Toronto');

  // Experience with alternate heading "EMPLOYMENT HISTORY"
  assert.strictEqual(parsed.workExperience.length, 1);
  assert.strictEqual(parsed.workExperience[0].title, 'Frontend Web Developer');
  assert.strictEqual(parsed.workExperience[0].company, 'Klick Health');

  // Skills with alternate heading "CORE COMPETENCIES"
  assert.ok(parsed.skills.all.includes('React'));
  assert.ok(parsed.skills.all.includes('TypeScript'));
  assert.ok(parsed.skills.all.includes('Next.js'));

  // Missing optional sections should safely default to empty arrays
  assert.deepStrictEqual(parsed.extracurriculars, []);
  assert.deepStrictEqual(parsed.volunteerExperience, []);
  assert.deepStrictEqual(parsed.certifications, []);
});

test('ResumeParserService extracts international phone numbers and varied link formats', () => {
  const contactText = `
Elena Rostova
elena.rostova@techmail.com | +1 (514) 555-8921 | Montreal, QC | https://www.linkedin.com/in/elenarostova | https://github.com/erostova

SUMMARY
Cloud Infrastructure Engineer with experience in Terraform and Kubernetes.

TECHNICAL SKILLS
Python, Go, Docker, Kubernetes, Terraform, AWS
`;

  const parsed = ResumeParserService.parseText(contactText);

  assert.strictEqual(parsed.personalInfo.fullName, 'Elena Rostova');
  assert.strictEqual(parsed.personalInfo.email, 'elena.rostova@techmail.com');
  assert.ok(parsed.personalInfo.phone.includes('555-8921'));
  assert.strictEqual(parsed.personalInfo.linkedin, 'https://www.linkedin.com/in/elenarostova');
  assert.strictEqual(parsed.personalInfo.github, 'https://github.com/erostova');
  assert.ok(parsed.skills.all.includes('Kubernetes'));
  assert.ok(parsed.skills.all.includes('Docker'));
});

test('ResumeParserService.parsePdf correctly extracts metadata and parses valid PDF document buffer', async () => {
  const resumeText = 'Sophia Chen\nsophia.chen@example.com | (514) 555-0182 | Montreal, QC\nSKILLS: Python, React, AWS, Docker';
  const validPdfBuffer = createValidPdf(resumeText);

  const result = await ResumeParserService.parsePdf(validPdfBuffer, {
    originalFilename: 'sophia_chen_resume.pdf',
    fileSize: validPdfBuffer.length
  });

  assert.ok(result);
  assert.strictEqual(result.metadata.originalFilename, 'sophia_chen_resume.pdf');
  assert.strictEqual(result.metadata.pageCount, 1);
  assert.ok(result.metadata.parsedAt);
  assert.ok(result.personalInfo);
  assert.strictEqual(result.personalInfo.email, 'sophia.chen@example.com');
  assert.ok(result.skills.all.includes('Python'));
  assert.ok(result.skills.all.includes('React'));
  assert.ok(result.skills.all.includes('AWS'));
});

test('ResumeParserService.parsePdf rejects null, undefined, or non-buffer inputs with descriptive error', async () => {
  await assert.rejects(
    async () => ResumeParserService.parsePdf(null),
    { message: 'Valid PDF buffer is required for parsing.' }
  );

  await assert.rejects(
    async () => ResumeParserService.parsePdf(undefined),
    { message: 'Valid PDF buffer is required for parsing.' }
  );

  await assert.rejects(
    async () => ResumeParserService.parsePdf('not-a-valid-buffer'),
    { message: 'Valid PDF buffer is required for parsing.' }
  );
});
