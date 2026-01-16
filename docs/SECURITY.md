# Security Documentation

## Overview

This document outlines the comprehensive security measures implemented in the backend API to protect against common vulnerabilities and follow OWASP Top 10 security guidelines.

## Table of Contents

1. [Security Headers with Helmet](#security-headers-with-helmet)
2. [JWT Token Management](#jwt-token-management)
3. [Password Hashing Strategy](#password-hashing-strategy)
4. [CORS Configuration](#cors-configuration)
5. [Rate Limiting Policies](#rate-limiting-policies)
6. [Input Validation & Sanitization](#input-validation--sanitization)
7. [XSS Prevention](#xss-prevention)
8. [SQL Injection Prevention](#sql-injection-prevention)
9. [NoSQL Injection Prevention](#nosql-injection-prevention)
10. [OWASP Top 10 Protections](#owasp-top-10-protections)
11. [Security Best Practices for Deployment](#security-best-practices-for-deployment)

---

## Security Headers with Helmet

Helmet.js is configured to set the following security headers:

### Implementation

```javascript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
})
```

### Security Headers Explained

| Header | Purpose |
|--------|---------|
| **Content-Security-Policy (CSP)** | Prevents inline script execution, restricts resource loading origins |
| **Strict-Transport-Security (HSTS)** | Forces HTTPS connections for 1 year, prevents SSL stripping attacks |
| **X-Frame-Options** | Prevents clickjacking by denying frame embedding |
| **X-Content-Type-Options** | Prevents MIME-type sniffing |
| **X-XSS-Protection** | Legacy XSS protection header |
| **Referrer-Policy** | Controls referrer information leakage |

---

## JWT Token Management

### Token Strategy

The application uses a dual-token approach for enhanced security:

#### Access Token
- **Purpose**: Short-lived token for API authentication
- **Expiration**: Configured via `JWT_EXPIRE` (typically 15 minutes)
- **Stored**: In HTTP-only cookies (client-side) or Authorization header
- **Use**: Sent with each API request

#### Refresh Token
- **Purpose**: Long-lived token to generate new access tokens
- **Expiration**: Configured via `JWT_REFRESH_EXPIRE` (typically 7 days)
- **Stored**: In database and HTTP-only cookies
- **Use**: Only used to refresh access tokens

### Implementation

```javascript
// Token Generation
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Token Verification
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};
```

### Security Measures

1. **Strong Secrets**: Use strong, randomly generated JWT secrets
2. **Token Blacklisting**: Implement token blacklist on logout
3. **Database Storage**: Store refresh tokens in database for revocation
4. **Short Expiration**: Access tokens expire quickly
5. **HTTPS Only**: Always transmit tokens over HTTPS
6. **Secure Storage**: Use HTTP-only, Secure cookies for storage

### Environment Variables Required

```
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
```

---

## Password Hashing Strategy

### Algorithm: bcryptjs

bcryptjs is used for secure password hashing:

```javascript
// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password on login
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};
```

### Security Features

| Feature | Details |
|---------|---------|
| **Salt Rounds** | 10 (ensures sufficient computational cost) |
| **Algorithm** | bcrypt (adaptive, resistant to brute-force) |
| **Pre-hashing** | Applied before saving to database |
| **Comparison** | Uses constant-time comparison |

### Password Requirements

Implement strong password requirements:

- **Minimum Length**: 8 characters
- **Uppercase**: At least one uppercase letter
- **Lowercase**: At least one lowercase letter
- **Numbers**: At least one number
- **Special Characters**: At least one special character
- **No Common Patterns**: Avoid dictionary words or sequential characters

### Password Validation

```javascript
const validatePasswordStrength = (password) => {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return { isValid: errors.length === 0, errors };
};
```

---

## CORS Configuration

### Implementation

```javascript
const corsOptions = {
  origin: [
    process.env.CLIENT_URL,
    process.env.ADMIN_CLIENT_URL,
    process.env.SUPERADMIN_CLIENT_URL
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
```

### Security Considerations

1. **Whitelist Origins**: Only allow specified frontend domains
2. **Credentials**: Enable only when necessary
3. **Allowed Methods**: Restrict to required HTTP methods
4. **Allowed Headers**: Explicitly define headers
5. **Environment Variables**: Load origins from environment

### Configuration Best Practices

```
CLIENT_URL=https://yourdomain.com
ADMIN_CLIENT_URL=https://admin.yourdomain.com
SUPERADMIN_CLIENT_URL=https://superadmin.yourdomain.com
```

---

## Rate Limiting Policies

### General API Rate Limit

- **Window**: 15 minutes
- **Max Requests**: 100 requests per IP
- **Purpose**: Prevent general abuse and DoS attacks

```javascript
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => process.env.NODE_ENV === 'development',
});
```

### Login Endpoint Rate Limit

- **Window**: 15 minutes
- **Max Attempts**: 5 failed attempts per IP/email
- **Method**: Count only failed requests
- **Purpose**: Prevent brute-force attacks

```javascript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${req.body?.email}-${ip}`,
});
```

### Register Endpoint Rate Limit

- **Window**: 1 hour
- **Max Attempts**: 3 registration attempts per IP
- **Purpose**: Prevent account creation spam

```javascript
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
});
```

### Password Reset Rate Limit

- **Window**: 1 hour
- **Max Attempts**: 3 password reset attempts per email/IP
- **Purpose**: Prevent password reset abuse

```javascript
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => `${req.body?.email}-${ip}`,
});
```

### Custom Rate Limiting

For additional sensitive operations:

```javascript
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
});
```

---

## Input Validation & Sanitization

### Sanitization Pipeline

1. **Request Size Limiting**: Limit JSON/URL-encoded payloads to 10KB
2. **MongoDB Sanitization**: Remove `$` and `.` from keys (NoSQL injection prevention)
3. **XSS Sanitization**: Clean HTML/script content
4. **HPP Protection**: Prevent HTTP Parameter Pollution
5. **Custom Sanitization**: Format-specific sanitization

### Implementation

```javascript
// Middleware stack order (in server.js)
app.use(requestSizeLimiter);        // Limit: 10KB
app.use(requestUrlLimiter);         // Limit: 10KB
app.use(mongoSanitizeMiddleware);   // NoSQL injection
app.use(xssMiddleware);             // XSS prevention
app.use(hppMiddleware);             // HTTP Parameter Pollution
app.use(sanitizeBodyMiddleware);    // Custom sanitization
```

### Sanitization Functions

#### String Sanitization

```javascript
const sanitizeString = (input) => {
  if (typeof input !== 'string') return '';
  let sanitized = validator.escape(input);
  sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [] });
  return sanitized.trim();
};
```

#### Email Sanitization

```javascript
const sanitizeEmail = (email) => {
  const sanitized = email.toLowerCase().trim();
  if (!validator.isEmail(sanitized)) return '';
  return sanitized;
};
```

#### Phone Sanitization

```javascript
const sanitizePhone = (phone) => {
  const sanitized = phone.replace(/[^\d+]/g, '').trim();
  if (!validator.isMobilePhone(sanitized, 'any', { strictMode: false })) return '';
  return sanitized;
};
```

#### Object Sanitization

```javascript
const sanitizeObject = (obj) => {
  const sanitized = {};
  for (const key in obj) {
    // Skip NoSQL operators
    if (key.startsWith('$') || key.startsWith('.')) continue;

    // Recursively sanitize based on type
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    }
  }
  return sanitized;
};
```

---

## XSS Prevention

### Cross-Site Scripting (XSS) Protection

XSS attacks attempt to inject malicious scripts into web pages. Protections include:

### 1. Content Security Policy (CSP)

```javascript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
  },
}
```

### 2. XSS Middleware

```javascript
import xss from 'xss-clean';
app.use(xss());
```

Removes dangerous HTML/JavaScript from request bodies.

### 3. DOMPurify Sanitization

```javascript
import DOMPurify from 'isomorphic-dompurify';
const clean = DOMPurify.sanitize(userInput, { ALLOWED_TAGS: [] });
```

### 4. Output Encoding

- Always HTML-encode user data before displaying
- Use framework templates that auto-escape by default
- Avoid `innerHTML` with user data

### 5. HTTP-Only Cookies

Store authentication tokens in HTTP-only cookies:

```javascript
res.cookie('accessToken', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000, // 15 minutes
});
```

---

## SQL Injection Prevention

### Protection Strategy

While the backend uses MongoDB (not SQL), similar injection principles apply:

### 1. Parameterized Queries

Never concatenate user input into queries:

```javascript
// WRONG
const user = await User.find({ email: req.body.email });

// RIGHT - Mongoose handles parameterization
const user = await User.findOne({ email: sanitizedEmail });
```

### 2. Input Validation

Always validate input types and formats:

```javascript
if (!validator.isEmail(email)) {
  return sendError(res, 400, 'Invalid email format');
}
```

### 3. Schema Validation

Define strict schemas:

```javascript
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email']
  }
});
```

---

## NoSQL Injection Prevention

### Protection Mechanisms

MongoDB is vulnerable to injection when user input is not properly sanitized.

### 1. MongoDB Sanitization Middleware

```javascript
import mongoSanitize from 'express-mongo-sanitize';
app.use(mongoSanitize());
```

Removes `$` and `.` from keys to prevent operator injection.

### 2. Query Operators Prevention

```javascript
// VULNERABLE
const user = await User.findOne(req.body);
// If body: { email: { $ne: null } } - retrieves all users!

// SAFE
const user = await User.findOne({
  email: sanitizeEmail(req.body.email)
});
```

### 3. Schema Type Enforcement

```javascript
const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  age: { type: Number, min: 0, max: 150 }
});
```

### 4. Whitelisting Fields

```javascript
const sanitizeRequestBody = (body) => {
  const allowedFields = ['email', 'firstName', 'lastName', 'phone'];
  const sanitized = {};

  for (const field of allowedFields) {
    if (field in body) {
      sanitized[field] = body[field];
    }
  }

  return sanitized;
};
```

---

## OWASP Top 10 Protections

### A1: Broken Authentication & Session Management

**Protections:**
- Secure JWT implementation with short-lived tokens
- Refresh token rotation on login
- Password hashing with bcryptjs
- Rate limiting on login (5 attempts/15 min)
- Account lockout mechanisms (to be implemented)

```javascript
// In authController.js
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true
});
```

### A2: Broken Access Control

**Protections:**
- Role-based access control (RBAC) middleware
- JWT verification on protected routes
- Per-resource authorization checks

```javascript
// Middleware stack
router.get('/admin-only', protect, roleCheck('admin'), handler);
```

### A3: Injection (SQL, NoSQL, Command)

**Protections:**
- Input sanitization and validation
- MongoDB sanitization middleware
- Parameterized queries
- Type checking and casting

```javascript
app.use(mongoSanitizeMiddleware); // Prevents NoSQL injection
app.use(sanitizeBodyMiddleware);  // Custom input validation
```

### A4: Insecure Direct Object References (IDOR)

**Protections:**
- Authorization checks before resource access
- User ID verification from JWT
- Resource ownership validation

```javascript
const resource = await Resource.findById(id);
if (resource.userId !== req.user.id) {
  return sendError(res, 403, 'Forbidden');
}
```

### A5: Cross-Site Request Forgery (CSRF)

**Protections:**
- SameSite cookie attribute
- CORS restrictions
- JWT tokens (not stored in cookies by default)

```javascript
cors({
  origin: ['https://yourdomain.com'],
  credentials: true
});
```

### A6: Security Misconfiguration

**Protections:**
- Helmet.js for security headers
- Environment-based configuration
- No sensitive data in error responses
- HTTPS enforcement

```javascript
app.use(helmetConfig);
// Error handler hides stack traces in production
if (process.env.NODE_ENV === 'production') {
  // Hide stack trace
}
```

### A7: Cross-Site Scripting (XSS)

**Protections:**
- XSS middleware (xss-clean)
- DOMPurify sanitization
- Content Security Policy headers
- HTML entity encoding

```javascript
app.use(xss());
const clean = DOMPurify.sanitize(userInput, { ALLOWED_TAGS: [] });
```

### A8: Insecure Deserialization

**Protections:**
- Never deserialize untrusted data
- Use JSON schema validation
- Type validation with Joi

```javascript
const schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required()
});
```

### A9: Using Components with Known Vulnerabilities

**Protections:**
- Regular npm audits
- Dependency updates
- Automated security scanning

```bash
# Audit dependencies
npm audit
npm audit fix

# Update packages
npm update
```

### A10: Insufficient Logging & Monitoring

**Protections:**
- Implement comprehensive logging
- Log security events
- Monitor for suspicious patterns
- Alert on failures

```javascript
// Log authentication events
console.log(`User login attempt: ${email} from ${ip}`);
```

---

## Security Best Practices for Deployment

### 1. Environment Configuration

```bash
# .env file (never commit to git)
NODE_ENV=production
PORT=5000
JWT_SECRET=your-very-long-random-secret-min-32-chars
JWT_REFRESH_SECRET=another-long-random-secret-min-32-chars
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
CLIENT_URL=https://yourdomain.com
ADMIN_CLIENT_URL=https://admin.yourdomain.com
SUPERADMIN_CLIENT_URL=https://superadmin.yourdomain.com
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
NODE_ENV=production
```

### 2. HTTPS/TLS

- Always use HTTPS in production
- Obtain SSL/TLS certificate from trusted authority
- Use at least TLS 1.2
- Implement HSTS headers

### 3. Database Security

- Use strong database credentials
- Enable MongoDB authentication
- Use connection string encryption
- Regular backups with encryption
- Restrict database access to application servers only

```
mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true
```

### 4. API Security

- Use API keys for external services
- Implement API versioning
- Rate limiting (implemented)
- Request size limits (implemented)
- CORS whitelist (implemented)

### 5. Monitoring & Logging

```javascript
// Log security events
logger.info(`User login: ${email} from ${req.ip}`);
logger.warn(`Failed login: ${email} - attempt ${attempt}`);
logger.error(`Unauthorized access attempt: ${req.path}`);
```

### 6. Regular Security Audits

```bash
# Dependency vulnerabilities
npm audit

# Code quality
eslint .

# Security linting
npm install --save-dev eslint-plugin-security
```

### 7. Secrets Management

- Use environment variables
- Never commit `.env` files
- Use a secrets management service (e.g., AWS Secrets Manager)
- Rotate secrets regularly
- Use strong random generation

```bash
# Generate strong secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 8. Infrastructure Security

- Use firewall rules
- Implement WAF (Web Application Firewall)
- Use DDoS protection
- Monitor server resources
- Implement intrusion detection

### 9. Data Protection

- Encrypt sensitive data at rest
- Encrypt data in transit (HTTPS)
- Implement data masking for logs
- Secure password reset flows
- PII handling compliance (GDPR, CCPA)

### 10. Incident Response

- Have an incident response plan
- Log security events
- Monitor for breaches
- Set up alerts for suspicious activities
- Document and respond to incidents quickly

### 11. Development Practices

- Code review process
- Secure coding guidelines
- Dependency management
- Regular security training
- Penetration testing
- Bug bounty program (for larger scale)

### 12. Deployment Checklist

```
[ ] Secrets loaded from environment variables
[ ] HTTPS/TLS configured
[ ] Database credentials secured
[ ] CORS whitelist configured
[ ] Rate limiting enabled
[ ] Helmet middleware active
[ ] Input sanitization enabled
[ ] Logging configured
[ ] Error handling secure (no stack traces)
[ ] Dependencies updated
[ ] Security headers verified
[ ] Database backups configured
[ ] Monitoring alerts set up
[ ] Firewall rules applied
```

---

## Implementation Status

### ✅ Implemented

- Helmet security headers
- JWT token management
- Password hashing with bcryptjs
- CORS configuration
- Rate limiting (general, login, register)
- Input sanitization and validation
- XSS prevention
- NoSQL injection prevention
- Request size limiting
- HTTP Parameter Pollution prevention
- MongoDB sanitization

### 🔄 To Be Implemented

- Account lockout mechanism
- Password reset flow with rate limiting
- Two-factor authentication (2FA)
- Session management
- Audit logging
- Security monitoring and alerting
- API key authentication for services
- Encryption at rest
- Data masking in logs

---

## Support & References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [MongoDB Security](https://docs.mongodb.com/manual/security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8949)
- [bcryptjs Documentation](https://github.com/dcodeIO/bcrypt.js)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)

---

## Security Team

For security concerns or vulnerability reports, please contact: security@yourdomain.com

**Last Updated**: January 14, 2025
**Version**: 1.0.0
