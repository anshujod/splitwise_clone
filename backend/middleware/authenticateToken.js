// backend/middleware/authenticateToken.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET; // Make sure JWT_SECRET is loaded via dotenv in server.js

if (!JWT_SECRET) {
  throw new Error("FATAL ERROR: JWT_SECRET is not defined. Check .env file and server startup.");
}

function authenticateToken(req, res, next) {
  // Get token from the Authorization header (format: "Bearer TOKEN")
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract token part

  if (token == null) {
    console.log('Auth Middleware: No token provided');
    return res.status(401).json({ message: 'Authentication required: No token provided' }); // if there isn't any token
  }

  // Verify the token
  jwt.verify(token, JWT_SECRET, (err, userPayload) => {
    if (err) {
      console.log('Auth Middleware: Token verification failed', err.message);
      // Handle specific errors if needed (e.g., TokenExpiredError)
       if (err.name === 'TokenExpiredError') {
           return res.status(403).json({ message: 'Token expired. Please log in again.' });
       }
      return res.status(403).json({ message: 'Invalid or expired token' }); // Forbidden if token is invalid
    }

    // If token is valid, attach the payload to the request object
    // The payload contains { userId, username, email } that we put in during login
    req.user = userPayload;
    console.log('Auth Middleware: Token verified for user:', req.user.userId);

    next(); // Proceed to the next middleware or the route handler
  });
}

module.exports = authenticateToken;