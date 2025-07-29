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

    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId
      },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      item: {
        id: item.id,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        lowStockThreshold: item.lowStockThreshold,
        image: item.image,
        notes: item.notes,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        tags: item.tags.map(t => t.tag)
      }
    })

  } catch (error) {
    console.error('Get item error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    const body = await request.json()
    const { name, description, notes, tags } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Item name is required' },
        { status: 400 }
      )
    }

    // Get current item for comparison
    const currentItem = await prisma.inventoryItem.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId
      },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    })

    if (!currentItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    // Update item and handle tags
    await prisma.$transaction(async (tx) => {
      // Update the item
      await tx.inventoryItem.update({
        where: { id: params.id },
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          notes: notes?.trim() || null,
          updatedAt: new Date()
        }
      })

      // Handle tag updates
      if (tags && Array.isArray(tags)) {
        // Remove all existing tags
        await tx.itemTag.deleteMany({
          where: { itemId: params.id }
        })

        // Add new tags
        if (tags.length > 0) {
          await tx.itemTag.createMany({
            data: tags.map((tagId: string) => ({
              itemId: params.id,
              tagId: tagId
            }))
          })
        }
      }

      // Create audit logs for changes
      const auditLogs = []

      // Name change
      if (currentItem.name !== name.trim()) {
        auditLogs.push({
          action: 'UPDATED',
          itemId: params.id,
          itemName: name.trim(),
          note: `Item name changed from "${currentItem.name}" to "${name.trim()}"`,
          userId: session.user.id,
          companyId: session.user.companyId!
        })
      }

      // Description change
      const newDescription = description?.trim() || null
      if (currentItem.description !== newDescription) {
        auditLogs.push({
          action: 'UPDATED',
          itemId: params.id,
          itemName: name.trim(),
          note: `Description changed from "${currentItem.description || 'None'}" to "${newDescription || 'None'}"`,
          userId: session.user.id,
          companyId: session.user.companyId!
        })
      }

      // Notes change
      const newNotes = notes?.trim() || null
      if (currentItem.notes !== newNotes) {
        auditLogs.push({
          action: 'UPDATED',
          itemId: params.id,
          itemName: name.trim(),
          note: `Notes changed from "${currentItem.notes || 'None'}" to "${newNotes || 'None'}"`,
          userId: session.user.id,
          companyId: session.user.companyId!
        })
      }

      // Tags change
      if (tags && Array.isArray(tags)) {
        const currentTagIds = currentItem.tags.map(t => t.tag.id).sort()
        const newTagIds = tags.sort()
        
        if (JSON.stringify(currentTagIds) !== JSON.stringify(newTagIds)) {
          const currentTagNames = currentItem.tags.map(t => t.tag.name).join(', ')
          const newTagNames = await tx.tag.findMany({
            where: { id: { in: tags } }
          }).then(tags => tags.map(t => t.name).join(', '))

          auditLogs.push({
            action: 'UPDATED',
            itemId: params.id,
            itemName: name.trim(),
            note: `Tags changed from "${currentTagNames || 'No tags'}" to "${newTagNames || 'No tags'}"`,
            userId: session.user.id,
            companyId: session.user.companyId!
          })
        }
      }

      // Create audit logs
      if (auditLogs.length > 0) {
        await tx.auditLog.createMany({
          data: auditLogs
        })
      }
    })

    // Fetch updated item
    const updatedItem = await prisma.inventoryItem.findUnique({
      where: { id: params.id },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    })

    return NextResponse.json({
      item: {
        id: updatedItem!.id,
        name: updatedItem!.name,
        description: updatedItem!.description,
        quantity: updatedItem!.quantity,
        lowStockThreshold: updatedItem!.lowStockThreshold,
        image: updatedItem!.image,
        notes: updatedItem!.notes,
        createdAt: updatedItem!.createdAt,
        updatedAt: updatedItem!.updatedAt,
        tags: updatedItem!.tags.map(t => t.tag)
      }
    })

  } catch (error) {
    console.error('Update item error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}