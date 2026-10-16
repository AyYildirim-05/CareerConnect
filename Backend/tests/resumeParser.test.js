const test = require('node:test');
const assert = require('node:assert');
const ResumeParserService = require('../services/resumeParserService');

test('ResumeParserService correctly parses structured categories from resume text', () => {
  const sampleResume = `
Alex Mercer
alex.mercer@gmail.com | (514) 789-0123 | Montreal, QC | linkedin.com/in/alexmercer | github.com/alexmercer

PROFESSIONAL SUMMARY
Senior Software Engineer specialized in full-stack web applications and cloud architecture.

EDUCATION
Concordia University                                     2020 - 2024
Bachelor of Engineering in Software Engineering (GPA: 3.85/4.0)

WORK EXPERIENCE
Software Developer Intern                                May 2023 - Aug 2023
Shopify
• Developed high-throughput microservices in Node.js and TypeScript.
• Reduced API response latency by 35% through caching strategies.

PROJECTS
CareerConnect | React, Node.js, Express, Firebase
• Architected end-to-end recruitment platform.
• Designed automated resume classification pipeline.

SKILLS
Programming Languages: JavaScript, TypeScript, Python, Java, C++
Frameworks & Databases: React, Node.js, Express, PostgreSQL, Firebase

EXTRACURRICULAR ACTIVITIES
President                                               2022 - 2023
Engineering Software Guild
• Organized hackathons and workshops with over 300 participants.

VOLUNTEER EXPERIENCE
Volunteer Coding Mentor                                 2021 - 2022
Canada Learning Code
• Assisted learners in building their first HTML, CSS, and JS web projects.

CERTIFICATIONS & AWARDS
AWS Certified Solutions Architect                        2023
Dean's Honor Roll                                        2022
`;

  const parsed = ResumeParserService.parseText(sampleResume, {
    originalFilename: 'alex_mercer_resume.pdf'
  });

  // Personal Info assertions
  assert.strictEqual(parsed.personalInfo.fullName, 'Alex Mercer');
  assert.strictEqual(parsed.personalInfo.firstName, 'Alex');
  assert.strictEqual(parsed.personalInfo.lastName, 'Mercer');
  assert.strictEqual(parsed.personalInfo.email, 'alex.mercer@gmail.com');
  assert.strictEqual(parsed.personalInfo.phone, '(514) 789-0123');
  assert.strictEqual(parsed.personalInfo.location, 'Montreal, QC');
  assert.match(parsed.personalInfo.linkedin, /linkedin\.com\/in\/alexmercer/);
  assert.match(parsed.personalInfo.github, /github\.com\/alexmercer/);
  assert.ok(parsed.personalInfo.summary.includes('Senior Software Engineer'));

  // Work Experience assertions
  assert.strictEqual(parsed.workExperience.length, 1);
  assert.strictEqual(parsed.workExperience[0].title, 'Software Developer Intern');
  assert.strictEqual(parsed.workExperience[0].company, 'Shopify');
  assert.strictEqual(parsed.workExperience[0].dates, 'May 2023 - Aug 2023');
  assert.strictEqual(parsed.workExperience[0].bullets.length, 2);

  // Education assertions
  assert.strictEqual(parsed.education.length, 1);
  assert.strictEqual(parsed.education[0].institution, 'Concordia University');
  assert.ok(parsed.education[0].degree.includes('Bachelor of Engineering'));
  assert.strictEqual(parsed.education[0].gpa, '3.85/4.0');

  // Projects assertions
  assert.strictEqual(parsed.projects.length, 1);
  assert.strictEqual(parsed.projects[0].name, 'CareerConnect');
  assert.ok(parsed.projects[0].techStack.includes('React'));
  assert.ok(parsed.projects[0].techStack.includes('Node.js'));

  // Skills assertions
  assert.ok(parsed.skills.all.includes('TypeScript'));
  assert.ok(parsed.skills.all.includes('Python'));
  assert.ok(parsed.skills.all.includes('PostgreSQL'));
  assert.ok(parsed.skills.all.includes('Firebase'));

  // Extracurriculars assertions
  assert.strictEqual(parsed.extracurriculars.length, 1);
  assert.strictEqual(parsed.extracurriculars[0].title, 'President');
  assert.strictEqual(parsed.extracurriculars[0].organization, 'Engineering Software Guild');

  // Volunteer assertions
  assert.strictEqual(parsed.volunteerExperience.length, 1);
  assert.strictEqual(parsed.volunteerExperience[0].role, 'Volunteer Coding Mentor');
  assert.strictEqual(parsed.volunteerExperience[0].organization, 'Canada Learning Code');

  // Certifications assertions
  assert.strictEqual(parsed.certifications.length, 2);
  assert.ok(parsed.certifications[0].name.includes('AWS Certified Solutions Architect'));
});

test('ResumeParserService.parsePdf extracts text from a PDF buffer', async () => {
  const minimalPdf = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF'
  );

  const result = await ResumeParserService.parsePdf(minimalPdf, {
    originalFilename: 'test_doc.pdf'
  });

  assert.ok(result);
  assert.strictEqual(result.metadata.originalFilename, 'test_doc.pdf');
  assert.ok(result.personalInfo);
  assert.ok(result.skills);
});

