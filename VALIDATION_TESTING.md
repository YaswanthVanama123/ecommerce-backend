# Validation Testing Examples

## Testing Guide for All Endpoints

### Setup

```bash
# Install dependencies (already done)
npm install

# Start the server
npm run dev
```

## Authentication Endpoints

### 1. Register - Valid Request
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+919876543210"
  }'

# Expected: 201 Created
```

### 2. Register - Invalid Email
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Expected: 400 - "Must be a valid email address"
```

### 3. Register - Weak Password
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "weak",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Expected: 400 - Password strength requirements error
```

### 4. Register - Missing Required Fields
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "firstName": "John"
  }'

# Expected: 400 - Multiple validation errors for password and lastName
```

### 5. Login - Valid Credentials
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'

# Expected: 200 - Returns tokens
```

### 6. Login - Missing Password
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'

# Expected: 400 - "Password is required"
```

## Product Endpoints

### 1. Create Product - Valid Request
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Wireless Headphones",
    "description": "High-quality wireless headphones with noise cancellation",
    "category": "60d5ec49c1234567890abcde",
    "brand": "AudioBrand",
    "price": 2999.99,
    "discountPrice": 2499.99,
    "images": ["https://example.com/headphones1.jpg"],
    "sizes": ["One Size"],
    "colors": [
      {"name": "Black", "code": "#000000"},
      {"name": "White", "code": "#FFFFFF"}
    ],
    "stock": [
      {"size": "One Size", "color": "Black", "quantity": 50},
      {"size": "One Size", "color": "White", "quantity": 30}
    ],
    "tags": ["electronics", "audio", "wireless"],
    "isFeatured": true,
    "isActive": true
  }'

# Expected: 201 Created
```

### 2. Create Product - Invalid Discount Price
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Name",
    "category": "60d5ec49c1234567890abcde",
    "price": 1000.00,
    "discountPrice": 1500.00
  }'

# Expected: 400 - "Discount price cannot be greater than original price"
```

### 3. Create Product - Invalid Category ID
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Name",
    "category": "invalid-id",
    "price": 1000.00
  }'

# Expected: 400 - Invalid ObjectId error
```

### 4. Get Products - With Filters
```bash
curl "http://localhost:5000/api/products?page=1&limit=20&minPrice=500&maxPrice=5000&sort=price-low&search=headphones" \
  -H "Content-Type: application/json"

# Expected: 200 - Filtered products
```

### 5. Get Products - Invalid Limit
```bash
curl "http://localhost:5000/api/products?limit=500" \
  -H "Content-Type: application/json"

# Expected: 400 - "Limit must not exceed 100"
```

### 6. Update Product - Valid Update
```bash
curl -X PUT http://localhost:5000/api/products/60d5ec49c1234567890abcde \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 3499.99,
    "isFeatured": true
  }'

# Expected: 200 - Updated product
```

### 7. Update Product - No Fields
```bash
curl -X PUT http://localhost:5000/api/products/60d5ec49c1234567890abcde \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: 400 - "At least one field must be provided for update"
```

### 8. Add Review - Valid Review
```bash
curl -X POST http://localhost:5000/api/products/60d5ec49c1234567890abcde/reviews \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "comment": "Excellent product! Highly recommended for everyone."
  }'

# Expected: 201 - Review added
```

### 9. Add Review - Invalid Rating
```bash
curl -X POST http://localhost:5000/api/products/60d5ec49c1234567890abcde/reviews \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 10,
    "comment": "Great product"
  }'

# Expected: 400 - "Rating must not exceed 5"
```

### 10. Add Review - Short Comment
```bash
curl -X POST http://localhost:5000/api/products/60d5ec49c1234567890abcde/reviews \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 4,
    "comment": "Good"
  }'

# Expected: 400 - "Comment must be at least 5 characters"
```

## Category Endpoints

### 1. Create Category - Valid Request
```bash
curl -X POST http://localhost:5000/api/categories \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Electronics",
    "description": "All electronic devices and accessories",
    "image": "https://example.com/electronics.jpg",
    "parentCategory": null,
    "order": 1
  }'

# Expected: 201 Created
```

### 2. Create Category - Short Name
```bash
curl -X POST http://localhost:5000/api/categories \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AB",
    "description": "Category description"
  }'

# Expected: 400 - "Name must be at least 3 characters"
```

### 3. Update Category - Valid Update
```bash
curl -X PUT http://localhost:5000/api/categories/60d5ec49c1234567890abcde \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Category Name",
    "order": 2
  }'

# Expected: 200 - Updated category
```

### 4. Get Category - Valid ID
```bash
curl http://localhost:5000/api/categories/60d5ec49c1234567890abcde \
  -H "Content-Type: application/json"

# Expected: 200 - Category details
```

### 5. Get Category - Invalid ID Format
```bash
curl http://localhost:5000/api/categories/invalid-id \
  -H "Content-Type: application/json"

# Expected: 400 - "Invalid category ID"
```

## Order Endpoints

### 1. Create Order - Valid Request
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddressId": "60d5ec49c1234567890abcde",
    "paymentMethod": "COD"
  }'

# Expected: 201 Created
```

### 2. Create Order - Invalid Payment Method
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddressId": "60d5ec49c1234567890abcde",
    "paymentMethod": "BITCOIN"
  }'

# Expected: 400 - "Payment method must be one of: COD, UPI, CARD, NETBANKING, WALLET"
```

### 3. Get My Orders
```bash
curl "http://localhost:5000/api/orders?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json"

# Expected: 200 - User's orders
```

### 4. Get All Orders (Admin)
```bash
curl "http://localhost:5000/api/orders/admin/orders?page=1&limit=20&status=pending" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# Expected: 200 - All orders (filtered)
```

### 5. Update Order Status (Admin) - Valid Status
```bash
curl -X PUT http://localhost:5000/api/orders/admin/orders/60d5ec49c1234567890abcde/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "shipped",
    "note": "Order shipped via Express Delivery"
  }'

# Expected: 200 - Order status updated
```

### 6. Update Order Status - Invalid Status
```bash
curl -X PUT http://localhost:5000/api/orders/admin/orders/60d5ec49c1234567890abcde/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "invalid_status"
  }'

# Expected: 400 - Invalid status error
```

### 7. Cancel Order - Valid Request
```bash
curl -X PUT http://localhost:5000/api/orders/60d5ec49c1234567890abcde/cancel \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Found better deal elsewhere"
  }'

# Expected: 200 - Order cancelled
```

## Cart Endpoints

### 1. Add to Cart - Valid Request
```bash
curl -X POST http://localhost:5000/api/cart/items \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "60d5ec49c1234567890abcde",
    "quantity": 2,
    "size": "L",
    "color": "Red"
  }'

# Expected: 200 - Item added to cart
```

### 2. Add to Cart - Invalid Quantity
```bash
curl -X POST http://localhost:5000/api/cart/items \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "60d5ec49c1234567890abcde",
    "quantity": 0
  }'

# Expected: 400 - "Quantity must be at least 1"
```

### 3. Add to Cart - Invalid Product ID
```bash
curl -X POST http://localhost:5000/api/cart/items \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "not-a-valid-id",
    "quantity": 1
  }'

# Expected: 400 - "Invalid product ID"
```

### 4. Update Cart Item - Valid Update
```bash
curl -X PUT http://localhost:5000/api/cart/items/60d5ec49c1234567890abcde \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 5
  }'

# Expected: 200 - Item quantity updated
```

### 5. Update Cart Item - Excessive Quantity
```bash
curl -X PUT http://localhost:5000/api/cart/items/60d5ec49c1234567890abcde \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 2000
  }'

# Expected: 400 - "Quantity cannot exceed 999"
```

### 6. Remove from Cart
```bash
curl -X DELETE http://localhost:5000/api/cart/items/60d5ec49c1234567890abcde \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json"

# Expected: 200 - Item removed from cart
```

### 7. Get Cart
```bash
curl http://localhost:5000/api/cart \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json"

# Expected: 200 - Cart contents
```

## Error Response Examples

### Validation Error Response
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "data": [
    {
      "field": "password",
      "message": "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&)"
    },
    {
      "field": "firstName",
      "message": "First name must be at least 2 characters"
    }
  ]
}
```

### Successful Response
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "60d5ec49c1234567890abcde",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## Testing Checklist

- [ ] All required fields are validated
- [ ] Optional fields accept null/undefined
- [ ] Invalid data types are rejected
- [ ] String length constraints enforced
- [ ] Number range constraints enforced
- [ ] Email format validation works
- [ ] Password strength validation works
- [ ] Phone number format validation works
- [ ] ObjectId format validation works
- [ ] Enum values enforced
- [ ] URL/URI validation works
- [ ] Array items validated
- [ ] Custom error messages appear
- [ ] Trimming and normalization works
- [ ] Unknown properties stripped
- [ ] Multiple validation errors collected
- [ ] Proper HTTP status codes returned (400 for validation errors)
