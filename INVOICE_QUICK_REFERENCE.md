# Invoice System Quick Reference

## API Endpoints Summary

### User Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders/:id/invoice` | Get invoice details |
| GET | `/api/orders/:id/invoice/download` | Download invoice PDF |
| GET | `/api/orders/:id/invoice/view` | View invoice in browser |
| POST | `/api/orders/:id/invoice/email` | Email invoice to customer |
| POST | `/api/orders/:id/invoice/generate` | Manually generate invoice |

### Admin Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders/:id/invoice/regenerate` | Regenerate invoice |
| POST | `/api/orders/invoices/bulk-download` | Bulk download as ZIP |

## Quick Setup

### 1. Install Packages
```bash
npm install pdfkit qrcode archiver
```

### 2. Configure Company Settings
```javascript
PUT /api/superadmin/settings
{
  "company": {
    "name": "Your Company Name",
    "address": "Complete Address",
    "state": "Maharashtra",
    "gstNumber": "27AAAAA0000A1Z5",
    "pan": "AAAAA0000A"
  },
  "tax": {
    "gstRate": 18,
    "gstEnabled": true
  }
}
```

### 3. Add HSN Codes to Products
```javascript
PUT /api/products/:id
{
  "hsnCode": "62059090"
}
```

### 4. Invoice Generated Automatically
When order status → "delivered"

## GST Rules

### Intrastate (Same State)
- CGST: 9% (half of 18%)
- SGST: 9% (half of 18%)

### Interstate (Different States)
- IGST: 18%

## Invoice Format

```
INV/YYYY/MM/XXXXXX
Example: INV/2026/01/000001
```

## Common Tasks

### Download Invoice (Frontend)
```javascript
const downloadInvoice = async (orderId) => {
  const response = await fetch(`/api/orders/${orderId}/invoice/download`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Invoice-${orderId}.pdf`;
  a.click();
};
```

### Email Invoice (Frontend)
```javascript
const emailInvoice = async (orderId, email) => {
  await fetch(`/api/orders/${orderId}/invoice/email`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  });
};
```

### Bulk Download (Admin)
```javascript
const bulkDownload = async (orderIds) => {
  const response = await fetch('/api/orders/invoices/bulk-download', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ orderIds })
  });
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoices-${Date.now()}.zip`;
  a.click();
};
```

## Files Created

✅ `/backend/services/invoiceGenerator.js` - Core PDF generation
✅ `/backend/utils/invoiceHelpers.js` - Helper functions
✅ `/backend/controllers/invoiceController.js` - API controllers
✅ `/backend/utils/invoiceEmailService.js` - Email integration
✅ `/backend/routes/orderRoutes.js` - API routes (updated)
✅ `/backend/models/Order.js` - Invoice field (added)
✅ `/backend/models/Settings.js` - Company & tax config (added)
✅ `/backend/models/Product.js` - HSN code field (added)
✅ `/backend/invoices/` - Invoice storage directory

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Invoice not generating | Check order status, company settings configured |
| PDF empty/corrupt | Verify PDFKit installation, check logs |
| Email not sending | Configure SMTP settings in .env |
| Wrong tax calculation | Verify company state and customer state |
| Download fails | Check file permissions on invoices directory |

## Next Steps

1. ✅ Configure company settings via Settings API
2. ✅ Add HSN codes to products
3. ⏳ Test invoice generation with sample order
4. ⏳ Integrate download button in user-webapp
5. ⏳ Add email invoice option in order details
6. ⏳ Create admin invoice management page
7. ⏳ Configure SMTP for email delivery

---

For detailed documentation, see: `INVOICE_SYSTEM_DOCUMENTATION.md`
