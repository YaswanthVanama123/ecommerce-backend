#\!/bin/bash

echo "Applying security patches to server.js..."

# Backup original file
cp server.js server.js.backup

# Add cookieParser import after line 5
sed -i '' '5 a\
import cookieParser from '"'"'cookie-parser'"'"';\
import { csrfTokenMiddleware, csrfProtection } from '"'"'./middleware/csrf.js'"'"';\
import csrfRoutes from '"'"'./routes/csrfRoutes.js'"'"';
' server.js

# Add cookie-parser middleware after compressionMiddleware (around line 119)
sed -i '' '/app.use(compressionMiddleware);/a\
\
// Cookie parser - must be before CSRF and auth middleware\
app.use(cookieParser());\
\
// CSRF token generation middleware (sets token in cookie and res.locals)\
app.use(csrfTokenMiddleware);
' server.js

echo "Security patches applied successfully\!"
echo "Backup saved as server.js.backup"
echo ""
echo "IMPORTANT: You still need to:"
echo "1. Update CORS configuration manually (see SECURITY_INTEGRATION_INSTRUCTIONS.js)"
echo "2. Add CSRF protection to routes (see SECURITY_INTEGRATION_INSTRUCTIONS.js)"
echo "3. Update .env file with new environment variables"
