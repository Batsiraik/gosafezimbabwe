# Database Setup Guide

## Prerequisites
- Neon PostgreSQL database connection string
- Node.js and npm installed

## Step 1: Create Environment File

Create a `.env.local` file in the root directory with the following content:

```
DATABASE_URL="postgresql://neondb_owner:npg_rmAQqXLng04V@ep-hidden-waterfall-agkel5r6-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
JWT_SECRET="go-safe-secret-key-change-in-production"
```

**Important:** Change the JWT_SECRET to a secure random string in production!

## Step 2: Push Database Schema

Run the following command to create the users table in your Neon database:

```bash
npx prisma db push
```

This will create the `users` table with the following structure:
- `id` (String, Primary Key)
- `fullName` (String)
- `phone` (String, Unique) - Stored in +263 format
- `password` (String, Hashed)
- `idDocumentUrl` (String, Optional) - For future identity verification
- `licenseUrl` (String, Optional) - For future license verification
- `isVerified` (Boolean, Default: false) - Identity verification status
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

## Step 3: Generate Prisma Client

After pushing the schema, generate the Prisma client:

```bash
npx prisma generate
```

## Step 4: Test the Connection

Start your development server:

```bash
npm run dev
```

Try registering a new user at `/auth/register`:
- Use any Zimbabwean phone number (e.g., 0776954448 or +263776954448)
- The phone will be automatically formatted to +263776954448
- Use OTP: **123456** (test OTP)

## API Endpoints

### POST `/api/auth/register`
- Creates a new user account
- Accepts: `fullName`, `phone`, `password`
- Returns: User data and phone for OTP verification

### POST `/api/auth/verify-otp`
- Verifies OTP and logs user in
- Accepts: `phone`, `otp` (use 123456 for testing)
- Returns: JWT token and user data
- **Auto-redirects to dashboard after verification**

### POST `/api/auth/login`
- Logs in existing user
- Accepts: `phone`, `password`
- Returns: JWT token and user data

### POST `/api/auth/forgot-password`
- Sends OTP for password reset
- Accepts: `phone`
- Returns: OTP (123456 for testing)

### POST `/api/auth/reset-password`
- Resets user password
- Accepts: `phone`, `otp`, `newPassword`
- Returns: Success message

## Phone Number Formatting

The system automatically handles multiple phone number formats:
- `0776954448` → `+263776954448`
- `+263776954448` → `+263776954448`
- `263776954448` → `+263776954448`

All phone numbers are stored in the database as `+263XXXXXXXXX` format.

## Test OTP

For testing purposes, the OTP is always **123456**. This will be replaced with Twilio integration later.

## Troubleshooting

### Database Connection Error
- Verify your `.env.local` file exists and has the correct DATABASE_URL
- Check that your Neon database is accessible
- Ensure the connection string includes `?sslmode=require&channel_binding=require`

### Prisma Client Not Found
- Run `npx prisma generate` to regenerate the client
- Make sure `node_modules` is installed: `npm install`

### Schema Push Fails
- Check your database connection string
- Ensure you have write permissions on the Neon database
- Try running `npx prisma db push --force-reset` (WARNING: This will delete all data!)
