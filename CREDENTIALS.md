# Default Credentials

This file contains the default credentials for accessing the Portfolio application.

## ⚠️ Security Warning

**IMPORTANT**: These are default credentials for development and testing purposes only.
**You MUST change these passwords before deploying to production!**

## Default User Accounts

### Admin Account
- **Email**: `admin@portfolio.local`
- **Password**: `admin123!@#`
- **Role**: ADMIN
- **Capabilities**: Full access to all features

### Regular User Account
- **Email**: `user@portfolio.local`
- **Password**: `user123!@#`
- **Role**: USER
- **Capabilities**: Standard user access

## How to Login

1. **Frontend**: Navigate to `http://localhost:3000` and use the login page
2. **API**: Send a POST request to `http://localhost:3001/api/auth/login`
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@portfolio.local",
       "password": "admin123!@#"
     }'
   ```

## Seeding the Database

The seed script runs automatically during deployment when you use:
```bash
./scripts/deploy-docker.sh deploy
```

To manually run the seed script:
```bash
# Inside the backend container
docker compose exec backend npm run prisma:seed

# Or during development
cd backend && npm run prisma:seed
```

## Creating New Users

You can create new users by:

1. **Via API** (POST `/api/auth/register`):
   ```bash
   curl -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "newuser@example.com",
       "username": "newuser",
       "password": "securePassword123!"
     }'
   ```

2. **Via Frontend**: Use the registration page at `http://localhost:3000/register`

## Password Requirements

- Minimum length: 8 characters
- Must include uppercase and lowercase letters
- Must include numbers
- Special characters are recommended

## Changing Default Passwords

### For Production Deployment:

1. **Before first deployment**, edit `backend/prisma/seed.ts` and change:
   - Line 9: Admin password
   - Line 30: Regular user password

2. **After deployment**, use the API to update passwords:
   ```bash
   # Login as admin first to get JWT token
   TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@portfolio.local","password":"admin123!@#"}' \
     | jq -r '.access_token')

   # Update password (implementation needed in AuthService)
   curl -X PATCH http://localhost:3001/api/auth/password \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"oldPassword":"admin123!@#","newPassword":"NewSecurePassword123!"}'
   ```

## Security Best Practices

1. ✅ Change default passwords immediately after first deployment
2. ✅ Use strong, unique passwords for each user
3. ✅ Enable two-factor authentication (if implemented)
4. ✅ Regularly rotate passwords
5. ✅ Never commit credentials to version control
6. ✅ Use environment variables for sensitive configuration
7. ✅ Review user access and permissions regularly

## Environment Variables

For production, set these environment variables:
```bash
# In .env file or deployment configuration
JWT_SECRET=<your-strong-random-secret>
ENCRYPTION_KEY=<your-encryption-key>
```

Generate secure random values:
```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
