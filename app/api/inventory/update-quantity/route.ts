import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateQuantitySchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  change: z.number().int('Change must be an integer'),
  note: z.string().optional(),
})

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
    const validatedData = updateQuantitySchema.parse(body)
    const { itemId, change, note } = validatedData

    // Get the current item
    const currentItem = await prisma.inventoryItem.findFirst({
      where: {
        id: itemId,
        companyId: session.user.companyId
      }
    })

    if (!currentItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    const newQuantity = Math.max(0, currentItem.quantity + change)

    // Update the item quantity
    const updatedItem = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        quantity: newQuantity,
        updatedAt: new Date()
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_QUANTITY',
        itemId: updatedItem.id,
        itemName: updatedItem.name,
        quantityChange: change,
        previousQuantity: currentItem.quantity,
        newQuantity: newQuantity,
        userId: session.user.id,
        companyId: session.user.companyId,
        note: note || (change > 0 ? 'Quantity increased' : 'Quantity decreased')
      }
    })

    return NextResponse.json({
      message: 'Quantity updated successfully',
      item: updatedItem
    })

  } catch (error) {
    console.error('Update quantity error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}