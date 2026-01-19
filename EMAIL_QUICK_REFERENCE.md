# Email System - Quick Reference Guide

## Quick Setup (5 minutes)

### 1. Configure Environment Variables
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=StyleHub <noreply@stylehub.com>
CLIENT_URL=http://localhost:5173
```

### 2. Test Configuration
```bash
# Start server
npm start

# Test email config (requires admin token)
curl http://localhost:5000/api/email/test-config \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 3. Send Test Email
```bash
curl -X POST http://localhost:5000/api/email/send-test \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@gmail.com","templateType":"welcome"}'
```

## Available Templates

| Template ID | Description | When to Use |
|------------|-------------|-------------|
| `welcome` | Welcome email | After user registration |
| `orderConfirmation` | Order placed | After order creation |
| `orderShipped` | Shipping notification | When order ships |
| `orderDelivered` | Delivery confirmation | When order delivered |
| `orderCancelled` | Cancellation notice | When order cancelled |
| `refund` | Refund processed | After refund |
| `passwordReset` | Password reset link | Password reset request |
| `invoice` | Order invoice | Invoice generation |
| `lowStockAlert` | Low stock warning | Stock below threshold (Admin) |
| `returnRequest` | Return confirmation | Return request submitted |

## Common Code Snippets

### Send Welcome Email
```javascript
import { sendWelcomeEmail } from '../utils/emailService.js';

// After user creation
await sendWelcomeEmail(user.email, user);
```

### Send Order Confirmation
```javascript
import { sendOrderConfirmationEmail } from '../utils/emailService.js';

// After order creation
await sendOrderConfirmationEmail(user.email, order, user);
```

### Send Order Shipped
```javascript
import { sendOrderShippedEmail } from '../utils/emailService.js';

// When order status changes to 'shipped'
await sendOrderShippedEmail(user.email, order, user);
```

### Send Password Reset
```javascript
import { sendPasswordResetEmail } from '../utils/emailService.js';

// Generate token and send email
const resetToken = generateToken();
await sendPasswordResetEmail(user.email, user, resetToken);
```

## API Endpoints Quick Reference

### Test Configuration
```
GET /api/email/test-config
Auth: Admin
```

### Send Test Email
```
POST /api/email/send-test
Auth: Admin
Body: { email, templateType }
```

### Preview Template
```
POST /api/email/preview
Auth: Admin
Body: { templateType, orderId?, userId? }
Returns: HTML
```

### Resend Order Email
```
POST /api/email/resend-order-confirmation
Auth: User
Body: { orderId }
```

### Get Templates List
```
GET /api/email/templates
Auth: Admin
```

## File Locations

```
backend/
├── templates/          # HTML templates
│   ├── welcome.html
│   ├── orderConfirmation.html
│   └── ... (10 templates total)
│
├── utils/
│   ├── emailService.js      # Main service
│   └── emailTemplates.js    # Data preparation
│
├── controllers/
│   └── emailController.js   # API endpoints
│
└── routes/
    └── emailRoutes.js       # Route definitions
```

## Troubleshooting

### Email Not Sending?
1. Check `.env` has `EMAIL_USER` and `EMAIL_PASSWORD`
2. Test config: `GET /api/email/test-config`
3. Check console logs
4. For Gmail: Use App Password (not regular password)

### Template Not Rendering?
1. Check file exists in `/backend/templates/`
2. Verify placeholder syntax: `{{variableName}}`
3. Preview template: `POST /api/email/preview`

### Gmail App Password Setup
1. Enable 2FA on Gmail account
2. Google Account → Security → App passwords
3. Generate password for "Mail"
4. Use generated password in `EMAIL_PASSWORD`

## Environment Variables

### Required
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### Optional (with defaults)
```env
EMAIL_SERVICE=gmail                    # Default: smtp
EMAIL_HOST=smtp.gmail.com              # Default: smtp.ethereal.email
EMAIL_PORT=587                         # Default: 587
EMAIL_SECURE=false                     # Default: false
EMAIL_FROM=StyleHub <noreply@stylehub.com>
CLIENT_URL=http://localhost:5173       # Frontend URL
ADMIN_CLIENT_URL=http://localhost:5174 # Admin URL
```

## Integration Checklist

- [ ] Add environment variables to `.env`
- [ ] Test email configuration
- [ ] Send test email
- [ ] Preview templates in browser
- [ ] Add email calls to user registration
- [ ] Add email calls to order creation
- [ ] Add email calls to order status updates
- [ ] Add email calls to password reset
- [ ] Add email calls to return requests
- [ ] Test in development
- [ ] Configure production email service

## Production Checklist

- [ ] Use production email service (SendGrid/AWS SES)
- [ ] Update environment variables
- [ ] Test email delivery
- [ ] Monitor email logs
- [ ] Implement email queue (optional)
- [ ] Set up email tracking (optional)
- [ ] Add rate limiting
- [ ] Test unsubscribe links

## Support

- Documentation: `/backend/EMAIL_SYSTEM_DOCUMENTATION.md`
- Test Config: `GET /api/email/test-config`
- Preview: `POST /api/email/preview`
- Templates: `GET /api/email/templates`

---

**Need Help?** Check the full documentation in `EMAIL_SYSTEM_DOCUMENTATION.md`
