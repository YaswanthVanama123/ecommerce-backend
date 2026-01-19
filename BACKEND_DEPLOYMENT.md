# StyleHub Backend Deployment Guide

## Quick Deployment

### Prerequisites
- Node.js 18+ installed
- MongoDB connection string
- Server with sudo access
- PM2 installed globally

### Step-by-Step Deployment

```bash
# 1. Clone and setup
cd /var/www
git clone <repository-url> stylehub
cd stylehub/backend
npm install --production

# 2. Configure environment
cp .env.example .env
nano .env  # Configure all variables

# 3. Create required directories
mkdir -p uploads invoices logs

# 4. Seed database (first time only)
npm run seed:superadmin
npm run seed:pincodes  # Optional

# 5. Start with PM2
pm2 start server.js --name stylehub-api -i max
pm2 save
pm2 startup

# 6. Configure NGINX reverse proxy
sudo nano /etc/nginx/sites-available/stylehub-api
```

### NGINX Configuration

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Environment Variables

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/stylehub
JWT_SECRET=<generate-64-char-secret>
JWT_REFRESH_SECRET=<generate-64-char-secret>
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
CLIENT_URL=https://yourdomain.com
ADMIN_CLIENT_URL=https://admin.yourdomain.com
SUPERADMIN_CLIENT_URL=https://superadmin.yourdomain.com
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your_sendgrid_key
EMAIL_FROM=noreply@yourdomain.com
```

### SSL Setup

```bash
sudo certbot --nginx -d api.yourdomain.com
```

### Monitoring

```bash
# View logs
pm2 logs stylehub-api

# Monitor performance
pm2 monit

# Check status
pm2 status
```

### Updates

```bash
cd /var/www/stylehub/backend
git pull origin main
npm install --production
pm2 restart stylehub-api
```

### Troubleshooting

**Port already in use:**
```bash
sudo lsof -i :5000
sudo kill -9 <PID>
```

**Database connection failed:**
- Check MongoDB URI
- Verify IP whitelist in MongoDB Atlas
- Test connection: `mongo "mongodb+srv://..."`

**PM2 not starting:**
```bash
pm2 delete stylehub-api
pm2 start server.js --name stylehub-api
pm2 logs stylehub-api --lines 100
```
