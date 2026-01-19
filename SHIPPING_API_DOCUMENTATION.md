# Shipping Tracking API Documentation

## Overview
Comprehensive backend API endpoints for shipping tracking system with support for multiple carriers, real-time location tracking, and delivery management.

## Base URL
```
/api/shipping
```

## Shipping Status Enum
- `pending` - Shipment created, awaiting pickup
- `picked_up` - Package picked up by carrier
- `in_transit` - Package in transit to destination
- `out_for_delivery` - Package out for delivery
- `delivered` - Package successfully delivered
- `failed` - Delivery attempt failed
- `returned` - Package returned to sender

## Supported Carriers
- `bluedart` - Blue Dart Express
- `delhivery` - Delhivery Logistics
- `dtdc` - DTDC Courier
- `fedex` - FedEx
- `aramex` - Aramex
- `other` - Other carriers

---

## API Endpoints

### 1. Create Shipping Entry
**Endpoint:** `POST /api/shipping/create`
**Access:** Admin only
**Description:** Create a new shipping entry for an order

**Request Body:**
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "carrier": "bluedart",
  "estimatedDeliveryDate": "2026-01-25T00:00:00.000Z",
  "currentLocation": "Mumbai Warehouse",
  "coordinates": {
    "latitude": 19.0760,
    "longitude": 72.8777
  },
  "shipmentDetails": {
    "weight": 2.5,
    "dimensions": {
      "length": 30,
      "width": 20,
      "height": 15,
      "unit": "cm"
    },
    "package_count": 1
  },
  "notes": "Handle with care - Fragile items",
  "deliveryInstructions": "Call before delivery",
  "shippingCharge": 50
}
```

**Response:**
```json
{
  "success": true,
  "message": "Shipping entry created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "order": "507f1f77bcf86cd799439011",
    "trackingNumber": "BD17370824120001",
    "carrier": "bluedart",
    "status": "pending",
    "estimatedDeliveryDate": "2026-01-25T00:00:00.000Z",
    "currentLocation": {
      "location": "Mumbai Warehouse",
      "coordinates": {
        "latitude": 19.0760,
        "longitude": 72.8777
      },
      "updatedAt": "2026-01-19T00:00:00.000Z"
    },
    "locationHistory": [
      {
        "location": "Mumbai Warehouse",
        "status": "pending",
        "timestamp": "2026-01-19T00:00:00.000Z",
        "description": "Shipment created"
      }
    ],
    "createdAt": "2026-01-19T00:00:00.000Z",
    "updatedAt": "2026-01-19T00:00:00.000Z"
  }
}
```

---

### 2. Update Shipping Status
**Endpoint:** `PUT /api/shipping/:id/update`
**Access:** Admin only
**Description:** Update shipping status with location tracking

**Request Body:**
```json
{
  "status": "in_transit",
  "location": "Delhi Hub",
  "description": "Package in transit to destination city",
  "coordinates": {
    "latitude": 28.6139,
    "longitude": 77.2090
  }
}
```

**For Delivered Status:**
```json
{
  "status": "delivered",
  "location": "Customer Address",
  "description": "Package delivered successfully",
  "signature": "John Doe",
  "recipientName": "John Doe"
}
```

**For Failed Status:**
```json
{
  "status": "failed",
  "location": "Customer Address",
  "description": "Delivery attempt failed",
  "failureReason": "Customer not available"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Shipping status updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "trackingNumber": "BD17370824120001",
    "status": "in_transit",
    "currentLocation": {
      "location": "Delhi Hub",
      "coordinates": {
        "latitude": 28.6139,
        "longitude": 77.2090
      },
      "updatedAt": "2026-01-20T00:00:00.000Z"
    },
    "locationHistory": [
      {
        "location": "Mumbai Warehouse",
        "status": "pending",
        "timestamp": "2026-01-19T00:00:00.000Z",
        "description": "Shipment created"
      },
      {
        "location": "Delhi Hub",
        "status": "in_transit",
        "timestamp": "2026-01-20T00:00:00.000Z",
        "description": "Package in transit to destination city"
      }
    ]
  }
}
```

---

### 3. Get Shipping Details by Order ID
**Endpoint:** `GET /api/shipping/:orderId`
**Access:** User (own orders) or Admin
**Description:** Retrieve shipping information for a specific order

**Response:**
```json
{
  "success": true,
  "message": "Shipping details fetched successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "order": {
      "_id": "507f1f77bcf86cd799439011",
      "orderNumber": "ORD173708241200123",
      "totalAmount": 2499,
      "orderStatus": "shipped"
    },
    "trackingNumber": "BD17370824120001",
    "carrier": "bluedart",
    "status": "in_transit",
    "estimatedDeliveryDate": "2026-01-25T00:00:00.000Z",
    "currentLocation": {
      "location": "Delhi Hub",
      "updatedAt": "2026-01-20T00:00:00.000Z"
    },
    "locationHistory": [...],
    "isDelivered": false,
    "daysInTransit": 2,
    "estimatedDaysRemaining": 5
  }
}
```

---

### 4. Track by Tracking Number
**Endpoint:** `GET /api/shipping/track/:trackingNumber`
**Access:** Public
**Description:** Track shipment using tracking number

**Example:** `GET /api/shipping/track/BD17370824120001`

**Response:**
```json
{
  "success": true,
  "message": "Shipping tracking information fetched successfully",
  "data": {
    "trackingNumber": "BD17370824120001",
    "carrier": "bluedart",
    "status": "in_transit",
    "estimatedDeliveryDate": "2026-01-25T00:00:00.000Z",
    "currentLocation": {
      "location": "Delhi Hub",
      "updatedAt": "2026-01-20T00:00:00.000Z"
    },
    "locationHistory": [
      {
        "location": "Delhi Hub",
        "status": "in_transit",
        "timestamp": "2026-01-20T00:00:00.000Z",
        "description": "Package in transit"
      },
      {
        "location": "Mumbai Warehouse",
        "status": "picked_up",
        "timestamp": "2026-01-19T10:30:00.000Z",
        "description": "Package picked up"
      },
      {
        "location": "Mumbai Warehouse",
        "status": "pending",
        "timestamp": "2026-01-19T00:00:00.000Z",
        "description": "Shipment created"
      }
    ],
    "order": {
      "orderNumber": "ORD173708241200123",
      "totalAmount": 2499,
      "orderStatus": "shipped"
    }
  }
}
```

---

### 5. Update Current Location
**Endpoint:** `PUT /api/shipping/:id/location`
**Access:** Admin only
**Description:** Update current location without changing status

**Request Body:**
```json
{
  "location": "Bangalore Sorting Center",
  "coordinates": {
    "latitude": 12.9716,
    "longitude": 77.5946
  },
  "description": "Package arrived at sorting center"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Location updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "currentLocation": {
      "location": "Bangalore Sorting Center",
      "coordinates": {
        "latitude": 12.9716,
        "longitude": 77.5946
      },
      "updatedAt": "2026-01-21T00:00:00.000Z"
    }
  }
}
```

---

### 6. Get All Shipments by Carrier
**Endpoint:** `GET /api/shipping/carrier/:carrier`
**Access:** Admin only
**Description:** Retrieve all shipments for a specific carrier

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `status` (optional): Filter by status

**Example:** `GET /api/shipping/carrier/bluedart?status=in_transit&page=1&limit=20`

**Response:**
```json
{
  "success": true,
  "message": "Shipments fetched successfully",
  "data": {
    "shipments": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "trackingNumber": "BD17370824120001",
        "status": "in_transit",
        "currentLocation": {
          "location": "Delhi Hub"
        },
        "estimatedDeliveryDate": "2026-01-25T00:00:00.000Z",
        "order": {
          "orderNumber": "ORD173708241200123",
          "totalAmount": 2499
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

---

### 7. Get All Shipments (Admin)
**Endpoint:** `GET /api/shipping/admin/all`
**Access:** Admin only
**Description:** Get all shipments with advanced filtering

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): Filter by status
- `carrier` (optional): Filter by carrier
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date

**Example:** `GET /api/shipping/admin/all?status=delivered&carrier=bluedart&startDate=2026-01-01&endDate=2026-01-31`

**Response:**
```json
{
  "success": true,
  "message": "All shipments fetched successfully",
  "data": {
    "shipments": [...],
    "stats": [
      { "_id": "delivered", "count": 120 },
      { "_id": "in_transit", "count": 45 },
      { "_id": "pending", "count": 15 }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 180,
      "pages": 9
    }
  }
}
```

---

### 8. Get Shipping Statistics
**Endpoint:** `GET /api/shipping/admin/statistics`
**Access:** Admin only
**Description:** Get comprehensive shipping analytics

**Query Parameters:**
- `startDate` (optional): Start date for analytics
- `endDate` (optional): End date for analytics

**Example:** `GET /api/shipping/admin/statistics?startDate=2026-01-01&endDate=2026-01-31`

**Response:**
```json
{
  "success": true,
  "message": "Shipping statistics fetched successfully",
  "data": {
    "totalShipments": 180,
    "statusStats": [
      { "_id": "delivered", "count": 120 },
      { "_id": "in_transit", "count": 45 },
      { "_id": "pending", "count": 15 }
    ],
    "carrierStats": [
      { "_id": "bluedart", "count": 80 },
      { "_id": "delhivery", "count": 60 },
      { "_id": "dtdc", "count": 40 }
    ],
    "deliveryPerformance": {
      "onTime": 105,
      "delayed": 15,
      "total": 120
    },
    "avgDeliveryTime": 3.5
  }
}
```

---

### 9. Update Tracking Information
**Endpoint:** `PUT /api/shipping/:id/tracking`
**Access:** Admin only
**Description:** Update tracking number, carrier, or estimated delivery date

**Request Body:**
```json
{
  "trackingNumber": "BD17370824120002",
  "carrier": "delhivery",
  "estimatedDeliveryDate": "2026-01-28T00:00:00.000Z",
  "notes": "Updated tracking information"
}
```

---

### 10. Get Delivery Timeline
**Endpoint:** `GET /api/shipping/:id/timeline`
**Access:** User (own orders) or Admin
**Description:** Get detailed delivery timeline for a shipment

**Response:**
```json
{
  "success": true,
  "message": "Delivery timeline fetched successfully",
  "data": {
    "trackingNumber": "BD17370824120001",
    "status": "in_transit",
    "estimatedDeliveryDate": "2026-01-25T00:00:00.000Z",
    "timeline": [
      {
        "location": "Mumbai Warehouse",
        "status": "pending",
        "timestamp": "2026-01-19T00:00:00.000Z",
        "description": "Shipment created"
      },
      {
        "location": "Mumbai Warehouse",
        "status": "picked_up",
        "timestamp": "2026-01-19T10:30:00.000Z",
        "description": "Package picked up"
      },
      {
        "location": "Delhi Hub",
        "status": "in_transit",
        "timestamp": "2026-01-20T00:00:00.000Z",
        "description": "Package in transit"
      }
    ]
  }
}
```

---

### 11. Carrier Webhook
**Endpoint:** `POST /api/shipping/webhook/carrier-update`
**Access:** Public (should be secured with API key in production)
**Description:** Webhook endpoint for carrier status updates

**Request Body:**
```json
{
  "trackingNumber": "BD17370824120001",
  "status": "IN_TRANSIT",
  "location": "Delhi Hub",
  "timestamp": "2026-01-20T00:00:00.000Z",
  "description": "Package in transit"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation failed",
  "statusCode": 400,
  "errors": [
    {
      "field": "carrier",
      "message": "Carrier must be one of: bluedart, delhivery, dtdc, fedex, aramex, other"
    }
  ]
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Tracking number not found",
  "statusCode": 404
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Not authorized to view this shipping information",
  "statusCode": 403
}
```

---

## Model Schema

### Shipping Model Fields

```javascript
{
  order: ObjectId,                    // Reference to Order
  trackingNumber: String,             // Auto-generated unique tracking number
  carrier: String,                    // Carrier enum
  status: String,                     // Status enum
  currentLocation: {
    location: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    updatedAt: Date
  },
  locationHistory: [{
    location: String,
    status: String,
    timestamp: Date,
    description: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  }],
  recipientInfo: {
    name: String,
    phone: String,
    address: {
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    }
  },
  shipmentDetails: {
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: String
    },
    package_count: Number
  },
  estimatedDeliveryDate: Date,
  actualDeliveryDate: Date,
  pickupDate: Date,
  shippingCharge: Number,
  notes: String,
  deliveryInstructions: String,
  failureReason: String,
  returnReason: String,
  deliveryAttempts: Number,
  signature: String,
  recipientName: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Virtual Fields
- `isDelivered`: Boolean - Whether package is delivered
- `daysInTransit`: Number - Days since pickup
- `estimatedDaysRemaining`: Number - Days until estimated delivery
- `isDelayed`: Boolean - Whether delivery is delayed

---

## Indexes

The Shipping model includes optimized indexes for:
- Unique tracking number
- Order reference lookup
- Status and carrier queries
- Date range queries
- Full-text search on location and notes

---

## Usage Examples

### Create Shipping for an Order
```javascript
const response = await fetch('/api/shipping/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <admin-token>'
  },
  body: JSON.stringify({
    orderId: '507f1f77bcf86cd799439011',
    carrier: 'bluedart',
    estimatedDeliveryDate: '2026-01-25'
  })
});
```

### Track Shipment (Public)
```javascript
const response = await fetch('/api/shipping/track/BD17370824120001');
const data = await response.json();
console.log(data.data.locationHistory);
```

### Update Location
```javascript
const response = await fetch('/api/shipping/507f1f77bcf86cd799439012/location', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <admin-token>'
  },
  body: JSON.stringify({
    location: 'Customer City Hub',
    description: 'Out for delivery'
  })
});
```

---

## Security & Validation

### Authentication
- Public routes: Track by tracking number
- User routes: Get shipping by order (own orders only)
- Admin routes: All management endpoints

### Validation
All endpoints include comprehensive Joi validation for:
- Required fields
- Data types
- Enum values
- String lengths
- Date formats
- Coordinate ranges

### Rate Limiting
- Standard API rate limiting applies
- Webhook endpoint may have separate limits

---

## Best Practices

1. **Status Updates**: Always update status with location for better tracking
2. **Coordinates**: Include GPS coordinates when available for accurate tracking
3. **Descriptions**: Provide meaningful descriptions for location history
4. **Error Handling**: Handle 404 for invalid tracking numbers gracefully
5. **Webhooks**: Secure webhook endpoints with API keys or signatures
6. **Date Handling**: Always use ISO 8601 format for dates
7. **Pagination**: Use pagination for large result sets
8. **Caching**: Consider caching tracking information for better performance

---

## File Structure

```
backend/
├── models/
│   └── Shipping.js              # Shipping model with schema and methods
├── controllers/
│   └── shippingController.js    # All shipping controller functions
├── routes/
│   └── shipping.js              # Shipping routes definition
├── validators/
│   └── shippingValidator.js     # Joi validation schemas
└── server.js                     # Routes registered as /api/shipping
```

---

## Notes

- Tracking numbers are auto-generated with carrier prefix
- Location history is automatically maintained
- Virtual fields provide computed values
- Indexes are optimized for common queries
- All dates stored in UTC
- Supports real-time location tracking with coordinates
- Compatible with webhook integrations from carriers
