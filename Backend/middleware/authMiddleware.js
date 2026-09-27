const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_careerconnect_2026';

/**
 * Middleware to verify JWT token in Authorization header
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Access denied. No authentication token provided.'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        error: 'Invalid or expired token.'
      });
    }
    req.user = decoded;
    next();
  });
}

/**
 * Middleware to enforce specific user role(s)
 * @param {Array<string>|string} allowedRoles 
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to access this resource.'
      });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles
};
