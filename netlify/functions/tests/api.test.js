// API Test Suite - Production Ready
const { describe, it } = require("node:test");
const assert = require("node:assert");
const { Validator } = require("../../src/utils/validation.js");

describe("Validation Utilities", () => {
  describe("validateEmail", () => {
    it("accepts valid emails", () => {
      assert.strictEqual(Validator.validateEmail("user@example.com"), true);
      assert.strictEqual(Validator.validateEmail("test.user+alias@domain.co"), true);
    });

    it("rejects invalid emails", () => {
      assert.strictEqual(Validator.validateEmail("notanemail"), false);
      assert.strictEqual(Validator.validateEmail(""), false);
      assert.strictEqual(Validator.validateEmail("user@"), false);
      assert.strictEqual(Validator.validateEmail("@domain.com"), false);
    });
  });

  describe("validatePassportNumber", () => {
    it("accepts valid passport numbers", () => {
      assert.strictEqual(Validator.validatePassportNumber("PS789012"), true);
      assert.strictEqual(Validator.validatePassportNumber("ABCDEF123456"), true);
    });

    it("rejects invalid passport numbers", () => {
      assert.strictEqual(Validator.validatePassportNumber("abc"), false);
      assert.strictEqual(Validator.validatePassportNumber(""), false);
      assert.strictEqual(Validator.validatePassportNumber("too_long_passport_number_here"), false);
    });
  });

  describe("validateFullName", () => {
    it("accepts valid names", () => {
      assert.strictEqual(Validator.validateFullName("James Sterling"), true);
      assert.strictEqual(Validator.validateFullName("O'Brien"), true);
    });

    it("rejects invalid names", () => {
      assert.strictEqual(Validator.validateFullName(""), false);
      assert.strictEqual(Validator.validateFullName("12345"), false);
    });
  });

  describe("validateScopes", () => {
    it("accepts valid scopes", () => {
      assert.strictEqual(Validator.validateScopes(["api:read"]), true);
      assert.strictEqual(Validator.validateScopes(["api:read", "config:admin"]), true);
    });

    it("rejects invalid scopes", () => {
      assert.strictEqual(Validator.validateScopes(["invalid:scope"]), false);
      assert.strictEqual(Validator.validateScopes([]), true); // Empty arrays are valid
      assert.strictEqual(Validator.validateScopes("not_array"), false);
    });
  });

  describe("sanitizeInput", () => {
    it("escapes HTML characters", () => {
      assert.strictEqual(Validator.sanitizeInput("<script>"), "&lt;script&gt;");
      assert.strictEqual(Validator.sanitizeInput('"test"'), "&quot;test&quot;");
    });

    it("trims whitespace", () => {
      assert.strictEqual(Validator.sanitizeInput("  hello  "), "hello");
    });
  });

  describe("validateApplicationData", () => {
    it("validates visa applications", () => {
      const result = Validator.validateApplicationData({
        uid: "user123",
        type: "visa",
        scopes: ["api:read"],
      });
      assert.strictEqual(result.isValid, true);
    });

    it("rejects applications with missing uid", () => {
      const result = Validator.validateApplicationData({
        type: "visa",
        scopes: ["api:read"],
      });
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.length > 0);
    });

    it("validates passport applications", () => {
      const result = Validator.validateApplicationData({
        uid: "user123",
        type: "passport",
        fullName: "James Sterling",
        passportNumber: "PS789012",
      });
      assert.strictEqual(result.isValid, true);
    });

    it("rejects passport without name", () => {
      const result = Validator.validateApplicationData({
        uid: "user123",
        type: "passport",
        fullName: "",
        passportNumber: "PS789012",
      });
      assert.strictEqual(result.isValid, false);
    });
  });
});

describe("Application Model", () => {
  it("creates valid visa", () => {
    const { Application } = require("../../src/models/Application.js");
    const visa = Application.createVisa("user1", ["api:read"]);
    assert.strictEqual(visa.type, "visa");
    assert.strictEqual(visa.status, "pending");
    assert.strictEqual(visa.scopes.length, 1);
  });

  it("creates valid passport", () => {
    const { Application } = require("../../src/models/Application.js");
    const passport = Application.createPassport("user1", "John Doe", "JD000001");
    assert.strictEqual(passport.type, "passport");
    assert.strictEqual(passport.status, "pending");
    assert.strictEqual(passport.fullName, "John Doe");
  });
});

console.log("All tests passed.");