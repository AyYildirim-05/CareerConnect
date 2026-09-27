const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { UserModel, JobSeekerModel, RecruiterModel } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_careerconnect_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const VALID_ROLES = ['Job Seeker', 'Recruiter'];

/**
 * Validate email format using standard regex
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

class AuthController {
  /**
   * POST /api/auth/register
   * Register a new user (Job Seeker or Recruiter)
   */
  static async register(req, res) {
    try {
      const { email, password, role, profile, companyProfile } = req.body;

      // Input Validation
      const errors = {};

      if (!email || !email.trim()) {
        errors.email = 'Email address is required.';
      } else if (!isValidEmail(email.trim())) {
        errors.email = 'Please enter a valid email address.';
      }

      if (!password) {
        errors.password = 'Password is required.';
      } else if (password.length < 6) {
        errors.password = 'Password must be at least 6 characters long.';
      }

      if (!role) {
        errors.role = 'Role selection is required.';
      } else if (!VALID_ROLES.includes(role)) {
        errors.role = 'Role must be either "Job Seeker" or "Recruiter".';
      }

      if (Object.keys(errors).length > 0) {
        return res.status(400).json({
          message: 'Validation failed',
          errors
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Check global email uniqueness across all users
      const existingUser = await UserModel.findByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(400).json({
          message: 'Registration failed',
          errors: { email: 'An account with this email address already exists.' }
        });
      }

      // Hash and Salt Password (10 rounds of bcrypt salting)
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create model instance based on role
      let newUser;
      if (role === JobSeekerModel.ROLE) {
        newUser = await JobSeekerModel.create({
          email: normalizedEmail,
          passwordHash,
          profile: profile || {}
        });
      } else if (role === RecruiterModel.ROLE) {
        newUser = await RecruiterModel.create({
          email: normalizedEmail,
          passwordHash,
          companyProfile: companyProfile || {}
        });
      }

      // Generate JWT Token
      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, role: newUser.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      const safeUser = UserModel.sanitizeUser(newUser);

      return res.status(201).json({
        message: 'Registration successful!',
        token,
        user: safeUser
      });

    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({
        message: 'An internal server error occurred during registration.'
      });
    }
  }

  /**
   * POST /api/auth/login
   * Authenticate user with email and password
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Client input check
      if (!email || !password) {
        return res.status(400).json({
          message: 'Invalid credentials',
          error: 'Invalid email or password.'
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Lookup user in DB
      const user = await UserModel.findByEmail(normalizedEmail);

      // Verify user existence and password comparison
      let isMatch = false;
      if (user && user.password_hash) {
        isMatch = await bcrypt.compare(password, user.password_hash);
      } else {
        // Run dummy hash check to mitigate timing attacks if user not found
        await bcrypt.compare(password, '$2a$10$7v1bN.jZ6G.7s2h0u7Z6u.6V7Z6u7Z6u7Z6u7Z6u7Z6u7Z6u7Z6u');
      }

      // Unified generic error to prevent user enumeration
      if (!user || !isMatch) {
        return res.status(401).json({
          message: 'Authentication failed',
          error: 'Invalid email or password.'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      const safeUser = UserModel.sanitizeUser(user);

      return res.status(200).json({
        message: 'Login successful!',
        token,
        user: safeUser
      });

    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        message: 'An internal server error occurred during login.'
      });
    }
  }

  /**
   * GET /api/auth/me
   * Get current authenticated user details
   */
  static async getMe(req, res) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      return res.status(200).json({ user: UserModel.sanitizeUser(user) });
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({ error: 'Failed to fetch user profile.' });
    }
  }
}

module.exports = AuthController;
