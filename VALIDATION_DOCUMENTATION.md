# Input Validation Documentation

## Overview

Comprehensive input validation has been implemented across all API endpoints using Joi schemas. This ensures data integrity, type safety, and consistent error handling throughout the backend application.

## Architecture

### 1. Validation Middleware (`middleware/validate.js`)

The validation middleware provides two main functions:

#### `validate(schema, source)`
- **Purpose**: Validates a single data source against a Joi schema
- **Parameters**:
  - `schema`: Joi schema object
  - `source`: 'body', 'query', 'params', or 'all'
- **Returns**: Express middleware function
- **Features**:
  - Aborts on first validation error for efficiency
  - Strips unknown properties automatically
  - Custom error messages for better UX
  - Replaces request data with validated, sanitized data

#### `validateMultiple(schemas)`
- **Purpose**: Validates multiple data sources in one middleware
- **Parameters**:
  - `schemas`: Object with keys 'body', 'query', 'params' and their respective Joi schemas
- **Returns**: Express middleware function
- **Features**:
  - Validates all sources and collects all errors
  - Helpful for endpoints validating both body and params

### 2. Validator Files

All validators are located in `/validators/` directory:

#### Authentication Validator (`authValidator.js`)
Validates auth endpoints with comprehensive checks:

**Schemas:**
- `register`: Register validation
  - Email: Valid email format, required, lowercase, trimmed
  - Password: Min 8 chars, max 50 chars, strong pattern required (uppercase, lowercase, digit, special char)
  - firstName: 2-50 characters, required, trimmed
  - lastName: 2-50 characters, required, trimmed
  - phone: Optional, valid phone format (10-15 digits, can include +)

- `login`: Login validation
  - Email: Valid email format, required
  - Password: Required (actual strength validation happens server-side)

- `refresh`: Refresh token validation
  - refreshToken: Required, trimmed

- `logout`: Optional body validation

- `getMe`: Optional body validation

**Password Pattern**: `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$`

#### Product Validator (`productValidator.js`)
Validates product operations:

**Schemas:**
- `create`: Create product validation
  - name: 3-200 characters, required
  - description: 10-5000 characters, optional
  - category: Required, must be valid ObjectId
  - subCategory: Optional
  - brand: Max 100 characters
  - price: Positive number with 2 decimal places, required
  - discountPrice: Positive, max 2 decimals, must be <= price
  - images: Array of valid URIs, optional
  - sizes: Array of strings (max 50 chars each), optional
  - colors: Array of objects with name and hex color code
  - stock: Array of stock items with size, color, quantity
  - tags: Array of strings (max 10 tags), each max 50 chars
  - isFeatured: Boolean, default false
  - isActive: Boolean, default true

- `update`: Update product validation
  - All fields optional, but at least one required
  - Same validations as create for respective fields
  - discountPrice cannot exceed price

- `id`: Product ID validation (MongoDB ObjectId)

- `getProducts`: Query parameter validation
  - page: Integer, min 1, default 1
  - limit: Integer, 1-100, default 20
  - category, brand, size, color: Optional filters
  - minPrice, maxPrice: Optional numeric filters
  - search: Optional, max 200 chars
  - sort: Enum - 'price-low', 'price-high', 'rating', 'newest'

- `getFeatured`: Query validation
  - limit: Integer, 1-100, default 10

- `addReview`: Add product review validation
  - rating: Integer, 1-5, required
  - comment: 5-1000 characters, required

#### Category Validator (`categoryValidator.js`)
Validates category operations:

**Schemas:**
- `create`: Create category validation
  - name: 3-100 characters, required
  - description: 5-1000 characters, optional
  - image: Valid URI, optional
  - parentCategory: Valid ObjectId or null, optional
  - order: Integer, min 0, default 0

- `update`: Update category validation
  - All fields optional, at least one required
  - Same validations as create for respective fields
  - Can set fields to null

- `id`: Category ID validation (MongoDB ObjectId)

#### Order Validator (`orderValidator.js`)
Validates order operations:

**Schemas:**
- `create`: Create order validation
  - shippingAddressId: Valid ObjectId, required
  - paymentMethod: Enum - 'COD', 'UPI', 'CARD', 'NETBANKING', 'WALLET'

- `cancel`: Cancel order validation
  - reason: 5-500 characters, optional

- `updateStatus`: Update order status validation (admin)
  - status: Enum - 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'
  - note: 3-500 characters, optional

- `id`: Order ID validation (MongoDB ObjectId)

- `getOrders`: Get orders query validation
  - page: Integer, min 1, default 1
  - limit: Integer, 1-100, default 10

- `getAllOrders`: Admin get all orders query validation
  - page: Integer, min 1, default 1
  - limit: Integer, 1-100, default 20
  - status: Optional enum
  - paymentStatus: Optional enum

#### Cart Validator (`cartValidator.js`)
Validates cart operations:

**Schemas:**
- `addToCart`: Add to cart validation
  - productId: Valid ObjectId, required
  - quantity: Integer, 1-999, required
  - size: Optional, max 50 chars
  - color: Optional, max 50 chars

- `updateItem`: Update cart item validation
  - quantity: Integer, 1-999, required

- `itemId`: Cart item ID validation (MongoDB ObjectId)

## Usage in Routes

### Basic Usage (Single Source)
```javascript
import { validate } from '../middleware/validate.js';
import productValidator from '../validators/productValidator.js';

// Validate request body
router.post('/', validate(productValidator.create, 'body'), createProduct);

// Validate URL parameters
router.get('/:id', validate(productValidator.id, 'params'), getProductById);

// Validate query parameters
router.get('/', validate(productValidator.getProducts, 'query'), getProducts);
```

### Multiple Validations
```javascript
// Validate both params and body
router.put('/:id',
  validate(productValidator.id, 'params'),
  validate(productValidator.update, 'body'),
  updateProduct
);
```

### With Authentication/Authorization
```javascript
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roleCheck.js';

router.post('/',
  protect,
  isAdmin,
  validate(productValidator.create, 'body'),
  createProduct
);
```

## Error Response Format

When validation fails, the API returns a 400 status with detailed error information:

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

## Files Created/Modified

### Created Files:
1. `/middleware/validate.js` - Main validation middleware
2. `/validators/authValidator.js` - Authentication validators
3. `/validators/productValidator.js` - Product validators
4. `/validators/categoryValidator.js` - Category validators
5. `/validators/orderValidator.js` - Order validators
6. `/validators/cartValidator.js` - Cart validators

### Modified Files:
1. `/routes/authRoutes.js` - Added validation middleware to auth endpoints
2. `/routes/productRoutes.js` - Added validation middleware to product endpoints
3. `/routes/categoryRoutes.js` - Added validation middleware to category endpoints
4. `/routes/orderRoutes.js` - Added validation middleware to order endpoints
5. `/routes/cartRoutes.js` - Added validation middleware to cart endpoints

## Validation Features

### Data Type Validation
- String, number, integer, boolean, array, object
- UUID/ObjectId format validation
- Email format validation
- URI format validation

### String Validation
- Min/max length constraints
- Pattern matching (regex)
- Trimming and lowercasing options
- Enum values (for status/type fields)

### Number Validation
- Positive/negative constraints
- Min/max values
- Integer/decimal precision
- Comparisons between fields (e.g., discountPrice <= price)

### Array Validation
- Min/max items
- Item type validation
- Element constraints

### Password Strength
Passwords must meet the following criteria:
- Minimum 8 characters
- Maximum 50 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (@$!%*?&)

### Phone Number Format
Accepts 10-15 digit numbers with optional + prefix at the beginning.

## Custom Error Messages

Each validator includes custom error messages for better user experience:

```javascript
'string.email': 'Must be a valid email address'
'number.min': '{#label} must be at least {#limit}'
'array.max': '{#label} must not exceed {#limit} items'
```

These messages replace Joi's default messages for clarity.

## Best Practices

1. **Always validate input**: Never skip validation, even for trusted sources
2. **Use appropriate sources**: Validate body, query, or params from the correct source
3. **Provide context**: Include field-level errors for better UX
4. **Be specific**: Use specific validation rules to prevent invalid data
5. **Sanitize data**: Validation middleware trims and normalizes input
6. **Use defaults**: Define sensible defaults for optional fields
7. **Fail early**: Validation happens before controller execution

## Testing Validation

### Register Endpoint
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

### Create Product Endpoint
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Name",
    "description": "Product description here",
    "category": "60d5ec49c1234567890abcde",
    "price": 1999.99,
    "isFeatured": true
  }'
```

### Add to Cart Endpoint
```bash
curl -X POST http://localhost:5000/api/cart/items \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "60d5ec49c1234567890abcde",
    "quantity": 2,
    "size": "L",
    "color": "Red"
  }'
```

## Future Enhancements

1. Rate limiting per endpoint
2. Custom validators for business logic
3. Request logging and monitoring
4. Async validators for database checks
5. Internationalization of error messages
6. Validation middleware caching
7. GraphQL integration

## Support

For issues or questions about validation:
1. Check the specific validator file for schema details
2. Review error messages for guidance
3. Ensure data types and formats match the schema
4. Verify URL vs body vs query parameters are in correct location
