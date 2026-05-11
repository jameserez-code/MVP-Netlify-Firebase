// Passport Service - Production Ready
import jwt from 'https://cdn.skypack.dev/jsonwebtoken';

class PassportService {
  constructor(secret = process.env.JWT_SECRET || 'fallback_secret_for_dev_only') {
    this.secret = secret;
    this.algorithm = 'HS256';
  }

  // Generate JWT token for passport
  generateToken(payload, expiresIn = '1y') {
    if (!this.secret || this.secret === 'fallback_secret_for_dev_only') {
      console.warn('WARNING: Using fallback secret. Set JWT_SECRET in environment variables for production.');
    }

    try {
      const tokenPayload = {
        ...payload,
        iss: 'PassportAgent',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (expiresIn === '1y' ? 365 * 24 * 60 * 60 : 3600) // 1 year or 1 hour
      };

      return jwt.sign(tokenPayload, this.secret, { algorithm: this.algorithm });
    } catch (error) {
      console.error('Error generating JWT token:', error);
      throw new Error('Failed to generate passport token');
    }
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.secret, { algorithms: [this.algorithm] });
    } catch (error) {
      console.error('Error verifying JWT token:', error);
      throw new Error('Invalid or expired token');
    }
  }

  // Create passport with embedded JWT
  createPassport(application) {
    const payload = {
      sub: application.uid,
      passportId: application.id,
      fullName: application.fullName,
      passportNumber: application.passportNumber,
      dateOfBirth: application.dateOfBirth,
      nationality: application.nationality,
      scopes: ['passport:holder']
    };

    const token = this.generateToken(payload);

    return {
      ...application,
      token,
      issuedAt: new Date().toISOString(),
      status: 'issued'
    };
  }

  // Validate passport token
  validatePassport(passport) {
    if (!passport.token) {
      throw new Error('Passport token is missing');
    }

    try {
      const decoded = this.verifyToken(passport.token);
      return {
        isValid: true,
        decoded,
        passport
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message,
        passport
      };
    }
  }
}

// Singleton instance
const passportService = new PassportService();

export { passportService };