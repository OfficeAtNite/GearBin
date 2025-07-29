import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string
      role: string
      companyId?: string
      company?: {
        id: string
        name: string
        joinCode: string
      }
    }
  }

  interface User {
    id: string
    email: string
    name?: string
    role: string
    companyId?: string
    company?: {
      id: string
      name: string
      joinCode: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    companyId?: string
    company?: {
      id: string
      name: string
      joinCode: string
    }
  }
}