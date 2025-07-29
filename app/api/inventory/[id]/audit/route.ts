import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify the item belongs to the user's company
    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId
      }
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    // Fetch audit logs for this specific item
    const logs = await prisma.auditLog.findMany({
      where: {
        itemId: params.id,
        companyId: session.user.companyId
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      logs: logs.map(log => ({
        id: log.id,
        action: log.action,
        itemName: log.itemName,
        quantityChange: log.quantityChange,
        previousQuantity: log.previousQuantity,
        newQuantity: log.newQuantity,
        note: log.note,
        createdAt: log.createdAt,
        user: {
          name: log.user.name,
          email: log.user.email
        }
      }))
    })

  } catch (error) {
    console.error('Get audit logs error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}