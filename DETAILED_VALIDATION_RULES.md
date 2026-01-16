# Detailed Validation Rules Reference

## Complete Validation Rules Specification

### Authentication Validators

#### Register Endpoint
```
Field: email
- Type: String
- Required: Yes
- Format: Valid email
- Actions: Lowercase, Trim
- Max Length: No limit
- Min Length: N/A
- Pattern: RFC email format

Field: password
- Type: String
- Required: Yes
- Format: Strong (uppercase, lowercase, number, special char)
- Min Length: 8 characters
- Max Length: 50 characters
- Pattern: ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$
- Complexity: Must contain:
  * At least 1 uppercase letter (A-Z)
  * At least 1 lowercase letter (a-z)
  * At least 1 digit (0-9)
  * At least 1 special character (@$!%*?&)

Field: firstName
- Type: String
- Required: Yes
- Min Length: 2 characters
- Max Length: 50 characters
- Actions: Trim

Field: lastName
- Type: String
- Required: Yes
- Min Length: 2 characters
- Max Length: 50 characters
- Actions: Trim

Field: phone
- Type: String
- Required: No
- Format: Phone number (10-15 digits, optional +)
- Pattern: ^\+?[1-9]\d{1,14}$
- Example Formats:
  * 9876543210 (10 digits)
  * +919876543210 (with country code)
  * +1234567890123 (up to 15 digits)
```

#### Login Endpoint
```
Field: email
- Type: String
- Required: Yes
- Format: Valid email
- Actions: Lowercase, Trim

Field: password
- Type: String
- Required: Yes
- No format checking at validation level
- (Actual verification happens in controller)
```

#### Refresh Token Endpoint
```
Field: refreshToken
- Type: String
- Required: Yes
- Actions: Trim
- Must be non-empty after trimming
```

### Product Validators

#### Create Product Endpoint
```
Field: name
- Type: String
- Required: Yes
- Min Length: 3 characters
- Max Length: 200 characters
- Actions: Trim
- Example: "Premium Wireless Headphones"

Field: description
- Type: String
- Required: No
- Min Length: 10 characters (if provided)
- Max Length: 5000 characters
- Actions: Trim

Field: category
- Type: String (MongoDB ObjectId)
- Required: Yes
- Format: 24-character hexadecimal
- Pattern: ^[0-9a-fA-F]{24}$
- Actions: Trim

Field: subCategory
- Type: String
- Required: No
- Actions: Trim

Field: brand
- Type: String
- Required: No
- Max Length: 100 characters
- Actions: Trim

Field: price
- Type: Number
- Required: Yes
- Must be: Positive
- Decimal Places: 2 (precision)
- Min Value: > 0
- Example: 1999.99

Field: discountPrice
- Type: Number
- Required: No
- Must be: Positive (if provided)
- Decimal Places: 2 (precision)
- Constraint: Must be <= price
- Example: 1499.99

Field: images
- Type: Array[String]
- Required: No
- Format: Each element must be valid URI
- Example: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]

Field: sizes
- Type: Array[String]
- Required: No
- Each item Max Length: 50 characters
- Example: ["S", "M", "L", "XL", "XXL"]

Field: colors
- Type: Array[Object]
- Required: No
- Object Structure:
  * name: String, Required, Max 50 chars
  * code: String, Optional, Hex color format (#RRGGBB)
  * code Pattern: ^#[0-9A-F]{6}$/i
- Example: [
    {"name": "Red", "code": "#FF0000"},
    {"name": "Blue", "code": "#0000FF"}
  ]

Field: stock
- Type: Array[Object]
- Required: No
- Object Structure:
  * size: String, Optional, Max 50 chars
  * color: String, Optional, Max 50 chars
  * quantity: Number, Required, Integer, Min 0
- Example: [
    {"size": "M", "color": "Red", "quantity": 50},
    {"size": "L", "color": "Blue", "quantity": 30}
  ]

Field: tags
- Type: Array[String]
- Required: No
- Max Items: 10 tags
- Each item Max Length: 50 characters
- Example: ["electronics", "audio", "wireless", "new"]

Field: isFeatured
- Type: Boolean
- Required: No
- Default: false

Field: isActive
- Type: Boolean
- Required: No
- Default: true
```

#### Update Product Endpoint
```
All fields same as Create Product, but:
- Constraint: At least ONE field must be provided
- discountPrice constraint: If both provided, must be <= price
- All fields optional individually

If no fields provided: Error 400 "At least one field must be provided for update"
```

#### Get Products Query Parameters
```
Field: page
- Type: Number
- Required: No
- Default: 1
- Min Value: 1
- Must be: Integer

Field: limit
- Type: Number
- Required: No
- Default: 20
- Min Value: 1
- Max Value: 100
- Must be: Integer

Field: category
- Type: String
- Required: No
- Actions: Trim
- Used as filter

Field: minPrice
- Type: Number
- Required: No
- Must be: Positive
- Used in filter: price >= minPrice

Field: maxPrice
- Type: Number
- Required: No
- Must be: Positive
- Used in filter: price <= maxPrice

Field: brand
- Type: String
- Required: No
- Actions: Trim
- Used as filter

Field: size
- Type: String
- Required: No
- Actions: Trim
- Used as filter

Field: color
- Type: String
- Required: No
- Actions: Trim
- Used as filter (case-insensitive regex)

Field: search
- Type: String
- Required: No
- Max Length: 200 characters
- Actions: Trim
- Used in text search

Field: sort
- Type: String (Enum)
- Required: No
- Valid Values: "price-low", "price-high", "rating", "newest"
- Default: "newest"
```

#### Add Product Review Endpoint
```
Field: rating
- Type: Number
- Required: Yes
- Must be: Integer
- Min Value: 1
- Max Value: 5
- Example: 4

Field: comment
- Type: String
- Required: Yes
- Min Length: 5 characters
- Max Length: 1000 characters
- Actions: Trim
```

### Category Validators

#### Create Category Endpoint
```
Field: name
- Type: String
- Required: Yes
- Min Length: 3 characters
- Max Length: 100 characters
- Actions: Trim

Field: description
- Type: String
- Required: No
- Min Length: 5 characters (if provided)
- Max Length: 1000 characters
- Actions: Trim

Field: image
- Type: String
- Required: No
- Format: Valid URI
- Example: "https://example.com/category.jpg"

Field: parentCategory
- Type: String (MongoDB ObjectId) or Null
- Required: No
- Format: 24-character hexadecimal
- Can be: null (for top-level categories)
- Pattern: ^[0-9a-fA-F]{24}$

Field: order
- Type: Number
- Required: No
- Default: 0
- Min Value: 0
- Must be: Integer
```

#### Update Category Endpoint
```
All fields same as Create Category, but:
- Constraint: At least ONE field must be provided
- All fields optional individually

If no fields provided: Error 400 "At least one field must be provided for update"
```

### Order Validators

#### Create Order Endpoint
```
Field: shippingAddressId
- Type: String (MongoDB ObjectId)
- Required: Yes
- Format: 24-character hexadecimal
- Pattern: ^[0-9a-fA-F]{24}$

Field: paymentMethod
- Type: String (Enum)
- Required: Yes
- Valid Values: "COD", "UPI", "CARD", "NETBANKING", "WALLET"
- Default: None
```

#### Cancel Order Endpoint
```
Field: reason
- Type: String
- Required: No
- Min Length: 5 characters (if provided)
- Max Length: 500 characters
- Actions: Trim
- Example: "Changed my mind about the purchase"
```

#### Update Order Status Endpoint (Admin)
```
Field: status
- Type: String (Enum)
- Required: Yes
- Valid Values: "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"

Field: note
- Type: String
- Required: No
- Min Length: 3 characters (if provided)
- Max Length: 500 characters
- Actions: Trim
- Example: "Order shipped via FedEx on 2024-01-14"
```

#### Get Orders Query Parameters
```
Field: page
- Type: Number
- Required: No
- Default: 1
- Min Value: 1
- Must be: Integer

Field: limit
- Type: Number
- Required: No
- Default: 10
- Min Value: 1
- Max Value: 100
- Must be: Integer
```

#### Get All Orders Query Parameters (Admin)
```
Field: page
- Type: Number
- Required: No
- Default: 1
- Min Value: 1
- Must be: Integer

Field: limit
- Type: Number
- Required: No
- Default: 20
- Min Value: 1
- Max Value: 100
- Must be: Integer

Field: status
- Type: String (Enum)
- Required: No
- Valid Values: "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"
- Used as filter

Field: paymentStatus
- Type: String (Enum)
- Required: No
- Valid Values: "pending", "completed", "failed", "refunded"
- Used as filter
```

### Cart Validators

#### Add to Cart Endpoint
```
Field: productId
- Type: String (MongoDB ObjectId)
- Required: Yes
- Format: 24-character hexadecimal
- Pattern: ^[0-9a-fA-F]{24}$

Field: quantity
- Type: Number
- Required: Yes
- Must be: Integer
- Min Value: 1
- Max Value: 999
- Example: 2

Field: size
- Type: String
- Required: No
- Max Length: 50 characters
- Actions: Trim
- Example: "L"

Field: color
- Type: String
- Required: No
- Max Length: 50 characters
- Actions: Trim
- Example: "Red"
```

#### Update Cart Item Endpoint
```
Field: quantity
- Type: Number
- Required: Yes
- Must be: Integer
- Min Value: 1
- Max Value: 999
```

### Common Validation Patterns

#### MongoDB ObjectId Pattern
```
Pattern: ^[0-9a-fA-F]{24}$
Examples of valid IDs:
- 60d5ec49c1234567890abcde
- 5f9d5e6c3b8c1a2d3e4f5a6b

Examples of invalid IDs:
- invalid-id (not hexadecimal)
- 60d5ec49c123456789 (too short)
- 60d5ec49c1234567890abcde12 (too long)
```

#### Email Pattern
```
Valid formats:
- user@example.com
- john.doe@company.co.uk
- test+tag@domain.com

Invalid formats:
- user@
- @example.com
- user.example.com
- user @example.com (space)
```

#### Phone Number Pattern
```
Pattern: ^\+?[1-9]\d{1,14}$

Valid formats:
- 9876543210 (10 digits)
- +919876543210 (country code)
- +1234567890123 (15 digits max)

Invalid formats:
- 0123456789 (can't start with 0)
- 987654321 (less than 10 digits)
- +0123456789 (0 after plus)
- 01234567890123456 (more than 15 digits)
```

#### Hex Color Code Pattern
```
Pattern: ^#[0-9A-F]{6}$/i (case-insensitive)

Valid formats:
- #FF0000 (Red)
- #00ff00 (Green - lowercase)
- #0000FF (Blue)
- #ffffff (White)

Invalid formats:
- FF0000 (missing #)
- #F00 (too short)
- #FF000000 (too long)
- #GGGGGG (invalid hex)
```

#### Strong Password Pattern
```
Pattern: ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$

Requirements:
- Minimum 8 characters
- At least 1 uppercase (A-Z)
- At least 1 lowercase (a-z)
- At least 1 digit (0-9)
- At least 1 special (@$!%*?&)

Valid examples:
- Secure@Pass123
- MyP@ssw0rd
- Test!Pwd789
- Demo@123Pass

Invalid examples:
- password (no uppercase, digit, special)
- PASSWORD (no lowercase, digit, special)
- Pass123 (no special character)
- Pass@word (no digit)
- Pass1 (too short, no special)
```

### Validation Rules Summary Table

| Field Type | Min | Max | Pattern | Enum | Required |
|-----------|-----|-----|---------|------|----------|
| Email | - | - | RFC | - | Yes |
| Password | 8 | 50 | Strong | - | Yes |
| Name | 3 | 200 | - | - | Yes |
| Phone | 10 | 15 | Int'l | - | No |
| Price | 0 | - | Positive | - | Yes |
| Discount | 0 | price | <= price | - | No |
| Quantity | 1 | 999 | Integer | - | Yes |
| Rating | 1 | 5 | Integer | - | Yes |
| Comment | 5 | 1000 | - | - | Yes |
| Status | - | - | - | Enum | Yes |
| ObjectId | 24 | 24 | Hex | - | Yes |
| URL | - | - | URI | - | No |
| Boolean | - | - | - | - | No |

### Error Message Customizations

All validators include custom error messages:

```
Email errors:
- "Must be a valid email address"

Password errors:
- "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&)"
- "Password must be at least 8 characters"
- "Password must not exceed 50 characters"

Length errors:
- "{field} must be at least {limit} characters"
- "{field} must not exceed {limit} characters"

Number errors:
- "{field} must be a number"
- "{field} must be at least {limit}"
- "{field} must not exceed {limit}"

Required errors:
- "{field} is required"

Enum errors:
- "{field} must be one of: {options}"

Array errors:
- "{field} must be an array"
- "{field} must contain at least {limit} items"

Type errors:
- "{field} must be a {type}"
```

This comprehensive reference covers every validation rule in the system.
