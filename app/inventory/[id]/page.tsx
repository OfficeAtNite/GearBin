'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Edit3, Save, X, Tag, Plus, Trash2, Clock, User } from 'lucide-react'
import Link from 'next/link'

interface Tag {
  id: string
  name: string
  color: string
}

interface AuditLog {
  id: string
  action: string
  itemName: string
  quantityChange: number | null
  previousQuantity: number | null
  newQuantity: number | null
  note: string | null
  createdAt: string
  user: {
    name: string | null
    email: string
  }
}

interface InventoryItem {
  id: string
  name: string
  description: string | null
  quantity: number
  lowStockThreshold: number
  image: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  tags: Tag[]
}

export default function InventoryItemDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [editedItem, setEditedItem] = useState<Partial<InventoryItem>>({})

  useEffect(() => {
    if (params.id) {
      fetchItem()
      fetchAuditLogs()
      fetchTags()
    }
  }, [params.id])

  const fetchItem = async () => {
    try {
      const response = await fetch(`/api/inventory/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setItem(data.item)
        setEditedItem(data.item)
      } else {
        setError('Item not found')
      }
    } catch (error) {
      setError('Failed to load item')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAuditLogs = async () => {
    try {
      const response = await fetch(`/api/inventory/${params.id}/audit`)
      if (response.ok) {
        const data = await response.json()
        setAuditLogs(data.logs)
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
    }
  }

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags')
      if (response.ok) {
        const data = await response.json()
        setAvailableTags(data.tags)
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditedItem({ ...item })
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedItem({ ...item })
    setError('')
  }

  const handleSave = async () => {
    if (!editedItem.name?.trim()) {
      setError('Item name is required')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/inventory/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editedItem.name,
          description: editedItem.description || null,
          notes: editedItem.notes || null,
          tags: editedItem.tags?.map(tag => tag.id) || [],
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setItem(data.item)
        setIsEditing(false)
        fetchAuditLogs() // Refresh audit logs
      } else {
        const result = await response.json()
        setError(result.error || 'Failed to update item')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleTag = (tag: Tag) => {
    const currentTags = editedItem.tags || []
    const isSelected = currentTags.some(t => t.id === tag.id)
    
    if (isSelected) {
      setEditedItem({
        ...editedItem,
        tags: currentTags.filter(t => t.id !== tag.id)
      })
    } else {
      setEditedItem({
        ...editedItem,
        tags: [...currentTags, tag]
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATED': return 'text-green-600 dark:text-green-400'
      case 'UPDATED': return 'text-blue-600 dark:text-blue-400'
      case 'QUANTITY_UPDATED': return 'text-orange-600 dark:text-orange-400'
      case 'DELETED': return 'text-red-600 dark:text-red-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading item...</p>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Item not found</p>
          <Link href="/dashboard" className="text-primary-600 hover:text-primary-700 dark:text-primary-400">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link
                href="/dashboard"
                className="p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {isEditing ? 'Edit Item' : 'Item Details'}
              </h1>
            </div>
            
            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <button
                  onClick={handleEdit}
                  className="btn-secondary"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    className="btn-secondary"
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="btn-primary"
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto">
        {/* Item Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          {/* Image */}
          {item.image && (
            <div className="mb-6">
              <img
                src={item.image}
                alt={item.name}
                className="w-full max-w-md mx-auto rounded-lg shadow-md"
              />
            </div>
          )}

          {/* Item Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Item Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedItem.name || ''}
                onChange={(e) => setEditedItem({ ...editedItem, name: e.target.value })}
                className="input-field"
                placeholder="Enter item name"
              />
            ) : (
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{item.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            {isEditing ? (
              <textarea
                value={editedItem.description || ''}
                onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })}
                className="input-field"
                rows={3}
                placeholder="Enter description"
              />
            ) : (
              <p className="text-gray-600 dark:text-gray-300">
                {item.description || 'No description provided'}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            {isEditing ? (
              <textarea
                value={editedItem.notes || ''}
                onChange={(e) => setEditedItem({ ...editedItem, notes: e.target.value })}
                className="input-field"
                rows={3}
                placeholder="Enter notes"
              />
            ) : (
              <p className="text-gray-600 dark:text-gray-300">
                {item.notes || 'No notes'}
              </p>
            )}
          </div>

          {/* Quantity Info */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Current Quantity
              </label>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{item.quantity}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Low Stock Alert
              </label>
              <p className="text-lg text-gray-600 dark:text-gray-300">{item.lowStockThreshold}</p>
            </div>
          </div>

          {/* Tags */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags
            </label>
            {isEditing ? (
              <div className="space-y-3">
                {/* Selected Tags */}
                {editedItem.tags && editedItem.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {editedItem.tags.map(tag => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                      >
                        {tag.name}
                        <button
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className="ml-1 text-primary-500 hover:text-primary-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Available Tags */}
                <div className="flex flex-wrap gap-2">
                  {availableTags
                    .filter(tag => !editedItem.tags?.some(t => t.id === tag.id))
                    .map(tag => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {tag.name}
                      </button>
                    ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {item.tags.length > 0 ? (
                  item.tags.map(tag => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag.name}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">No tags</span>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
            <div>
              <strong>Created:</strong> {formatDate(item.createdAt)}
            </div>
            <div>
              <strong>Updated:</strong> {formatDate(item.updatedAt)}
            </div>
          </div>
        </div>

        {/* Audit Log */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Audit Log
          </h2>
          
          {auditLogs.length > 0 ? (
            <div className="space-y-4">
              {auditLogs.map(log => (
                <div key={log.id} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {log.user.name || log.user.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(log.createdAt)}
                      </p>
                    </div>
                    <p className={`text-sm font-medium ${getActionColor(log.action)}`}>
                      {log.action.replace('_', ' ')}
                    </p>
                    {log.note && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {log.note}
                      </p>
                    )}
                    {log.quantityChange !== null && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium">
                          Quantity: {log.previousQuantity} → {log.newQuantity}
                        </span>
                        <span className={`ml-2 ${log.quantityChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ({log.quantityChange > 0 ? '+' : ''}{log.quantityChange})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No audit logs available
            </p>
          )}
        </div>
      </div>
    </div>
  )
}