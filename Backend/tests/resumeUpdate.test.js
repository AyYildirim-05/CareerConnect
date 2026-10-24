const test = require('node:test');
const assert = require('node:assert');
const JobSeekerModel = require('../models/jobSeekerModel');
const {
  updateResumeProfile,
  uploadResumeJson,
  getResumeProfile,
  downloadResumeJson
} = require('../controllers/resumeController');

/**
 * Mock response helper for Express controller unit tests
 */
function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    data: null,
    sentBody: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    send(body) {
      this.sentBody = body;
      return this;
    }
  };
}

// Realistic candidate profile fixture
const realCandidateUser = {
  id: 'usr_david_kim_452',
  email: 'david.kim@concordia.alumni.ca',
  role: 'Job Seeker',
  profile: {
    firstName: 'David',
    lastName: 'Kim',
    phone: '(514) 555-0133',
    headline: 'Junior Software Developer with C++ and Java foundation',
    skills: ['Java', 'C++', 'SQL'],
    workExperience: [
      {
        title: 'Junior Software Intern',
        company: 'CGI Canada',
        dates: 'May 2022 - Aug 2022',
        bullets: ['Maintained enterprise Java database applications.']
      }
    ],
    education: [
      {
        institution: 'Concordia University',
        degree: 'B.Eng in Software Engineering',
        dates: '2019 - 2023',
        gpa: '3.75/4.0'
      }
    ],
    resumeJson: {}
  }
};

// Realistic updated resume profile fixture
const realUpdatedResumeProfile = {
  personalInfo: {
    fullName: 'David Kim',
    firstName: 'David',
    lastName: 'Kim',
    email: 'david.kim@concordia.alumni.ca',
    phone: '(514) 555-0199',
    location: 'Montreal, QC, Canada',
    linkedin: 'https://linkedin.com/in/davidkim-dev',
    github: 'https://github.com/davidkim-tech',
    summary: 'Full-Stack Software Engineer with 2+ years of experience in distributed microservices, React web applications, and cloud deployment with Docker and AWS.'
  },
  skills: {
    categories: {
      languages: ['TypeScript', 'Python', 'Go'],
      frameworksAndTools: ['React', 'Node.js', 'PostgreSQL', 'Docker', 'AWS']
    },
    all: ['TypeScript', 'Python', 'Go', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'AWS']
  },
  workExperience: [
    {
      title: 'Full-Stack Developer',
      company: 'Morgan Stanley',
      location: 'Montreal, QC',
      dates: 'Sep 2022 - Present',
      bullets: [
        'Engineered event-driven trade processing services in Node.js and TypeScript.',
        'Reduced API latency by 40% utilizing Redis caching and PostgreSQL query optimization.'
      ]
    }
  ],
  education: [
    {
      institution: 'Concordia University',
      degree: 'Bachelor of Engineering in Software Engineering',
      dates: '2019 - 2023',
      gpa: '3.85/4.0'
    }
  ],
  projects: [
    {
      name: 'CareerConnect Job Platform',
      link: 'https://github.com/davidkim-tech/careerconnect',
      dates: '2024',
      techStack: ['React', 'Node.js', 'Express', 'Firebase'],
      bullets: [
        'Built responsive job tracking dashboard with Firestore real-time updates.',
        'Implemented end-to-end resume parsing module with PDF text extraction.'
      ]
    }
  ],
  certifications: [
    {
      name: 'AWS Certified Solutions Architect - Associate',
      issuer: 'Amazon Web Services',
      date: '2023'
    }
  ]
};

test('JobSeekerModel.saveResumeJson properly updates profile fields in isUpdate mode with real candidate data', async () => {
  const originalFindById = JobSeekerModel.findById;
  const originalUpdateUser = JobSeekerModel.updateUser;

  let capturedUpdates = null;

  JobSeekerModel.findById = async (id) => {
    if (id === realCandidateUser.id) return realCandidateUser;
    return null;
  };

  JobSeekerModel.updateUser = async (id, updateData) => {
    capturedUpdates = updateData;
    return { ...realCandidateUser, ...updateData };
  };

  try {
    await JobSeekerModel.saveResumeJson(realCandidateUser.id, realUpdatedResumeProfile, { isUpdate: true });

    assert.ok(capturedUpdates);
    assert.strictEqual(capturedUpdates.profile.firstName, 'David');
    assert.strictEqual(capturedUpdates.profile.lastName, 'Kim');
    assert.strictEqual(capturedUpdates.profile.phone, '(514) 555-0199');
    assert.strictEqual(
      capturedUpdates.profile.headline,
      'Full-Stack Software Engineer with 2+ years of experience in distributed microservices, React web applications, and cloud deployment with Docker and AWS.'
    );

    // In isUpdate mode, skills should be replaced exactly without resurrecting old ones
    assert.deepStrictEqual(capturedUpdates.profile.skills, [
      'TypeScript',
      'Python',
      'Go',
      'React',
      'Node.js',
      'PostgreSQL',
      'Docker',
      'AWS'
    ]);

    assert.strictEqual(capturedUpdates.profile.workExperience.length, 1);
    assert.strictEqual(capturedUpdates.profile.workExperience[0].company, 'Morgan Stanley');
    assert.strictEqual(capturedUpdates.profile.workExperience[0].title, 'Full-Stack Developer');

    assert.strictEqual(capturedUpdates.profile.education.length, 1);
    assert.strictEqual(capturedUpdates.profile.education[0].institution, 'Concordia University');

    assert.strictEqual(capturedUpdates.profile.projects.length, 1);
    assert.strictEqual(capturedUpdates.profile.projects[0].name, 'CareerConnect Job Platform');

    assert.deepStrictEqual(capturedUpdates.profile.resumeJson, realUpdatedResumeProfile);
    assert.ok(capturedUpdates.profile.resumeUpdatedAt);
  } finally {
    JobSeekerModel.findById = originalFindById;
    JobSeekerModel.updateUser = originalUpdateUser;
  }
});

test('JobSeekerModel.saveResumeJson properly merges skills and populates empty fields when isUpdate is false', async () => {
  const originalFindById = JobSeekerModel.findById;
  const originalUpdateUser = JobSeekerModel.updateUser;

  const newUserWithoutProfile = {
    id: 'usr_new_grad_101',
    email: 'newgrad@example.com',
    role: 'Job Seeker',
    profile: {
      firstName: '',
      lastName: '',
      phone: '',
      headline: '',
      skills: ['Git', 'Linux']
    }
  };

  let capturedUpdates = null;

  JobSeekerModel.findById = async (id) => {
    if (id === newUserWithoutProfile.id) return newUserWithoutProfile;
    return null;
  };

  JobSeekerModel.updateUser = async (id, updateData) => {
    capturedUpdates = updateData;
    return { ...newUserWithoutProfile, ...updateData };
  };

  try {
    await JobSeekerModel.saveResumeJson(newUserWithoutProfile.id, realUpdatedResumeProfile, { isUpdate: false });

    assert.ok(capturedUpdates);
    // Fields that were previously empty should be populated
    assert.strictEqual(capturedUpdates.profile.firstName, 'David');
    assert.strictEqual(capturedUpdates.profile.lastName, 'Kim');
    assert.strictEqual(capturedUpdates.profile.phone, '(514) 555-0199');
    assert.ok(capturedUpdates.profile.headline.startsWith('Full-Stack Software Engineer'));

    // In isUpdate: false mode, existing skills ['Git', 'Linux'] are merged with new skills
    assert.ok(capturedUpdates.profile.skills.includes('Git'));
    assert.ok(capturedUpdates.profile.skills.includes('Linux'));
    assert.ok(capturedUpdates.profile.skills.includes('TypeScript'));
    assert.ok(capturedUpdates.profile.skills.includes('Python'));
    assert.ok(capturedUpdates.profile.resumeParsedAt);
  } finally {
    JobSeekerModel.findById = originalFindById;
    JobSeekerModel.updateUser = originalUpdateUser;
  }
});

test('JobSeekerModel.saveResumeJson throws error if user is not found', async () => {
  const originalFindById = JobSeekerModel.findById;
  JobSeekerModel.findById = async () => null;

  try {
    await assert.rejects(
      async () => JobSeekerModel.saveResumeJson('unknown_user_id', realUpdatedResumeProfile),
      { message: 'User not found.' }
    );
  } finally {
    JobSeekerModel.findById = originalFindById;
  }
});

test('JobSeekerModel.getResumeJson retrieves saved resume or returns null', async () => {
  const originalFindById = JobSeekerModel.findById;

  JobSeekerModel.findById = async (id) => {
    if (id === 'with_resume') {
      return { profile: { resumeJson: realUpdatedResumeProfile } };
    }
    if (id === 'without_resume') {
      return { profile: {} };
    }
    return null;
  };

  try {
    const resumeData = await JobSeekerModel.getResumeJson('with_resume');
    assert.strictEqual(resumeData.personalInfo.fullName, 'David Kim');

    const emptyData = await JobSeekerModel.getResumeJson('without_resume');
    assert.strictEqual(emptyData, null);

    const nonExistent = await JobSeekerModel.getResumeJson('does_not_exist');
    assert.strictEqual(nonExistent, null);
  } finally {
    JobSeekerModel.findById = originalFindById;
  }
});

test('resumeController.updateResumeProfile validates payload and authentication', async () => {
  const originalSaveResumeJson = JobSeekerModel.saveResumeJson;

  JobSeekerModel.saveResumeJson = async (userId, resumeJson, options) => {
    return {
      id: userId,
      profile: {
        ...realCandidateUser.profile,
        resumeJson
      }
    };
  };

  try {
    // 1. Missing user / unauthorized
    const reqUnauth = { user: null, body: realUpdatedResumeProfile };
    const resUnauth = createMockRes();
    await updateResumeProfile(reqUnauth, resUnauth);
    assert.strictEqual(resUnauth.statusCode, 401);
    assert.strictEqual(resUnauth.data.success, false);
    assert.match(resUnauth.data.message, /must be logged in/i);

    // 2. Empty payload
    const reqEmpty = { user: { id: realCandidateUser.id }, body: {} };
    const resEmpty = createMockRes();
    await updateResumeProfile(reqEmpty, resEmpty);
    assert.strictEqual(resEmpty.statusCode, 400);
    assert.strictEqual(resEmpty.data.success, false);
    assert.match(resEmpty.data.message, /valid profile JSON/i);

    // 3. Valid update with real candidate data
    const reqValid = { user: { id: realCandidateUser.id }, body: realUpdatedResumeProfile };
    const resValid = createMockRes();
    await updateResumeProfile(reqValid, resValid);
    assert.strictEqual(resValid.statusCode, 200);
    assert.strictEqual(resValid.data.success, true);
    assert.strictEqual(resValid.data.savedToProfile, true);
    assert.strictEqual(resValid.data.resumeJson.personalInfo.fullName, 'David Kim');
    assert.ok(resValid.data.user);

    // 4. Server / database error handling
    const originalConsoleError = console.error;
    console.error = () => {};
    try {
      JobSeekerModel.saveResumeJson = async () => {
        throw new Error('Firestore connection timeout');
      };
      const resError = createMockRes();
      await updateResumeProfile(reqValid, resError);
      assert.strictEqual(resError.statusCode, 500);
      assert.strictEqual(resError.data.success, false);
      assert.strictEqual(resError.data.error, 'Firestore connection timeout');
    } finally {
      console.error = originalConsoleError;
    }
  } finally {
    JobSeekerModel.saveResumeJson = originalSaveResumeJson;
  }
});

test('resumeController.uploadResumeJson handles valid JSON upload, empty body, and unauthorized access', async () => {
  const originalSaveResumeJson = JobSeekerModel.saveResumeJson;

  JobSeekerModel.saveResumeJson = async (userId, resumeJson) => {
    return { id: userId, profile: { resumeJson } };
  };

  try {
    // 1. Success on valid JSON profile
    const reqValid = { user: { id: realCandidateUser.id }, body: realUpdatedResumeProfile };
    const resValid = createMockRes();
    await uploadResumeJson(reqValid, resValid);
    assert.strictEqual(resValid.statusCode, 200);
    assert.strictEqual(resValid.data.success, true);
    assert.strictEqual(resValid.data.savedToProfile, true);
    assert.strictEqual(resValid.data.parsedProfile.personalInfo.fullName, 'David Kim');

    // 2. Unauthorized
    const reqUnauth = { user: null, body: realUpdatedResumeProfile };
    const resUnauth = createMockRes();
    await uploadResumeJson(reqUnauth, resUnauth);
    assert.strictEqual(resUnauth.statusCode, 401);
    assert.strictEqual(resUnauth.data.success, false);

    // 3. Empty body
    const reqEmpty = { user: { id: realCandidateUser.id }, body: null };
    const resEmpty = createMockRes();
    await uploadResumeJson(reqEmpty, resEmpty);
    assert.strictEqual(resEmpty.statusCode, 400);
    assert.strictEqual(resEmpty.data.success, false);
  } finally {
    JobSeekerModel.saveResumeJson = originalSaveResumeJson;
  }
});

test('resumeController.getResumeProfile fetches stored resume or returns 404/401 appropriately', async () => {
  const originalGetResumeJson = JobSeekerModel.getResumeJson;

  JobSeekerModel.getResumeJson = async (userId) => {
    if (userId === realCandidateUser.id) {
      return realUpdatedResumeProfile;
    }
    return null;
  };

  try {
    // 1. Success
    const reqSuccess = { user: { id: realCandidateUser.id } };
    const resSuccess = createMockRes();
    await getResumeProfile(reqSuccess, resSuccess);
    assert.strictEqual(resSuccess.statusCode, 200);
    assert.strictEqual(resSuccess.data.success, true);
    assert.strictEqual(resSuccess.data.resumeJson.personalInfo.fullName, 'David Kim');

    // 2. Not Found
    const reqNotFound = { user: { id: 'usr_no_resume' } };
    const resNotFound = createMockRes();
    await getResumeProfile(reqNotFound, resNotFound);
    assert.strictEqual(resNotFound.statusCode, 404);
    assert.strictEqual(resNotFound.data.success, false);

    // 3. Unauthorized
    const reqUnauth = { user: null };
    const resUnauth = createMockRes();
    await getResumeProfile(reqUnauth, resUnauth);
    assert.strictEqual(resUnauth.statusCode, 401);
    assert.strictEqual(resUnauth.data.success, false);
  } finally {
    JobSeekerModel.getResumeJson = originalGetResumeJson;
  }
});

test('resumeController.downloadResumeJson streams formatted JSON attachment or handles missing profile', async () => {
  const originalGetResumeJson = JobSeekerModel.getResumeJson;

  JobSeekerModel.getResumeJson = async (userId) => {
    if (userId === realCandidateUser.id) {
      return realUpdatedResumeProfile;
    }
    return null;
  };

  try {
    // 1. Success download
    const reqSuccess = { user: { id: realCandidateUser.id } };
    const resSuccess = createMockRes();
    await downloadResumeJson(reqSuccess, resSuccess);

    assert.strictEqual(resSuccess.headers['Content-Type'], 'application/json');
    assert.strictEqual(
      resSuccess.headers['Content-Disposition'],
      `attachment; filename="careerconnect_profile_${realCandidateUser.id}.json"`
    );
    assert.ok(resSuccess.sentBody);
    const parsedSent = JSON.parse(resSuccess.sentBody);
    assert.strictEqual(parsedSent.personalInfo.fullName, 'David Kim');

    // 2. Not found download
    const reqNotFound = { user: { id: 'usr_no_resume' } };
    const resNotFound = createMockRes();
    await downloadResumeJson(reqNotFound, resNotFound);
    assert.strictEqual(resNotFound.statusCode, 404);
    assert.strictEqual(resNotFound.data.success, false);

    // 3. Unauthorized download
    const reqUnauth = { user: null };
    const resUnauth = createMockRes();
    await downloadResumeJson(reqUnauth, resUnauth);
    assert.strictEqual(resUnauth.statusCode, 401);
  } finally {
    JobSeekerModel.getResumeJson = originalGetResumeJson;
  }
});
