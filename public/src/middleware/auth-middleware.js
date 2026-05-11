// Authentication Middleware - Production Ready
class AuthMiddleware {
  constructor(firebaseClient) {
    this.firebaseClient = firebaseClient;
  }

  // Require authentication middleware
  async requireAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing or invalid authorization header'
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify token with Firebase
      const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-auth-compat.js");
      const auth = getAuth(this.firebaseClient.app);

      const decodedToken = await auth.verifyIdToken(token);
      req.user = decodedToken;

      next();
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid authentication token'
      });
    }
  }

  // Rate limiting middleware
  rateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) { // 100 requests per 15 minutes
    const requests = new Map();

    return (req, res, next) => {
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean up old requests
      if (requests.has(ip)) {
        const userRequests = requests.get(ip);
        const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
        requests.set(ip, validRequests);
      } else {
        requests.set(ip, []);
      }

      // Check rate limit
      const userRequests = requests.get(ip);
      if (userRequests.length >= maxRequests) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded'
        });
      }

      // Add current request
      userRequests.push(now);
      next();
    };
  }

  // CORS middleware
  cors(origin = '*', methods = ['GET', 'POST', 'PUT', 'DELETE']) {
    return (req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }

      next();
    };
  }
}

export { AuthMiddleware };