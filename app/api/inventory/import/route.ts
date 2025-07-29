import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Force dynamic rendering for this API route
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const mode = formData.get('mode') as string // 'overwrite', 'increment', 'restore'

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a CSV file.' },
        { status: 400 }
      )
    }

    const csvText = await file.text()
    const lines = csvText.split('\n').filter(line => line.trim())
    
    if (lines.length === 0) {
      return NextResponse.json(
        { error: 'Empty CSV file' },
        { status: 400 }
      )
    }

    // Parse CSV header
    const header = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
    const requiredFields = ['Name', 'Quantity']
    const hasRequiredFields = requiredFields.every(field => 
      header.some(h => h.toLowerCase() === field.toLowerCase())
    )

    if (!hasRequiredFields) {
      return NextResponse.json(
        { error: 'CSV must contain at least Name and Quantity columns' },
        { status: 400 }
      )
    }

    // Parse CSV rows
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim())
      const row: any = {}
      header.forEach((col, index) => {
        row[col.toLowerCase()] = values[index] || ''
      })
      return row
    })

    let processed = 0
    let created = 0
    let updated = 0
    let errors: string[] = []

    // Process each row
    for (const row of rows) {
      try {
        const name = row.name || row.item_name || row['item name']
        const quantityStr = row.quantity || row.qty || row.stock
        const description = row.description || ''
        const lowStockThreshold = parseInt(row.low_stock_threshold || row['low stock threshold'] || '10')
        const notes = row.notes || ''

        if (!name) {
          errors.push(`Row ${processed + 1}: Missing item name`)
          continue
        }

        const quantity = parseInt(quantityStr) || 0

        // Find existing item
        const existingItem = await prisma.inventoryItem.findFirst({
          where: {
            name: name.trim(),
            companyId: session.user.companyId
          }
        })

        if (existingItem) {
          if (mode === 'overwrite' || mode === 'restore') {
            // Update existing item
            await prisma.inventoryItem.update({
              where: { id: existingItem.id },
              data: {
                quantity: mode === 'restore' ? quantity : quantity,
                description: description || existingItem.description,
                lowStockThreshold: lowStockThreshold || existingItem.lowStockThreshold,
                notes: notes || existingItem.notes,
                updatedAt: new Date()
              }
            })

            // Create audit log
            await prisma.auditLog.create({
              data: {
                action: 'UPDATE_QUANTITY',
                itemId: existingItem.id,
                itemName: existingItem.name,
                quantityChange: quantity - existingItem.quantity,
                previousQuantity: existingItem.quantity,
                newQuantity: quantity,
                userId: session.user.id,
                companyId: session.user.companyId,
                note: `Updated via CSV import (${mode})`
              }
            })

            updated++
          } else if (mode === 'increment') {
            // Add to existing quantity
            const newQuantity = existingItem.quantity + quantity

            await prisma.inventoryItem.update({
              where: { id: existingItem.id },
              data: {
                quantity: newQuantity,
                updatedAt: new Date()
              }
            })

            // Create audit log
            await prisma.auditLog.create({
              data: {
                action: 'UPDATE_QUANTITY',
                itemId: existingItem.id,
                itemName: existingItem.name,
                quantityChange: quantity,
                previousQuantity: existingItem.quantity,
                newQuantity: newQuantity,
                userId: session.user.id,
                companyId: session.user.companyId,
                note: 'Incremented via CSV import'
              }
            })

            updated++
          }
        } else {
          // Create new item
          const newItem = await prisma.inventoryItem.create({
            data: {
              name: name.trim(),
              description: description,
              quantity: quantity,
              lowStockThreshold: lowStockThreshold,
              notes: notes,
              companyId: session.user.companyId
            }
          })

          // Create audit log
          await prisma.auditLog.create({
            data: {
              action: 'CREATE_ITEM',
              itemId: newItem.id,
              itemName: newItem.name,
              quantityChange: quantity,
              newQuantity: quantity,
              userId: session.user.id,
              companyId: session.user.companyId,
              note: 'Created via CSV import'
            }
          })

          created++
        }

        processed++
      } catch (error) {
        errors.push(`Row ${processed + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Create overall import audit log
    await prisma.auditLog.create({
      data: {
        action: 'CSV_IMPORT',
        itemName: `CSV Import: ${created} created, ${updated} updated`,
        userId: session.user.id,
        companyId: session.user.companyId,
        note: `Import mode: ${mode}, Processed: ${processed} items`
      }
    })

    return NextResponse.json({
      message: 'CSV import completed',
      summary: {
        processed,
        created,
        updated,
        errors: errors.length,
        errorDetails: errors
      }
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}