import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const signUpSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  companyMode: z.enum(['create', 'join']),
  companyData: z.object({
    name: z.string().optional(),
    joinCode: z.string().optional(),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = signUpSchema.parse(body)
    const { name, email, password, companyMode, companyData } = validatedData

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    let companyId: string
    let isAdmin = false

    if (companyMode === 'create') {
      if (!companyData.name?.trim()) {
        return NextResponse.json(
          { error: 'Company name is required' },
          { status: 400 }
        )
      }

      // Create new company
      let joinCode: string
      let isUnique = false
      
      // Generate unique join code
      do {
        joinCode = generateJoinCode()
        const existingCompany = await prisma.company.findUnique({
          where: { joinCode }
        })
        isUnique = !existingCompany
      } while (!isUnique)

      const company = await prisma.company.create({
        data: {
          name: companyData.name.trim(),
          joinCode: joinCode!,
        }
      })

      companyId = company.id
      isAdmin = true // First user of company is admin
    } else {
      // Join existing company
      if (!companyData.joinCode?.trim()) {
        return NextResponse.json(
          { error: 'Company join code is required' },
          { status: 400 }
        )
      }

      const company = await prisma.company.findUnique({
        where: { joinCode: companyData.joinCode.trim().toUpperCase() }
      })

      if (!company) {
        return NextResponse.json(
          { error: 'Invalid company join code' },
          { status: 400 }
        )
      }

      companyId = company.id
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: isAdmin ? 'ADMIN' : 'USER',
        companyId,
      },
      include: {
        company: true
      }
    })

    // Return success (don't include password)
    const { password: _, ...userWithoutPassword } = user
    
    return NextResponse.json({
      message: 'Account created successfully',
      user: userWithoutPassword
    })

  } catch (error) {
    console.error('Signup error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}