import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { joinCode } = await request.json()

    if (!joinCode?.trim()) {
      return NextResponse.json({ error: 'Join code is required' }, { status: 400 })
    }

    // Find the company with this join code
    const company = await prisma.company.findUnique({
      where: { joinCode: joinCode.trim() }
    })

    if (!company) {
      return NextResponse.json({ error: 'Invalid join code' }, { status: 404 })
    }

    // Check if user is already in this company
    if (session.user.companyId === company.id) {
      return NextResponse.json({ error: 'You are already in this company' }, { status: 400 })
    }

    // Update the user's company
    await prisma.user.update({
      where: { id: session.user.id },
      data: { companyId: company.id }
    })

    // Create audit log for the switch
    await prisma.auditLog.create({
      data: {
        action: 'COMPANY_SWITCH',
        itemName: 'Company Switch',
        note: `Switched to company: ${company.name}`,
        userId: session.user.id,
        companyId: company.id
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully switched to ${company.name}`,
      company: {
        id: company.id,
        name: company.name,
        joinCode: company.joinCode
      }
    })

  } catch (error) {
    console.error('Company switch error:', error)
    return NextResponse.json(
      { error: 'Failed to switch company' },
      { status: 500 }
    )
  }
}