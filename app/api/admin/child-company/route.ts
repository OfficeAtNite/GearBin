import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createChildCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(100, 'Company name too long'),
  organizationType: z.enum(['SUBSIDIARY', 'BRANCH', 'LOCATION', 'DIVISION']),
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

// POST /api/admin/child-company - Create child organization
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createChildCompanySchema.parse(body)

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

    // Create child company
    const childCompany = await prisma.company.create({
      data: {
        name: validatedData.name,
        joinCode: joinCode!,
        organizationType: validatedData.organizationType,
        parentCompanyId: session.user.companyId,
        location: validatedData.location,
        description: validatedData.description,
      },
      include: {
        parentCompany: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            users: true,
            childCompanies: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Child organization created successfully',
      company: childCompany
    })

  } catch (error) {
    console.error('Create child company error:', error)
    
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