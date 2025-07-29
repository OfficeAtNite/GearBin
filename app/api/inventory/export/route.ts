import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all inventory items for the company
    const items = await prisma.inventoryItem.findMany({
      where: {
        companyId: session.user.companyId
      },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Convert to CSV format
    const csvHeader = 'Name,Description,Quantity,Low Stock Threshold,Notes,Tags\n'
    const csvRows = items.map(item => {
      const tags = item.tags.map(t => t.tag.name).join(';')
      return [
        `"${item.name.replace(/"/g, '""')}"`,
        `"${(item.description || '').replace(/"/g, '""')}"`,
        item.quantity.toString(),
        item.lowStockThreshold.toString(),
        `"${(item.notes || '').replace(/"/g, '""')}"`,
        `"${tags}"`
      ].join(',')
    }).join('\n')

    const csvContent = csvHeader + csvRows

    // Create audit log for export
    await prisma.auditLog.create({
      data: {
        action: 'CSV_EXPORT',
        itemName: `${items.length} items exported`,
        userId: session.user.id,
        companyId: session.user.companyId,
        note: 'Inventory snapshot exported to CSV'
      }
    })

    // Return CSV with appropriate headers
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="gearbin-inventory-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}