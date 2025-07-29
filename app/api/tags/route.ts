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

    // Get all tags that are used by items in the company
    const tags = await prisma.tag.findMany({
      where: {
        items: {
          some: {
            item: {
              companyId: session.user.companyId
            }
          }
        }
      },
      include: {
        _count: {
          select: {
            items: {
              where: {
                item: {
                  companyId: session.user.companyId
                }
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({
      tags: tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        itemCount: tag._count.items
      }))
    })

  } catch (error) {
    console.error('Get tags error:', error)
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
    const { name, color } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      )
    }

    // Check if tag already exists
    const existingTag = await prisma.tag.findUnique({
      where: { name: name.trim().toLowerCase() }
    })

    if (existingTag) {
      return NextResponse.json({
        tag: existingTag
      })
    }

    // Create new tag
    const tag = await prisma.tag.create({
      data: {
        name: name.trim().toLowerCase(),
        color: color || '#3b82f6'
      }
    })

    return NextResponse.json({
      message: 'Tag created successfully',
      tag
    })

  } catch (error) {
    console.error('Create tag error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}