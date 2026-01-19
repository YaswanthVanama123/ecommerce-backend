# Multi-Channel Order Notification System

Complete implementation of a multi-channel notification system for order management.

## Architecture Overview

### Backend Components

1. **Models** (`/backend/models/`)
   - `Notification.js` - In-app notifications with TTL and auto-cleanup
   - `NotificationPreference.js` - User preferences for all channels

2. **Services** (`/backend/services/`)
   - `orderNotifications.js` - Main orchestration service
   - `emailNotificationService.js` - Professional HTML email templates
   - `smsNotificationService.js` - SMS via Twilio
   - `pushNotificationService.js` - Push notifications via Firebase
   - `whatsappNotificationService.js` - WhatsApp via Twilio

3. **Controllers & Routes** (`/backend/controllers/`, `/backend/routes/`)
   - `notificationController.js` - API endpoints for notifications
   - `notificationRoutes.js` - Notification routes

### Frontend Components

1. **Components** (`/user-webapp/src/`)
   - `NotificationCenter.jsx` - Existing in-app notification center
   - `NotificationSettings.jsx` - New preferences management UI

## Features Implemented

### 1. Multi-Channel Support
- **Email** - Professional HTML templates with company branding
- **SMS** - Concise messages for important updates
- **Push Notifications** - Web and mobile push via Firebase
- **In-App** - Notification center with badge counts
- **WhatsApp** - Template-based messages via Twilio

### 2. Notification Triggers
All order lifecycle events supported:
- Order placed
- Payment received
- Order confirmed
- Order processing
- Order shipped (with tracking)
- Out for delivery
- Order delivered
- Order cancelled
- Return initiated/approved
- Refund processed

### 3. User Preferences
- Enable/disable each channel independently
- Event-specific preferences per channel
- Quiet hours with timezone support
- Email digest options (daily/weekly)
- Minimum priority filtering
- Marketing preferences

### 4. Admin Notifications
- New order alerts
- Low stock alerts
- Separate admin notification handling

### 5. Professional Email Templates
- Responsive HTML design
- Order summaries with product images
- CTA buttons (Track Order, View Invoice, etc.)
- Company branding
- Mobile-friendly

### 6. SMS Features
- Concise messages under 160 characters
- Tracking links included
- OTP support for COD verification
- Country code handling

### 7. Push Notifications
- Rich notifications with images
- Action buttons
- Badge management
- Platform-specific optimizations (Android/iOS/Web)
- Silent/background notifications

### 8. Smart Features
- Quiet hours support
- Priority-based filtering
- Automatic notification cleanup
- Multi-device support
- Preference-based delivery

## Environment Variables Setup

Add these to your `.env` file:

```bash
# ===================================
# NOTIFICATION SETTINGS
# ===================================

# Company Information
COMPANY_NAME="Your Store"
FRONTEND_URL=http://localhost:3000
SUPPORT_EMAIL=support@yourstore.com
SUPPORT_PHONE=+91-XXXXXXXXXX

# ===================================
# EMAIL CONFIGURATION
# ===================================

# Option 1: Gmail
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com

# Option 2: SendGrid
# EMAIL_SERVICE=sendgrid
# SENDGRID_API_KEY=your-sendgrid-api-key
# EMAIL_FROM=noreply@yourstore.com

# Option 3: Custom SMTP
# EMAIL_SERVICE=smtp
# EMAIL_HOST=smtp.yourprovider.com
# EMAIL_PORT=587
# EMAIL_SECURE=false
# EMAIL_USER=your-email@domain.com
# EMAIL_PASSWORD=your-password
# EMAIL_FROM=noreply@yourstore.com

# ===================================
# SMS CONFIGURATION (Twilio)
# ===================================

TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

# ===================================
# WHATSAPP CONFIGURATION (Twilio)
# ===================================

TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# ===================================
# PUSH NOTIFICATIONS (Firebase)
# ===================================

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key\n-----END PRIVATE KEY-----\n"
```

## Installation & Setup

### Backend Setup

1. **Install Dependencies** (if not already installed)
```bash
cd backend
npm install nodemailer
```

2. **For Twilio (SMS & WhatsApp)**
```bash
npm install twilio
```

3. **For Firebase (Push Notifications)**
```bash
npm install firebase-admin
```

4. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Add the configuration values above

5. **Start Server**
```bash
npm run dev
```

### Frontend Setup

No additional dependencies needed. The notification API is already integrated.

## API Endpoints

### Notification Management

```
GET    /api/notifications                  # Get user notifications
GET    /api/notifications/unread-count      # Get unread count
GET    /api/notifications/stats             # Get notification statistics
GET    /api/notifications/:id               # Get specific notification
PUT    /api/notifications/:id/read          # Mark as read
PUT    /api/notifications/read-all          # Mark all as read
DELETE /api/notifications/:id               # Delete notification
DELETE /api/notifications/read              # Delete all read
```

### Notification Preferences

```
GET    /api/notifications/preferences                    # Get preferences
PUT    /api/notifications/preferences                    # Update preferences
PUT    /api/notifications/preferences/channel/:channel   # Update channel
PUT    /api/notifications/preferences/quiet-hours        # Update quiet hours
POST   /api/notifications/preferences/push-device        # Add push device
DELETE /api/notifications/preferences/push-device/:token # Remove push device
POST   /api/notifications/test                          # Send test notification
```

## Usage Examples

### 1. Sending Notifications from Order Lifecycle

```javascript
import orderNotificationService from '../services/orderNotifications.js';

// On order creation
await orderNotificationService.notifyOrderPlaced(order, user);
await orderNotificationService.notifyAdminNewOrder(order);

// On order shipped
await orderNotificationService.notifyOrderShipped(order, user, shipping);

// On order delivered
await orderNotificationService.notifyOrderDelivered(order, user);
```

### 2. Frontend - Access Notification Settings

Add route to your React Router:

```javascript
import NotificationSettings from './pages/user/NotificationSettings';

// In your routes
<Route path="/settings/notifications" element={<NotificationSettings />} />
```

### 3. Frontend - Use Notification API

```javascript
import { notificationApi } from './api';

// Get notifications
const notifications = await notificationApi.getNotifications({ page: 1, limit: 20 });

// Mark as read
await notificationApi.markAsRead(notificationId);

// Update preferences
await axiosInstance.put('/notifications/preferences', {
  channels: {
    email: { enabled: true },
    sms: { enabled: false }
  }
});
```

## Email Service Configuration

### Gmail Setup

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to Google Account Settings > Security > 2-Step Verification
   - Scroll to "App passwords"
   - Generate a new app password for "Mail"
3. Use this app password in `EMAIL_PASSWORD`

### SendGrid Setup

1. Sign up at [SendGrid](https://sendgrid.com)
2. Create an API key with "Mail Send" permission
3. Verify your sender email/domain
4. Use the API key in `SENDGRID_API_KEY`

## SMS & WhatsApp Configuration

### Twilio Setup

1. Sign up at [Twilio](https://www.twilio.com)
2. Get your Account SID and Auth Token from the console
3. For SMS:
   - Get a Twilio phone number
   - Add to `TWILIO_PHONE_NUMBER`
4. For WhatsApp:
   - Enable WhatsApp in Twilio console
   - Use sandbox number for testing: `whatsapp:+14155238886`
   - For production, apply for WhatsApp Business API access

## Push Notifications Configuration

### Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Go to Project Settings > Service Accounts
3. Generate a new private key (downloads a JSON file)
4. Extract the following from the JSON:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

5. Frontend Setup:
   - Add Firebase SDK to your web app
   - Initialize Firebase messaging
   - Request notification permission
   - Get device token and save via API

## Testing Notifications

### Test Endpoint

```bash
curl -X POST http://localhost:5000/api/notifications/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channel": "email"}'
```

### Testing Each Channel

1. **Email** - Set `EMAIL_SERVICE=gmail` with valid credentials
2. **SMS** - Configure Twilio and add phone number in preferences
3. **Push** - Add device token via preferences API
4. **In-App** - Automatically created for all events
5. **WhatsApp** - Configure Twilio WhatsApp and add number

## Customization

### 1. Modify Email Templates

Edit `/backend/services/emailNotificationService.js`:
- Update HTML templates in `getEmailTemplate()` function
- Customize colors, branding, layout
- Add/remove sections

### 2. Add New Notification Types

1. Add new type to `Notification` model enum
2. Create message template in each service
3. Add to `eventLabels` in frontend
4. Trigger from appropriate controller

### 3. Customize SMS Messages

Edit `/backend/services/smsNotificationService.js`:
- Modify `getSMSMessage()` function
- Keep messages under 160 characters
- Include essential info only

### 4. Modify Push Notification Payloads

Edit `/backend/services/pushNotificationService.js`:
- Customize `getPushNotificationPayload()` function
- Add custom actions, images, sounds
- Platform-specific configurations

## Database Indexes

The Notification model includes optimized indexes:
- User + CreatedAt (most common query)
- User + Read + CreatedAt (unread notifications)
- User + Type + CreatedAt (filtered by type)
- TTL indexes for auto-cleanup

## Auto-Cleanup

- Read notifications are automatically deleted after 90 days
- Expired notifications (if `expiresAt` is set) are auto-deleted
- Old read notifications cleaned up periodically

## Performance Considerations

1. **Non-Blocking** - All notification sending is non-blocking
2. **Bulk Operations** - Batch processing for admin notifications
3. **Caching** - User preferences cached per request
4. **Async** - All external API calls are asynchronous
5. **Error Handling** - Failures don't affect order processing

## Monitoring

Monitor notification delivery:

```javascript
// Get notification stats
const stats = await orderNotificationService.getNotificationStats(userId);
// Returns: { total, unread, byType: {...} }
```

## Troubleshooting

### Email Not Sending

1. Check EMAIL environment variables
2. Verify email service credentials
3. Check console logs for errors
4. Test with Ethereal (test email service)

### SMS Not Sending

1. Verify Twilio credentials
2. Check phone number format (include country code)
3. Verify Twilio account has credits
4. Check Twilio console for errors

### Push Notifications Not Working

1. Verify Firebase credentials
2. Check device token is valid
3. Ensure notification permission granted
4. Test with FCM console directly

### In-App Notifications Not Appearing

1. Check user is authenticated
2. Verify notification was created in database
3. Check frontend API integration
4. Clear cache and reload

## Security Considerations

1. **API Keys** - Never commit API keys to version control
2. **Rate Limiting** - Applied to notification endpoints
3. **User Isolation** - Users can only access their own notifications
4. **Input Validation** - All inputs validated and sanitized
5. **Quiet Hours** - Prevents notification spam

## Future Enhancements

Potential improvements:
- Slack integration for admin notifications
- Telegram bot support
- Voice call notifications for urgent alerts
- A/B testing for email templates
- Advanced analytics dashboard
- Machine learning for optimal send times
- Multi-language support

## Support

For issues or questions:
1. Check console logs for errors
2. Verify environment variables
3. Test with simple notification first
4. Check service provider dashboards (Twilio, Firebase, etc.)

## License

This notification system is part of the e-commerce platform and follows the same license.
