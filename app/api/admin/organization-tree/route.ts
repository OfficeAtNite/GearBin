import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get current user's company
    const userCompany = await prisma.company.findUnique({
      where: { id: session.user.companyId! },
      include: {
        _count: {
          select: {
            users: true
          }
        }
      }
    })

    if (!userCompany) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // For now, return simple structure until organizational hierarchy is fully implemented
    const organizationTree = {
      ...userCompany,
      organizationType: 'PARENT',
      parentCompanyId: null,
      location: null,
      description: null,
      childCompanies: []
    }

    return NextResponse.json({
      organizationTree,
      currentCompanyId: session.user.companyId,
      userRole: session.user.role
    })

  } catch (error) {
    console.error('Organization tree error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization tree' },
      { status: 500 }
    )
  }
}