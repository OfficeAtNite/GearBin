import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/inventory/[id]/images - Get all images for an item
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

    // Verify item belongs to user's company
    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId
      },
      include: {
        images: {
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'asc' }
          ]
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
      images: item.images
    })

  } catch (error) {
    console.error('Get item images error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/inventory/[id]/images - Add new image to item
export async function POST(
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
    const { imageUrl, fileName, fileSize, mimeType, isPrimary } = body

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      )
    }

    // Verify item belongs to user's company
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

    // If this is set as primary, unset other primary images
    if (isPrimary) {
      await prisma.itemImage.updateMany({
        where: {
          itemId: params.id,
          isPrimary: true
        },
        data: {
          isPrimary: false
        }
      })
    }

    // Create the new image
    const image = await prisma.itemImage.create({
      data: {
        itemId: params.id,
        imageUrl,
        fileName: fileName || null,
        fileSize: fileSize || null,
        mimeType: mimeType || null,
        isPrimary: isPrimary || false
      }
    })

    return NextResponse.json({
      message: 'Image added successfully',
      image
    })

  } catch (error) {
    console.error('Add item image error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/inventory/[id]/images - Delete an image
export async function DELETE(
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

    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('imageId')

    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      )
    }

    // Verify image belongs to item and user's company
    const image = await prisma.itemImage.findFirst({
      where: {
        id: imageId,
        item: {
          id: params.id,
          companyId: session.user.companyId
        }
      }
    })

    if (!image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      )
    }

    await prisma.itemImage.delete({
      where: { id: imageId }
    })

    return NextResponse.json({
      message: 'Image deleted successfully'
    })

  } catch (error) {
    console.error('Delete item image error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}