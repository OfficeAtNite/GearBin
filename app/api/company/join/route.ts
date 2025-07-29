import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

const joinCompanySchema = z.object({
  joinCode: z.string().min(8, 'Invalid join code').max(8, 'Invalid join code'),
})

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
    const validatedData = joinCompanySchema.parse(body)

    // Find company by join code
    const company = await prisma.company.findUnique({
      where: { joinCode: validatedData.joinCode.toUpperCase() }
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Invalid join code' },
        { status: 400 }
      )
    }

    // Update user to join the company
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        companyId: company.id,
        role: 'USER' // Regular user when joining
      },
      include: {
        company: true
      }
    })

    return NextResponse.json({
      message: 'Successfully joined company',
      company: updatedUser.company
    })

  } catch (error) {
    console.error('Join company error:', error)
    
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