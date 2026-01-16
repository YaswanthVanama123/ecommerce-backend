# Validation Quick Reference

## File Locations

```
/middleware/validate.js                 - Validation middleware
/validators/authValidator.js            - Auth validators
/validators/productValidator.js         - Product validators
/validators/categoryValidator.js        - Category validators
/validators/orderValidator.js           - Order validators
/validators/cartValidator.js            - Cart validators
```

## Route Implementation Examples

### Authentication Routes

```javascript
// Register - Full validation
POST /api/auth/register
Body: {
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+919876543210" (optional)
}

// Login
POST /api/auth/login
Body: {
  "email": "user@example.com",
  "password": "SecurePass123!"
}

// Refresh Token
POST /api/auth/refresh
Body: {
  "refreshToken": "your_refresh_token_here"
}
```

### Product Routes

```javascript
// Create Product
POST /api/products
Auth: Required (Admin)
Body: {
  "name": "Product Name",
  "description": "Detailed description (optional)",
  "category": "60d5ec49c1234567890abcde",
  "brand": "Brand Name (optional)",
  "price": 1999.99,
  "discountPrice": 1499.99 (optional, must be <= price),
  "sizes": ["S", "M", "L", "XL"],
  "colors": [{"name": "Red", "code": "#FF0000"}],
  "stock": [{"size": "M", "color": "Red", "quantity": 10}],
  "tags": ["new", "trending"],
  "isFeatured": false,
  "isActive": true
}

// Get Products
GET /api/products?page=1&limit=20&minPrice=100&maxPrice=5000&sort=price-low&search=shirt

// Update Product
PUT /api/products/:id
Auth: Required (Admin)
Body: {
  "price": 2999.99,
  "isFeatured": true
}
(At least one field required)

// Add Review
POST /api/products/:id/reviews
Auth: Required
Body: {
  "rating": 4,
  "comment": "Great product, highly recommended!"
}
```

### Category Routes

```javascript
// Create Category
POST /api/categories
Auth: Required (Admin)
Body: {
  "name": "Electronics",
  "description": "Electronic devices (optional)",
  "image": "https://example.com/electronics.jpg (optional)",
  "parentCategory": null (optional),
  "order": 1 (optional)
}

// Get Categories
GET /api/categories

// Get Category by ID
GET /api/categories/:id

// Update Category
PUT /api/categories/:id
Auth: Required (Admin)
Body: {
  "name": "Updated Name (optional)",
  "description": "Updated description"
}

// Delete Category
DELETE /api/categories/:id
Auth: Required (Admin)
```

### Order Routes

```javascript
// Create Order
POST /api/orders
Auth: Required
Body: {
  "shippingAddressId": "60d5ec49c1234567890abcde",
  "paymentMethod": "COD" (Options: COD, UPI, CARD, NETBANKING, WALLET)
}

// Get My Orders
GET /api/orders?page=1&limit=10
Auth: Required

// Get Order by ID
GET /api/orders/:id
Auth: Required

// Cancel Order
PUT /api/orders/:id/cancel
Auth: Required
Body: {
  "reason": "Changed my mind about the purchase" (optional)
}

// Get All Orders (Admin)
GET /api/orders/admin/orders?page=1&limit=20&status=pending&paymentStatus=completed
Auth: Required (Admin)

// Update Order Status (Admin)
PUT /api/orders/admin/orders/:id/status
Auth: Required (Admin)
Body: {
  "status": "shipped",
  "note": "Order shipped via FedEx" (optional)
}
```

### Cart Routes

```javascript
// Get Cart
GET /api/cart
Auth: Required

// Add to Cart
POST /api/cart/items
Auth: Required
Body: {
  "productId": "60d5ec49c1234567890abcde",
  "quantity": 2,
  "size": "L (optional)",
  "color": "Red (optional)"
}

// Update Cart Item
PUT /api/cart/items/:itemId
Auth: Required
Body: {
  "quantity": 5
}

// Remove from Cart
DELETE /api/cart/items/:itemId
Auth: Required

// Clear Cart
DELETE /api/cart
Auth: Required
```

## Validation Rules Summary

### Authentication
- **Email**: Valid email format, lowercase, trimmed
- **Password**: Min 8 chars, max 50 chars, strong pattern (A-Z, a-z, 0-9, @$!%*?&)
- **First/Last Name**: 2-50 characters
- **Phone**: 10-15 digits, optional + prefix

### Products
- **Name**: 3-200 characters
- **Description**: 10-5000 characters
- **Price**: Positive number (2 decimals)
- **Discount Price**: Must be <= original price
- **Rating**: 1-5 integer
- **Comment**: 5-1000 characters
- **Category/IDs**: Valid MongoDB ObjectId format

### Categories
- **Name**: 3-100 characters
- **Description**: 5-1000 characters
- **Order**: Non-negative integer

### Orders
- **Payment Methods**: COD, UPI, CARD, NETBANKING, WALLET
- **Statuses**: pending, confirmed, processing, shipped, delivered, cancelled
- **Payment Statuses**: pending, completed, failed, refunded

### Cart
- **Quantity**: 1-999 integer
- **Size/Color**: Max 50 characters each

## Error Response Format

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

## Common Validation Errors

| Error | Solution |
|-------|----------|
| "Invalid email address" | Provide valid email format (user@domain.com) |
| "Password must contain..." | Add uppercase, lowercase, number, special char |
| "String must be at least X characters" | Increase string length |
| "Number must be at least X" | Increase numeric value |
| "Invalid product ID" | Provide valid 24-character MongoDB ObjectId |
| "At least one field must be provided" | Include at least one field in update request |
| "Quantity must be at least 1" | Use quantity >= 1 |
| "Discount price cannot be greater than original price" | Ensure discountPrice <= price |

## Tips for Integration

1. Always include validation before sending requests
2. Check error messages for exact requirements
3. Use correct HTTP methods (POST for create, PUT for update, DELETE for delete)
4. Include authentication token in Authorization header when required
5. Provide all required fields
6. Use correct enum values for status/method fields
7. Validate ObjectIds are 24 characters hexadecimal
8. Test each endpoint with both valid and invalid data

## Middleware Order in Routes

```javascript
// For protected admin endpoints:
router.method('/path/:id',
  protect,              // Check authentication
  isAdmin,              // Check authorization
  validate(..., 'params'),    // Validate URL params
  validate(..., 'body'),      // Validate request body
  controllerFunction
);

// For public endpoints:
router.get('/path',
  validate(..., 'query'),     // Validate query parameters
  controllerFunction
);
```

## Database ObjectId Format

All IDs (productId, categoryId, orderId, etc.) must be valid MongoDB ObjectIds:
- Format: 24 character hexadecimal string
- Example: `60d5ec49c1234567890abcde`
- Validation: Checked with regex `/^[0-9a-fA-F]{24}$/`
