import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering for this API route

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, role } = body

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'User ID and role are required' },
        { status: 400 }
      )
    }

    if (!['ADMIN', 'USER'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Check if user belongs to the same company
    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: session.user.companyId
      }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found or not in your company' },
        { status: 404 }
      )
    }

    // Prevent self-demotion
    if (targetUser.id === session.user.id && role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot change your own admin role' },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role }
    })

    return NextResponse.json({
      message: 'User role updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role
      }
    })

  } catch (error) {
    console.error('Update user role error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if user belongs to the same company
    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: session.user.companyId
      }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found or not in your company' },
        { status: 404 }
      )
    }

    // Prevent self-removal
    if (targetUser.id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot remove yourself from the company' },
        { status: 400 }
      )
    }

    // Remove user from company (set companyId to null)
    await prisma.user.update({
      where: { id: userId },
      data: { 
        companyId: null,
        role: 'USER' // Reset to regular user
      }
    })

    return NextResponse.json({
      message: 'User removed from company successfully'
    })

  } catch (error) {
    console.error('Remove user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}