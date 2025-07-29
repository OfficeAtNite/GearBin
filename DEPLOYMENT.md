# 🚀 Deploying GearBin to Cloudflare Pages

This guide will help you deploy GearBin to Cloudflare Pages for free hosting.

## ✅ Pre-Deployment Verification

### Persistent Logins
- ✅ **Working**: NextAuth.js with JWT sessions stored as HTTP-only cookies
- ✅ **Cross-Device**: Sessions persist across browsers and devices
- ✅ **Security**: Secure authentication with bcrypt password hashing

### Cross-Device Inventory Storage
- ✅ **Working**: All inventory data stored server-side in database
- ✅ **Multi-Tenant**: Company-based data isolation
- ✅ **Real-Time**: Instant updates across all connected devices

## 📋 Prerequisites

1. **GitHub Repository**: Your code should be in a GitHub repository
2. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
3. **Database**: You'll need a PostgreSQL database (see options below)

## 🗄️ Database Setup

### Option 1: Neon (Recommended - Free PostgreSQL)
1. Sign up at [neon.tech](https://neon.tech)
2. Create a new database
3. Copy the connection string

### Option 2: Supabase (Alternative Free PostgreSQL)
1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings > Database and copy the connection string

### Option 3: PlanetScale (MySQL Alternative)
1. Sign up at [planetscale.com](https://planetscale.com)
2. Create a new database
3. Copy the connection string

## 🔧 Cloudflare Pages Setup

### Step 1: Connect GitHub Repository
1. Log into Cloudflare Dashboard
2. Go to **Pages** in the sidebar
3. Click **Create a project**
4. Select **Connect to Git**
5. Choose your GitHub account and repository

### Step 2: Configure Build Settings
```
Framework preset: Next.js
Build command: npm run build:cloudflare
Build output directory: .next
Root directory: (leave empty)
```

### Step 3: Environment Variables
Add these environment variables in Cloudflare Pages settings:

**Required Variables:**
```bash
DATABASE_URL=your_postgresql_connection_string
NEXTAUTH_SECRET=your_long_random_secret_string_here
NEXTAUTH_URL=https://your-project-name.pages.dev
NODE_ENV=production
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### Step 4: Custom Domain (Optional)
1. In Cloudflare Pages, go to **Custom domains**
2. Add your domain (e.g., `gearbin.yourdomain.com`)
3. Follow DNS configuration instructions

## 🛠️ Database Migration

After deployment, you'll need to apply database migrations:

### Option A: Using Prisma Studio (Recommended)
1. Run locally with production DATABASE_URL:
```bash
DATABASE_URL="your_production_db_url" npx prisma db push
```

### Option B: Using Migration Files
1. Generate migration:
```bash
npx prisma migrate dev --name init
```
2. Apply in production:
```bash
DATABASE_URL="your_production_db_url" npx prisma migrate deploy
```

## 🚦 Deployment Process

1. **Push to GitHub**: Commit and push your changes
2. **Automatic Build**: Cloudflare Pages will automatically build and deploy
3. **Database Setup**: Apply migrations as described above
4. **Test Deployment**: Visit your `.pages.dev` URL

## 📊 Free Tier Limits (Cloudflare Pages)

- **Builds**: 500 builds per month
- **Bandwidth**: 100GB per month
- **Requests**: 100,000 requests per day
- **Functions**: 100,000 invocations per day
- **Storage**: 25MB per site

## 🔒 Production Security Checklist

- [ ] Strong `NEXTAUTH_SECRET` generated
- [ ] Database connection secured with SSL
- [ ] Environment variables properly configured
- [ ] Custom domain with HTTPS enabled
- [ ] Database backups configured

## 🏗️ Build Process

The custom build script (`scripts/build-cloudflare.js`) handles:
- Prisma client generation
- Next.js optimization for Cloudflare
- Security headers configuration
- Static asset optimization

## 🚨 Troubleshooting

### Build Failures
- Check environment variables are set correctly
- Ensure database is accessible
- Verify `package.json` scripts are correct

### Database Connection Issues
- Confirm DATABASE_URL format
- Check database server accessibility
- Verify SSL requirements

### Authentication Problems
- Ensure NEXTAUTH_URL matches your domain
- Check NEXTAUTH_SECRET is set
- Verify callback URLs in production

## 📈 Monitoring & Maintenance

- **Analytics**: Built into Cloudflare Pages dashboard
- **Logs**: Available in Functions tab
- **Performance**: Real User Monitoring available
- **Alerts**: Set up via Cloudflare dashboard

## 🔄 Continuous Deployment

Every push to your main branch will automatically:
1. Trigger a new build
2. Run tests and linting
3. Deploy if successful
4. Update your live site

Your GearBin application will be accessible at: `https://your-project-name.pages.dev`

## 🎉 Post-Deployment

1. Create your first admin user
2. Set up your company
3. Invite team members
4. Start tracking inventory!

---

**Need Help?** Check the [Cloudflare Pages docs](https://developers.cloudflare.com/pages/) or open an issue in the repository.