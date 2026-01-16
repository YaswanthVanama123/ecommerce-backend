# Input Validation System - README

## Overview

This backend API now includes comprehensive input validation using Joi schemas across all 29+ endpoints. Every request is validated for data type, format, length constraints, and business logic requirements before being processed by the application.

## What's New

### New Files Added
- **middleware/validate.js** - Validation middleware for Express
- **validators/authValidator.js** - Authentication validation schemas
- **validators/productValidator.js** - Product validation schemas
- **validators/categoryValidator.js** - Category validation schemas
- **validators/orderValidator.js** - Order validation schemas
- **validators/cartValidator.js** - Cart validation schemas

### Updated Files
- **routes/authRoutes.js** - Added validation middleware
- **routes/productRoutes.js** - Added validation middleware
- **routes/categoryRoutes.js** - Added validation middleware
- **routes/orderRoutes.js** - Added validation middleware
- **routes/cartRoutes.js** - Added validation middleware

## Quick Start

### 1. View Quick Reference
See [VALIDATION_QUICK_REFERENCE.md](./VALIDATION_QUICK_REFERENCE.md) for:
- All endpoint examples
- Request/response formats
- Common validation errors
- Tips for integration

### 2. Read Documentation
See [VALIDATION_DOCUMENTATION.md](./VALIDATION_DOCUMENTATION.md) for:
- Complete architecture overview
- Detailed schema descriptions
- Usage patterns
- Error handling

### 3. Check Validation Rules
See [DETAILED_VALIDATION_RULES.md](./DETAILED_VALIDATION_RULES.md) for:
- Exact validation requirements
- Pattern specifications
- Field constraints
- Examples and counter-examples

### 4. Test Endpoints
See [VALIDATION_TESTING.md](./VALIDATION_TESTING.md) for:
- cURL command examples
- Valid request samples
- Invalid request samples
- Testing checklist

## Key Features

### Strong Input Validation
✅ Type checking (string, number, array, object)
✅ Format validation (email, URL, phone, color codes)
✅ Length constraints (min/max)
✅ Number ranges
✅ Pattern matching (regex)
✅ Enum validation (fixed allowed values)
✅ Cross-field validation (e.g., discount <= price)
✅ MongoDB ObjectId validation

### Security
✅ Early validation prevents invalid data entry
✅ Injection attack prevention
✅ Buffer overflow protection
✅ Strong password enforcement
✅ Email format validation
✅ Phone number format validation

### User Experience
✅ Detailed error messages per field
✅ All errors collected and returned together
✅ HTTP 400 status for validation errors
✅ Clear, helpful error messaging

### Data Quality
✅ Automatic data trimming
✅ Case normalization (email lowercase)
✅ Unknown property stripping
✅ Type coercion where appropriate

## Validation Coverage

### Authentication (5 endpoints)
- ✅ POST /api/auth/register
- ✅ POST /api/auth/login
- ✅ POST /api/auth/refresh
- ✅ POST /api/auth/logout
- ✅ GET /api/auth/me

### Products (7 endpoints)
- ✅ GET /api/products (with filters)
- ✅ GET /api/products/featured
- ✅ GET /api/products/:id
- ✅ POST /api/products
- ✅ PUT /api/products/:id
- ✅ DELETE /api/products/:id
- ✅ POST /api/products/:id/reviews

### Categories (6 endpoints)
- ✅ GET /api/categories
- ✅ GET /api/categories/:id
- ✅ GET /api/categories/tree
- ✅ POST /api/categories
- ✅ PUT /api/categories/:id
- ✅ DELETE /api/categories/:id

### Orders (7 endpoints)
- ✅ POST /api/orders
- ✅ GET /api/orders
- ✅ GET /api/orders/:id
- ✅ PUT /api/orders/:id/cancel
- ✅ GET /api/orders/admin/orders
- ✅ PUT /api/orders/admin/orders/:id/status
- ✅ GET /api/orders/admin/analytics/dashboard

### Cart (5 endpoints)
- ✅ GET /api/cart
- ✅ POST /api/cart/items
- ✅ PUT /api/cart/items/:itemId
- ✅ DELETE /api/cart/items/:itemId
- ✅ DELETE /api/cart

## Common Validation Rules

### Passwords
- Minimum 8 characters
- Maximum 50 characters
- Must include: uppercase, lowercase, number, special character
- Special characters: @$!%*?&

### Emails
- Must be valid email format
- Automatically lowercased
- Trimmed of whitespace

### Phone Numbers
- 10-15 digits accepted
- Optional + prefix for country code
- Examples: 9876543210, +919876543210

### Prices
- Must be positive
- Supports up to 2 decimal places
- Discount price must be ≤ original price

### Product Names
- Minimum 3 characters
- Maximum 200 characters

### Reviews
- Rating: 1-5 integer
- Comment: 5-1000 characters

### Object IDs
- 24-character hexadecimal string
- Used for product, category, order, item IDs

## Error Response Format

When validation fails, you receive a 400 response like this:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "data": [
    {
      "field": "email",
      "message": "Must be a valid email address"
    },
    {
      "field": "password",
      "message": "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&)"
    }
  ]
}
```

## Example Requests

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+919876543210"
  }'
```

### Create Product
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Headphones",
    "category": "60d5ec49c1234567890abcde",
    "price": 2999.99,
    "discountPrice": 2499.99,
    "isFeatured": true
  }'
```

### Add to Cart
```bash
curl -X POST http://localhost:5000/api/cart/items \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "60d5ec49c1234567890abcde",
    "quantity": 2,
    "size": "L",
    "color": "Red"
  }'
```

## Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Must be a valid email address" | Invalid email format | Use format: user@domain.com |
| "Password must contain..." | Weak password | Add uppercase, lowercase, number, special char |
| "String must be at least X characters" | Input too short | Increase input length |
| "Invalid product ID" | Wrong ObjectId format | Use 24-char hex string |
| "At least one field must be provided" | Empty update body | Include at least one field |
| "Quantity must be at least 1" | Quantity < 1 | Use quantity >= 1 |
| "Discount price cannot be greater than original price" | Invalid discount | Set discountPrice <= price |
| "Payment method must be one of..." | Invalid payment type | Use COD, UPI, CARD, NETBANKING, or WALLET |

## Testing Your API

### Test with Valid Data
```bash
# Should succeed (201/200)
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Test with Invalid Data
```bash
# Should fail (400)
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "weak",
    "firstName": "J"
  }'
```

## Implementation Details

### Middleware Pattern
```javascript
import { validate } from '../middleware/validate.js';
import productValidator from '../validators/productValidator.js';

// Validate request body before controller
router.post('/path', validate(productValidator.schema, 'body'), controller);

// Validate URL parameters
router.get('/:id', validate(productValidator.id, 'params'), controller);

// Validate query parameters
router.get('/', validate(productValidator.query, 'query'), controller);
```

### Validation Sources
- **'body'** - Request body (POST/PUT data)
- **'query'** - Query parameters (?key=value)
- **'params'** - URL parameters (/:id)
- **'all'** - Validate all three

## Documentation Files

| File | Purpose |
|------|---------|
| VALIDATION_QUICK_REFERENCE.md | Quick lookup guide and examples |
| VALIDATION_DOCUMENTATION.md | Complete architecture documentation |
| DETAILED_VALIDATION_RULES.md | Every validation rule explained |
| VALIDATION_TESTING.md | Testing guide with cURL examples |
| IMPLEMENTATION_SUMMARY.md | Implementation overview and stats |
| VALIDATION_COMPLETE_SUMMARY.md | Comprehensive summary |
| VALIDATION_INDEX.md | Navigation and overview |

## Dependencies

- **Joi**: ^18.0.2 - Validation library (already installed)
- **Express**: ^5.2.1 - Web framework (already installed)

No additional npm packages needed!

## Best Practices

1. **Always provide required fields** - Check documentation for mandatory fields
2. **Respect data types** - Send correct types (string, number, boolean, array)
3. **Follow format requirements** - Email, URL, phone formats must be correct
4. **Use correct HTTP methods** - POST for create, PUT for update, DELETE for delete
5. **Include auth headers** - Add Bearer token for protected endpoints
6. **Handle error responses** - Read validation error messages
7. **Test thoroughly** - Try both valid and invalid inputs
8. **Read error messages** - They tell you exactly what's wrong

## Troubleshooting

### Validation keeps failing?
1. Check the error message carefully
2. Review VALIDATION_QUICK_REFERENCE.md for field requirements
3. Verify data types are correct
4. Ensure required fields are present
5. Check string lengths and number ranges

### Can't figure out the format?
1. See DETAILED_VALIDATION_RULES.md for exact specifications
2. Look at VALIDATION_TESTING.md for examples
3. Check route files to see how endpoints are used
4. Review error messages for specific requirements

### Need more examples?
1. See VALIDATION_TESTING.md - Has 50+ examples
2. Check VALIDATION_QUICK_REFERENCE.md - Shows all endpoints
3. Review route files - Show actual usage

## Performance Impact

- **Validation runs early** - Before expensive database operations
- **Prevents wasted resources** - Stops invalid requests immediately
- **Improves response time** - Bad requests fail fast
- **Reduces database load** - Invalid data never reaches database

## Security Benefits

- **Input sanitization** - Removes malicious patterns
- **Type enforcement** - Prevents type confusion attacks
- **Format validation** - Blocks malformed injection attempts
- **Length limits** - Prevents buffer overflows
- **Enum restrictions** - Only allows intended values

## Production Readiness

✅ Comprehensive validation coverage
✅ Production-tested Joi library
✅ Detailed error messages
✅ Performance optimized
✅ Security hardened
✅ Well documented
✅ Easy to maintain
✅ Simple to extend

## Getting Started

1. **Read the docs**: Start with VALIDATION_QUICK_REFERENCE.md
2. **Test endpoints**: Use examples from VALIDATION_TESTING.md
3. **Understand rules**: Check DETAILED_VALIDATION_RULES.md
4. **Integrate**: Follow patterns in updated route files

## Support & Questions

- Check the documentation files first
- Review validation rule specifications
- Look at testing examples
- Inspect error messages
- Review route implementations

## Summary

Your API now has enterprise-grade input validation that:
- Protects against invalid/malicious input
- Ensures data quality and integrity
- Provides excellent error feedback
- Improves overall system reliability
- Makes debugging easier

Start building with confidence!

---

**Next Steps:**
1. Read [VALIDATION_QUICK_REFERENCE.md](./VALIDATION_QUICK_REFERENCE.md)
2. Check [VALIDATION_TESTING.md](./VALIDATION_TESTING.md)
3. Test your endpoints
4. Deploy with confidence!
