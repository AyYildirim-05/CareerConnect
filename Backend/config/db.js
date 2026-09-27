const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let activeProvider = 'firebase';
let pgPool = null;
let firestoreDb = null;

/**
 * Initialize Firebase Firestore Connection
 */
async function initDb() {
  const targetProvider = process.env.DB_PROVIDER || 'firebase';

  // 1. PostgreSQL (if explicitly set)
  if (targetProvider === 'postgres' && process.env.DATABASE_URL) {
    try {
      let Pool;
      try {
        Pool = require('pg').Pool;
      } catch (e) {
        console.error('PostgreSQL package "pg" is not installed.');
        throw e;
      }
      pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false
      });
      await pgPool.query('SELECT 1');
      activeProvider = 'postgres';
      console.log('Connected to PostgreSQL Database.');
      await createPostgresTables();
      return pgPool;
    } catch (err) {
      console.error('PostgreSQL connection error:', err.message);
    }
  }

  // 2. Firebase Firestore (Default Primary Database)
  try {
    if (admin.apps.length === 0) {
      let certObj = null;

      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      if (serviceAccountPath && fs.existsSync(path.resolve(__dirname, '..', serviceAccountPath))) {
        const serviceAccount = require(path.resolve(__dirname, '..', serviceAccountPath));
        certObj = admin.credential.cert(serviceAccount);
      } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        certObj = admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        });
      } else if (process.env.FIRESTORE_EMULATOR_HOST || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        certObj = admin.credential.applicationDefault();
      }

      if (certObj) {
        admin.initializeApp({
          credential: certObj,
          projectId: process.env.FIREBASE_PROJECT_ID || 'soen-341-a1f89'
        });
      } else {
        // Fallback default init with project ID
        admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || 'soen-341-a1f89'
        });
      }
    }
    
    firestoreDb = admin.firestore();
    activeProvider = 'firebase';
    console.log('🔥 Connected to Firebase Firestore Database.');
    return firestoreDb;
  } catch (err) {
    console.error('Firebase initialization error:', err.message);
    throw err;
  }
}

/**
 * Create users table in PostgreSQL
 */
async function createPostgresTables() {
  const queryText = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL CHECK (role IN ('Job Seeker', 'Recruiter')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `;
  await pgPool.query(queryText);
}

/**
 * Database abstraction helper methods
 */
const db = {
  initDb,
  getProvider: () => activeProvider,
  getFirestore: () => firestoreDb,

  // Close db connections
  async close() {
    if (pgPool) {
      await pgPool.end();
    }
    if (admin.apps.length > 0) {
      await Promise.all(admin.apps.map(app => app.delete()));
    }
  }
};

module.exports = db;
