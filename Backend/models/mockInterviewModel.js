const db = require('../config/db');

/**
 * MockInterviewModel
 * Manages the `mock_interviews` schema (user_id, job_id, transcript, created_at)
 * across Firestore / In-Memory Mock Firestore and PostgreSQL.
 */
class MockInterviewModel {
  static COLLECTION = 'mock_interviews';
  static STATUS_IN_PROGRESS = 'in_progress';
  static STATUS_COMPLETED = 'completed';

  /**
   * Return the SQL DDL statement defining the `mock_interviews` table schema (Task 11.2)
   * Columns: id, user_id, job_id, transcript, created_at (plus metadata)
   * @returns {string}
   */
  static getPostgresTableSQL() {
    return `
      CREATE TABLE IF NOT EXISTS mock_interviews (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        job_id VARCHAR(255) NOT NULL,
        job_title VARCHAR(255),
        company_name VARCHAR(255),
        questions JSONB NOT NULL DEFAULT '[]'::jsonb,
        transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
        status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_mock_interviews_user_id ON mock_interviews(user_id);
      CREATE INDEX IF NOT EXISTS idx_mock_interviews_job_id ON mock_interviews(job_id);
    `;
  }

  /**
   * Ensure the `mock_interviews` table exists when using PostgreSQL provider
   * @param {Object} pgPool
   */
  static async ensurePostgresTable(pgPool) {
    if (!pgPool || typeof pgPool.query !== 'function') return;
    await pgPool.query(this.getPostgresTableSQL());
  }

  /**
   * Build initial transcript entries from the 5 generated questions
   * @param {Array<Object>} questions
   * @param {Array<Object>} [existingTranscript]
   * @returns {Array<Object>}
   */
  static buildTranscriptEntries(questions = [], existingTranscript = []) {
    const responseByQuestionNumber = new Map();
    if (Array.isArray(existingTranscript)) {
      existingTranscript.forEach((entry, index) => {
        if (entry && typeof entry === 'object') {
          const qNum = Number(entry.questionNumber || index + 1);
          responseByQuestionNumber.set(qNum, entry);
        }
      });
    }

    return questions.map((q, index) => {
      const qNum = Number(q.questionNumber || index + 1);
      const prev = responseByQuestionNumber.get(qNum) || {};
      const responseText = typeof prev.response === 'string' ? prev.response : '';
      return {
        questionId: q.id || `q_${qNum}`,
        questionNumber: qNum,
        category: q.category || (qNum <= 3 ? 'technical' : 'behavioral'),
        framework: q.framework || (qNum <= 3 ? 'Role-Specific' : 'STAR'),
        focusArea: q.focusArea || '',
        question: q.question || '',
        hint: q.hint || '',
        starGuide: q.starGuide || null,
        response: responseText,
        responseMode: prev.responseMode || 'text',
        answeredAt: responseText.trim() ? (prev.answeredAt || new Date().toISOString()) : null
      };
    });
  }

  /**
   * Create and persist a new mock interview session in `mock_interviews` (Task 11.2)
   * @param {Object} params
   * @param {string} params.user_id - ID of the Job Seeker starting the mock interview
   * @param {string} params.job_id - ID of the target job posting
   * @param {string} [params.jobTitle]
   * @param {string} [params.companyName]
   * @param {Array<Object>} params.questions - 5 structured interview questions
   * @param {Array<Object>} [params.transcript] - Optional initial transcript array
   * @param {string} [params.provider] - AI provider identifier ('gemini' | 'heuristic-generator')
   * @returns {Promise<Object>}
   */
  static async create({
    user_id,
    userId,
    job_id,
    jobId,
    jobTitle = '',
    companyName = '',
    questions = [],
    transcript = null,
    provider = 'gemini'
  }) {
    const resolvedUserId = String(user_id || userId || '').trim();
    const resolvedJobId = String(job_id || jobId || '').trim();

    if (!resolvedUserId) {
      const err = new Error('user_id is required to create a mock interview session.');
      err.statusCode = 400;
      throw err;
    }

    if (!resolvedJobId) {
      const err = new Error('job_id is required to create a mock interview session.');
      err.statusCode = 400;
      throw err;
    }

    const firestore = db.getFirestore();
    if (!firestore) {
      throw new Error('Firestore database is not initialized');
    }

    const docRef = firestore.collection(this.COLLECTION).doc();
    const nowIso = new Date().toISOString();

    const initialTranscript = Array.isArray(transcript) && transcript.length > 0
      ? this.buildTranscriptEntries(questions, transcript)
      : this.buildTranscriptEntries(questions, []);

    const record = {
      id: docRef.id,
      user_id: resolvedUserId,
      job_id: resolvedJobId,
      jobTitle: String(jobTitle || ''),
      companyName: String(companyName || ''),
      provider: String(provider || 'gemini'),
      questions: Array.isArray(questions) ? questions : [],
      transcript: initialTranscript,
      status: this.STATUS_IN_PROGRESS,
      created_at: nowIso,
      updated_at: nowIso
    };

    await docRef.set(record);
    return record;
  }

  /**
   * Find a mock interview session by ID
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    if (!id) return null;
    const firestore = db.getFirestore();
    if (!firestore) return null;

    const doc = await firestore.collection(this.COLLECTION).doc(String(id)).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Update the transcript (and optionally status) of an existing mock interview session
   * @param {string} id
   * @param {string} userId
   * @param {Object} updates
   * @param {Array<Object>} [updates.transcript]
   * @param {Object} [updates.singleAnswer] - { questionNumber, response, responseMode }
   * @param {string} [updates.status]
   * @returns {Promise<Object>}
   */
  static async updateTranscript(id, userId, { transcript, singleAnswer, status } = {}) {
    const existing = await this.findById(id);
    if (!existing) {
      const err = new Error('Mock interview session not found.');
      err.statusCode = 404;
      throw err;
    }

    if (userId && String(existing.user_id) !== String(userId)) {
      const err = new Error('You do not have permission to modify this mock interview session.');
      err.statusCode = 403;
      throw err;
    }

    let updatedTranscript = Array.isArray(existing.transcript) ? [...existing.transcript] : [];

    if (Array.isArray(transcript)) {
      updatedTranscript = this.buildTranscriptEntries(existing.questions || [], transcript);
    } else if (singleAnswer && typeof singleAnswer === 'object') {
      const targetNum = Number(singleAnswer.questionNumber);
      const nowIso = new Date().toISOString();
      updatedTranscript = updatedTranscript.map((entry, idx) => {
        const entryNum = Number(entry.questionNumber || idx + 1);
        if (entryNum === targetNum) {
          const responseText = typeof singleAnswer.response === 'string' ? singleAnswer.response : '';
          return {
            ...entry,
            response: responseText,
            responseMode: singleAnswer.responseMode || entry.responseMode || 'text',
            answeredAt: responseText.trim() ? nowIso : null
          };
        }
        return entry;
      });
    }

    const allAnswered = updatedTranscript.length > 0 && updatedTranscript.every(
      (item) => typeof item.response === 'string' && item.response.trim().length > 0
    );

    const nextStatus = status || (allAnswered ? this.STATUS_COMPLETED : existing.status || this.STATUS_IN_PROGRESS);
    const updatedAt = new Date().toISOString();

    const firestore = db.getFirestore();
    const docRef = firestore.collection(this.COLLECTION).doc(String(id));

    await docRef.update({
      transcript: updatedTranscript,
      status: nextStatus,
      updated_at: updatedAt
    });

    const updatedDoc = await docRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
  }

  /**
   * Find all mock interviews for a specific user and job posting, newest first
   * @param {string} userId
   * @param {string} jobId
   * @returns {Promise<Array<Object>>}
   */
  static async findByUserAndJob(userId, jobId) {
    const firestore = db.getFirestore();
    if (!firestore) return [];

    const snapshot = await firestore
      .collection(this.COLLECTION)
      .where('user_id', '==', String(userId))
      .where('job_id', '==', String(jobId))
      .get();

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }

  /**
   * Find all mock interviews for a user across all job postings, newest first
   * @param {string} userId
   * @returns {Promise<Array<Object>>}
   */
  static async findByUser(userId) {
    const firestore = db.getFirestore();
    if (!firestore) return [];

    const snapshot = await firestore
      .collection(this.COLLECTION)
      .where('user_id', '==', String(userId))
      .get();

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }
}

module.exports = MockInterviewModel;
