// Firebase Configuration - Production Ready
const firebaseConfig = {
  // These will be set via environment variables in production
  apiKey: process.env.FIREBASE_API_KEY || "YOUR_API_KEY_PLACEHOLDER",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID_PLACEHOLDER",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID_PLACEHOLDER",
  appId: process.env.FIREBASE_APP_ID || "YOUR_APP_ID_PLACEHOLDER"
};

// Environment validation
const validateConfig = (config) => {
  const requiredKeys = ['apiKey', 'authDomain', 'projectId'];
  const missingKeys = requiredKeys.filter(key => !config[key] || config[key] === `${key.toUpperCase()}_PLACEHOLDER`);
  
  if (missingKeys.length > 0) {
    console.warn(`Missing Firebase config keys: ${missingKeys.join(', ')}`);
    return false;
  }
  return true;
};

// Export configuration with validation
export { firebaseConfig, validateConfig };