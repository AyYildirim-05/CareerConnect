const pdf = require('pdf-parse');

/**
 * Standard Section Patterns
 */
const SECTION_PATTERNS = {
  workExperience: /^(?:work\s+experience|professional\s+experience|employment\s+history|experience|work\s+history|career\s+history)\b/i,
  education: /^(?:education|academic\s+background|educational\s+qualifications|academics|academic\s+history)\b/i,
  projects: /^(?:projects|technical\s+projects|academic\s+projects|personal\s+projects|key\s+projects)\b/i,
  skills: /^(?:skills|technical\s+skills|core\s+competencies|technologies|skills\s+&\s+proficiencies|programming\s+languages)\b/i,
  extracurriculars: /^(?:extracurricular(?:s|\s+activities)?|activities|leadership(?:(?:\s+and|\s*&)?\s+activities)?|campus\s+involvement|student\s+leadership)\b/i,
  volunteerExperience: /^(?:volunteer(?:ing)?(?:\s+experience)?|community\s+service|volunteer\s+work|social\s+involvement)\b/i,
  certifications: /^(?:certifications?|certificates?|licenses?(?:\s+and|\s*&)?\s*certifications?|credentials)\b/i,
  awards: /^(?:awards?(?:\s+and|\s*&)?\s*honors?|honors?(?:\s+and|\s*&)?\s*awards?|achievements)\b/i,
  summary: /^(?:professional\s+summary|summary\s+of\s+qualifications|summary|profile|about\s+me|objective)\b/i,
  languages: /^(?:languages?)\b/i,
  interests: /^(?:interests?|hobbies)\b/i
};

// Common tech keywords to recognize
const KNOWN_SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'C', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Go', 'Rust', 'SQL', 'R', 'MATLAB', 'HTML', 'HTML5', 'CSS', 'CSS3', 'Sass',
  'React', 'React.js', 'React Native', 'Angular', 'Vue', 'Vue.js', 'Next.js', 'Node.js', 'Express', 'Express.js', 'Django', 'Flask', 'Spring Boot', 'ASP.NET', 'FastAPI',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Firebase', 'Firestore', 'Redis', 'SQLite', 'Oracle', 'Cassandra',
  'Git', 'GitHub', 'GitLab', 'Docker', 'Kubernetes', 'AWS', 'Amazon Web Services', 'Azure', 'GCP', 'Google Cloud', 'Linux', 'Unix', 'CI/CD', 'Jenkins', 'Terraform', 'Jira', 'Agile', 'Scrum', 'REST API', 'GraphQL', 'OAuth'
];

/**
 * Service to parse raw PDF resumes into structured JSON profiles
 */
class ResumeParserService {
  /**
   * Extract raw text and page count from a PDF buffer
   * @param {Buffer} pdfBuffer
   * @returns {Promise<{ rawText: string, numPages: number }>}
   */
  static async extractRawText(pdfBuffer) {
    if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
      throw new Error('Valid PDF buffer is required for parsing.');
    }

    let rawText = '';
    let numPages = 1;

    try {
      if (pdf && pdf.PDFParse) {
        const uint8Data = new Uint8Array(pdfBuffer);
        const parser = new pdf.PDFParse(uint8Data);
        const result = await parser.getText();
        rawText = result.text || '';
        numPages = result.total || (result.pages && result.pages.length) || 1;
      } else if (typeof pdf === 'function') {
        const result = await pdf(pdfBuffer);
        rawText = result.text || '';
        numPages = result.numpages || 1;
      } else if (pdf && typeof pdf.default === 'function') {
        const result = await pdf.default(pdfBuffer);
        rawText = result.text || '';
        numPages = result.numpages || 1;
      } else {
        throw new Error('No compatible PDF parser engine found.');
      }
    } catch (parseError) {
      console.error('PDF text extraction error:', parseError);
      throw new Error(`Failed to extract text from PDF: ${parseError.message}`);
    }

    return {
      rawText: rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\u00A0/g, ' ').trim(),
      numPages
    };
  }

  /**
   * Convert a structured resume JSON profile into plain text for GenAI analysis
   * @param {Object} profile
   * @returns {string}
   */
  static profileToText(profile) {
    if (!profile || typeof profile !== 'object') return '';

    const parts = [];
    const info = profile.personalInfo || {};
    const fullName =
      info.fullName ||
      [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
    const summary = info.summary || profile.headline || profile.bio || '';

    if (fullName) parts.push(`Name: ${fullName}`);
    if (summary) parts.push(`Summary: ${summary}`);
    if (info.linkedin) parts.push(`LinkedIn: ${info.linkedin}`);
    if (info.github) parts.push(`GitHub: ${info.github}`);
    if (info.portfolio) parts.push(`Portfolio: ${info.portfolio}`);

    if (profile.skills) {
      const cats = profile.skills.categories || {};
      const skillList = Array.isArray(profile.skills)
        ? profile.skills
        : [
            ...(profile.skills.technical || []),
            ...(profile.skills.soft || []),
            ...(profile.skills.tools || []),
            ...(profile.skills.all || []),
            ...(cats.languages || []),
            ...(cats.frameworksAndTools || []),
            ...(cats.technical || []),
            ...(cats.softSkills || [])
          ];
      if (skillList.length > 0) {
        parts.push(`Skills: ${[...new Set(skillList)].join(', ')}`);
      }
    }

    if (Array.isArray(profile.workExperience) && profile.workExperience.length > 0) {
      const expLines = profile.workExperience.map(exp => {
        const roleTitle = exp.title || exp.jobTitle || exp.role || '';
        const details =
          exp.description ||
          (exp.bullets || exp.responsibilities || []).join(' ');
        return `${roleTitle} at ${exp.company || ''} (${exp.dates || ''}): ${details}`;
      });
      parts.push(`Work Experience:\n${expLines.join('\n')}`);
    }

    if (Array.isArray(profile.projects) && profile.projects.length > 0) {
      const projLines = profile.projects.map(proj => {
        const tech = (proj.techStack || proj.technologies || []).join(', ');
        const details =
          (Array.isArray(proj.bullets) && proj.bullets.length > 0
            ? proj.bullets.join(' ')
            : proj.description) || '';
        return `${proj.name || proj.title || ''}${tech ? ` (${tech})` : ''}: ${details}`;
      });
      parts.push(`Projects:\n${projLines.join('\n')}`);
    }

    if (Array.isArray(profile.education) && profile.education.length > 0) {
      const eduLines = profile.education.map(edu =>
        `${edu.degree || ''} - ${edu.institution || ''} (${edu.dates || edu.graduationYear || ''})`
      );
      parts.push(`Education:\n${eduLines.join('\n')}`);
    }

    if (Array.isArray(profile.certifications) && profile.certifications.length > 0) {
      const certLines = profile.certifications.map(cert =>
        typeof cert === 'string' ? cert : `${cert.name || ''} (${cert.date || ''})`
      );
      parts.push(`Certifications:\n${certLines.join('\n')}`);
    }

    return parts.join('\n\n').trim();
  }

  /**
   * Parse PDF buffer into structured JSON
   * @param {Buffer} pdfBuffer
   * @param {Object} [meta]
   * @returns {Promise<Object>}
   */
  static async parsePdf(pdfBuffer, meta = {}) {
    const { rawText, numPages } = await this.extractRawText(pdfBuffer);

    return this.parseText(rawText, {
      originalFilename: meta.originalFilename || 'resume.pdf',
      pageCount: numPages,
      fileSize: meta.fileSize || pdfBuffer.length
    });
  }

  /**
   * Parse raw text string into structured resume profile
   * @param {string} rawText 
   * @param {Object} [meta]
   * @returns {Object}
   */
  static parseText(rawText, meta = {}) {
    const cleanText = rawText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\u00A0/g, ' ')
      .trim();

    const lines = cleanText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // 1. Partition document into sections
    const { headerLines, sections } = this._partitionSections(lines);

    // 2. Parse individual sections
    const personalInfo = this._parsePersonalInfo(headerLines, cleanText, sections.summary);
    const workExperience = this._parseWorkExperience(sections.workExperience || []);
    const education = this._parseEducation(sections.education || []);
    const projects = this._parseProjects(sections.projects || []);
    const skills = this._parseSkills(sections.skills || [], cleanText);
    const extracurriculars = this._parseExtracurriculars(sections.extracurriculars || []);
    const volunteerExperience = this._parseVolunteer(sections.volunteerExperience || []);
    const certifications = this._parseCertifications(sections.certifications || [], sections.awards || []);
    const additional = this._parseAdditional(sections.languages || [], sections.interests || [], sections);

    return {
      personalInfo,
      skills,
      workExperience,
      education,
      projects,
      extracurriculars,
      volunteerExperience,
      certifications,
      additional,
      metadata: {
        originalFilename: meta.originalFilename || 'resume.pdf',
        parsedAt: new Date().toISOString(),
        pageCount: meta.pageCount || 1,
        totalSectionsDetected: Object.keys(sections).length
      }
    };
  }

  /**
   * Partition lines into section buckets based on header lines
   */
  static _partitionSections(lines) {
    const headerLines = [];
    const sections = {};
    let currentSection = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const detectedSection = this._matchSectionHeader(line);

      if (detectedSection) {
        currentSection = detectedSection;
        if (!sections[currentSection]) {
          sections[currentSection] = [];
        }
      } else if (currentSection) {
        sections[currentSection].push(line);
      } else {
        headerLines.push(line);
      }
    }

    return { headerLines, sections };
  }

  /**
   * Match a line against known section header patterns
   */
  static _matchSectionHeader(line) {
    // Section headers are usually short (less than 45 chars) and typically 1-4 words
    if (line.length > 50) return null;
    const clean = line.replace(/[:\-_|•#*]+/g, '').trim();
    if (!clean) return null;

    for (const [sectionKey, regex] of Object.entries(SECTION_PATTERNS)) {
      if (regex.test(clean)) {
        return sectionKey;
      }
    }
    return null;
  }

  /**
   * Extract personal info from top lines and text
   */
  static _parsePersonalInfo(headerLines, fullText, summaryLines = []) {
    // Extract Email
    const emailMatch = fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0].trim() : '';

    // Extract Phone
    const phoneMatch = fullText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const phone = phoneMatch ? phoneMatch[0].trim() : '';

    // Extract Links
    const linkedinMatch = fullText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9._-]+/i);
    const linkedin = linkedinMatch ? (linkedinMatch[0].startsWith('http') ? linkedinMatch[0] : `https://${linkedinMatch[0]}`) : '';

    const githubMatch = fullText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9._-]+/i);
    const github = githubMatch ? (githubMatch[0].startsWith('http') ? githubMatch[0] : `https://${githubMatch[0]}`) : '';

    const portfolioMatch = fullText.match(/(?:https?:\/\/)(?!.*(?:linkedin|github))[a-zA-Z0-9./_-]+/i);
    const portfolio = portfolioMatch ? portfolioMatch[0] : '';

    // Extract Location (e.g. "Montreal, QC", "Toronto, ON", "New York, NY", or Postal Code)
    const locationMatch = fullText.match(/([A-Z][a-zA-Z\s.-]+),\s*([A-Z]{2})\b/);
    const location = locationMatch ? `${locationMatch[1].trim()}, ${locationMatch[2]}` : '';

    // Extract Candidate Name from top header lines
    let fullName = '';
    for (const line of headerLines.slice(0, 4)) {
      // Skip lines that have email, phone, links, or generic resume words
      if (
        line.includes('@') ||
        /\d{3}[-.]?\d{3}/.test(line) ||
        /linkedin|github|http|www\./i.test(line) ||
        /curriculum\s+vitae|resume|page\s+\d/i.test(line)
      ) {
        continue;
      }

      // Check if line looks like a person's name (2-4 words, letters only)
      const cleanLine = line.replace(/[^a-zA-Z\s'-]/g, '').trim();
      const words = cleanLine.split(/\s+/);
      if (words.length >= 2 && words.length <= 4 && words.every(w => w.length >= 2)) {
        fullName = cleanLine;
        break;
      }
    }

    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts.length > 0 ? nameParts[0] : '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    // Summary / Objective
    const summary = summaryLines && summaryLines.length > 0 ? summaryLines.join(' ') : '';

    return {
      fullName,
      firstName,
      lastName,
      email,
      phone,
      location,
      linkedin,
      github,
      portfolio,
      summary
    };
  }

  /**
   * Parse Work Experience section into structured job entries
   */
  static _parseWorkExperience(lines) {
    if (!lines || lines.length === 0) return [];

    const entries = [];
    let currentEntry = null;

    const datePattern = /(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}|\b\d{4}\b)\s*[-–—]\s*(?:Present|Current|Ongoing|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}|\b\d{4}\b)/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const hasDate = datePattern.test(line);

      // A new entry usually has a date range or looks like a job title/company header
      if (hasDate || (!currentEntry && line.length < 80)) {
        if (currentEntry) {
          entries.push(currentEntry);
        }

        const dateMatch = line.match(datePattern);
        const dates = dateMatch ? dateMatch[0].trim() : '';
        const titleOrCompany = line.replace(datePattern, '').replace(/[|•–—]+/g, ' ').trim();

        currentEntry = {
          title: titleOrCompany,
          company: '',
          location: '',
          dates,
          bullets: []
        };

        // If next line might be the company or title
        if (lines[i + 1] && !lines[i + 1].startsWith('•') && !lines[i + 1].startsWith('-') && !datePattern.test(lines[i + 1])) {
          currentEntry.company = lines[i + 1].replace(/[|•–—]+/g, ' ').trim();
          i++; // skip next line
        }
      } else if (currentEntry) {
        if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
          currentEntry.bullets.push(line.replace(/^[•\-*]\s*/, '').trim());
        } else {
          // If bullet or continuation
          if (currentEntry.bullets.length > 0) {
            currentEntry.bullets[currentEntry.bullets.length - 1] += ' ' + line;
          } else {
            currentEntry.bullets.push(line);
          }
        }
      }
    }

    if (currentEntry) {
      entries.push(currentEntry);
    }

    return entries;
  }

  /**
   * Parse Education section into structured entries
   */
  static _parseEducation(lines) {
    if (!lines || lines.length === 0) return [];

    const entries = [];
    let currentEntry = null;

    const degreeKeywords = /bachelor|master|ph\.?d|doctorate|b\.?s\.?|b\.?a\.?|b\.?eng\.?|m\.?s\.?|m\.?eng\.?|associate|diploma|certificate|minor|major/i;
    const institutionKeywords = /university|college|institute|polytechnic|school|academy/i;
    const yearPattern = /\b(19\d{2}|20\d{2})\s*[-–—]\s*(19\d{2}|20\d{2}|Present|Expected\s*\d{4}|\d{4})\b/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isDegree = degreeKeywords.test(line);
      const isInstitution = institutionKeywords.test(line);
      const yearMatch = line.match(yearPattern);

      // If we see an institution, that's typically a new educational entry
      if (isInstitution) {
        if (currentEntry) entries.push(currentEntry);

        const dates = yearMatch ? yearMatch[0] : '';
        const cleanLine = line.replace(yearPattern, '').trim();

        currentEntry = {
          institution: cleanLine,
          degree: '',
          fieldOfStudy: '',
          dates,
          gpa: '',
          details: []
        };
      } else if (currentEntry) {
        if (!currentEntry.degree && isDegree) {
          const dates = yearMatch ? yearMatch[0] : '';
          if (dates && !currentEntry.dates) currentEntry.dates = dates;

          const gpaMatch = line.match(/gpa[:\s]+([\d.]+(?:\s*\/\s*[\d.]+)?)/i);
          if (gpaMatch) currentEntry.gpa = gpaMatch[1];

          currentEntry.degree = line.replace(yearPattern, '').replace(/\(gpa[:\s]+[\d./]+\)/i, '').trim();
        } else if (/gpa[:\s]+([\d.]+(?:\s*\/\s*[\d.]+)?)/i.test(line)) {
          const gpaMatch = line.match(/gpa[:\s]+([\d.]+(?:\s*\/\s*[\d.]+)?)/i);
          currentEntry.gpa = gpaMatch ? gpaMatch[1] : '';
        } else {
          currentEntry.details.push(line);
        }
      } else if (isDegree) {
        const dates = yearMatch ? yearMatch[0] : '';
        currentEntry = {
          institution: '',
          degree: line.replace(yearPattern, '').trim(),
          fieldOfStudy: '',
          dates,
          gpa: '',
          details: []
        };
      }
    }

    if (currentEntry) {
      entries.push(currentEntry);
    }

    return entries;
  }

  /**
   * Parse Projects section
   */
  static _parseProjects(lines) {
    if (!lines || lines.length === 0) return [];

    const projects = [];
    let currentProject = null;

    for (const line of lines) {
      const isBullet = line.startsWith('•') || line.startsWith('-') || line.startsWith('*');

      // A project header line often contains pipe separator or tech tags in brackets/parentheses
      if (!isBullet && (line.includes('|') || line.includes('–') || line.includes('-') || line.length < 60)) {
        if (currentProject) projects.push(currentProject);

        let name = line;
        let techStack = [];
        let link = '';

        const urlMatch = line.match(/(https?:\/\/[^\s]+|github\.com\/[^\s]+)/i);
        if (urlMatch) {
          link = urlMatch[0];
          name = name.replace(urlMatch[0], '');
        }

        if (name.includes('|')) {
          const parts = name.split('|');
          name = parts[0].trim();
          techStack = parts.slice(1).join(',').split(',').map(s => s.trim()).filter(Boolean);
        }

        currentProject = {
          name: name.replace(/[•–—*#]/g, '').trim(),
          techStack,
          link,
          description: '',
          bullets: []
        };
      } else if (currentProject) {
        const bulletText = line.replace(/^[•\-*]\s*/, '').trim();
        currentProject.bullets.push(bulletText);
        if (!currentProject.description) {
          currentProject.description = bulletText;
        }
      }
    }

    if (currentProject) projects.push(currentProject);

    return projects;
  }

  /**
   * Parse Skills section into categories and a flat list
   */
  static _parseSkills(lines, fullText) {
    const categories = {
      languages: [],
      frameworksAndTools: [],
      technical: [],
      softSkills: []
    };
    const allSet = new Set();

    // Check line by line for structured categories like "Languages: JavaScript, Python"
    for (const line of lines) {
      const split = line.split(':');
      if (split.length >= 2) {
        const catName = split[0].toLowerCase().trim();
        const items = split.slice(1).join(':').split(/[,|•;]+/).map(s => s.trim()).filter(Boolean);

        if (catName.includes('lang')) {
          categories.languages.push(...items);
        } else if (catName.includes('frame') || catName.includes('tool') || catName.includes('lib')) {
          categories.frameworksAndTools.push(...items);
        } else {
          categories.technical.push(...items);
        }

        items.forEach(item => allSet.add(item));
      } else {
        // Simple comma or bullet separated list
        const items = line.split(/[,|•;]+/).map(s => s.trim()).filter(Boolean);
        items.forEach(item => {
          if (item.length < 35) {
            allSet.add(item);
            categories.technical.push(item);
          }
        });
      }
    }

    // Also scan the whole document for known industry skills to ensure high recall
    for (const skill of KNOWN_SKILLS) {
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(fullText)) {
        allSet.add(skill);
      }
    }

    return {
      all: Array.from(allSet),
      categories
    };
  }

  /**
   * Parse Extracurriculars section
   */
  static _parseExtracurriculars(lines) {
    if (!lines || lines.length === 0) return [];

    const entries = [];
    let current = null;
    const yearPattern = /\b(19\d{2}|20\d{2})\s*[-–—]\s*(19\d{2}|20\d{2}|Present|Current|Ongoing|\d{4})\b/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isBullet = line.startsWith('•') || line.startsWith('-') || line.startsWith('*');

      if (!isBullet && line.length < 80) {
        if (current) entries.push(current);

        const yearMatch = line.match(yearPattern);
        const dates = yearMatch ? yearMatch[0] : '';
        const title = line.replace(yearPattern, '').replace(/[•–—*#]/g, '').trim();

        current = {
          title,
          organization: '',
          dates,
          description: ''
        };

        // If next line is not a bullet, it might be the organization name
        if (lines[i + 1] && !lines[i + 1].startsWith('•') && !lines[i + 1].startsWith('-') && !yearPattern.test(lines[i + 1])) {
          current.organization = lines[i + 1].replace(/[•–—*#]/g, '').trim();
          i++;
        }
      } else if (current) {
        const clean = line.replace(/^[•\-*]\s*/, '').trim();
        current.description = current.description ? `${current.description} ${clean}` : clean;
      }
    }

    if (current) entries.push(current);
    return entries;
  }

  /**
   * Parse Volunteer Experience section
   */
  static _parseVolunteer(lines) {
    if (!lines || lines.length === 0) return [];

    const entries = [];
    let current = null;
    const yearPattern = /\b(19\d{2}|20\d{2})\s*[-–—]\s*(19\d{2}|20\d{2}|Present|Current|Ongoing|\d{4})\b/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isBullet = line.startsWith('•') || line.startsWith('-') || line.startsWith('*');

      if (!isBullet && line.length < 80) {
        if (current) entries.push(current);

        const yearMatch = line.match(yearPattern);
        const dates = yearMatch ? yearMatch[0] : '';
        const role = line.replace(yearPattern, '').replace(/[•–—*#]/g, '').trim();

        current = {
          role,
          organization: '',
          dates,
          description: ''
        };

        // If next line is not a bullet, it might be the organization name
        if (lines[i + 1] && !lines[i + 1].startsWith('•') && !lines[i + 1].startsWith('-') && !yearPattern.test(lines[i + 1])) {
          current.organization = lines[i + 1].replace(/[•–—*#]/g, '').trim();
          i++;
        }
      } else if (current) {
        const clean = line.replace(/^[•\-*]\s*/, '').trim();
        current.description = current.description ? `${current.description} ${clean}` : clean;
      }
    }

    if (current) entries.push(current);
    return entries;
  }

  /**
   * Parse Certifications & Awards section
   */
  static _parseCertifications(certLines, awardLines) {
    const certs = [];
    const combined = [...(certLines || []), ...(awardLines || [])];

    for (const line of combined) {
      const clean = line.replace(/^[•\-*]\s*/, '').trim();
      if (!clean) continue;

      const yearMatch = clean.match(/\b(19\d{2}|20\d{2})\b/);
      certs.push({
        name: clean.replace(/\b(19\d{2}|20\d{2})\b/, '').replace(/[()|–—]/g, '').trim(),
        issuer: '',
        date: yearMatch ? yearMatch[0] : ''
      });
    }

    return certs;
  }

  /**
   * Parse Additional / Misc section (Languages, Interests, etc.)
   */
  static _parseAdditional(langLines, interestLines, allSections) {
    const languages = langLines.map(l => l.replace(/^[•\-*]\s*/, '').trim()).filter(Boolean);
    const interests = interestLines.map(l => l.replace(/^[•\-*]\s*/, '').trim()).filter(Boolean);

    return {
      languages,
      interests,
      detectedSectionNames: Object.keys(allSections)
    };
  }
}

module.exports = ResumeParserService;
