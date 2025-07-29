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

  console.log('✅ Build completed successfully!');
  console.log('📁 Output directory: .next');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}