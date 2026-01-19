# StyleHub E-Commerce API Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [Rate Limiting](#rate-limiting)
5. [Error Handling](#error-handling)
6. [API Endpoints](#api-endpoints)
   - [Authentication](#authentication-endpoints)
   - [Products](#products-endpoints)
   - [Categories](#categories-endpoints)
   - [Cart](#cart-endpoints)
   - [Wishlist](#wishlist-endpoints)
   - [Orders](#orders-endpoints)
   - [Payments](#payments-endpoints)
   - [Returns](#returns-endpoints)
   - [Reviews](#reviews-endpoints)
   - [Shipping](#shipping-endpoints)
   - [Admin](#admin-endpoints)
   - [Coupons](#coupons-endpoints)
   - [Notifications](#notifications-endpoints)
   - [Settings](#settings-endpoints)

---

## Introduction

This document provides comprehensive documentation for the StyleHub E-Commerce Platform API. The API follows REST principles and uses JSON for request and response payloads.

**Version:** 1.0.0
**Last Updated:** January 2025

## Base URL

```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

## Authentication

The API uses JWT (JSON Web Token) based authentication. Most endpoints require authentication via Bearer tokens.

### Authentication Flow

1. **Register** or **Login** to obtain access and refresh tokens
2. Include the access token in the `Authorization` header for subsequent requests
3. Use the refresh token to obtain a new access token when it expires

### Token Format

```http
Authorization: Bearer <your_access_token>
```

### Token Expiration

- **Access Token:** 15 minutes
- **Refresh Token:** 7 days

### Authentication Roles

- `user` - Regular customer (default)
- `admin` - Administrator with management privileges
- `superadmin` - Super administrator with full system access

---

## Rate Limiting

To prevent abuse, the API implements rate limiting:

- **Default:** 100 requests per 15 minutes per IP
- **Authentication Endpoints:**
  - Login: 5 requests per 15 minutes
  - Register: 3 requests per 15 minutes

**Headers:**
- `X-RateLimit-Limit` - Total requests allowed
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Time when limit resets (UTC)

**Rate Limit Error (429):**
```json
{
  "success": false,
  "message": "Too many requests, please try again later."
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created successfully |
| 400 | Bad request - Invalid input |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable entity - Validation error |
| 429 | Too many requests - Rate limit exceeded |
| 500 | Internal server error |

---

## API Endpoints

---

## Authentication Endpoints

### Register User

Create a new user account.

**Endpoint:** `POST /auth/register`

**Rate Limit:** 3 requests per 15 minutes

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "createdAt": "2025-01-19T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Email already exists"
    }
  ]
}
```

---

### Login User

Authenticate and obtain access tokens.

**Endpoint:** `POST /auth/login`

**Rate Limit:** 5 requests per 15 minutes

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

### Refresh Token

Obtain a new access token using refresh token.

**Endpoint:** `POST /auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Logout

Invalidate refresh token.

**Endpoint:** `POST /auth/logout`

**Authentication:** Required

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Get Current User

Get authenticated user details.

**Endpoint:** `GET /auth/me`

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "role": "user",
      "addresses": [],
      "isActive": true,
      "createdAt": "2025-01-19T00:00:00.000Z"
    }
  }
}
```

---

### Change Password

Change user password.

**Endpoint:** `PUT /auth/change-password`

**Authentication:** Required

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## Products Endpoints

### Get All Products

Retrieve products with filtering, sorting, and pagination.

**Endpoint:** `GET /products`

**Query Parameters:**
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 20, max: 100)
- `category` (string) - Filter by category ID
- `minPrice` (number) - Minimum price
- `maxPrice` (number) - Maximum price
- `search` (string) - Search in name and description
- `sort` (string) - Sort field (price, name, createdAt, rating)
- `order` (string) - Sort order (asc, desc)
- `inStock` (boolean) - Filter by stock availability

**Example Request:**
```
GET /products?page=1&limit=20&category=electronics&minPrice=100&maxPrice=1000&sort=price&order=asc&inStock=true
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Premium Wireless Headphones",
        "description": "High-quality wireless headphones with noise cancellation",
        "price": 299.99,
        "images": [
          "https://res.cloudinary.com/demo/image/upload/v1234567890/product1.jpg"
        ],
        "category": {
          "_id": "507f1f77bcf86cd799439012",
          "name": "Electronics"
        },
        "stock": 50,
        "variants": [
          {
            "size": "M",
            "color": "Black",
            "stock": 20,
            "sku": "WH-BLK-M"
          }
        ],
        "rating": 4.5,
        "reviewCount": 128,
        "isFeatured": true,
        "createdAt": "2025-01-19T00:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalProducts": 98,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### Get Featured Products

Retrieve featured products.

**Endpoint:** `GET /products/featured`

**Query Parameters:**
- `limit` (number) - Number of featured products (default: 10)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "products": [...]
  }
}
```

---

### Get Trending Products

Retrieve trending products based on recent sales and views.

**Endpoint:** `GET /products/trending`

**Query Parameters:**
- `limit` (number) - Number of trending products (default: 10)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "products": [...]
  }
}
```

---

### Get Product by ID

Retrieve detailed information about a specific product.

**Endpoint:** `GET /products/:id`

**Authentication:** Optional (for personalized data)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "product": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Premium Wireless Headphones",
      "description": "High-quality wireless headphones...",
      "price": 299.99,
      "images": ["..."],
      "category": {...},
      "stock": 50,
      "variants": [...],
      "rating": 4.5,
      "reviewCount": 128,
      "specifications": {
        "weight": "250g",
        "dimensions": "20x18x8cm",
        "battery": "30 hours"
      },
      "tags": ["wireless", "noise-cancelling", "bluetooth"],
      "createdAt": "2025-01-19T00:00:00.000Z"
    }
  }
}
```

---

### Get Product Categories

Retrieve all product categories.

**Endpoint:** `GET /products/categories`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "categories": ["Electronics", "Clothing", "Home & Garden", "Sports"]
  }
}
```

---

### Create Product (Admin)

Create a new product.

**Endpoint:** `POST /products`

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "name": "Premium Wireless Headphones",
  "description": "High-quality wireless headphones with noise cancellation",
  "price": 299.99,
  "category": "507f1f77bcf86cd799439012",
  "stock": 50,
  "variants": [
    {
      "size": "M",
      "color": "Black",
      "stock": 20,
      "sku": "WH-BLK-M",
      "price": 299.99
    }
  ],
  "images": ["url1", "url2"],
  "specifications": {
    "weight": "250g",
    "battery": "30 hours"
  },
  "tags": ["wireless", "noise-cancelling"],
  "isFeatured": true
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "product": {...}
  }
}
```

---

### Update Product (Admin)

Update an existing product.

**Endpoint:** `PUT /products/:id`

**Authentication:** Required (Admin)

**Request Body:** Same as Create Product (all fields optional)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "product": {...}
  }
}
```

---

### Delete Product (Admin)

Delete a product.

**Endpoint:** `DELETE /products/:id`

**Authentication:** Required (Admin)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

---

### Upload Product Images (Admin)

Upload multiple product images.

**Endpoint:** `POST /products/upload`

**Authentication:** Required (Admin)

**Content-Type:** `multipart/form-data`

**Form Data:**
- `images` - Multiple image files (max 10, max 5MB each)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Images uploaded successfully",
  "data": {
    "urls": [
      "https://res.cloudinary.com/demo/image/upload/v1234567890/product1.jpg",
      "https://res.cloudinary.com/demo/image/upload/v1234567890/product2.jpg"
    ]
  }
}
```

---

## Categories Endpoints

### Get All Categories

Retrieve all categories with optional filtering.

**Endpoint:** `GET /categories`

**Query Parameters:**
- `parent` (string) - Filter by parent category ID
- `active` (boolean) - Filter by active status

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Electronics",
        "slug": "electronics",
        "description": "Electronic devices and accessories",
        "parent": null,
        "isActive": true,
        "productCount": 245,
        "createdAt": "2025-01-19T00:00:00.000Z"
      }
    ]
  }
}
```

---

### Get Category Tree

Retrieve hierarchical category structure.

**Endpoint:** `GET /categories/tree`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "tree": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Electronics",
        "children": [
          {
            "_id": "507f1f77bcf86cd799439013",
            "name": "Smartphones",
            "children": []
          }
        ]
      }
    ]
  }
}
```

---

### Get Category by ID

Retrieve a specific category with its products.

**Endpoint:** `GET /categories/:id`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "category": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Electronics",
      "slug": "electronics",
      "description": "Electronic devices and accessories",
      "productCount": 245
    }
  }
}
```

---

### Create Category (Admin)

Create a new category.

**Endpoint:** `POST /categories`

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "name": "Smartphones",
  "description": "Mobile phones and accessories",
  "parent": "507f1f77bcf86cd799439012",
  "isActive": true
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "category": {...}
  }
}
```

---

### Update Category (Admin)

Update an existing category.

**Endpoint:** `PUT /categories/:id`

**Authentication:** Required (Admin)

**Request Body:** Same as Create Category (all fields optional)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Category updated successfully",
  "data": {
    "category": {...}
  }
}
```

---

### Delete Category (Admin)

Delete a category.

**Endpoint:** `DELETE /categories/:id`

**Authentication:** Required (Admin)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

---

## Cart Endpoints

### Get Cart

Retrieve user's shopping cart.

**Endpoint:** `GET /cart`

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "cart": {
      "_id": "507f1f77bcf86cd799439011",
      "user": "507f1f77bcf86cd799439012",
      "items": [
        {
          "_id": "507f1f77bcf86cd799439013",
          "product": {
            "_id": "507f1f77bcf86cd799439014",
            "name": "Premium Wireless Headphones",
            "price": 299.99,
            "images": ["..."]
          },
          "quantity": 2,
          "variant": {
            "size": "M",
            "color": "Black"
          },
          "price": 299.99,
          "subtotal": 599.98
        }
      ],
      "totalItems": 2,
      "totalPrice": 599.98,
      "updatedAt": "2025-01-19T00:00:00.000Z"
    }
  }
}
```

---

### Add to Cart

Add a product to cart.

**Endpoint:** `POST /cart`

**Authentication:** Required

**Request Body:**
```json
{
  "productId": "507f1f77bcf86cd799439014",
  "quantity": 2,
  "variant": {
    "size": "M",
    "color": "Black"
  }
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Product added to cart",
  "data": {
    "cart": {...}
  }
}
```

---

### Update Cart Item

Update quantity or variant of a cart item.

**Endpoint:** `PUT /cart/:itemId`

**Authentication:** Required

**Request Body:**
```json
{
  "quantity": 3,
  "variant": {
    "size": "L",
    "color": "Black"
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Cart updated successfully",
  "data": {
    "cart": {...}
  }
}
```

---

### Remove from Cart

Remove an item from cart.

**Endpoint:** `DELETE /cart/:itemId`

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Item removed from cart",
  "data": {
    "cart": {...}
  }
}
```

---

### Clear Cart

Remove all items from cart.

**Endpoint:** `DELETE /cart`

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Cart cleared successfully"
}
```

---

### Validate Cart

Validate cart items for stock availability and price changes.

**Endpoint:** `POST /cart/validate`

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "issues": [],
    "cart": {...}
  }
}
```

**Response with Issues (200):**
```json
{
  "success": true,
  "data": {
    "valid": false,
    "issues": [
      {
        "itemId": "507f1f77bcf86cd799439013",
        "type": "stock",
        "message": "Only 1 items available in stock",
        "availableStock": 1
      },
      {
        "itemId": "507f1f77bcf86cd799439015",
        "type": "price",
        "message": "Price changed from $299.99 to $279.99",
        "oldPrice": 299.99,
        "newPrice": 279.99
      }
    ]
  }
}
```

---

## Wishlist Endpoints

### Get Wishlist

Retrieve user's wishlist.

**Endpoint:** `GET /wishlist`

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "wishlist": {
      "_id": "507f1f77bcf86cd799439011",
      "user": "507f1f77bcf86cd799439012",
      "items": [
        {
          "_id": "507f1f77bcf86cd799439014",
          "name": "Premium Wireless Headphones",
          "price": 299.99,
          "images": ["..."],
          "inStock": true,
          "addedAt": "2025-01-19T00:00:00.000Z"
        }
      ],
      "totalItems": 1
    }
  }
}
```

---

### Add to Wishlist

Add a product to wishlist.

**Endpoint:** `POST /wishlist`

**Authentication:** Required

**Request Body:**
```json
{
  "productId": "507f1f77bcf86cd799439014"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Product added to wishlist",
  "data": {
    "wishlist": {...}
  }
}
```

---

### Remove from Wishlist

Remove a product from wishlist.

**Endpoint:** `DELETE /wishlist/:productId`

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Product removed from wishlist"
}
```

---

### Move to Cart

Move a wishlist item to cart.

**Endpoint:** `POST /wishlist/:productId/move-to-cart`

**Authentication:** Required

**Request Body:**
```json
{
  "quantity": 1,
  "variant": {
    "size": "M",
    "color": "Black"
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Product moved to cart",
  "data": {
    "cart": {...}
  }
}
```

---

## Orders Endpoints

### Create Order

Place a new order.

**Endpoint:** `POST /orders`

**Authentication:** Required

**Request Body:**
```json
{
  "items": [
    {
      "product": "507f1f77bcf86cd799439014",
      "quantity": 2,
      "variant": {
        "size": "M",
        "color": "Black"
      },
      "price": 299.99
    }
  ],
  "shippingAddress": {
    "fullName": "John Doe",
    "phone": "+1234567890",
    "addressLine1": "123 Main St",
    "addressLine2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "paymentMethod": "card",
  "couponCode": "SAVE20"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "order": {
      "_id": "507f1f77bcf86cd799439020",
      "orderNumber": "ORD-2025-001234",
      "user": "507f1f77bcf86cd799439012",
      "items": [...],
      "totalAmount": 599.98,
      "discount": 119.996,
      "finalAmount": 479.984,
      "status": "pending",
      "paymentStatus": "pending",
      "shippingAddress": {...},
      "createdAt": "2025-01-19T00:00:00.000Z"
    }
  }
}
```

---

### Get My Orders

Retrieve authenticated user's orders.

**Endpoint:** `GET /orders`

**Authentication:** Required

**Query Parameters:**
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 10)
- `status` (string) - Filter by status
- `paymentStatus` (string) - Filter by payment status

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "_id": "507f1f77bcf86cd799439020",
        "orderNumber": "ORD-2025-001234",
        "totalAmount": 599.98,
        "finalAmount": 479.984,
        "status": "processing",
        "paymentStatus": "paid",
        "itemCount": 2,
        "createdAt": "2025-01-19T00:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalOrders": 28
    }
  }
}
```

---

### Get Order by ID

Retrieve detailed order information.

**Endpoint:** `GET /orders/:id`

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "order": {
      "_id": "507f1f77bcf86cd799439020",
      "orderNumber": "ORD-2025-001234",
      "user": {...},
      "items": [
        {
          "product": {...},
          "quantity": 2,
          "variant": {...},
          "price": 299.99,
          "subtotal": 599.98
        }
      ],
      "totalAmount": 599.98,
      "discount": 119.996,
      "finalAmount": 479.984,
      "status": "processing",
      "paymentStatus": "paid",
      "paymentMethod": "card",
      "shippingAddress": {...},
      "statusHistory": [
        {
          "status": "pending",
          "timestamp": "2025-01-19T00:00:00.000Z",
          "note": "Order placed"
        },
        {
          "status": "processing",
          "timestamp": "2025-01-19T01:00:00.000Z",
          "note": "Payment confirmed"
        }
      ],
      "createdAt": "2025-01-19T00:00:00.000Z",
      "updatedAt": "2025-01-19T01:00:00.000Z"
    }
  }
}
```

---

### Cancel Order

Cancel an order (only if status is 'pending' or 'processing').

**Endpoint:** `POST /orders/:id/cancel`

**Authentication:** Required

**Request Body:**
```json
{
  "reason": "Changed my mind",
  "details": "Decided to buy a different product"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "order": {...}
  }
}
```

---

### Search My Orders

Advanced search for user's orders.

**Endpoint:** `GET /orders/search`

**Authentication:** Required

**Query Parameters:**
- `q` (string) - Search query (order number, product name)
- `status` (string) - Filter by status
- `dateFrom` (date) - Start date
- `dateTo` (date) - End date
- `minAmount` (number) - Minimum order amount
- `maxAmount` (number) - Maximum order amount

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "orders": [...],
    "total": 5
  }
}
```

---

### Get All Orders (Admin)

Retrieve all orders with filtering.

**Endpoint:** `GET /orders/admin/orders`

**Authentication:** Required (Admin)

**Query Parameters:**
- `page` (number) - Page number
- `limit` (number) - Items per page
- `status` (string) - Filter by status
- `paymentStatus` (string) - Filter by payment status
- `userId` (string) - Filter by user ID

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "orders": [...],
    "pagination": {...}
  }
}
```

---

### Update Order Status (Admin)

Update the status of an order.

**Endpoint:** `PUT /orders/admin/orders/:id/status`

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "status": "shipped",
  "note": "Order shipped via FedEx",
  "trackingNumber": "FDX123456789"
}
```

**Order Status Values:**
- `pending` - Order placed, awaiting payment
- `processing` - Payment confirmed, preparing order
- `shipped` - Order dispatched
- `delivered` - Order delivered
- `cancelled` - Order cancelled
- `returned` - Order returned

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "order": {...}
  }
}
```

---

### Get Order Timeline

Get detailed timeline for an order.

**Endpoint:** `GET /orders/:id/timeline`

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "timeline": [
      {
        "status": "pending",
        "timestamp": "2025-01-19T00:00:00.000Z",
        "title": "Order Placed",
        "description": "Your order has been received",
        "icon": "check"
      },
      {
        "status": "processing",
        "timestamp": "2025-01-19T01:00:00.000Z",
        "title": "Processing",
        "description": "Payment confirmed, preparing your order",
        "icon": "package"
      }
    ]
  }
}
```

---

### Export Orders (Admin)

Export orders to CSV or Excel.

**Endpoint:** `GET /orders/admin/export/csv` or `GET /orders/admin/export/excel`

**Authentication:** Required (Admin)

**Query Parameters:**
- `status` (string) - Filter by status
- `dateFrom` (date) - Start date
- `dateTo` (date) - End date

**Success Response (200):**
File download with appropriate content-type

---

## Payments Endpoints

### Create Payment Intent

Create a payment intent for an order.

**Endpoint:** `POST /payments/create-intent`

**Authentication:** Required

**Request Body:**
```json
{
  "orderId": "507f1f77bcf86cd799439020",
  "amount": 479.984,
  "paymentMethod": "card"
}
```

**Payment Methods:**
- `card` - Credit/Debit Card
- `upi` - UPI Payment
- `cod` - Cash on Delivery
- `wallet` - Digital Wallet

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "paymentIntent": {
      "id": "pi_1234567890",
      "amount": 479.984,
      "currency": "USD",
      "clientSecret": "pi_1234567890_secret_abcdef"
    }
  }
}
```

---

### Verify Payment

Verify payment completion.

**Endpoint:** `POST /payments/verify`

**Authentication:** Required

**Request Body:**
```json
{
  "paymentIntentId": "pi_1234567890",
  "orderId": "507f1f77bcf86cd799439020"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "order": {...},
    "payment": {
      "status": "succeeded",
      "amount": 479.984,
      "method": "card"
    }
  }
}
```

---

### Get Payment Methods

Retrieve available payment methods.

**Endpoint:** `GET /payments/methods`

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "methods": [
      {
        "id": "card",
        "name": "Credit/Debit Card",
        "enabled": true,
        "icon": "credit-card"
      },
      {
        "id": "upi",
        "name": "UPI Payment",
        "enabled": true,
        "icon": "upi"
      },
      {
        "id": "cod",
        "name": "Cash on Delivery",
        "enabled": true,
        "icon": "money"
      },
      {
        "id": "wallet",
        "name": "Digital Wallet",
        "enabled": true,
        "icon": "wallet"
      }
    ]
  }
}
```

---

### Process Refund (Admin)

Process a refund for an order.

**Endpoint:** `POST /payments/refund`

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "orderId": "507f1f77bcf86cd799439020",
  "amount": 479.984,
  "reason": "Product return",
  "note": "Refund for returned product"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Refund processed successfully",
  "data": {
    "refund": {
      "id": "rf_1234567890",
      "amount": 479.984,
      "status": "succeeded",
      "createdAt": "2025-01-19T00:00:00.000Z"
    }
  }
}
```

---

## Returns Endpoints

### Create Return Request

Initiate a return request for an order.

**Endpoint:** `POST /returns`

**Authentication:** Required

**Request Body:**
```json
{
  "orderId": "507f1f77bcf86cd799439020",
  "items": [
    {
      "productId": "507f1f77bcf86cd799439014",
      "quantity": 1,
      "reason": "defective",
      "description": "Product not working properly"
    }
  ],
  "images": ["image_url1", "image_url2"]
}
```

**Return Reasons:**
- `defective` - Product is defective
- `wrong_item` - Received wrong item
- `not_as_described` - Item not as described
- `size_issue` - Size doesn't fit
- `changed_mind` - Changed mind
- `other` - Other reason

**Success Response (201):**
```json
{
  "success": true,
  "message": "Return request created successfully",
  "data": {
    "return": {
      "_id": "507f1f77bcf86cd799439030",
      "returnNumber": "RET-2025-001234",
      "order": "507f1f77bcf86cd799439020",
      "items": [...],
      "status": "pending",
      "refundAmount": 299.99,
      "createdAt": "2025-01-19T00:00:00.000Z"
    }
  }
}
```

---

### Get User Returns

Retrieve user's return requests.

**Endpoint:** `GET /returns`

**Authentication:** Required

**Query Parameters:**
- `page` (number) - Page number
- `limit` (number) - Items per page
- `status` (string) - Filter by status

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "returns": [
      {
        "_id": "507f1f77bcf86cd799439030",
        "returnNumber": "RET-2025-001234",
        "order": {...},
        "status": "approved",
        "refundAmount": 299.99,
        "createdAt": "2025-01-19T00:00:00.000Z"
      }
    ],
    "pagination": {...}
  }
}
```

---

### Check Return Eligibility

Check if an order is eligible for return.

**Endpoint:** `GET /returns/check-eligibility/:orderId`

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "eligible": true,
    "reason": "Order delivered 5 days ago",
    "daysLeft": 25,
    "returnWindow": 30
  }
}
```

**Ineligible Response (200):**
```json
{
  "success": true,
  "data": {
    "eligible": false,
    "reason": "Return window expired",
    "daysLeft": 0
  }
}
```

---

### Update Return Status (Admin)

Update the status of a return request.

**Endpoint:** `PUT /returns/:id/status`

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "status": "approved",
  "note": "Return request approved"
}
```

**Return Status Values:**
- `pending` - Awaiting review
- `approved` - Return approved
- `rejected` - Return rejected
- `picked_up` - Item picked up
- `received` - Item received at warehouse
- `inspecting` - Quality inspection in progress
- `completed` - Return completed and refunded
- `cancelled` - Return cancelled

**Success Response (200):**
```json
{
  "success": true,
  "message": "Return status updated successfully",
  "data": {
    "return": {...}
  }
}
```

---

### Schedule Pickup (Admin)

Schedule pickup for a return.

**Endpoint:** `POST /returns/:id/schedule-pickup`

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "pickupDate": "2025-01-25",
  "timeSlot": "10:00 AM - 2:00 PM",
  "courierService": "FedEx"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Pickup scheduled successfully",
  "data": {
    "return": {...},
    "pickup": {
      "date": "2025-01-25",
      "timeSlot": "10:00 AM - 2:00 PM",
      "courierService": "FedEx",
      "trackingNumber": "FDX987654321"
    }
  }
}
```

---

## Reviews Endpoints

### Get Product Reviews

Retrieve reviews for a product.

**Endpoint:** `GET /reviews/product/:productId`

**Authentication:** Optional

**Query Parameters:**
- `page` (number) - Page number
- `limit` (number) - Items per page
- `rating` (number) - Filter by rating (1-5)
- `sort` (string) - Sort by (recent, helpful, rating)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "_id": "507f1f77bcf86cd799439040",
        "user": {
          "firstName": "John",
          "lastName": "D."
        },
        "rating": 5,
        "title": "Excellent product!",
        "comment": "Great quality, highly recommended",
        "images": ["review_image1.jpg"],
        "verified": true,
        "helpful": 42,
        "notHelpful": 3,
        "createdAt": "2025-01-19T00:00:00.000Z"
      }
    ],
    "pagination": {...},
    "summary": {
      "averageRating": 4.5,
      "totalReviews": 128,
      "ratingDistribution": {
        "5": 80,
        "4": 30,
        "3": 10,
        "2": 5,
        "1": 3
      }
    }
  }
}
```

---

### Create Review

Create a product review (requires verified purchase).

**Endpoint:** `POST /reviews`

**Authentication:** Required

**Content-Type:** `multipart/form-data`

**Form Data:**
- `orderId` (string) - Order ID
- `productId` (string) - Product ID
- `rating` (number) - Rating 1-5
- `title` (string) - Review title
- `comment` (string) - Review comment
- `images` (files) - Review images (max 5)

**Success Response (201):**
```json
{
  "success": true,
  "message": "Review submitted successfully",
  "data": {
    "review": {
      "_id": "507f1f77bcf86cd799439040",
      "rating": 5,
      "title": "Excellent product!",
      "comment": "Great quality, highly recommended",
      "verified": true,
      "status": "pending",
      "createdAt": "2025-01-19T00:00:00.000Z"
    }
  }
}
```

---

### Vote on Review

Mark a review as helpful or not helpful.

**Endpoint:** `POST /reviews/:id/vote`

**Authentication:** Required

**Request Body:**
```json
{
  "vote": "helpful"
}
```

**Vote Values:** `helpful` or `notHelpful`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Vote recorded successfully"
}
```

---

### Report Review

Report a review for inappropriate content.

**Endpoint:** `POST /reviews/:id/report`

**Authentication:** Required

**Request Body:**
```json
{
  "reason": "inappropriate",
  "description": "Contains offensive language"
}
```

**Report Reasons:**
- `inappropriate` - Inappropriate content
- `spam` - Spam or fake review
- `offensive` - Offensive language
- `irrelevant` - Not relevant to product

**Success Response (200):**
```json
{
  "success": true,
  "message": "Review reported successfully"
}
```

---

### Approve Review (Admin)

Approve a pending review.

**Endpoint:** `PUT /reviews/:id/approve`

**Authentication:** Required (Admin)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Review approved successfully"
}
```

---

### Reject Review (Admin)

Reject a review.

**Endpoint:** `PUT /reviews/:id/reject`

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "reason": "Violates community guidelines"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Review rejected successfully"
}
```

---

## Shipping Endpoints

### Track Shipment

Track a shipment by tracking number (public endpoint).

**Endpoint:** `GET /shipping/track/:trackingNumber`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "shipping": {
      "trackingNumber": "FDX123456789",
      "carrier": "FedEx",
      "status": "in_transit",
      "estimatedDelivery": "2025-01-25",
      "timeline": [
        {
          "status": "picked_up",
          "location": "New York, NY",
          "timestamp": "2025-01-20T10:00:00.000Z",
          "description": "Package picked up"
        },
        {
          "status": "in_transit",
          "location": "Philadelphia, PA",
          "timestamp": "2025-01-21T14:00:00.000Z",
          "description": "Package in transit"
        }
      ]
    }
  }
}
```

---

### Get Shipping by Order ID

Get shipping information for an order.

**Endpoint:** `GET /shipping/order/:orderId`

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "shipping": {...}
  }
}
```

---

### Create Shipping (Admin)

Create shipping entry for an order.

**Endpoint:** `POST /shipping`

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "orderId": "507f1f77bcf86cd799439020",
  "carrier": "FedEx",
  "trackingNumber": "FDX123456789",
  "estimatedDelivery": "2025-01-25",
  "shippingCost": 15.99
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Shipping created successfully",
  "data": {
    "shipping": {...}
  }
}
```

---

### Update Shipping Status (Admin)

Update shipping status.

**Endpoint:** `PUT /shipping/:id/status`

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "status": "delivered",
  "location": "New York, NY",
  "note": "Package delivered to customer"
}
```

**Shipping Status Values:**
- `pending` - Awaiting pickup
- `picked_up` - Package picked up
- `in_transit` - In transit
- `out_for_delivery` - Out for delivery
- `delivered` - Delivered
- `failed` - Delivery failed
- `returned` - Returned to sender

**Success Response (200):**
```json
{
  "success": true,
  "message": "Shipping status updated successfully"
}
```

---

## Admin Endpoints

### Get Dashboard Stats

Get overview statistics for admin dashboard.

**Endpoint:** `GET /admin/analytics/dashboard`

**Authentication:** Required (Admin)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalOrders": 1247,
      "totalRevenue": 125678.50,
      "totalCustomers": 856,
      "totalProducts": 342,
      "pendingOrders": 23,
      "processingOrders": 45,
      "deliveredOrders": 1179,
      "returnsThisMonth": 12,
      "averageOrderValue": 100.78
    },
    "recentOrders": [...],
    "topProducts": [...],
    "revenueChart": [
      {
        "date": "2025-01-01",
        "revenue": 4567.89
      }
    ]
  }
}
```

---

### Get User Activity Metrics

Get user activity statistics.

**Endpoint:** `GET /admin/analytics/users`

**Authentication:** Required (Admin)

**Query Parameters:**
- `dateFrom` (date) - Start date
- `dateTo` (date) - End date

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalUsers": 856,
    "activeUsers": 432,
    "newUsers": 45,
    "userGrowth": [
      {
        "date": "2025-01-01",
        "count": 12
      }
    ]
  }
}
```

---

### Get Revenue Analytics

Get detailed revenue analytics.

**Endpoint:** `GET /admin/analytics/revenue`

**Authentication:** Required (Admin)

**Query Parameters:**
- `dateFrom` (date) - Start date
- `dateTo` (date) - End date
- `groupBy` (string) - day, week, month

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 125678.50,
    "averageOrderValue": 100.78,
    "revenueByPeriod": [
      {
        "period": "2025-01-01",
        "revenue": 4567.89,
        "orders": 45
      }
    ],
    "revenueByCategory": [
      {
        "category": "Electronics",
        "revenue": 45678.90,
        "percentage": 36.3
      }
    ]
  }
}
```

---

### Get All Users (SuperAdmin)

Get list of all users with filtering.

**Endpoint:** `GET /admin/users`

**Authentication:** Required (SuperAdmin)

**Query Parameters:**
- `page` (number) - Page number
- `limit` (number) - Items per page
- `role` (string) - Filter by role
- `isActive` (boolean) - Filter by active status
- `search` (string) - Search by name or email

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "user",
        "isActive": true,
        "createdAt": "2025-01-19T00:00:00.000Z"
      }
    ],
    "pagination": {...}
  }
}
```

---

### Update User Status (SuperAdmin)

Activate or deactivate a user account.

**Endpoint:** `PUT /admin/users/:id/status`

**Authentication:** Required (SuperAdmin)

**Request Body:**
```json
{
  "isActive": false,
  "reason": "Violation of terms of service"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "User status updated successfully"
}
```

---

## Coupons Endpoints

### Validate Coupon

Validate a coupon code for an order.

**Endpoint:** `POST /coupons/validate`

**Authentication:** Required

**Request Body:**
```json
{
  "code": "SAVE20",
  "cartTotal": 599.98
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "coupon": {
      "code": "SAVE20",
      "discountType": "percentage",
      "discountValue": 20,
      "description": "Get 20% off on all orders"
    },
    "discount": 119.996,
    "finalAmount": 479.984
  }
}
```

**Invalid Coupon Response (200):**
```json
{
  "success": true,
  "data": {
    "valid": false,
    "reason": "Coupon has expired"
  }
}
```

---

### Get All Coupons (Admin)

Get list of all coupons.

**Endpoint:** `GET /coupons`

**Authentication:** Required (Admin)

**Query Parameters:**
- `page` (number) - Page number
- `limit` (number) - Items per page
- `isActive` (boolean) - Filter by active status

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "coupons": [
      {
        "_id": "507f1f77bcf86cd799439050",
        "code": "SAVE20",
        "discountType": "percentage",
        "discountValue": 20,
        "minPurchase": 100,
        "maxDiscount": 500,
        "usageLimit": 1000,
        "usedCount": 245,
        "validFrom": "2025-01-01T00:00:00.000Z",
        "validUntil": "2025-12-31T23:59:59.000Z",
        "isActive": true
      }
    ],
    "pagination": {...}
  }
}
```

---

### Create Coupon (Admin)

Create a new coupon.

**Endpoint:** `POST /coupons`

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "code": "NEWYEAR25",
  "description": "New Year Special - 25% off",
  "discountType": "percentage",
  "discountValue": 25,
  "minPurchase": 200,
  "maxDiscount": 1000,
  "usageLimit": 500,
  "validFrom": "2025-01-01T00:00:00.000Z",
  "validUntil": "2025-01-31T23:59:59.000Z",
  "isActive": true,
  "applicableCategories": ["electronics", "fashion"],
  "excludedProducts": []
}
```

**Discount Types:**
- `percentage` - Percentage discount (e.g., 20%)
- `fixed` - Fixed amount discount (e.g., $50)
- `free_shipping` - Free shipping

**Success Response (201):**
```json
{
  "success": true,
  "message": "Coupon created successfully",
  "data": {
    "coupon": {...}
  }
}
```

---

### Update Coupon (Admin)

Update an existing coupon.

**Endpoint:** `PUT /coupons/:id`

**Authentication:** Required (Admin)

**Request Body:** Same as Create Coupon (all fields optional)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Coupon updated successfully"
}
```

---

### Delete Coupon (Admin)

Delete a coupon.

**Endpoint:** `DELETE /coupons/:id`

**Authentication:** Required (Admin)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Coupon deleted successfully"
}
```

---

## Notifications Endpoints

### Get User Notifications

Get notifications for authenticated user.

**Endpoint:** `GET /notifications`

**Authentication:** Required

**Query Parameters:**
- `page` (number) - Page number
- `limit` (number) - Items per page
- `unreadOnly` (boolean) - Show only unread notifications

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "507f1f77bcf86cd799439060",
        "type": "order_shipped",
        "title": "Your order has been shipped",
        "message": "Order #ORD-2025-001234 is on its way",
        "data": {
          "orderId": "507f1f77bcf86cd799439020",
          "trackingNumber": "FDX123456789"
        },
        "read": false,
        "createdAt": "2025-01-19T00:00:00.000Z"
      }
    ],
    "unreadCount": 3,
    "pagination": {...}
  }
}
```

---

### Mark Notification as Read

Mark a notification as read.

**Endpoint:** `PUT /notifications/:id/read`

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

### Mark All as Read

Mark all notifications as read.

**Endpoint:** `PUT /notifications/read-all`

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

---

## Settings Endpoints

### Get Settings

Get user or system settings.

**Endpoint:** `GET /settings`

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "settings": {
      "notifications": {
        "email": true,
        "sms": false,
        "push": true,
        "orderUpdates": true,
        "promotions": false
      },
      "privacy": {
        "showProfile": true,
        "showOrders": false
      },
      "preferences": {
        "language": "en",
        "currency": "USD"
      }
    }
  }
}
```

---

### Update Settings

Update user settings.

**Endpoint:** `PUT /settings`

**Authentication:** Required

**Request Body:**
```json
{
  "notifications": {
    "email": true,
    "sms": true
  },
  "preferences": {
    "language": "en"
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```

---

## Webhooks

### Order Status Webhook

Receive order status updates from external systems.

**Endpoint:** `POST /webhooks/order-status`

**Authentication:** API Key in header

**Headers:**
```
X-API-Key: your_webhook_api_key
```

**Request Body:**
```json
{
  "orderId": "507f1f77bcf86cd799439020",
  "status": "delivered",
  "timestamp": "2025-01-25T10:00:00.000Z",
  "location": "New York, NY"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Webhook received successfully"
}
```

---

## Appendix

### Data Models

#### User Model
```json
{
  "_id": "string",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "phone": "string",
  "role": "user|admin|superadmin",
  "addresses": [Address],
  "isActive": "boolean",
  "createdAt": "date",
  "updatedAt": "date"
}
```

#### Product Model
```json
{
  "_id": "string",
  "name": "string",
  "description": "string",
  "price": "number",
  "images": ["string"],
  "category": "Category",
  "stock": "number",
  "variants": [Variant],
  "rating": "number",
  "reviewCount": "number",
  "isFeatured": "boolean",
  "tags": ["string"],
  "createdAt": "date",
  "updatedAt": "date"
}
```

#### Order Model
```json
{
  "_id": "string",
  "orderNumber": "string",
  "user": "User",
  "items": [OrderItem],
  "totalAmount": "number",
  "discount": "number",
  "finalAmount": "number",
  "status": "string",
  "paymentStatus": "string",
  "paymentMethod": "string",
  "shippingAddress": "Address",
  "statusHistory": [StatusUpdate],
  "createdAt": "date",
  "updatedAt": "date"
}
```

---

## Support

For API support and questions:
- Email: api-support@stylehub.com
- Documentation: https://docs.stylehub.com
- Status Page: https://status.stylehub.com

---

**Last Updated:** January 19, 2025
**API Version:** 1.0.0
