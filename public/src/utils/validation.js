// Input Validation Utilities - Production Ready
class Validator {
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  static validatePassportNumber(passportNumber) {
    // Basic validation - alphanumeric, 6-20 characters
    const passportRegex = /^[A-Z0-9]{6,20}$/;
    return passportRegex.test(passportNumber.toUpperCase());
  }

  static validateFullName(name) {
    // Basic validation - letters, spaces, hyphens, apostrophes
    const nameRegex = /^[A-Za-z\s\-']+$/;
    return nameRegex.test(name) && name.trim().length > 0;
  }

  static validateScopes(scopes) {
    const validScopes = ['api:read', 'api:write', 'data:share', 'config:view', 'config:admin'];
    return Array.isArray(scopes) && scopes.every(scope => validScopes.includes(scope));
  }

  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    // Remove potentially dangerous characters
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .trim();
  }

  static validateApplicationData(data) {
    const errors = [];

    if (!data.uid) {
      errors.push("User ID is required");
    }

    if (data.type === 'visa') {
      if (!this.validateScopes(data.scopes)) {
        errors.push("Invalid scopes provided");
      }
    } else if (data.type === 'passport') {
      if (!this.validateFullName(data.fullName)) {
        errors.push("Invalid full name");
      }
      if (!this.validatePassportNumber(data.passportNumber)) {
        errors.push("Invalid passport number");
      }
    } else {
      errors.push("Invalid application type");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export { Validator };