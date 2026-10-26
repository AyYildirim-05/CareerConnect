/**
 * Role-specific keyword catalogs used by the local fallback analyzer
 * when no external LLM API key (GEMINI_API_KEY) is configured.
 */
const ROLE_KEYWORD_CATALOG = {
  frontend: [
    'React', 'TypeScript', 'JavaScript', 'HTML5', 'CSS3', 'Next.js',
    'Redux', 'Tailwind CSS', 'Accessibility (WCAG)', 'Responsive Design', 'Jest', 'Webpack'
  ],
  backend: [
    'Node.js', 'Express', 'PostgreSQL', 'REST API', 'GraphQL', 'Docker',
    'Redis', 'Microservices', 'Authentication (JWT/OAuth)', 'CI/CD', 'SQL', 'Unit Testing'
  ],
  fullstack: [
    'React', 'Node.js', 'TypeScript', 'PostgreSQL', 'REST API', 'Docker',
    'Git', 'CI/CD', 'AWS', 'MongoDB', 'Express', 'Next.js'
  ],
  data: [
    'Python', 'SQL', 'Pandas', 'NumPy', 'Scikit-Learn', 'TensorFlow',
    'PyTorch', 'Data Visualization', 'ETL Pipelines', 'Spark', 'A/B Testing', 'Statistics'
  ],
  devops: [
    'Docker', 'Kubernetes', 'AWS', 'Terraform', 'CI/CD', 'GitHub Actions',
    'Linux', 'Prometheus', 'Grafana', 'Bash', 'Ansible', 'CloudWatch'
  ],
  mobile: [
    'React Native', 'Swift', 'Kotlin', 'Flutter', 'iOS', 'Android',
    'REST API', 'Firebase', 'Offline Storage', 'App Store Deployment', 'UI/UX', 'Unit Testing'
  ],
  default: [
    'Git', 'Agile', 'Scrum', 'CI/CD', 'REST API', 'Unit Testing',
    'Cloud (AWS/GCP/Azure)', 'Docker', 'SQL', 'Problem Solving', 'Code Review', 'System Design'
  ]
};

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;
const MAX_RESUME_TEXT_LENGTH = 15000;

// In-memory sliding window store: clientKey -> Array<timestamp>
const rateLimitStore = new Map();

class ResumeFeedbackService {
  /**
   * Validate resume text and target role inputs
   * @param {string} resumeText
   * @param {string} targetRole
   * @returns {{ cleanResumeText: string, cleanTargetRole: string }}
   */
  static validateInput(resumeText, targetRole) {
    if (!targetRole || typeof targetRole !== 'string' || targetRole.trim().length < 2) {
      const err = new Error('A valid target role (at least 2 characters) is required.');
      err.statusCode = 400;
      throw err;
    }

    if (targetRole.trim().length > 100) {
      const err = new Error('Target role must not exceed 100 characters.');
      err.statusCode = 400;
      throw err;
    }

    if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length < 20) {
      const err = new Error('Resume text is too short or empty. Please upload a valid resume first.');
      err.statusCode = 400;
      throw err;
    }

    return {
      cleanResumeText: resumeText.trim().slice(0, MAX_RESUME_TEXT_LENGTH),
      cleanTargetRole: targetRole.trim()
    };
  }

  /**
   * Enforce per-user / per-IP sliding-window rate limiting
   * @param {string} clientKey
   * @param {number} [maxRequests]
   * @param {number} [windowMs]
   */
  static checkRateLimit(
    clientKey = 'anonymous',
    maxRequests = MAX_REQUESTS_PER_WINDOW,
    windowMs = RATE_LIMIT_WINDOW_MS
  ) {
    const key = String(clientKey || 'anonymous');
    const now = Date.now();
    const timestamps = rateLimitStore.get(key) || [];

    // Filter out timestamps older than the window
    const recentTimestamps = timestamps.filter(ts => now - ts < windowMs);

    if (recentTimestamps.length >= maxRequests) {
      const err = new Error('Rate limit exceeded. Please wait a minute before requesting more AI feedback.');
      err.statusCode = 429;
      throw err;
    }

    recentTimestamps.push(now);
    rateLimitStore.set(key, recentTimestamps);
  }

  /**
   * Clear rate limit state (useful for automated tests)
   */
  static resetRateLimits() {
    rateLimitStore.clear();
  }

  /**
   * Analyze resume text against a target role using Google Gemini API (or local fallback)
   * @param {Object} params
   * @param {string} params.resumeText
   * @param {string} params.targetRole
   * @param {string} [params.clientKey]
   * @returns {Promise<{ targetRole: string, provider: string, strengths: string[], missingKeywords: string[], actionableRevisions: string[] }>}
   */
  static async analyzeResume({ resumeText, targetRole, clientKey = 'anonymous' }) {
    const { cleanResumeText, cleanTargetRole } = this.validateInput(resumeText, targetRole);
    this.checkRateLimit(clientKey);

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && typeof fetch === 'function') {
      try {
        const llmFeedback = await this._callGeminiApi(cleanResumeText, cleanTargetRole, apiKey);
        return {
          targetRole: cleanTargetRole,
          provider: 'gemini',
          ...llmFeedback
        };
      } catch (apiError) {
        console.warn('Gemini API call failed, falling back to local heuristic analyzer:', apiError.message);
      }
    }

    const fallbackFeedback = this._generateFallbackFeedback(cleanResumeText, cleanTargetRole);
    return {
      targetRole: cleanTargetRole,
      provider: 'heuristic-analyzer',
      ...fallbackFeedback
    };
  }

  /**
   * Call Google Gemini API with structured JSON response requirements
   * @private
   */
  static async _callGeminiApi(resumeText, targetRole, apiKey) {
    const modelName = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const prompt = `You are an expert technical recruiter and career coach.
Analyze the following candidate's resume against the target job role: "${targetRole}".

Return strictly valid JSON with these exact 3 keys:
- "strengths": array of 3 to 5 specific strengths found in the resume relevant to "${targetRole}"
- "missingKeywords": array of 4 to 8 important technical or domain keywords missing from the resume for "${targetRole}"
- "actionableRevisions": array of 3 to 5 concrete, actionable bullet-point improvements the candidate should make to increase interview call rates

Candidate Resume:
${resumeText}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API responded with status ${response.status}`);
    }

    const payload = await response.json();
    const rawJsonText = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJsonText) {
      throw new Error('Empty response from Gemini API.');
    }

    const parsed = JSON.parse(rawJsonText);
    return this._normalizeFeedbackPayload(parsed);
  }

  /**
   * Ensure feedback payload always contains non-empty string arrays for the 3 required keys
   * @param {Object} payload
   */
  static _normalizeFeedbackPayload(payload) {
    const toStringArray = (arr) =>
      Array.isArray(arr)
        ? arr.map(item => String(item).trim()).filter(Boolean)
        : [];

    const strengths = toStringArray(payload?.strengths);
    const missingKeywords = toStringArray(payload?.missingKeywords);
    const actionableRevisions = toStringArray(payload?.actionableRevisions);

    if (strengths.length === 0 || missingKeywords.length === 0 || actionableRevisions.length === 0) {
      throw new Error('Incomplete structured feedback returned from LLM.');
    }

    return {
      strengths,
      missingKeywords,
      actionableRevisions
    };
  }

  /**
   * Deterministic role-aware resume analyzer used when GEMINI_API_KEY is not configured
   * @param {string} resumeText
   * @param {string} targetRole
   */
  static _generateFallbackFeedback(resumeText, targetRole) {
    const lowerText = resumeText.toLowerCase();
    const lowerRole = targetRole.toLowerCase();

    let bucket = ROLE_KEYWORD_CATALOG.default;
    if (lowerRole.includes('front') || lowerRole.includes('ui') || lowerRole.includes('react')) {
      bucket = ROLE_KEYWORD_CATALOG.frontend;
    } else if (lowerRole.includes('back') || lowerRole.includes('api') || lowerRole.includes('node') || lowerRole.includes('java')) {
      bucket = ROLE_KEYWORD_CATALOG.backend;
    } else if (lowerRole.includes('full') || lowerRole.includes('software')) {
      bucket = ROLE_KEYWORD_CATALOG.fullstack;
    } else if (lowerRole.includes('data') || lowerRole.includes('machine learning') || lowerRole.includes('ai') || lowerRole.includes('ml')) {
      bucket = ROLE_KEYWORD_CATALOG.data;
    } else if (lowerRole.includes('devops') || lowerRole.includes('cloud') || lowerRole.includes('sre')) {
      bucket = ROLE_KEYWORD_CATALOG.devops;
    } else if (lowerRole.includes('mobile') || lowerRole.includes('ios') || lowerRole.includes('android')) {
      bucket = ROLE_KEYWORD_CATALOG.mobile;
    }

    const matchedKeywords = [];
    const missingKeywords = [];

    for (const kw of bucket) {
      const baseToken = kw.replace(/\s*\(.*?\)/g, '').toLowerCase();
      if (lowerText.includes(baseToken)) {
        matchedKeywords.push(kw);
      } else {
        missingKeywords.push(kw);
      }
    }

    const strengths = [];
    if (matchedKeywords.length > 0) {
      strengths.push(
        `Demonstrates relevant alignment with ${targetRole} through core competencies: ${matchedKeywords.slice(0, 6).join(', ')}.`
      );
    }

    const hasMetrics = /\b\d+%|\b\d+x\b|\$\d+|\b\d+\+\s*(?:users|clients|projects|requests|ms)\b/i.test(resumeText);
    if (hasMetrics) {
      strengths.push('Includes quantifiable impact metrics (percentages or numeric outcomes) in experience descriptions.');
    }

    const hasLinks = /github\.com|linkedin\.com|portfolio/i.test(resumeText);
    if (hasLinks) {
      strengths.push('Provides professional portfolio or repository links (GitHub/LinkedIn) to validate technical work.');
    }

    const hasProjectsOrExp = /experience|project/i.test(resumeText);
    if (hasProjectsOrExp) {
      strengths.push(`Contains structured experience and project sections relevant to ${targetRole} screening.`);
    }

    if (strengths.length === 0) {
      strengths.push(`Includes foundational resume content ready to be tailored for ${targetRole} positions.`);
    }

    const actionableRevisions = [];
    if (!hasMetrics) {
      actionableRevisions.push(
        'Add measurable impact metrics to your bullet points (e.g., "Reduced API latency by 35%" or "Supported 1,000+ active users").'
      );
    }
    if (missingKeywords.length > 0) {
      actionableRevisions.push(
        `Incorporate missing ${targetRole} keywords (${missingKeywords.slice(0, 4).join(', ')}) naturally into your Technical Skills and Project bullets to pass ATS filters.`
      );
    }
    if (!hasLinks) {
      actionableRevisions.push(
        'Add direct links to your GitHub profile, LinkedIn, or live project demos in the header section.'
      );
    }
    actionableRevisions.push(
      `Start each work experience and project bullet with strong action verbs (e.g., "Architected", "Optimized", "Automated") tailored to ${targetRole} responsibilities.`
    );
    actionableRevisions.push(
      `Add a concise 2-3 sentence Professional Summary at the top highlighting your strongest qualifications for ${targetRole}.`
    );

    return {
      strengths: strengths.slice(0, 5),
      missingKeywords: missingKeywords.length > 0 ? missingKeywords.slice(0, 8) : ['System Design', 'CI/CD', 'Performance Optimization', 'Automated Testing'],
      actionableRevisions: actionableRevisions.slice(0, 5)
    };
  }
}

module.exports = ResumeFeedbackService;
