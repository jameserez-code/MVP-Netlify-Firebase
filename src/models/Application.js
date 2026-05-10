// Application Model - Production Ready
class Application {
  constructor(data) {
    this.id = data.id || null;
    this.uid = data.uid;
    this.type = data.type; // 'visa' or 'passport'
    this.status = data.status || 'pending';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    
    // Visa specific fields
    if (this.type === 'visa') {
      this.scopes = data.scopes || [];
      this.expiresAt = data.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year default
    }
    
    // Passport specific fields
    if (this.type === 'passport') {
      this.fullName = data.fullName;
      this.passportNumber = data.passportNumber;
      this.dateOfBirth = data.dateOfBirth;
      this.nationality = data.nationality;
      this.token = data.token || null;
    }
  }

  // Validation methods
  validate() {
    const errors = [];
    
    if (!this.uid) {
      errors.push("User ID is required");
    }
    
    if (!['visa', 'passport'].includes(this.type)) {
      errors.push("Invalid application type");
    }
    
    if (!['pending', 'approved', 'rejected', 'issued'].includes(this.status)) {
      errors.push("Invalid status");
    }
    
    if (this.type === 'visa') {
      if (!Array.isArray(this.scopes) || this.scopes.length === 0) {
        errors.push("At least one scope is required for visa");
      }
      // Validate scopes against allowed list
      const validScopes = ['api:read', 'api:write', 'data:share', 'config:view', 'config:admin'];
      const invalidScopes = this.scopes.filter(scope => !validScopes.includes(scope));
      if (invalidScopes.length > 0) {
        errors.push(`Invalid scopes: ${invalidScopes.join(', ')}`);
      }
    }
    
    if (this.type === 'passport') {
      if (!this.fullName || this.fullName.trim().length === 0) {
        errors.push("Full name is required");
      }
      if (!this.passportNumber || this.passportNumber.trim().length === 0) {
        errors.push("Passport number is required");
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // toJSON method for serialization
  toJSON() {
    const json = {
      id: this.id,
      uid: this.uid,
      type: this.type,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
    
    if (this.type === 'visa') {
      json.scopes = this.scopes;
      json.expiresAt = this.expiresAt;
    }
    
    if (this.type === 'passport') {
      json.fullName = this.fullName;
      json.passportNumber = this.passportNumber;
      json.dateOfBirth = this.dateOfBirth;
      json.nationality = this.nationality;
      json.token = this.token;
    }
    
    return json;
  }

  // Factory methods
  static createVisa(uid, scopes) {
    return new Application({
      uid,
      type: 'visa',
      scopes,
      status: 'pending'
    });
  }

  static createPassport(uid, fullName, passportNumber, dateOfBirth, nationality) {
    return new Application({
      uid,
      type: 'passport',
      fullName,
      passportNumber,
      dateOfBirth,
      nationality,
      status: 'pending'
    });
  }
}

export { Application };