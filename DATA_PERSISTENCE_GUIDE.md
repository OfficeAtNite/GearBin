# Data Persistence in Production Deployments

## Problem
When deploying updates to production, user data gets wiped and the database starts with a "clean slate". This happens because the current setup may be using ephemeral storage or improper database configuration.

## Solution Overview
To ensure data persistence across deployments, you need:
1. A persistent PostgreSQL database (not SQLite)
2. Proper environment variables in production
3. Database migrations instead of schema recreation

## Step 1: Set Up Persistent PostgreSQL Database

### Option A: Vercel Postgres (Recommended)
1. Go to your Vercel dashboard
2. Select your project
3. Go to Storage tab
4. Create a new Postgres database
5. Copy the connection string

### Option B: External PostgreSQL Service
Popular options:
- **Neon** (neon.tech) - Serverless PostgreSQL
- **Supabase** (supabase.com) - Full backend platform
- **Railway** (railway.app) - Developer-first cloud
- **PlanetScale** (planetscale.com) - MySQL alternative

## Step 2: Configure Production Environment Variables

In your Vercel project settings, add these environment variables:

```bash
# Production Database (replace with your actual connection string)
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"

# NextAuth Configuration  
NEXTAUTH_SECRET="your-production-secret-key-here"
NEXTAUTH_URL="https://your-domain.vercel.app"
```

## Step 3: Update Database Schema for Production

The current schema is set to SQLite for development. For production persistence:

1. **Ensure schema.prisma is PostgreSQL compatible:**
```prisma
datasource db {
  provider = "postgresql"  // Must be postgresql for production
  url      = env("DATABASE_URL")
}
```

2. **Run migrations in production:**
```bash
# This will be run automatically on Vercel if configured properly
npx prisma migrate deploy
```

## Step 4: Configure Vercel for Database Migrations

Create a `vercel.json` file in your project root:

```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm install && npx prisma generate && npx prisma migrate deploy"
}
```

Or add to your `package.json`:
```json
{
  "scripts": {
    "build": "npx prisma generate && npx prisma migrate deploy && next build",
    "postinstall": "npx prisma generate"
  }
}
```

## Step 5: Local vs Production Database Strategy

### Development (Local)
```bash
# .env.local
DATABASE_URL="file:./dev.db"  # SQLite for local development
```

### Production (Vercel)
```bash
# Vercel Environment Variables
DATABASE_URL="postgresql://..."  # PostgreSQL for production
```

## Step 6: Migration Strategy

When you make schema changes:

1. **Create migration locally:**
```bash
DATABASE_URL="file:./dev.db" npx prisma migrate dev --name "your-change-description"
```

2. **Deploy to production:**
```bash
git add .
git commit -m "feat: add new schema changes"
git push origin main
```

3. **Vercel will automatically:**
   - Install dependencies
   - Generate Prisma client
   - Run `prisma migrate deploy` (applies migrations without prompting)
   - Build the application

## Step 7: Data Backup Strategy

### Automated Backups
Most managed PostgreSQL services provide automatic backups. Enable:
- Point-in-time recovery
- Daily automated backups
- Retention policy (7-30 days recommended)

### Manual Export (Emergency)
```bash
# Export data before major changes
npx prisma db pull  # Update schema from database
npx prisma db seed  # If you have seed data
```

## Step 8: Troubleshooting Data Loss

### If Data Still Gets Wiped:

1. **Check DATABASE_URL in production:**
   - Vercel Dashboard → Project → Settings → Environment Variables
   - Ensure it points to your persistent PostgreSQL database

2. **Verify migrations are running:**
   - Check Vercel build logs for migration outputs
   - Look for "Database migration completed" messages

3. **Check for destructive migrations:**
   - Review migration files in `prisma/migrations/`
   - Avoid `DROP TABLE` or `TRUNCATE` statements

4. **Enable connection pooling:**
   Add `?connection_limit=5&pool_timeout=20` to your DATABASE_URL

## Production Checklist

- [ ] PostgreSQL database created and accessible
- [ ] DATABASE_URL environment variable set in Vercel
- [ ] NEXTAUTH_SECRET set with strong random value
- [ ] NEXTAUTH_URL set to your production domain
- [ ] Prisma schema uses PostgreSQL provider
- [ ] Build process includes `prisma migrate deploy`
- [ ] Backup strategy in place
- [ ] Test deployment with sample data

## Environment Variables Template

Copy this to your Vercel environment variables:

```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/dbname?sslmode=require

# Auth
NEXTAUTH_SECRET=your-super-secret-jwt-secret-here
NEXTAUTH_URL=https://your-domain.vercel.app

# Optional: Enable query logging
PRISMA_LOG_LEVEL=info
```

## Migration Commands Reference

```bash
# Development
DATABASE_URL="file:./dev.db" npx prisma migrate dev --name "description"

# Production (automatic via Vercel)
npx prisma migrate deploy

# Reset local database (ONLY FOR DEVELOPMENT)
DATABASE_URL="file:./dev.db" npx prisma migrate reset

# Generate client after schema changes
npx prisma generate
```

## Success Indicators

✅ **Your setup is working correctly when:**
- User data persists across deployments
- No "clean slate" after updates
- Database connections are stable
- Migrations apply automatically
- Backups are being created

⚠️ **Red flags indicating problems:**
- Users lose their data after updates
- "Database not found" errors
- Connection timeouts
- Migration failures in build logs

---

Following this guide will ensure your user data persists across all future deployments and updates.