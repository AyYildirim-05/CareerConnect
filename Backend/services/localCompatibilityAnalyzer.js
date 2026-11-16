/**
 * Comprehensive skill catalog & alias mapping for deterministic local compatibility analysis
 */
const SKILL_CATALOG = [
  // Languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'C', 'Go', 'Golang', 'Rust',
  'Ruby', 'PHP', 'Swift', 'Kotlin', 'SQL', 'R', 'MATLAB', 'Bash', 'HTML5', 'CSS3', 'Sass',
  // Frontend & Mobile
  'React', 'Next.js', 'Redux', 'Vue', 'Angular', 'Tailwind CSS', 'React Native', 'Flutter',
  'SwiftUI', 'Jetpack Compose', 'iOS', 'Android', 'Figma', 'UI/UX', 'Responsive Design', 'Accessibility (WCAG)',
  // Backend & APIs
  'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'ASP.NET',
  'REST API', 'GraphQL', 'gRPC', 'WebSockets', 'Microservices', 'JWT', 'OAuth',
  // Databases & Data
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Firebase', 'Firestore', 'SQLite', 'Snowflake',
  'Pandas', 'NumPy', 'Scikit-Learn', 'PyTorch', 'TensorFlow', 'Spark', 'ETL Pipelines',
  'Tableau', 'PowerBI', 'Data Visualization', 'Statistics', 'A/B Testing',
  // Cloud, DevOps & Security
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Terraform', 'CI/CD', 'GitHub Actions',
  'Jenkins', 'Linux', 'Prometheus', 'Grafana', 'Network Security', 'Penetration Testing',
  // Testing, Tooling & Process
  'Git', 'Jest', 'Cypress', 'Playwright', 'Selenium', 'Postman', 'Unit Testing',
  'Agile', 'Scrum', 'Jira', 'System Design', 'Problem Solving'
];

const SKILL_ALIASES = {
  'javascript': ['javascript', 'js', 'ecmascript'],
  'typescript': ['typescript', 'ts'],
  'react': ['react', 'react.js', 'reactjs'],
  'next.js': ['next.js', 'nextjs'],
  'node.js': ['node.js', 'nodejs', 'node'],
  'express': ['express', 'express.js', 'expressjs'],
  'vue': ['vue', 'vue.js', 'vuejs', 'vue 3'],
  'postgresql': ['postgresql', 'postgres', 'psql'],
  'html5': ['html5', 'html'],
  'css3': ['css3', 'css'],
  'rest api': ['rest api', 'rest apis', 'restful api', 'restful apis', 'restful'],
  'kubernetes': ['kubernetes', 'k8s'],
  'golang': ['golang', 'go'],
  'go': ['go', 'golang'],
  'aws': ['aws', 'amazon web services'],
  'gcp': ['gcp', 'google cloud'],
  'ci/cd': ['ci/cd', 'cicd', 'continuous integration'],
  'accessibility (wcag)': ['accessibility', 'wcag', 'a11y'],
  'unit testing': ['unit testing', 'unit tests', 'junit', 'jest']
};

/**
 * Escape special regex characters
 * @param {string} str
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if a text contains a given skill (handling word boundaries and aliases)
 * @param {string} lowerText
 * @param {string} skill
 * @returns {boolean}
 */
function textContainsSkill(lowerText, skill) {
  const canonical = skill.toLowerCase().trim();
  const variants = SKILL_ALIASES[canonical] || [canonical, canonical.replace(/\s*\(.*?\)/g, '').trim()];

  return variants.some((variant) => {
    if (!variant) return false;
    // For short or alphanumeric tokens like "c", "r", "go", "js", enforce strict boundary
    const pattern = new RegExp(`(?:^|[^a-z0-9+#.])${escapeRegex(variant)}(?:$|[^a-z0-9+#.])`, 'i');
    return pattern.test(lowerText);
  });
}

class LocalCompatibilityAnalyzer {
  /**
   * Extract required skills from a job posting's requirements, description, and title
   * @param {Object} job
   * @returns {string[]}
   */
  static extractJobSkills(job = {}) {
    const combinedJobText = `${job.title || ''}\n${job.requirements || ''}\n${job.description || ''}`.toLowerCase();
    const extracted = [];
    const seenCanonical = new Set();

    // 1. Scan against known SKILL_CATALOG
    for (const skill of SKILL_CATALOG) {
      const canonical = (SKILL_ALIASES[skill.toLowerCase()]?.[0] || skill.toLowerCase());
      if (!seenCanonical.has(canonical) && textContainsSkill(combinedJobText, skill)) {
        seenCanonical.add(canonical);
        extracted.push(skill);
      }
    }

    // 2. Also parse explicit comma-separated tokens in job.requirements if few catalog skills matched
    if (extracted.length < 4 && typeof job.requirements === 'string') {
      const chunks = job.requirements
        .split(/[,;\n•]+/)
        .map((s) => s.replace(/\.$/, '').trim())
        .filter((s) => s.length >= 2 && s.length <= 32 && !/^\d+\+?\s*years/i.test(s));

      for (const chunk of chunks) {
        const key = chunk.toLowerCase();
        if (!seenCanonical.has(key)) {
          seenCanonical.add(key);
          extracted.push(chunk);
        }
      }
    }

    return extracted;
  }

  /**
   * Flatten candidate skills from structured profile and resume JSON
   * @param {Object} resumeProfile
   * @returns {string[]}
   */
  static extractCandidateSkillsList(resumeProfile = {}) {
    if (!resumeProfile || typeof resumeProfile !== 'object') return [];

    if (Array.isArray(resumeProfile.skills)) {
      return resumeProfile.skills.map((s) => String(s).trim()).filter(Boolean);
    }

    if (resumeProfile.skills && Array.isArray(resumeProfile.skills.all)) {
      return resumeProfile.skills.all.map((s) => String(s).trim()).filter(Boolean);
    }

    return [];
  }

  /**
   * Calculate a 0-100% compatibility score and 2-3 bullet gap analysis locally
   * @param {Object} params
   * @param {Object} [params.resumeProfile]
   * @param {string} [params.candidateText]
   * @param {string[]} [params.candidateSkills]
   * @param {Object} params.job
   * @returns {{ matchScore: number, matchedSkills: string[], missingSkills: string[], summaryBullets: string[] }}
   */
  static analyze({ resumeProfile = {}, candidateText = '', candidateSkills = [], job = {} }) {
    const profileSkills = candidateSkills.length > 0
      ? candidateSkills
      : this.extractCandidateSkillsList(resumeProfile);

    const combinedCandidateText = `${profileSkills.join(', ')}\n${candidateText || ''}`.toLowerCase();
    const jobSkills = this.extractJobSkills(job);

    const matchedSkills = [];
    const missingSkills = [];

    for (const reqSkill of jobSkills) {
      if (textContainsSkill(combinedCandidateText, reqSkill)) {
        matchedSkills.push(reqSkill);
      } else {
        missingSkills.push(reqSkill);
      }
    }

    // Calculate base score (0-100%)
    let matchScore = 0;
    if (jobSkills.length > 0) {
      matchScore = Math.round((matchedSkills.length / jobSkills.length) * 100);
    } else {
      // Fallback token overlap if a posting has non-standard prose requirements
      const jobWords = Array.from(
        new Set(
          `${job.title || ''} ${job.requirements || ''}`
            .toLowerCase()
            .split(/[^a-z0-9+#.]+/)
            .filter((w) => w.length > 3)
        )
      );
      const hits = jobWords.filter((w) => combinedCandidateText.includes(w));
      matchScore = jobWords.length > 0 ? Math.round((hits.length / jobWords.length) * 100) : 50;
    }

    matchScore = Math.max(0, Math.min(100, matchScore));

    // Build 2-3 bullet summary highlighting matched skills and skill gaps
    const summaryBullets = [];
    const roleLabel = job.title || 'this role';

    if (matchedSkills.length > 0) {
      summaryBullets.push(
        `Matched qualifications (${matchedSkills.length}/${jobSkills.length}): Your profile demonstrates experience in ${matchedSkills.slice(0, 6).join(', ')}.`
      );
    } else {
      summaryBullets.push(
        `Matched qualifications (0/${jobSkills.length}): None of the primary technical keywords listed for ${roleLabel} were detected in your profile.`
      );
    }

    if (missingSkills.length > 0) {
      summaryBullets.push(
        `Skill gaps to address: Consider highlighting or building experience with ${missingSkills.slice(0, 6).join(', ')} required by this listing.`
      );
    } else {
      summaryBullets.push(
        `No major skill gaps detected: Your background covers all core requirements listed for ${roleLabel}.`
      );
    }

    if (matchScore >= 75) {
      summaryBullets.push(
        `Strong overall alignment (${matchScore}%): Your background closely fits the requirements for ${roleLabel}${job.companyName ? ` at ${job.companyName}` : ''}.`
      );
    } else if (matchScore >= 45) {
      summaryBullets.push(
        `Moderate alignment (${matchScore}%): Emphasize transferable projects and tailor your resume toward ${missingSkills.slice(0, 3).join(', ') || 'the role requirements'} before applying.`
      );
    } else {
      summaryBullets.push(
        `Developing alignment (${matchScore}%): Upskilling in ${missingSkills.slice(0, 3).join(', ') || 'the core technologies listed'} will significantly improve your competitiveness.`
      );
    }

    return {
      matchScore,
      matchedSkills,
      missingSkills,
      summaryBullets: summaryBullets.slice(0, 3)
    };
  }
}

module.exports = LocalCompatibilityAnalyzer;
