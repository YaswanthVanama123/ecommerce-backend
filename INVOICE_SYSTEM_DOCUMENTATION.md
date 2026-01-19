# Professional Invoice Generation System - Documentation

## Overview

A comprehensive invoice generation system with GST compliance, professional PDF templates, automatic generation on delivery, email integration, and admin management features.

## Features Implemented

### 1. Backend Invoice Generation

#### Invoice Generator Service (`services/invoiceGenerator.js`)
- **PDF Generation**: Uses PDFKit to create professional invoices
- **GST Compliance**:
  - Automatic IGST/CGST/SGST calculation
  - Interstate vs Intrastate detection
  - GST number validation (format: 22AAAAA0000A1Z5)
  - HSN code support for products
- **Invoice Components**:
  - Company logo and branding
  - Company and customer details
  - Invoice number (format: INV/YYYY/MM/XXXXXX)
  - Order details and payment information
  - Itemized product list with HSN codes
  - Tax breakdown (CGST/SGST or IGST)
  - Payment details with transaction ID
  - Terms and conditions
  - QR code for invoice verification
  - Digital signature placeholder
  - Professional footer with return policy

#### Invoice Helpers (`utils/invoiceHelpers.js`)
- `sendInvoiceEmail()` - Email invoice to customer
- `regenerateInvoice()` - Regenerate existing invoice
- `getInvoiceStream()` - Get invoice file stream for download
- `bulkDownloadInvoices()` - Download multiple invoices
- `invoiceExists()` - Check if invoice exists
- `getInvoiceDetails()` - Get invoice metadata
- `deleteInvoice()` - Remove invoice file

### 2. Database Models Updated

#### Order Model Additions
```javascript
invoice: {
  invoiceNumber: {
    type: String,
    sparse: true,
    unique: true
  },
  generatedAt: Date,
  path: String
}
```

#### Settings Model Additions
```javascript
company: {
  name: String,
  address: String,
  city: String,
  state: String,
  zipCode: String,
  country: { type: String, default: 'India' },
  gstNumber: String,  // Validated format
  pan: String,         // Validated format
  cin: String,
  invoiceTerms: [String],
  returnPolicy: String,
  bankDetails: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    ifscCode: String,
    branch: String
  }
},
tax: {
  gstRate: { type: Number, default: 18, min: 0, max: 100 },
  gstEnabled: { type: Boolean, default: true },
  hsnCodeMandatory: { type: Boolean, default: false }
}
```

#### Product Model Additions
```javascript
hsnCode: {
  type: String,
  default: null,
  trim: true,
  validate: {
    validator: function(v) {
      if (!v) return true;
      return /^[0-9]{4,8}$/.test(v);
    },
    message: 'HSN code must be 4 to 8 digits'
  }
}
```

### 3. API Endpoints

#### User Invoice Endpoints

**Get Invoice Details**
```
GET /api/orders/:id/invoice
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "invoiceNumber": "INV/2026/01/000001",
    "generatedAt": "2026-01-19T05:30:00.000Z",
    "orderNumber": "ORD1737265800001",
    "totalAmount": 15999.00,
    "exists": true
  }
}
```

**Download Invoice**
```
GET /api/orders/:id/invoice/download
Authorization: Bearer <token>

Response: PDF file (attachment)
```

**View Invoice**
```
GET /api/orders/:id/invoice/view
Authorization: Bearer <token>

Response: PDF file (inline)
```

**Email Invoice**
```
POST /api/orders/:id/invoice/email
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "customer@example.com"  // Optional, defaults to order user email
}

Response:
{
  "success": true,
  "message": "Invoice email sent successfully"
}
```

**Generate Invoice Manually**
```
POST /api/orders/:id/invoice/generate
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Invoice generated successfully",
  "data": {
    "invoiceNumber": "INV/2026/01/000001",
    "orderNumber": "ORD1737265800001"
  }
}
```

#### Admin Invoice Endpoints

**Regenerate Invoice**
```
POST /api/orders/:id/invoice/regenerate
Authorization: Bearer <admin-token>

Response:
{
  "success": true,
  "message": "Invoice regenerated successfully",
  "data": {
    "invoiceNumber": "INV/2026/01/000001"
  }
}
```

**Bulk Download Invoices**
```
POST /api/orders/invoices/bulk-download
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "orderIds": ["order_id_1", "order_id_2", "order_id_3"]
}

Response: ZIP file containing all invoices
```

### 4. Invoice Template Design

#### Professional Features
- **Header**: Company logo, "TAX INVOICE" title, original/duplicate marker
- **Company Details**: Name, address, GST number, PAN, email, phone
- **Customer Details**: Billing and shipping address, phone, email
- **Invoice Info**: Invoice number, date, order number, payment details
- **Items Table**:
  - Product name
  - HSN code
  - Quantity
  - Unit price
  - Discount
  - Total amount
- **Tax Breakdown**:
  - Subtotal
  - Discount
  - Taxable amount
  - CGST + SGST (intrastate) OR IGST (interstate)
  - Shipping charges
  - **Total Amount** (highlighted)
- **Payment Details**: Method, status, transaction ID, payment date
- **Terms & Conditions**: Customizable from settings
- **QR Code**: For invoice verification
- **Footer**: Auto-generated timestamp, return policy

### 5. Tax Compliance

#### GST Calculation
- **Intrastate Sales** (Same State):
  - CGST: 9% (half of 18%)
  - SGST: 9% (half of 18%)

- **Interstate Sales** (Different States):
  - IGST: 18%

#### State Detection
Uses Indian state codes for automatic interstate/intrastate detection:
```javascript
INDIAN_STATES = {
  'Maharashtra': '27',
  'Delhi': '07',
  'Karnataka': '29',
  // ... all 36 states/UTs
}
```

#### GST Number Validation
Format: `22AAAAA0000A1Z5`
- 2 digits: State code
- 5 letters: PAN first 5 characters
- 4 digits: PAN next 4 characters
- 1 letter: PAN last character
- 1 alphanumeric: Entity number
- 1 letter: Z (default)
- 1 alphanumeric: Checksum

#### HSN Code
- 4-8 digit product classification code
- Mandatory for GST compliance
- Stored in Product model

### 6. Automatic Invoice Generation

Invoices are automatically generated when:
1. Order status changes to "delivered"
2. Can be manually triggered via API endpoint
3. Auto-generated during order confirmation email (if configured)

Implementation in order controller:
```javascript
import { autoGenerateInvoice } from '../services/invoiceGenerator.js';

// In updateOrderStatus function
if (newStatus === 'delivered') {
  await autoGenerateInvoice(orderId);
}
```

### 7. Email Integration

#### Order Delivered Email with Invoice
```javascript
import { sendOrderDeliveredWithInvoice } from '../utils/invoiceEmailService.js';

// When order is delivered
await sendOrderDeliveredWithInvoice(customerEmail, {
  orderNumber: 'ORD123',
  deliveredAt: new Date(),
  totalAmount: 15999,
  invoice: {
    invoiceNumber: 'INV/2026/01/000001',
    path: '/path/to/invoice.pdf'
  }
});
```

### 8. File Storage

**Directory Structure**:
```
backend/
├── invoices/
│   ├── ORD1737265800001.pdf
│   ├── ORD1737265800002.pdf
│   └── ...
├── services/
│   └── invoiceGenerator.js
├── utils/
│   ├── invoiceHelpers.js
│   └── invoiceEmailService.js
└── controllers/
    └── invoiceController.js
```

**Invoice Filename**: `{orderNumber}.pdf`
**Storage Path**: `backend/invoices/`

### 9. Admin Management Features

1. **Regenerate Invoice**: Update invoice if order details change
2. **Bulk Download**: Download multiple invoices as ZIP
3. **Send via Email**: Resend invoice to customer
4. **Invoice Customization**: Configure company details, tax rates, terms
5. **Invoice Preview**: View before sending

### 10. Configuration

#### Environment Variables
Add to `.env`:
```env
# Email Configuration (for invoice sending)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourcompany.com

# Company Settings (can also be set via Settings API)
COMPANY_NAME=Your Company Name
COMPANY_GST=22AAAAA0000A1Z5
COMPANY_PAN=AAAAA0000A
```

#### Settings Configuration
Use the Settings API to configure:

```javascript
PUT /api/superadmin/settings
{
  "company": {
    "name": "ABC Enterprises Pvt Ltd",
    "address": "123 Business Park, MG Road",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zipCode": "400001",
    "country": "India",
    "gstNumber": "27AAAAA0000A1Z5",
    "pan": "AAAAA0000A",
    "invoiceTerms": [
      "Goods once sold will not be taken back or exchanged",
      "All disputes are subject to jurisdiction only",
      "Warranty as per manufacturer terms"
    ],
    "returnPolicy": "7 days return policy applicable"
  },
  "tax": {
    "gstRate": 18,
    "gstEnabled": true,
    "hsnCodeMandatory": false
  }
}
```

## Usage Examples

### User Flow

1. **Place Order**
   ```
   POST /api/orders
   ```

2. **Order Gets Delivered**
   - Invoice automatically generated
   - Email sent with invoice attachment

3. **View Invoice**
   ```
   GET /api/orders/:id/invoice/view
   ```

4. **Download Invoice**
   ```
   GET /api/orders/:id/invoice/download
   ```

5. **Email Invoice to Someone**
   ```
   POST /api/orders/:id/invoice/email
   { "email": "accountant@company.com" }
   ```

### Admin Flow

1. **View Order**
   ```
   GET /api/orders/:id
   ```

2. **Regenerate Invoice** (if needed)
   ```
   POST /api/orders/:id/invoice/regenerate
   ```

3. **Bulk Download** (for accounting)
   ```
   POST /api/orders/invoices/bulk-download
   { "orderIds": ["id1", "id2", "id3"] }
   ```

4. **Configure Invoice Settings**
   ```
   PUT /api/superadmin/settings
   { company: {...}, tax: {...} }
   ```

## Frontend Integration (Next Steps)

### 1. Order Details Page
Add invoice actions:
```jsx
<div className="invoice-actions">
  <button onClick={downloadInvoice}>
    <Download /> Download Invoice
  </button>
  <button onClick={viewInvoice}>
    <Eye /> View Invoice
  </button>
  <button onClick={emailInvoice}>
    <Mail /> Email Invoice
  </button>
</div>
```

### 2. Admin Order Management
Add admin invoice features:
```jsx
<div className="admin-invoice-actions">
  <button onClick={regenerateInvoice}>
    <RefreshCw /> Regenerate Invoice
  </button>
  <button onClick={sendInvoiceEmail}>
    <Send /> Send via Email
  </button>
</div>

<button onClick={bulkDownloadInvoices}>
  <Download /> Bulk Download Selected
</button>
```

### 3. Settings Page
Add company and tax configuration:
```jsx
<form onSubmit={saveCompanySettings}>
  <input name="company.name" placeholder="Company Name" />
  <input name="company.gstNumber" placeholder="GST Number" />
  <input name="company.pan" placeholder="PAN Number" />
  <input name="tax.gstRate" type="number" placeholder="GST Rate %" />
  {/* ... more fields */}
</form>
```

## Testing

### 1. Test Invoice Generation
```bash
# Generate test invoice
curl -X POST http://localhost:5000/api/orders/{orderId}/invoice/generate \
  -H "Authorization: Bearer {token}"
```

### 2. Test Download
```bash
# Download invoice
curl -X GET http://localhost:5000/api/orders/{orderId}/invoice/download \
  -H "Authorization: Bearer {token}" \
  -o invoice.pdf
```

### 3. Test Email
```bash
# Send invoice via email
curl -X POST http://localhost:5000/api/orders/{orderId}/invoice/email \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## Security Considerations

1. **Authorization**: All invoice endpoints check order ownership or admin role
2. **File Access**: Invoices stored in protected directory (not publicly accessible)
3. **GST Validation**: Format validation prevents invalid GST numbers
4. **XSS Prevention**: All data sanitized before PDF generation
5. **Rate Limiting**: API endpoints protected by rate limiters

## Performance Optimization

1. **Lazy Generation**: Invoices generated on-demand or on delivery
2. **File Caching**: Once generated, PDF is reused for subsequent downloads
3. **Stream Response**: Large files streamed instead of loaded into memory
4. **Bulk Operations**: ZIP compression for bulk downloads

## Troubleshooting

### Invoice Not Generating
- Check order status (must be confirmed/delivered)
- Verify company settings are configured
- Check file permissions on invoices directory
- Review logs for PDF generation errors

### Email Not Sending
- Verify SMTP configuration in .env
- Check email service credentials
- Ensure invoice PDF exists before sending
- Review email service logs

### GST Calculation Issues
- Verify company state in settings
- Check customer shipping state
- Ensure GST rate is configured (default: 18%)
- Validate state codes in INDIAN_STATES

## Future Enhancements

1. **Multi-Currency Support**: USD, EUR, GBP invoices
2. **Invoice Templates**: Multiple template designs
3. **Credit Notes**: Generate credit notes for returns
4. **Proforma Invoices**: Generate before order confirmation
5. **Invoice Analytics**: Revenue reports, tax summaries
6. **Digital Signatures**: PKI-based digital signatures
7. **E-Invoice Integration**: Government e-invoice portal integration
8. **Multi-Language**: Invoices in regional languages

## Dependencies

```json
{
  "pdfkit": "^0.15.0",
  "qrcode": "^1.5.4",
  "archiver": "^7.0.1",
  "nodemailer": "^7.0.12"
}
```

## File Locations

- Invoice Generator: `/backend/services/invoiceGenerator.js`
- Invoice Helpers: `/backend/utils/invoiceHelpers.js`
- Invoice Controller: `/backend/controllers/invoiceController.js`
- Invoice Email Service: `/backend/utils/invoiceEmailService.js`
- Invoice Routes: `/backend/routes/orderRoutes.js` (lines 78-91)
- Order Model: `/backend/models/Order.js` (invoice field added)
- Settings Model: `/backend/models/Settings.js` (company & tax fields added)
- Product Model: `/backend/models/Product.js` (hsnCode field added)
- Invoices Storage: `/backend/invoices/`

## Support

For issues or questions, please refer to:
- API Documentation: `/api-docs`
- Backend README: `/backend/README.md`
- Email Service Documentation: `/backend/utils/emailService.js`

---

**Created**: January 19, 2026
**Version**: 1.0.0
**Author**: Claude Code Assistant
