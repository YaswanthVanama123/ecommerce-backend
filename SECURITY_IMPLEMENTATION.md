# Security Implementation Guide

## Overview

This guide provides a comprehensive overview of the security enhancements implemented in the backend application to protect against OWASP Top 10 vulnerabilities.

## Files Created/Modified

### New Files Created

1. **middleware/security.js** (4,014 bytes)
   - Helmet configuration for security headers
   - MongoDB sanitization middleware
   - XSS prevention middleware
   - HTTP Parameter Pollution prevention
   - Request size limiters
   - Rate limiters for different endpoints
   - Specialized rate limiters for login, register, password reset

2. **utils/sanitize.js** (6,140 bytes)
   - String sanitization functions
   - Email validation and sanitization
   - Phone number validation and sanitization
   - Number validation
   - Password sanitization
   - URL validation and sanitization
   - Object sanitization (prevents NoSQL injection)
   - Password strength validation
   - Body sanitization middleware

3. **docs/SECURITY.md** (20,315 bytes)
   - Complete security documentation
   - Implementation details for all security measures
   - OWASP Top 10 protections mapping
   - Best practices for deployment
   - Configuration guidelines

### Files Modified

1. **server.js**
   - Added security middleware imports
   - Integrated all security middleware in proper order
   - Enhanced CORS configuration
   - Removed hardcoded rate limiter (replaced with security module)

2. **routes/authRoutes.js**
   - Added rate limiters to register endpoint (3 attempts/hour)
   - Added rate limiters to login endpoint (5 attempts/15 min)

3. **controllers/authController.js**
   - Added password strength validation on registration
   - Returns validation errors for weak passwords

4. **package.json**
   - Added security dependencies:
     - express-mongo-sanitize: ^2.2.0
     - hpp: ^0.2.3
     - isomorphic-dompurify: ^1.12.0
     - validator: ^13.11.0
     - xss-clean: ^0.1.1

## Security Features Implemented

### 1. Security Headers (Helmet.js)

- **Content-Security-Policy**: Restricts inline scripts and resource loading
- **Strict-Transport-Security**: Forces HTTPS for 1 year
- **X-Frame-Options**: Prevents clickjacking (deny embedding)
- **X-Content-Type-Options**: Prevents MIME-type sniffing
- **Referrer-Policy**: Prevents referrer leakage

### 2. Input Sanitization

- **MongoDB Sanitization**: Removes $ and . from keys (prevents NoSQL injection)
- **XSS Prevention**: Removes dangerous HTML/JavaScript
- **HPP Protection**: Prevents HTTP Parameter Pollution
- **Size Limiting**: 10KB limit on JSON/URL-encoded payloads
- **Custom Sanitization**: Format-specific cleaning for emails, phones, URLs

### 3. Rate Limiting

**Endpoint-specific rates:**
- **Login**: 5 attempts per 15 minutes (per email+IP)
- **Register**: 3 attempts per hour (per IP)
- **General API**: 100 requests per 15 minutes (per IP)

**Features:**
- Counts only failed requests for login
- Proxied IP detection (X-Forwarded-For)
- Development mode bypass

### 4. Authentication Security

- **JWT Tokens**: Short-lived access tokens (15 min), long-lived refresh tokens (7 days)
- **Bcryptjs**: Password hashing with salt rounds = 10
- **Token Validation**: Verified on protected routes
- **Account Status**: Checks user isActive flag

### 5. Password Security

- **Strength Requirements**:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- **Hashing**: bcryptjs with 10 salt rounds
- **Validation**: Enforced on registration

### 6. CORS Configuration

- Whitelist specific origins (from environment variables)
- Allow credentials
- Specific HTTP methods allowed
- Explicit headers allowed

### 7. OWASP Top 10 Coverage

| OWASP # | Vulnerability | Protection |
|---------|---------------|-----------|
| A1 | Broken Authentication | JWT, password hashing, rate limiting |
| A2 | Broken Access Control | Role-based middleware, JWT verification |
| A3 | Injection | Input sanitization, parameterized queries |
| A4 | Insecure Direct Object References | Auth checks before resource access |
| A5 | CSRF | CORS whitelist, JWT tokens, SameSite cookies |
| A6 | Security Misconfiguration | Helmet, environment config, error handling |
| A7 | XSS | DOMPurify, xss-clean, CSP headers |
| A8 | Insecure Deserialization | Schema validation, type checking |
| A9 | Known Vulnerabilities | Regular npm audits, dependency updates |
| A10 | Insufficient Logging | Implement custom logging (future) |

## Installation & Setup

### 1. Install Dependencies

```bash
cd /Users/yaswanthgandhi/Documents/validatesharing/backend
npm install
```

### 2. Environment Configuration

Create a `.env` file with these variables:

```env
# Server
NODE_ENV=production
PORT=5000

# JWT
JWT_SECRET=<generate-strong-random-32+-char-string>
JWT_REFRESH_SECRET=<generate-another-strong-random-32+-char-string>
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname

# CORS Origins
CLIENT_URL=https://yourdomain.com
ADMIN_CLIENT_URL=https://admin.yourdomain.com
SUPERADMIN_CLIENT_URL=https://superadmin.yourdomain.com
```

### 3. Generate Strong Secrets

```bash
# Generate JWT secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Usage Examples

### Protected Routes

```javascript
// Login with rate limiting (5 attempts/15 min)
POST /api/auth/login
Body: { email: "user@example.com", password: "SecurePass123!" }

// Register with rate limiting (3 attempts/hour)
POST /api/auth/register
Body: {
  email: "user@example.com",
  password: "SecurePass123!",
  firstName: "John",
  lastName: "Doe",
  phone: "+1234567890"
}

// Access protected routes
GET /api/auth/me
Headers: { Authorization: "Bearer <access_token>" }
```

### Password Strength Validation

Password must contain:
- ✓ 8+ characters
- ✓ Uppercase letter (A-Z)
- ✓ Lowercase letter (a-z)
- ✓ Number (0-9)
- ✓ Special character (!@#$%^&*)

## Monitoring & Logging

### Rate Limit Headers

```
RateLimit-Limit: 5
RateLimit-Remaining: 3
RateLimit-Reset: 1705276800
```

### Error Responses

Unauthorized attempts receive:
```json
{
  "success": false,
  "message": "Too many login attempts, please try again after 15 minutes.",
  "statusCode": 429
}
```

## Testing Recommendations

### 1. Security Headers Testing

```bash
# Check security headers
curl -i https://localhost:5000/api/auth/me

# Verify CSP header is present
curl -i https://localhost:5000/ | grep -i content-security
```

### 2. Rate Limiting Testing

```bash
# Test login rate limiting (5 attempts/15 min)
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# 6th request should return 429 Too Many Requests
```

### 3. Input Sanitization Testing

```bash
# Test XSS prevention
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"<script>alert(1)</script>","password":"Test123!","firstName":"John","lastName":"Doe"}'

# Test NoSQL injection prevention
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":{"$ne":null},"password":"test"}'
```

### 4. CORS Testing

```bash
# Test CORS whitelist
curl -H "Origin: http://untrusted-domain.com" \
  http://localhost:5000/api/auth/me
# Should reject requests from non-whitelisted origins
```

### 5. Dependency Vulnerabilities

```bash
# Check for known vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Review security advisories
npm audit --json
```

## Deployment Checklist

- [ ] `.env` file configured with strong secrets
- [ ] `NODE_ENV=production` set
- [ ] HTTPS/TLS certificate installed
- [ ] CORS whitelist configured with production URLs
- [ ] Database connection secured
- [ ] Rate limiting tested
- [ ] Security headers verified
- [ ] Input sanitization tested
- [ ] Logging configured
- [ ] Monitoring alerts set up
- [ ] Regular backups configured
- [ ] Firewall rules applied
- [ ] Dependencies audited and updated

## Future Enhancements

1. **Two-Factor Authentication (2FA)**
   - TOTP implementation
   - Backup codes

2. **Account Lockout Mechanism**
   - Lock after N failed attempts
   - Configurable lockout duration
   - Admin unlock capability

3. **Enhanced Logging**
   - Security event logging
   - Audit trail
   - Failed login tracking

4. **Monitoring & Alerting**
   - Brute-force detection
   - Unusual access patterns
   - Email alerts for security events

5. **Data Encryption**
   - Encryption at rest
   - Sensitive field encryption
   - PII data masking

6. **API Key Authentication**
   - Service-to-service auth
   - API key rotation
   - Rate limiting per API key

7. **Penetration Testing**
   - Professional security audit
   - Vulnerability assessment
   - Bug bounty program

## Support & Documentation

- **Security Documentation**: `/docs/SECURITY.md`
- **Middleware**: `/middleware/security.js`
- **Utilities**: `/utils/sanitize.js`
- **OWASP References**: https://owasp.org/www-project-top-ten/

## Security Best Practices for Development

1. **Code Review**: All code changes reviewed for security
2. **Dependency Management**: Regular npm audits and updates
3. **Secure Coding**: Follow OWASP guidelines
4. **Secret Management**: Never commit `.env` files
5. **Error Handling**: Don't expose stack traces in production
6. **Logging**: Log security events without exposing secrets

## Troubleshooting

### Rate Limiting Issues

If legitimate users are being rate limited:

```javascript
// Check IP detection in middleware/security.js
// Adjust rate limit thresholds based on traffic patterns
// Increase limits for trusted services
```

### CORS Errors

If frontend can't reach API:

```javascript
// Verify CLIENT_URL in .env matches frontend origin
// Check CORS configuration in server.js
// Ensure credentials: true is set correctly
```

### Password Validation Errors

If users report strong passwords being rejected:

```javascript
// Review password requirements in utils/sanitize.js
// Ensure requirements are clearly communicated
// Consider implementing password strength meter on frontend
```

---

**Version**: 1.0.0
**Last Updated**: January 14, 2025
**Maintainers**: Security Team
