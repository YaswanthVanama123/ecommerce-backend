# E-Commerce API Documentation

## Table of Contents
1. [Authentication APIs](#authentication-apis)
2. [Product APIs](#product-apis)
3. [Category APIs](#category-apis)
4. [Cart APIs](#cart-apis)
5. [Order APIs](#order-apis)
6. [Admin APIs](#admin-apis)
7. [Status Codes](#status-codes)
8. [Error Handling](#error-handling)

---

## Base URL

```
http://localhost:5000/api
```

---

## Authentication APIs

### 1. Register User

**Endpoint:** `POST /api/auth/register`

**Authentication Required:** No

**Description:** Register a new user account

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "role": "user",
      "isActive": true,
      "createdAt": "2024-01-14T10:30:00Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully"
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "statusCode": 400,
  "data": null,
  "message": "User already exists with this email"
}
```

**Status Codes:**
- `201` - User registered successfully
- `400` - User already exists or invalid data

---

### 2. Login User

**Endpoint:** `POST /api/auth/login`

**Authentication Required:** No

**Description:** Login with email and password

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "role": "user",
      "isActive": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

**Error Response (401 Unauthorized):**

```json
{
  "success": false,
  "statusCode": 401,
  "data": null,
  "message": "Invalid email or password"
}
```

**Error Response (403 Forbidden):**

```json
{
  "success": false,
  "statusCode": 403,
  "data": null,
  "message": "Your account has been deactivated"
}
```

**Status Codes:**
- `200` - Login successful
- `401` - Invalid credentials
- `403` - Account deactivated

---

### 3. Refresh Access Token

**Endpoint:** `POST /api/auth/refresh`

**Authentication Required:** No

**Description:** Get a new access token using refresh token

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Token refreshed successfully"
}
```

**Error Response (401 Unauthorized):**

```json
{
  "success": false,
  "statusCode": 401,
  "data": null,
  "message": "Invalid or expired refresh token"
}
```

**Status Codes:**
- `200` - Token refreshed
- `401` - Invalid or expired refresh token

---

### 4. Logout User

**Endpoint:** `POST /api/auth/logout`

**Authentication Required:** Yes (Bearer Token)

**Description:** Logout user and clear refresh token

**Request Headers:**

```
Authorization: Bearer <accessToken>
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": null,
  "message": "Logged out successfully"
}
```

**Error Response (401 Unauthorized):**

```json
{
  "success": false,
  "statusCode": 401,
  "data": null,
  "message": "Not authorized to access this route"
}
```

**Status Codes:**
- `200` - Logged out successfully
- `401` - Unauthorized

---

### 5. Get Current User

**Endpoint:** `GET /api/auth/me`

**Authentication Required:** Yes (Bearer Token)

**Description:** Get current authenticated user details

**Request Headers:**

```
Authorization: Bearer <accessToken>
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "role": "user",
    "isActive": true,
    "addresses": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "addressLine1": "123 Main St",
        "addressLine2": "Apt 4B",
        "city": "New York",
        "state": "NY",
        "pincode": "10001",
        "country": "USA"
      }
    ],
    "createdAt": "2024-01-14T10:30:00Z"
  },
  "message": "User fetched successfully"
}
```

**Status Codes:**
- `200` - User fetched successfully
- `401` - Unauthorized

---

## Product APIs

### 1. Get All Products

**Endpoint:** `GET /api/products`

**Authentication Required:** No

**Description:** Get all active products with filters, search, and pagination

**Query Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `page` | Integer | No | Page number (default: 1) | `?page=1` |
| `limit` | Integer | No | Items per page (default: 20) | `?limit=10` |
| `category` | String | No | Category ID filter | `?category=507f1f77bcf86cd799439011` |
| `minPrice` | Number | No | Minimum price filter | `?minPrice=100` |
| `maxPrice` | Number | No | Maximum price filter | `?maxPrice=1000` |
| `brand` | String | No | Brand filter | `?brand=Nike` |
| `size` | String | No | Size filter | `?size=M` |
| `color` | String | No | Color filter | `?color=Red` |
| `search` | String | No | Search query | `?search=shoes` |
| `sort` | String | No | Sort option: `price-low`, `price-high`, `rating`, `newest` | `?sort=price-low` |

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "products": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Nike Air Max 90",
        "description": "Classic sneaker",
        "category": {
          "_id": "507f1f77bcf86cd799439010",
          "name": "Shoes",
          "slug": "shoes"
        },
        "brand": "Nike",
        "price": 99.99,
        "discountPrice": 79.99,
        "images": [
          "https://cloudinary.com/image1.jpg",
          "https://cloudinary.com/image2.jpg"
        ],
        "sizes": ["S", "M", "L", "XL"],
        "colors": [
          {
            "name": "Red",
            "hex": "#FF0000"
          },
          {
            "name": "Black",
            "hex": "#000000"
          }
        ],
        "stock": 150,
        "isFeatured": true,
        "isActive": true,
        "ratings": {
          "average": 4.5,
          "count": 120
        },
        "createdAt": "2024-01-14T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 250,
      "pages": 13
    }
  },
  "message": "Products fetched successfully"
}
```

**Example Requests:**

```bash
# Get first page with default limit
GET /api/products

# Get products with filters
GET /api/products?page=1&limit=10&category=507f1f77bcf86cd799439011&minPrice=50&maxPrice=500&sort=price-low

# Search products
GET /api/products?search=nike&sort=newest

# Filter by brand and color
GET /api/products?brand=Nike&color=Red&size=M
```

**Status Codes:**
- `200` - Products fetched successfully
- `400` - Invalid query parameters

---

### 2. Get Featured Products

**Endpoint:** `GET /api/products/featured`

**Authentication Required:** No

**Description:** Get featured products for homepage display

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | Integer | No | Number of products to return (default: 10) |

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Premium Headphones",
      "price": 199.99,
      "discountPrice": 159.99,
      "images": ["https://cloudinary.com/image1.jpg"],
      "ratings": {
        "average": 4.8,
        "count": 250
      },
      "isFeatured": true,
      "isActive": true
    }
  ],
  "message": "Featured products fetched successfully"
}
```

**Status Codes:**
- `200` - Featured products fetched successfully

---

### 3. Get Product by ID

**Endpoint:** `GET /api/products/:id`

**Authentication Required:** No

**Description:** Get detailed information about a specific product

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | Product ID (MongoDB ObjectId) |

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Nike Air Max 90",
    "description": "Classic sneaker with advanced cushioning",
    "category": {
      "_id": "507f1f77bcf86cd799439010",
      "name": "Shoes",
      "slug": "shoes"
    },
    "subCategory": "Sneakers",
    "brand": "Nike",
    "price": 99.99,
    "discountPrice": 79.99,
    "images": [
      "https://cloudinary.com/image1.jpg",
      "https://cloudinary.com/image2.jpg"
    ],
    "sizes": ["S", "M", "L", "XL"],
    "colors": [
      {
        "name": "Red",
        "hex": "#FF0000"
      }
    ],
    "stock": [
      {
        "size": "M",
        "color": "Red",
        "quantity": 50
      }
    ],
    "tags": ["summer", "casual"],
    "ratings": {
      "average": 4.5,
      "count": 120
    },
    "reviews": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "user": {
          "_id": "507f1f77bcf86cd799439013",
          "firstName": "John",
          "lastName": "Doe"
        },
        "rating": 5,
        "comment": "Great product, highly recommend!",
        "createdAt": "2024-01-14T10:30:00Z"
      }
    ],
    "isFeatured": true,
    "isActive": true,
    "createdAt": "2024-01-14T10:30:00Z"
  },
  "message": "Product fetched successfully"
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "statusCode": 404,
  "data": null,
  "message": "Product not found"
}
```

**Status Codes:**
- `200` - Product fetched successfully
- `404` - Product not found

---

### 4. Create Product

**Endpoint:** `POST /api/products`

**Authentication Required:** Yes - Admin Role

**Description:** Create a new product (Admin only)

**Request Headers:**

```
Authorization: Bearer <adminAccessToken>
```

**Request Body:**

```json
{
  "name": "Nike Air Max 90",
  "description": "Classic sneaker with advanced cushioning",
  "category": "507f1f77bcf86cd799439010",
  "subCategory": "Sneakers",
  "brand": "Nike",
  "price": 99.99,
  "discountPrice": 79.99,
  "images": [
    "https://cloudinary.com/image1.jpg",
    "https://cloudinary.com/image2.jpg"
  ],
  "sizes": ["S", "M", "L", "XL"],
  "colors": [
    {
      "name": "Red",
      "hex": "#FF0000"
    },
    {
      "name": "Black",
      "hex": "#000000"
    }
  ],
  "stock": [
    {
      "size": "M",
      "color": "Red",
      "quantity": 50
    },
    {
      "size": "L",
      "color": "Black",
      "quantity": 30
    }
  ],
  "tags": ["summer", "casual"],
  "isFeatured": true,
  "isActive": true
}
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Nike Air Max 90",
    "description": "Classic sneaker with advanced cushioning",
    "category": "507f1f77bcf86cd799439010",
    "brand": "Nike",
    "price": 99.99,
    "discountPrice": 79.99,
    "createdBy": "507f1f77bcf86cd799439014",
    "createdAt": "2024-01-14T10:30:00Z"
  },
  "message": "Product created successfully"
}
```

**Error Response (401 Unauthorized):**

```json
{
  "success": false,
  "statusCode": 401,
  "data": null,
  "message": "Not authorized to access this route"
}
```

**Status Codes:**
- `201` - Product created successfully
- `400` - Invalid product data
- `401` - Not authenticated or not admin
- `403` - Forbidden (insufficient permissions)

---

### 5. Update Product

**Endpoint:** `PUT /api/products/:id`

**Authentication Required:** Yes - Admin Role

**Description:** Update an existing product (Admin only)

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | Product ID |

**Request Headers:**

```
Authorization: Bearer <adminAccessToken>
```

**Request Body:** (All fields are optional)

```json
{
  "name": "Nike Air Max 90 Updated",
  "description": "Updated description",
  "price": 109.99,
  "discountPrice": 85.99,
  "stock": 200,
  "isFeatured": false,
  "isActive": true
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Nike Air Max 90 Updated",
    "price": 109.99,
    "discountPrice": 85.99,
    "updatedAt": "2024-01-14T11:00:00Z"
  },
  "message": "Product updated successfully"
}
```

**Status Codes:**
- `200` - Product updated successfully
- `400` - Invalid data
- `401` - Not authenticated
- `404` - Product not found

---

### 6. Delete Product

**Endpoint:** `DELETE /api/products/:id`

**Authentication Required:** Yes - Admin Role

**Description:** Delete a product (Admin only)

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | Product ID |

**Request Headers:**

```
Authorization: Bearer <adminAccessToken>
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": null,
  "message": "Product deleted successfully"
}
```

**Status Codes:**
- `200` - Product deleted successfully
- `401` - Not authenticated
- `404` - Product not found

---

### 7. Upload Product Images

**Endpoint:** `POST /api/products/upload`

**Authentication Required:** Yes - Admin Role

**Description:** Upload multiple product images to Cloudinary

**Request Headers:**

```
Authorization: Bearer <adminAccessToken>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**

```
images: [file1, file2, file3, ...]
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "images": [
      "https://cloudinary.com/secure/image1.jpg",
      "https://cloudinary.com/secure/image2.jpg",
      "https://cloudinary.com/secure/image3.jpg"
    ]
  },
  "message": "Images uploaded successfully"
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "statusCode": 400,
  "data": null,
  "message": "No images provided"
}
```

**Status Codes:**
- `200` - Images uploaded successfully
- `400` - No images provided or invalid files
- `401` - Not authenticated

---

### 8. Add Product Review

**Endpoint:** `POST /api/products/:id/reviews`

**Authentication Required:** Yes (User)

**Description:** Add a review and rating to a product

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | Product ID |

**Request Headers:**

```
Authorization: Bearer <accessToken>
```

**Request Body:**

```json
{
  "rating": 5,
  "comment": "Excellent product, highly recommended!"
}
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Nike Air Max 90",
    "reviews": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "user": "507f1f77bcf86cd799439013",
        "rating": 5,
        "comment": "Excellent product, highly recommended!",
        "createdAt": "2024-01-14T10:30:00Z"
      }
    ],
    "ratings": {
      "average": 4.7,
      "count": 121
    }
  },
  "message": "Review added successfully"
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "statusCode": 400,
  "data": null,
  "message": "You have already reviewed this product"
}
```

**Status Codes:**
- `201` - Review added successfully
- `400` - User already reviewed or invalid data
- `401` - Not authenticated
- `404` - Product not found

---

## Category APIs

### 1. Get All Categories

**Endpoint:** `GET /api/categories`

**Authentication Required:** No

**Description:** Get all active categories

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439010",
      "name": "Shoes",
      "slug": "shoes",
      "description": "Footwear collection",
      "image": "https://cloudinary.com/category-shoes.jpg",
      "parentCategory": null,
      "order": 1,
      "isActive": true,
      "createdAt": "2024-01-14T10:30:00Z"
    },
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Clothing",
      "slug": "clothing",
      "description": "Apparel collection",
      "image": "https://cloudinary.com/category-clothing.jpg",
      "parentCategory": null,
      "order": 2,
      "isActive": true,
      "createdAt": "2024-01-14T10:30:00Z"
    }
  ],
  "message": "Categories fetched successfully"
}
```

**Status Codes:**
- `200` - Categories fetched successfully

---

### 2. Get Category Tree

**Endpoint:** `GET /api/categories/tree`

**Authentication Required:** No

**Description:** Get categories in hierarchical tree structure

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439010",
      "name": "Shoes",
      "slug": "shoes",
      "description": "Footwear collection",
      "order": 1,
      "isActive": true,
      "children": [
        {
          "_id": "507f1f77bcf86cd799439015",
          "name": "Sneakers",
          "slug": "sneakers",
          "description": "Casual sneakers",
          "parentCategory": "507f1f77bcf86cd799439010",
          "order": 1,
          "isActive": true,
          "children": []
        },
        {
          "_id": "507f1f77bcf86cd799439016",
          "name": "Formal Shoes",
          "slug": "formal-shoes",
          "description": "Formal footwear",
          "parentCategory": "507f1f77bcf86cd799439010",
          "order": 2,
          "isActive": true,
          "children": []
        }
      ]
    },
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Clothing",
      "slug": "clothing",
      "order": 2,
      "isActive": true,
      "children": []
    }
  ],
  "message": "Category tree fetched successfully"
}
```

**Status Codes:**
- `200` - Category tree fetched successfully

---

### 3. Get Category by ID

**Endpoint:** `GET /api/categories/:id`

**Authentication Required:** No

**Description:** Get details of a specific category

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | Category ID |

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "_id": "507f1f77bcf86cd799439010",
    "name": "Shoes",
    "slug": "shoes",
    "description": "Footwear collection",
    "image": "https://cloudinary.com/category-shoes.jpg",
    "parentCategory": null,
    "order": 1,
    "isActive": true,
    "createdAt": "2024-01-14T10:30:00Z"
  },
  "message": "Category fetched successfully"
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "statusCode": 404,
  "data": null,
  "message": "Category not found"
}
```

**Status Codes:**
- `200` - Category fetched successfully
- `404` - Category not found

---

### 4. Create Category

**Endpoint:** `POST /api/categories`

**Authentication Required:** Yes - Admin Role

**Description:** Create a new category (Admin only)

**Request Headers:**

```
Authorization: Bearer <adminAccessToken>
```

**Request Body:**

```json
{
  "name": "Sneakers",
  "description": "Casual sneaker collection",
  "image": "https://cloudinary.com/sneakers.jpg",
  "parentCategory": "507f1f77bcf86cd799439010",
  "order": 1
}
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "_id": "507f1f77bcf86cd799439015",
    "name": "Sneakers",
    "slug": "sneakers",
    "description": "Casual sneaker collection",
    "image": "https://cloudinary.com/sneakers.jpg",
    "parentCategory": "507f1f77bcf86cd799439010",
    "order": 1,
    "isActive": true,
    "createdAt": "2024-01-14T10:30:00Z"
  },
  "message": "Category created successfully"
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "statusCode": 400,
  "data": null,
  "message": "Category with this name already exists"
}
```

**Status Codes:**
- `201` - Category created successfully
- `400` - Category name already exists or invalid data
- `401` - Not authenticated

---

### 5. Update Category

**Endpoint:** `PUT /api/categories/:id`

**Authentication Required:** Yes - Admin Role

**Description:** Update an existing category (Admin only)

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | Category ID |

**Request Headers:**

```
Authorization: Bearer <adminAccessToken>
```

**Request Body:** (All fields are optional)

```json
{
  "name": "Updated Category Name",
  "description": "Updated description",
  "image": "https://cloudinary.com/updated-image.jpg",
  "isActive": true,
  "order": 2
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "_id": "507f1f77bcf86cd799439015",
    "name": "Updated Category Name",
    "description": "Updated description",
    "order": 2,
    "isActive": true,
    "updatedAt": "2024-01-14T11:00:00Z"
  },
  "message": "Category updated successfully"
}
```

**Status Codes:**
- `200` - Category updated successfully
- `400` - Invalid data or duplicate name
- `401` - Not authenticated
- `404` - Category not found

---

### 6. Delete Category

**Endpoint:** `DELETE /api/categories/:id`

**Authentication Required:** Yes - Admin Role

**Description:** Delete a category (Admin only). Cannot delete if sub-categories exist.

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | Category ID |

**Request Headers:**

```
Authorization: Bearer <adminAccessToken>
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": null,
  "message": "Category deleted successfully"
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "statusCode": 400,
  "data": null,
  "message": "Cannot delete category with sub-categories. Delete sub-categories first."
}
```

**Status Codes:**
- `200` - Category deleted successfully
- `400` - Has sub-categories
- `401` - Not authenticated
- `404` - Category not found

---

## Cart APIs

### 1. Get User's Cart

**Endpoint:** `GET /api/cart`

**Authentication Required:** Yes (User)

**Description:** Get the current user's shopping cart

**Request Headers:**

```
Authorization: Bearer <accessToken>
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "cart": {
      "_id": "507f1f77bcf86cd799439020",
      "user": "507f1f77bcf86cd799439013",
      "items": [
        {
          "_id": "507f1f77bcf86cd799439021",
          "product": {
            "_id": "507f1f77bcf86cd799439011",
            "name": "Nike Air Max 90",
            "images": ["https://cloudinary.com/image1.jpg"],
            "price": 99.99,
            "discountPrice": 79.99
          },
          "quantity": 2,
          "size": "M",
          "color": "Red",
          "price": 79.99
        }
      ],
      "createdAt": "2024-01-14T10:30:00Z",
      "updatedAt": "2024-01-14T10:30:00Z"
    },
    "total": 159.98,
    "totalItems": 2
  },
  "message": "Cart fetched successfully"
}
```

**Status Codes:**
- `200` - Cart fetched successfully
- `401` - Not authenticated

---

### 2. Add Item to Cart

**Endpoint:** `POST /api/cart/items`

**Authentication Required:** Yes (User)

**Description:** Add a product to user's cart

**Request Headers:**

```
Authorization: Bearer <accessToken>
```

**Request Body:**

```json
{
  "productId": "507f1f77bcf86cd799439011",
  "quantity": 2,
  "size": "M",
  "color": "Red"
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "cart": {
      "_id": "507f1f77bcf86cd799439020",
      "items": [
        {
          "_id": "507f1f77bcf86cd799439021",
          "product": {
            "_id": "507f1f77bcf86cd799439011",
            "name": "Nike Air Max 90",
            "images": ["https://cloudinary.com/image1.jpg"],
            "price": 99.99,
            "discountPrice": 79.99
          },
          "quantity": 2,
          "size": "M",
          "color": "Red",
          "price": 79.99
        }
      ]
    },
    "total": 159.98,
    "totalItems": 2
  },
  "message": "Item added to cart successfully"
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "statusCode": 400,
  "data": null,
  "message": "Insufficient stock for selected size and color"
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "statusCode": 404,
  "data": null,
  "message": "Product not found or inactive"
}
```

**Status Codes:**
- `200` - Item added successfully
- `400` - Insufficient stock or invalid data
- `401` - Not authenticated
- `404` - Product not found

---

### 3. Update Cart Item Quantity

**Endpoint:** `PUT /api/cart/items/:itemId`

**Authentication Required:** Yes (User)

**Description:** Update the quantity of an item in cart

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `itemId` | String | Yes | Cart item ID |

**Request Headers:**

```
Authorization: Bearer <accessToken>
```

**Request Body:**

```json
{
  "quantity": 3
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "cart": {
      "_id": "507f1f77bcf86cd799439020",
      "items": [
        {
          "_id": "507f1f77bcf86cd799439021",
          "product": {
            "_id": "507f1f77bcf86cd799439011",
            "name": "Nike Air Max 90",
            "price": 99.99,
            "discountPrice": 79.99
          },
          "quantity": 3,
          "size": "M",
          "color": "Red",
          "price": 79.99
        }
      ]
    },
    "total": 239.97,
    "totalItems": 3
  },
  "message": "Cart item updated successfully"
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "statusCode": 400,
  "data": null,
  "message": "Quantity must be at least 1"
}
```

**Status Codes:**
- `200` - Item quantity updated
- `400` - Invalid quantity or insufficient stock
- `401` - Not authenticated
- `404` - Cart or item not found

---

### 4. Remove Item from Cart

**Endpoint:** `DELETE /api/cart/items/:itemId`

**Authentication Required:** Yes (User)

**Description:** Remove a specific item from cart

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `itemId` | String | Yes | Cart item ID |

**Request Headers:**

```
Authorization: Bearer <accessToken>
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "cart": {
      "_id": "507f1f77bcf86cd799439020",
      "items": []
    },
    "total": 0,
    "totalItems": 0
  },
  "message": "Item removed from cart successfully"
}
```

**Status Codes:**
- `200` - Item removed successfully
- `401` - Not authenticated
- `404` - Cart or item not found

---

### 5. Clear Cart

**Endpoint:** `DELETE /api/cart`

**Authentication Required:** Yes (User)

**Description:** Remove all items from user's cart

**Request Headers:**

```
Authorization: Bearer <accessToken>
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "cart": {
      "_id": "507f1f77bcf86cd799439020",
      "items": []
    },
    "total": 0,
    "totalItems": 0
  },
  "message": "Cart cleared successfully"
}
```

**Status Codes:**
- `200` - Cart cleared successfully
- `401` - Not authenticated
- `404` - Cart not found

---

## Order APIs

### 1. Create Order

**Endpoint:** `POST /api/orders`

**Authentication Required:** Yes (User)

**Description:** Create a new order from user's cart

**Request Headers:**

```
Authorization: Bearer <accessToken>
```

**Request Body:**

```json
{
  "shippingAddressId": "507f1f77bcf86cd799439012",
  "paymentMethod": "card"
}
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "_id": "507f1f77bcf86cd799439030",
    "user": "507f1f77bcf86cd799439013",
    "items": [
      {
        "_id": "507f1f77bcf86cd799439031",
        "product": "507f1f77bcf86cd799439011",
        "name": "Nike Air Max 90",
        "image": "https://cloudinary.com/image1.jpg",
        "quantity": 2,
        "size": "M",
        "color": "Red",
        "price": 99.99,
        "discountPrice": 79.99
      }
    ],
    "shippingAddress": {
      "firstName": "John",
      "lastName": "Doe",
      "addressLine1": "123 Main St",
      "addressLine2": "Apt 4B",
      "city": "New York",
      "state": "NY",
      "pincode": "10001",
      "country": "USA",
      "phone": "+1234567890"
    },
    "paymentMethod": "card",
    "orderStatus": "pending",
    "paymentStatus": "pending",
    "itemsTotal": 159.98,
    "shippingCharge": 0,
    "tax": 28.80,
    "totalAmount": 188.78,
    "createdAt": "2024-01-14T10:30:00Z"
  },
  "message": "Order created successfully"
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "statusCode": 400,
  "data": null,
  "message": "Cart is empty"
}
```

**Status Codes:**
- `201` - Order created successfully
- `400` - Cart empty or insufficient stock
- `401` - Not authenticated
- `404` - Shipping address not found

---

### 2. Get User's Orders

**Endpoint:** `GET /api/orders`

**Authentication Required:** Yes (User)

**Description:** Get all orders placed by the current user

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | Integer | No | Page number (default: 1) |
| `limit` | Integer | No | Items per page (default: 10) |

**Request Headers:**

```
Authorization: Bearer <accessToken>
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "orders": [
      {
        "_id": "507f1f77bcf86cd799439030",
        "orderStatus": "delivered",
        "paymentStatus": "completed",
        "totalAmount": 188.78,
        "itemsCount": 2,
        "createdAt": "2024-01-14T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "pages": 1
    }
  },
  "message": "Orders fetched successfully"
}
```

**Status Codes:**
- `200` - Orders fetched successfully
- `401` - Not authenticated

---

### 3. Get Order by ID

**Endpoint:** `GET /api/orders/:id`

**Authentication Required:** Yes (User)

**Description:** Get detailed information about a specific order

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | Order ID |

**Request Headers:**

```
Authorization: Bearer <accessToken>
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "_id": "507f1f77bcf86cd799439030",
    "user": {
      "_id": "507f1f77bcf86cd799439013",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "items": [
      {
        "_id": "507f1f77bcf86cd799439031",
        "product": {
          "_id": "507f1f77bcf86cd799439011",
          "name": "Nike Air Max 90",
          "images": ["https://cloudinary.com/image1.jpg"]
        },
        "quantity": 2,
        "size": "M",
        "color": "Red",
        "price": 99.99,
        "discountPrice": 79.99
      }
    ],
    "shippingAddress": {
      "firstName": "John",
      "lastName": "Doe",
      "addressLine1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "pincode": "10001",
      "country": "USA",
      "phone": "+1234567890"
    },
    "orderStatus": "delivered",
    "paymentStatus": "completed",
    "paymentMethod": "card",
    "itemsTotal": 159.98,
    "shippingCharge": 0,
    "tax": 28.80,
    "totalAmount": 188.78,
    "createdAt": "2024-01-14T10:30:00Z",
    "deliveredAt": "2024-01-16T10:30:00Z"
  },
  "message": "Order fetched successfully"
}
```

**Error Response (403 Forbidden):**

```json
{
  "success": false,
  "statusCode": 403,
  "data": null,
  "message": "Not authorized to view this order"
}
```

**Status Codes:**
- `200` - Order fetched successfully
- `401` - Not authenticated
- `403` - Not authorized to view order
- `404` - Order not found

---

### 4. Cancel Order

**Endpoint:** `PUT /api/orders/:id/cancel`

**Authentication Required:** Yes (User)

**Description:** Cancel a pending or processing order

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | Order ID |

**Request Headers:**

```
Authorization: Bearer <accessToken>
```

**Request Body:**

```json
{
  "reason": "Changed my mind about the order"
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "_id": "507f1f77bcf86cd799439030",
    "orderStatus": "cancelled",
    "cancellationReason": "Changed my mind about the order",
    "totalAmount": 188.78
  },
  "message": "Order cancelled successfully"
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "statusCode": 400,
  "data": null,
  "message": "Order cannot be cancelled as it is shipped"
}
```

**Status Codes:**
- `200` - Order cancelled successfully
- `400` - Order cannot be cancelled (already shipped/delivered)
- `401` - Not authenticated
- `403` - Not authorized to cancel order
- `404` - Order not found

---

## Admin APIs

### 1. Get All Orders (Admin)

**Endpoint:** `GET /api/orders/admin/orders`

**Authentication Required:** Yes - Admin Role

**Description:** Get all orders with optional filters (Admin only)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | Integer | No | Page number (default: 1) |
| `limit` | Integer | No | Items per page (default: 20) |
| `status` | String | No | Filter by order status |
| `paymentStatus` | String | No | Filter by payment status |

**Request Headers:**

```
Authorization: Bearer <adminAccessToken>
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "orders": [
      {
        "_id": "507f1f77bcf86cd799439030",
        "user": {
          "_id": "507f1f77bcf86cd799439013",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        },
        "orderStatus": "pending",
        "paymentStatus": "pending",
        "totalAmount": 188.78,
        "createdAt": "2024-01-14T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  },
  "message": "Orders fetched successfully"
}
```

**Example Requests:**

```bash
# Get all orders
GET /api/orders/admin/orders

# Filter by status
GET /api/orders/admin/orders?status=pending

# Filter by payment status
GET /api/orders/admin/orders?paymentStatus=completed

# Combined filters with pagination
GET /api/orders/admin/orders?page=2&limit=25&status=shipped&paymentStatus=completed
```

**Status Codes:**
- `200` - Orders fetched successfully
- `401` - Not authenticated
- `403` - Not admin

---

### 2. Update Order Status (Admin)

**Endpoint:** `PUT /api/orders/admin/orders/:id/status`

**Authentication Required:** Yes - Admin Role

**Description:** Update order status (Admin only)

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | Order ID |

**Request Headers:**

```
Authorization: Bearer <adminAccessToken>
```

**Request Body:**

```json
{
  "status": "shipped",
  "note": "Order has been dispatched from warehouse"
}
```

**Allowed Status Values:**
- `pending` - Order received, awaiting confirmation
- `confirmed` - Order confirmed by admin
- `processing` - Order being prepared
- `shipped` - Order shipped to customer
- `delivered` - Order delivered
- `cancelled` - Order cancelled

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "_id": "507f1f77bcf86cd799439030",
    "orderStatus": "shipped",
    "paymentStatus": "completed",
    "statusHistory": [
      {
        "status": "pending",
        "changedAt": "2024-01-14T10:30:00Z"
      },
      {
        "status": "confirmed",
        "changedAt": "2024-01-14T10:35:00Z"
      },
      {
        "status": "processing",
        "changedAt": "2024-01-14T11:00:00Z"
      },
      {
        "status": "shipped",
        "changedAt": "2024-01-14T14:00:00Z",
        "note": "Order has been dispatched from warehouse"
      }
    ]
  },
  "message": "Order status updated successfully"
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "statusCode": 400,
  "data": null,
  "message": "Invalid status"
}
```

**Status Codes:**
- `200` - Status updated successfully
- `400` - Invalid status
- `401` - Not authenticated
- `403` - Not admin
- `404` - Order not found

---

### 3. Get Dashboard Analytics (Admin)

**Endpoint:** `GET /api/orders/admin/analytics/dashboard`

**Authentication Required:** Yes - Admin Role

**Description:** Get dashboard analytics and business metrics (Admin only)

**Request Headers:**

```
Authorization: Bearer <adminAccessToken>
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "totalOrders": 156,
    "ordersToday": 8,
    "pendingOrders": 12,
    "totalRevenue": 45230.50,
    "monthRevenue": 12540.75,
    "recentOrders": [
      {
        "_id": "507f1f77bcf86cd799439030",
        "user": {
          "firstName": "John",
          "lastName": "Doe"
        },
        "totalAmount": 188.78,
        "orderStatus": "delivered",
        "createdAt": "2024-01-14T10:30:00Z"
      }
    ],
    "ordersByStatus": [
      {
        "_id": "pending",
        "count": 12
      },
      {
        "_id": "confirmed",
        "count": 8
      },
      {
        "_id": "processing",
        "count": 5
      },
      {
        "_id": "shipped",
        "count": 15
      },
      {
        "_id": "delivered",
        "count": 110
      },
      {
        "_id": "cancelled",
        "count": 6
      }
    ]
  },
  "message": "Dashboard analytics fetched successfully"
}
```

**Status Codes:**
- `200` - Analytics fetched successfully
- `401` - Not authenticated
- `403` - Not admin

---

## Status Codes

| Code | Status | Description |
|------|--------|-------------|
| `200` | OK | Request succeeded |
| `201` | Created | Resource created successfully |
| `400` | Bad Request | Invalid request data or parameters |
| `401` | Unauthorized | Authentication required or invalid token |
| `403` | Forbidden | User lacks necessary permissions |
| `404` | Not Found | Resource not found |
| `500` | Internal Server Error | Server error occurred |

---

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "statusCode": 400,
  "data": null,
  "message": "Error description"
}
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Not authorized to access this route` | Missing or invalid token | Include valid Bearer token in Authorization header |
| `User already exists with this email` | Email already registered | Use different email or login |
| `Invalid email or password` | Wrong credentials | Verify email and password |
| `Product not found` | Invalid product ID | Use valid product ID |
| `Insufficient stock` | Not enough inventory | Reduce quantity or choose different option |
| `Cart is empty` | No items in cart | Add items to cart before creating order |
| `Category with sub-categories cannot be deleted` | Category has children | Delete sub-categories first |

---

## Authentication

All protected endpoints require an `Authorization` header with a Bearer token:

```
Authorization: Bearer <accessToken>
```

### How to Get Tokens

1. **Register or Login** to get `accessToken` and `refreshToken`
2. **Use accessToken** for API requests
3. **Use refreshToken** to get a new accessToken when it expires

### Token Refresh Flow

```
Client sends refreshToken → Server validates → Server returns new accessToken
```

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Limit:** 100 requests per 15 minutes per IP address
- **Headers:** Rate limit information is included in response headers
- **Error:** Returns `429 Too Many Requests` when limit exceeded

---

## CORS

API supports Cross-Origin Resource Sharing (CORS) from configured origins:

- Client application
- Admin application
- Super admin application

---

## Example Usage

### cURL Examples

**Register User:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890"
  }'
```

**Get Products with Filters:**
```bash
curl -X GET "http://localhost:5000/api/products?page=1&limit=10&brand=Nike&sort=price-low" \
  -H "Accept: application/json"
```

**Add Item to Cart:**
```bash
curl -X POST http://localhost:5000/api/cart/items \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "507f1f77bcf86cd799439011",
    "quantity": 2,
    "size": "M",
    "color": "Red"
  }'
```

**Create Order:**
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddressId": "507f1f77bcf86cd799439012",
    "paymentMethod": "card"
  }'
```

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- All IDs are MongoDB ObjectIds
- Pagination is 1-indexed (first page is 1, not 0)
- Empty/null fields may be omitted from responses
- File uploads are handled via multipart/form-data
- Images are stored on Cloudinary
