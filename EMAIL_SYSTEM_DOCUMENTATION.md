# Email Template System - Complete Documentation

## Overview

StyleHub's email template system provides a comprehensive, professional, and mobile-responsive email solution for all customer and admin communications. The system includes 10 beautifully designed HTML templates with the signature StyleHub pink branding.

## File Structure

```
backend/
├── templates/                      # HTML email templates
│   ├── welcome.html               # User registration welcome email
│   ├── orderConfirmation.html    # Order placed confirmation
│   ├── orderShipped.html          # Order shipping notification
│   ├── orderDelivered.html        # Order delivery confirmation
│   ├── orderCancelled.html        # Order cancellation notification
│   ├── refundProcessed.html       # Refund confirmation
│   ├── passwordReset.html         # Password reset link
│   ├── invoice.html               # Order invoice
│   ├── lowStockAlert.html         # Admin low stock alert
│   └── returnRequest.html         # Return request confirmation
├── utils/
│   ├── emailService.js            # Enhanced email sending service
│   └── emailTemplates.js          # Template data preparation functions
├── controllers/
│   └── emailController.js         # Email management endpoints
└── routes/
    └── emailRoutes.js             # Email API routes
```

## Features

### 1. Professional HTML Templates
- **Responsive Design**: All templates work perfectly on desktop, tablet, and mobile devices
- **StyleHub Branding**: Consistent pink gradient theme (#ec4899 to #be185d)
- **Inline CSS**: Full email client compatibility (Gmail, Outlook, Apple Mail, etc.)
- **Social Media Links**: Facebook, Instagram, Twitter, Pinterest integration
- **Unsubscribe Links**: GDPR-compliant unsubscribe functionality

### 2. Enhanced Email Service
- **Template Rendering**: Dynamic data injection into HTML templates
- **Attachment Support**: PDF invoices and other file attachments
- **Development Mode**: Console logging when EMAIL_USER is not configured
- **Error Handling**: Comprehensive error catching and logging
- **Multiple Providers**: Support for Gmail, SMTP, and other email services

### 3. Email Controller Features
- Test email configuration
- Send test emails with mock data
- Preview templates in browser
- Resend order emails
- Template listing

## Environment Variables

Add these to your `.env` file:

```env
# Email Configuration
EMAIL_SERVICE=gmail                    # or 'smtp' for custom SMTP
EMAIL_HOST=smtp.gmail.com              # SMTP host (if not using gmail)
EMAIL_PORT=587                         # SMTP port
EMAIL_SECURE=false                     # true for port 465, false for other ports
EMAIL_USER=your-email@gmail.com        # Sender email address
EMAIL_PASSWORD=your-app-password       # App password (not regular password)
EMAIL_FROM=StyleHub <noreply@stylehub.com>  # From name and address

# Frontend URLs
CLIENT_URL=http://localhost:5173       # User webapp URL
ADMIN_CLIENT_URL=http://localhost:5174 # Admin webapp URL
```

### Gmail Setup (Recommended for Development)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Use the generated password in `EMAIL_PASSWORD`

## API Endpoints

All endpoints require authentication. Admin-only endpoints require admin role.

### Test Configuration
```
GET /api/email/test-config
Authorization: Bearer <token>
Role: Admin

Response:
{
  "success": true,
  "message": "Email configuration is valid"
}
```

### Send Test Email
```
POST /api/email/send-test
Authorization: Bearer <token>
Role: Admin

Body:
{
  "email": "recipient@example.com",
  "templateType": "welcome"  // or orderConfirmation, orderShipped, etc.
}

Response:
{
  "success": true,
  "message": "Test welcome email sent successfully to recipient@example.com"
}
```

### Preview Template
```
POST /api/email/preview
Authorization: Bearer <token>
Role: Admin

Body:
{
  "templateType": "orderConfirmation",
  "orderId": "optional-order-id",
  "userId": "optional-user-id"
}

Response: HTML content of the email (opens in browser)
```

### Resend Order Confirmation
```
POST /api/email/resend-order-confirmation
Authorization: Bearer <token>

Body:
{
  "orderId": "order-id-here"
}

Response:
{
  "success": true,
  "message": "Order confirmation email resent to user@example.com"
}
```

### Get Templates List
```
GET /api/email/templates
Authorization: Bearer <token>
Role: Admin

Response:
{
  "success": true,
  "templates": [
    {
      "id": "welcome",
      "name": "Welcome Email",
      "description": "Sent to new users upon registration"
    },
    ...
  ]
}
```

## Integration Guide

### 1. User Registration (authController.js)

```javascript
import { sendWelcomeEmail } from '../utils/emailService.js';

// After user creation
const user = await User.create({ email, password, firstName, lastName });

// Send welcome email (non-blocking)
sendWelcomeEmail(user.email, user).catch(err =>
  console.error('Failed to send welcome email:', err)
);
```

### 2. Order Confirmation (orderController.js)

```javascript
import { sendOrderConfirmationEmail } from '../utils/emailService.js';

// After order creation
const order = await Order.create(orderData);

// Send confirmation email
sendOrderConfirmationEmail(user.email, order, user).catch(err =>
  console.error('Failed to send order confirmation:', err)
);
```

### 3. Order Shipped

```javascript
import { sendOrderShippedEmail } from '../utils/emailService.js';

// When updating order status to 'shipped'
order.status = 'shipped';
order.trackingNumber = trackingNumber;
order.carrier = carrier;
await order.save();

// Send shipped email
sendOrderShippedEmail(user.email, order, user).catch(err =>
  console.error('Failed to send shipped email:', err)
);
```

### 4. Order Delivered

```javascript
import { sendOrderDeliveredEmail } from '../utils/emailService.js';

// When order is delivered
order.status = 'delivered';
order.deliveredAt = new Date();
await order.save();

// Send delivered email
sendOrderDeliveredEmail(user.email, order, user).catch(err =>
  console.error('Failed to send delivered email:', err)
);
```

### 5. Order Cancellation

```javascript
import { sendOrderCancellationEmail } from '../utils/emailService.js';

// When order is cancelled
order.status = 'cancelled';
await order.save();

// Send cancellation email
sendOrderCancellationEmail(user.email, order, user, cancellationReason).catch(err =>
  console.error('Failed to send cancellation email:', err)
);
```

### 6. Refund Processing

```javascript
import { sendRefundEmail } from '../utils/emailService.js';

// After processing refund
sendRefundEmail(user.email, order, user, refundAmount, refundReason).catch(err =>
  console.error('Failed to send refund email:', err)
);
```

### 7. Password Reset

```javascript
import { sendPasswordResetEmail } from '../utils/emailService.js';

// Generate reset token
const resetToken = generateResetToken();

// Send password reset email
sendPasswordResetEmail(user.email, user, resetToken).catch(err =>
  console.error('Failed to send password reset email:', err)
);
```

### 8. Invoice Email

```javascript
import { sendInvoiceEmail } from '../utils/emailService.js';

// After generating invoice
const invoiceNumber = `INV-${order.orderNumber}`;
const pdfPath = `/path/to/invoice-${invoiceNumber}.pdf`;

// Send invoice with PDF attachment
sendInvoiceEmail(user.email, order, user, invoiceNumber, pdfPath).catch(err =>
  console.error('Failed to send invoice email:', err)
);
```

### 9. Low Stock Alert

```javascript
import { sendLowStockAlert } from '../utils/emailService.js';

// Check stock levels
if (product.stock < product.lowStockThreshold) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@stylehub.com';

  sendLowStockAlert(adminEmail, product, product.stock).catch(err =>
    console.error('Failed to send low stock alert:', err)
  );
}
```

### 10. Return Request

```javascript
import { sendReturnRequestEmail } from '../utils/emailService.js';

// After return request creation
const returnRequest = await Return.create(returnData);

// Send return request confirmation
sendReturnRequestEmail(user.email, returnRequest, order, user).catch(err =>
  console.error('Failed to send return request email:', err)
);
```

## Template Customization

### Modifying Templates

Each HTML template in `/backend/templates/` uses placeholder syntax `{{variableName}}` for dynamic data:

```html
<h1>Welcome, {{userName}}!</h1>
<p>Your order {{orderNumber}} has been confirmed.</p>
<p>Total: {{totalAmount}}</p>
```

### Adding New Templates

1. Create new HTML file in `/backend/templates/`
2. Add data preparation function in `emailTemplates.js`:
```javascript
export const getYourTemplateData = (data) => {
  return {
    userName: data.name,
    customField: data.customField,
    currentYear: new Date().getFullYear()
  };
};
```

3. Add send function in `emailService.js`:
```javascript
export const sendYourEmail = async (email, data) => {
  try {
    const templateData = getYourTemplateData(data);
    const html = renderEmailTemplate('yourTemplate', templateData);

    await sendEmail({
      to: email,
      subject: 'Your Subject',
      html
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending your email:', error);
    throw error;
  }
};
```

## Testing

### Test Email Configuration
```bash
curl -X GET http://localhost:5000/api/email/test-config \
  -H "Authorization: Bearer <admin-token>"
```

### Send Test Email
```bash
curl -X POST http://localhost:5000/api/email/send-test \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","templateType":"welcome"}'
```

### Preview Template in Browser
```bash
curl -X POST http://localhost:5000/api/email/preview \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"templateType":"orderConfirmation"}' \
  > preview.html
# Then open preview.html in browser
```

## Troubleshooting

### Email Not Sending

1. **Check Environment Variables**
   ```bash
   echo $EMAIL_USER
   echo $EMAIL_PASSWORD
   ```

2. **Test Configuration**
   ```bash
   curl http://localhost:5000/api/email/test-config
   ```

3. **Check Logs**
   - Look for email-related console logs
   - In development mode, emails are logged to console

### Gmail Issues

1. **Less Secure App Access**
   - Don't use this - use App Passwords instead

2. **App Password Not Working**
   - Ensure 2FA is enabled
   - Generate new app password
   - Remove spaces from app password

3. **Authentication Failed**
   - Verify EMAIL_USER and EMAIL_PASSWORD
   - Check if account is locked

### Template Not Rendering

1. **Missing Variables**
   - Check template uses correct placeholder syntax: `{{variable}}`
   - Ensure all placeholders have corresponding data

2. **Template Not Found**
   - Verify template file exists in `/backend/templates/`
   - Check file name matches template name

## Production Deployment

### Using SendGrid (Recommended)

1. Sign up at sendgrid.com
2. Generate API key
3. Update `.env`:
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
```

### Using AWS SES

1. Set up AWS SES
2. Verify domain
3. Update `.env`:
```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USER=your-smtp-username
EMAIL_PASSWORD=your-smtp-password
```

### Email Queue (Future Enhancement)

For high-volume production:
- Implement Bull queue with Redis
- Add retry logic for failed emails
- Track email delivery status
- Implement rate limiting

## Security Best Practices

1. **Never expose EMAIL_PASSWORD**
   - Use environment variables
   - Don't commit to git

2. **Validate Email Addresses**
   - Use email validation before sending
   - Sanitize user input

3. **Rate Limiting**
   - Implement rate limits on email endpoints
   - Prevent abuse

4. **Unsubscribe Compliance**
   - Honor unsubscribe requests
   - Maintain unsubscribe list
   - GDPR compliance

## Support

For issues or questions:
- Check logs in console
- Test configuration with `/api/email/test-config`
- Preview templates with `/api/email/preview`
- Review this documentation

## Future Enhancements

- [ ] Email queue with Bull/Redis
- [ ] Email tracking (opens, clicks)
- [ ] A/B testing for subject lines
- [ ] Email analytics dashboard
- [ ] Scheduled email campaigns
- [ ] Email preference center
- [ ] Multi-language support
- [ ] SMS notifications integration

---

**Version:** 1.0.0
**Last Updated:** January 2026
**Author:** StyleHub Development Team
