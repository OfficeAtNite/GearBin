import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get current user's company with organizational fields
    const userCompany = await prisma.company.findUnique({
      where: { id: session.user.companyId! },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        joinCode: true,
        organizationType: true,
        parentCompanyId: true,
        location: true,
        description: true
      }
    })

    if (!userCompany) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Find the root company by traversing up the hierarchy
    let rootCompanyId = userCompany.id
    if (userCompany.parentCompanyId) {
      let currentCompany = userCompany
      while (currentCompany.parentCompanyId) {
        const parentCompany = await prisma.company.findUnique({
          where: { id: currentCompany.parentCompanyId },
          select: {
            id: true,
            name: true,
            createdAt: true,
            updatedAt: true,
            joinCode: true,
            organizationType: true,
            parentCompanyId: true,
            location: true,
            description: true
          }
        })
        if (!parentCompany) break
        currentCompany = parentCompany
      }
      rootCompanyId = currentCompany.id
    }

    // Get the complete organizational tree from the root
    const rootCompany = await prisma.company.findUnique({
      where: { id: rootCompanyId },
      include: {
        childCompanies: {
          include: {
            childCompanies: {
              include: {
                childCompanies: true,
                _count: {
                  select: {
                    users: true
                  }
                }
              }
            },
            _count: {
              select: {
                users: true
              }
            }
          }
        },
        _count: {
          select: {
            users: true
          }
        }
      }
    })

    return NextResponse.json({
      organizationTree: rootCompany,
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