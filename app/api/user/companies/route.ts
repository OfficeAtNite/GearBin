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

    // Get companies using hierarchical access logic
    const companyIds = new Set<string>()
    
    // 1. Always include current company
    if (session.user.companyId) {
      companyIds.add(session.user.companyId)
    }

    // 2. Get current company details to check for parent
    const currentCompany = await prisma.company.findUnique({
      where: { id: session.user.companyId! },
      select: {
        id: true,
        parentCompanyId: true,
        organizationType: true
      }
    })

    // 3. If current company has a parent, include the parent (and its parents recursively)
    if (currentCompany?.parentCompanyId) {
      let parentId: string | null = currentCompany.parentCompanyId
      while (parentId) {
        companyIds.add(parentId)
        const parent: { parentCompanyId: string | null } | null = await prisma.company.findUnique({
          where: { id: parentId },
          select: { parentCompanyId: true }
        })
        parentId = parent?.parentCompanyId || null
      }
    }

    // 4. If user is admin, include child companies they created
    if (session.user.role === 'ADMIN') {
      const childCompanies = await prisma.company.findMany({
        where: {
          parentCompanyId: session.user.companyId
        },
        select: { id: true }
      })
      childCompanies.forEach(child => companyIds.add(child.id))
    }

    // 5. Include companies from audit history (fallback for edge cases)
    const auditCompanies = await prisma.auditLog.findMany({
      where: {
        userId: session.user.id
      },
      select: { companyId: true },
      distinct: ['companyId']
    })
    auditCompanies.forEach(audit => {
      if (audit.companyId) companyIds.add(audit.companyId)
    })

    // 6. Fetch all accessible company details
    const companies = await prisma.company.findMany({
      where: {
        id: {
          in: Array.from(companyIds)
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