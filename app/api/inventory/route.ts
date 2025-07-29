import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering for this API route

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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
        updatedAt: 'desc'
      }
    })

    return NextResponse.json({
      items: items.map(item => ({
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
      }))
    })

  } catch (error) {
    console.error('Fetch inventory error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, description, quantity, lowStockThreshold, image, notes, tags } = body

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Item name is required' },
        { status: 400 }
      )
    }

    // Create the item
    const item = await prisma.inventoryItem.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        quantity: parseInt(quantity) || 0,
        lowStockThreshold: parseInt(lowStockThreshold) || 10,
        image: image || null,
        notes: notes?.trim() || null,
        companyId: session.user.companyId,
      }
    })

    // Add tags if provided
    if (tags && Array.isArray(tags) && tags.length > 0) {
      await prisma.itemTag.createMany({
        data: tags.map((tagId: string) => ({
          itemId: item.id,
          tagId: tagId
        }))
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_ITEM',
        itemId: item.id,
        itemName: item.name,
        quantityChange: item.quantity,
        newQuantity: item.quantity,
        userId: session.user.id,
        companyId: session.user.companyId,
        note: 'Item created'
      }
    })

    return NextResponse.json({
      message: 'Item created successfully',
      item
    })

  } catch (error) {
    console.error('Create inventory item error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}