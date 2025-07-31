import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get ALL companies the user has ever been associated with
    // Method 1: Get companies from audit logs (switches, joins, creates)
    const auditCompanies = await prisma.auditLog.findMany({
      where: {
        userId: session.user.id,
        action: {
          in: ['COMPANY_SWITCH', 'COMPANY_JOIN', 'COMPANY_CREATE']
        }
      },
      select: {
        companyId: true
      },
      distinct: ['companyId']
    })

    // Method 2: Get companies where user has any audit history (comprehensive approach)
    const allUserAudits = await prisma.auditLog.findMany({
      where: {
        userId: session.user.id
      },
      select: {
        companyId: true
      },
      distinct: ['companyId']
    })

    // Combine all possible company IDs
    const companyIds = [
      ...auditCompanies.map(log => log.companyId),
      ...allUserAudits.map(log => log.companyId),
      session.user.companyId
    ].filter(Boolean) as string[]

    // Remove duplicates
    const uniqueCompanyIds = Array.from(new Set(companyIds))

    // Fetch company details
    const companies = await prisma.company.findMany({
      where: {
        id: {
          in: uniqueCompanyIds
        }
      },
      select: {
        id: true,
        name: true,
        joinCode: true,
        organizationType: true,
        location: true,
        parentCompanyId: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Mark current company
    const companiesWithCurrent = companies.map(company => ({
      ...company,
      isCurrent: company.id === session.user.companyId
    }))

    return NextResponse.json({
      companies: companiesWithCurrent,
      currentCompanyId: session.user.companyId
    })

  } catch (error) {
    console.error('Fetch user companies error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    )
  }
}