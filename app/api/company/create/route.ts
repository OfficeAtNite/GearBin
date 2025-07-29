import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(100, 'Company name too long'),
  organizationType: z.enum(['PARENT', 'SUBSIDIARY', 'BRANCH', 'LOCATION', 'DIVISION']).optional().default('PARENT'),
  parentCompanyId: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user already has a company
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true }
    })

    if (existingUser?.companyId) {
      return NextResponse.json(
        { error: 'User already belongs to a company' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = createCompanySchema.parse(body)

    // Generate unique join code
    let joinCode: string
    let isUnique = false
    
    do {
      joinCode = generateJoinCode()
      const existingCompany = await prisma.company.findUnique({
        where: { joinCode }
      })
      isUnique = !existingCompany
    } while (!isUnique)

    // Create company and update user
    const result = await prisma.$transaction(async (tx) => {
      // Create company
      const company = await tx.company.create({
        data: {
          name: validatedData.name,
          joinCode: joinCode!,
          organizationType: validatedData.organizationType,
          parentCompanyId: validatedData.parentCompanyId,
          location: validatedData.location,
          description: validatedData.description,
        }
      })

      // Update user to be admin of the company
      const updatedUser = await tx.user.update({
        where: { id: session.user.id },
        data: {
          companyId: company.id,
          role: 'ADMIN'
        },
        include: {
          company: true
        }
      })

      return { company, user: updatedUser }
    })

    return NextResponse.json({
      message: 'Company created successfully',
      company: result.company,
      joinCode: result.company.joinCode
    })

  } catch (error) {
    console.error('Create company error:', error)
    
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