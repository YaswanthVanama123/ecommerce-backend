# Quick Security Reference Guide

## Security Implementation Summary

### Files Created/Modified

**New Files:**
```
backend/middleware/security.js          - All security middleware
backend/utils/sanitize.js               - Input sanitization utilities
backend/docs/SECURITY.md                - Comprehensive security docs
backend/SECURITY_IMPLEMENTATION.md      - Implementation guide
```

**Modified Files:**
```
backend/server.js                       - Integrated security middleware
backend/routes/authRoutes.js            - Added rate limiters to auth endpoints
backend/controllers/authController.js   - Added password strength validation
backend/package.json                    - Added security dependencies
```

## Key Security Features

### 1. Helmet Security Headers
- Content-Security-Policy
- Strict-Transport-Security (HSTS)
- X-Frame-Options (Clickjacking prevention)
- X-Content-Type-Options
- Referrer-Policy

### 2. Input Sanitization
```javascript
// Middleware order in server.js:
app.use(requestSizeLimiter);        // 10KB limit
app.use(mongoSanitizeMiddleware);   // NoSQL injection prevention
app.use(xssMiddleware);             // XSS prevention
app.use(hppMiddleware);             // HTTP Parameter Pollution
app.use(sanitizeBodyMiddleware);    // Custom sanitization
```

### 3. Rate Limiting
```
Login:     5 attempts / 15 minutes (per email+IP)
Register:  3 attempts / 1 hour (per IP)
General:   100 requests / 15 minutes (per IP)
```

### 4. Authentication
```javascript
// JWT Tokens
- Access Token:  15 minutes
- Refresh Token: 7 days
- Verification: Required for protected routes

// Password Hashing
- Algorithm: bcryptjs
- Salt Rounds: 10
```

### 5. Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

## Environment Variables Required

```env
NODE_ENV=production
JWT_SECRET=<32+ character random string>
JWT_REFRESH_SECRET=<32+ character random string>
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
CLIENT_URL=https://yourdomain.com
ADMIN_CLIENT_URL=https://admin.yourdomain.com
SUPERADMIN_CLIENT_URL=https://superadmin.yourdomain.com
```

## Generate Secrets

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## API Examples

### Login (Rate Limited: 5/15min)
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

# Response (429 if rate limited):
{
  "success": false,
  "message": "Too many login attempts, please try again after 15 minutes.",
  "statusCode": 429
}
```

### Register (Rate Limited: 3/hour)
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}

# Password validation error response:
{
  "success": false,
  "message": "Password does not meet security requirements",
  "statusCode": 400,
  "errors": [
    "Password must contain at least one uppercase letter",
    "Password must contain at least one special character"
  ]
}
```

## OWASP Top 10 Coverage

| Issue | Status | Implementation |
|-------|--------|-----------------|
| A1: Broken Authentication | ✅ | JWT + bcryptjs + rate limiting |
| A2: Broken Access Control | ✅ | JWT verification + role middleware |
| A3: Injection | ✅ | Input sanitization + parameterized queries |
| A4: Insecure Direct Object References | ✅ | Authorization checks |
| A5: CSRF | ✅ | CORS whitelist + JWT tokens |
| A6: Security Misconfiguration | ✅ | Helmet + environment config |
| A7: XSS | ✅ | XSS-clean + DOMPurify + CSP |
| A8: Insecure Deserialization | ✅ | Schema validation |
| A9: Known Vulnerabilities | ✅ | Regular npm audits |
| A10: Insufficient Logging | 🔄 | To be implemented |

## Testing Commands

### Check Security Headers
```bash
curl -i https://localhost:5000/
```

### Test Rate Limiting
```bash
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
```

### Check Vulnerabilities
```bash
npm audit
npm audit fix
```

## Deployment Steps

1. Install dependencies: `npm install`
2. Create `.env` file with strong secrets
3. Set `NODE_ENV=production`
4. Configure CORS whitelist
5. Install SSL/TLS certificate
6. Run `npm audit` and fix issues
7. Test rate limiting
8. Verify security headers
9. Deploy to production

## Support Files

- **Full Documentation**: `/docs/SECURITY.md`
- **Implementation Guide**: `/SECURITY_IMPLEMENTATION.md`
- **This Reference**: `/SECURITY_QUICK_REFERENCE.md`

## Key Files Location

```
/middleware/security.js
  ├─ Helmet configuration
  ├─ MongoDB sanitization
  ├─ XSS prevention
  ├─ HPP prevention
  ├─ Request size limiting
  ├─ Rate limiters (general, login, register, password reset)
  └─ Strict limiter for sensitive operations

/utils/sanitize.js
  ├─ sanitizeString()
  ├─ sanitizeEmail()
  ├─ sanitizePhone()
  ├─ sanitizeNumber()
  ├─ sanitizePassword()
  ├─ sanitizeUrl()
  ├─ sanitizeObject()
  ├─ validatePasswordStrength()
  └─ Middleware functions

/server.js
  ├─ Integrated all security middleware
  ├─ CORS configuration
  ├─ Rate limiting setup
  └─ Middleware order: helmet → CORS → sanitization → rate limit

/routes/authRoutes.js
  ├─ registerLimiter (3/hour)
  └─ loginLimiter (5/15min)

/controllers/authController.js
  └─ Password strength validation on register
```

## Common Issues & Solutions

**Rate Limiting Too Strict?**
- Adjust max/windowMs in `/middleware/security.js`
- Increase thresholds based on traffic patterns

**CORS Errors?**
- Verify CLIENT_URL matches frontend origin in `.env`
- Check CORS whitelist in `server.js`

**Password Validation Failing?**
- Review requirements in `/utils/sanitize.js`
- Ensure all 5 criteria are met

**Headers Not Showing?**
- Verify Helmet is first middleware in `server.js`
- Check production deployment

---

For detailed information, see:
- `/docs/SECURITY.md` - Complete documentation
- `/SECURITY_IMPLEMENTATION.md` - Implementation guide
