# 🔧 GearBin - Garage Door Installer Inventory Management

A comprehensive, mobile-first inventory management system built specifically for garage door installation companies. Features multi-tenant organization support, real-time collaboration, QR code scanning, and seamless cross-device synchronization.

## ✨ Features

### 📱 **Mobile-First Design**
- Responsive interface optimized for smartphones and tablets
- Touch-friendly controls for field technicians
- Offline-capable PWA functionality

### 🏢 **Multi-Tenant Organization Management**
- Complete organizational hierarchy (Parent → Subsidiary → Branch → Location → Division)
- Company-based data isolation and security
- Admin controls for user management and permissions
- Visual organization tree in admin interface

### 📦 **Advanced Inventory Management**
- Real-time inventory tracking across all devices
- Low stock alerts and notifications
- Bulk CSV import/export functionality
- Advanced search and filtering capabilities
- Tag-based organization system

### 📱 **QR Code & Barcode Scanning**
- Quick item lookup and management
- Mobile camera integration
- Instant inventory updates

### 👥 **Team Collaboration**
- Real-time updates across all team members
- Role-based access control (Admin/User)
- Audit logging for all inventory changes
- Company switching for multi-location teams

### 🔐 **Security & Authentication**
- Secure authentication with NextAuth.js
- JWT session management
- Persistent logins across devices
- bcrypt password encryption

### 🌙 **Modern UI/UX**
- Dark/Light mode toggle
- Lucide React icons
- Tailwind CSS styling
- Smooth animations and transitions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (or SQLite for development)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/gearbin.git
cd gearbin
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
DATABASE_URL="your_database_connection_string"
NEXTAUTH_SECRET="your_long_random_secret"
NEXTAUTH_URL="http://localhost:3000"
```

4. **Initialize the database**
```bash
npx prisma db push
npx prisma generate
```

5. **Start the development server**
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to get started!

## 📋 Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Beautiful icons
- **next-themes** - Dark mode support

### Backend
- **Next.js API Routes** - Serverless functions
- **Prisma** - Database ORM and migrations
- **NextAuth.js** - Authentication framework
- **bcryptjs** - Password hashing

### Database
- **PostgreSQL** (Production)
- **SQLite** (Development)

### Deployment
- **Cloudflare Pages** - Free hosting with global CDN
- **GitHub Actions** - Automated CI/CD

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   Web Client    │    │   Admin Panel   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      Next.js API          │
                    │   (Serverless Functions)  │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │      Prisma ORM           │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   PostgreSQL Database     │
                    └───────────────────────────┘
```

## 📊 Database Schema

### Core Entities
- **Users** - Authentication and profile management
- **Companies** - Multi-tenant organization structure with hierarchy
- **InventoryItems** - Product catalog with quantities and metadata
- **AuditLogs** - Complete activity tracking
- **Tags** - Flexible item categorization

### Relationships
- Companies can have parent/child relationships for complex organizational structures
- Users belong to companies with role-based permissions
- Items are isolated by company for security
- Full audit trail for compliance and transparency

## 🚀 Deployment

### Cloudflare Pages (Recommended)

1. **Push to GitHub** (this repository)
2. **Connect to Cloudflare Pages**
3. **Configure build settings:**
   - Build command: `npm run build:cloudflare`
   - Build output directory: `.next`
4. **Set environment variables**
5. **Deploy!**

Detailed deployment instructions: [DEPLOYMENT.md](./DEPLOYMENT.md)

### Other Platforms
- Vercel
- Netlify
- Railway
- Render

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:push      # Push schema changes to database
npm run db:generate  # Generate Prisma client
npm run db:studio    # Open Prisma Studio
```

### Project Structure
```
gearbin/
├── app/                  # Next.js App Router
│   ├── api/             # API routes
│   ├── auth/            # Authentication pages
│   ├── dashboard/       # Main application
│   └── admin/           # Admin interface
├── components/          # Reusable components
├── lib/                # Utilities and configuration
├── prisma/             # Database schema and migrations
├── public/             # Static assets
└── types/              # TypeScript definitions
```

## 📱 Mobile Features

- **Progressive Web App (PWA)** ready
- **Camera integration** for QR/barcode scanning
- **Offline support** for critical functions
- **Touch-optimized** interface
- **Responsive design** for all screen sizes

## 🔒 Security

- **Authentication**: NextAuth.js with JWT tokens
- **Authorization**: Role-based access control
- **Data Isolation**: Multi-tenant architecture
- **Password Security**: bcrypt hashing
- **HTTPS**: Enforced in production
- **CSRF Protection**: Built into Next.js

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 [Documentation](./DEPLOYMENT.md)
- 🐛 [Report Issues](https://github.com/yourusername/gearbin/issues)
- 💬 [Discussions](https://github.com/yourusername/gearbin/discussions)

## 🙏 Acknowledgments

Built with modern web technologies for garage door installation professionals who need reliable, mobile-first inventory management.

---

**Made with ❤️ for garage door installers everywhere**