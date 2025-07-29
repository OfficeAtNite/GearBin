import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const { email } = body

    if (!email?.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    })

    if (existingUser) {
      if (existingUser.companyId === session.user.companyId) {
        return NextResponse.json(
          { error: 'User is already part of your company' },
          { status: 400 }
        )
      } else if (existingUser.companyId) {
        return NextResponse.json(
          { error: 'User already belongs to another company' },
          { status: 400 }
        )
      }
    }

    // Get company info
    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId }
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // In a real application, you would send an email invitation here
    // For this demo, we'll just return the join code that can be shared manually
    
    // Create audit log for invitation
    await prisma.auditLog.create({
      data: {
        action: 'CSV_EXPORT', // Reusing existing enum value for invitation
        itemName: `Invitation sent to ${email}`,
        userId: session.user.id,
        companyId: session.user.companyId,
        note: `Admin invited ${email} to join company`
      }
    })

    return NextResponse.json({
      message: 'Invitation prepared successfully',
      instructions: `Share the following information with ${email}:
      
Company: ${company.name}
Join Code: ${company.joinCode}

They can sign up at the registration page and use this join code to join your company.`,
      joinCode: company.joinCode
    })

  } catch (error) {
    console.error('Send invite error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}