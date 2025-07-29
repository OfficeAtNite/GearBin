#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building GearBin for Cloudflare Pages...');

// Set production environment
process.env.NODE_ENV = 'production';

try {
  // Generate Prisma client for production
  console.log('📦 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // Build the Next.js application
  console.log('🔨 Building Next.js application...');
  execSync('npm run build', { stdio: 'inherit' });

  // Create _headers file for Cloudflare Pages
  const headersContent = `
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/api/*
  Cache-Control: no-store, no-cache, must-revalidate
`;

  fs.writeFileSync(path.join('.next', '_headers'), headersContent.trim());

  // Remove cache files that exceed Cloudflare's 25MB limit
  console.log('🧹 Cleaning up cache files...');
  const cachePath = path.join('.next', 'cache');
  if (fs.existsSync(cachePath)) {
    fs.rmSync(cachePath, { recursive: true, force: true });
    console.log('✓ Removed cache directory');
  }

  // Remove other large files that aren't needed for static hosting
  const staticPath = path.join('.next', 'static');
  if (fs.existsSync(staticPath)) {
    const checkDir = (dirPath) => {
      const items = fs.readdirSync(dirPath);
      items.forEach(item => {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);
        if (stats.isDirectory()) {
          checkDir(itemPath);
        } else if (stats.size > 20 * 1024 * 1024) { // Remove files larger than 20MB
          fs.unlinkSync(itemPath);
          console.log(`✓ Removed large file: ${path.relative('.next', itemPath)}`);
        }
      });
    };
    checkDir(staticPath);
  }

  console.log('✅ Build completed successfully!');
  console.log('📁 Output directory: .next');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}