'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Edit3, Save, X, Tag, Plus, Trash2, Clock, User, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'
import Link from 'next/link'

interface Tag {
  id: string
  name: string
  color: string
}

interface ItemImage {
  id: string
  imageUrl: string
  fileName?: string
  fileSize?: number
  mimeType?: string
  isPrimary: boolean
  createdAt: string
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
  images?: ItemImage[]
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
  const [images, setImages] = useState<ItemImage[]>([])
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [expandedImageIndex, setExpandedImageIndex] = useState<number | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchItem()
      fetchAuditLogs()
      fetchTags()
      fetchImages()
    }
  }, [params.id])

  // Keyboard navigation for image modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (expandedImageIndex === null) return

      switch (event.key) {
        case 'Escape':
          handleCloseModal()
          break
        case 'ArrowLeft':
          handlePrevImage()
          break
        case 'ArrowRight':
          handleNextImage()
          break
      }
    }

    if (expandedImageIndex !== null) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [expandedImageIndex])

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

  const fetchImages = async () => {
    try {
      const response = await fetch(`/api/inventory/${params.id}/images`)
      if (response.ok) {
        const data = await response.json()
        setImages(data.images)
      }
    } catch (error) {
      console.error('Failed to fetch images:', error)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingImage(true)
    try {
      // Create a data URL for the image
      const reader = new FileReader()
      reader.onload = async (event) => {
        const imageUrl = event.target?.result as string
        
        // Upload to the images API
        const response = await fetch(`/api/inventory/${params.id}/images`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            isPrimary: images.length === 0, // Make first image primary
          }),
        })

        if (response.ok) {
          // Refresh images list
          fetchImages()
        } else {
          setError('Failed to upload image')
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      setError('Failed to upload image')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return
    }

    try {
      const response = await fetch(`/api/inventory/${params.id}/images?imageId=${imageId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Refresh images list
        fetchImages()
      } else {
        setError('Failed to delete image')
      }
    } catch (error) {
      setError('Failed to delete image')
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

  // Get all images including legacy image for modal navigation
  const getAllImages = () => {
    const allImages = []
    
    // Add legacy image if it exists and isn't already in images
    if (item?.image && !images.some(img => img.imageUrl === item.image)) {
      allImages.push({
        id: 'legacy',
        imageUrl: item.image,
        isPrimary: false,
        isLegacy: true
      })
    }
    
    // Add all other images
    allImages.push(...images.map(img => ({ ...img, isLegacy: false })))
    
    return allImages
  }

  const handleImageClick = (imageIndex: number) => {
    setExpandedImageIndex(imageIndex)
  }

  const handleNextImage = () => {
    const allImages = getAllImages()
    if (expandedImageIndex !== null && expandedImageIndex < allImages.length - 1) {
      setExpandedImageIndex(expandedImageIndex + 1)
    }
  }

  const handlePrevImage = () => {
    if (expandedImageIndex !== null && expandedImageIndex > 0) {
      setExpandedImageIndex(expandedImageIndex - 1)
    }
  }

  const handleCloseModal = () => {
    setExpandedImageIndex(null)
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
          {/* Images Gallery */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Images</h3>
              {isEditing && (
                <label className="btn-secondary cursor-pointer text-sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploadingImage}
                  />
                </label>
              )}
            </div>
            
            {images.length > 0 || item.image ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Legacy single image support */}
                {item.image && !images.some(img => img.imageUrl === item.image) && (
                  <div className="relative group cursor-pointer" onClick={() => handleImageClick(0)}>
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-32 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded">Legacy</span>
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                      <Maximize2 className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                )}
                
                {/* Multiple images */}
                {images.map((image, index) => {
                  const imageIndex = item.image && !images.some(img => img.imageUrl === item.image) ? index + 1 : index
                  return (
                    <div key={image.id} className="relative group cursor-pointer" onClick={() => handleImageClick(imageIndex)}>
                      <img
                        src={image.imageUrl}
                        alt={`${item.name} - Image ${image.id}`}
                        className="w-full h-32 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow"
                      />
                      {image.isPrimary && (
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-1 text-xs bg-green-500 text-white rounded">Primary</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                        <Maximize2 className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {isEditing && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteImage(image.id)
                            }}
                            className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No images uploaded</p>
                {isEditing && (
                  <p className="text-sm mt-1">Click "Add Image" to upload photos</p>
                )}
              </div>
            )}
          </div>

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

      {/* Image Expansion Modal */}
      {expandedImageIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="relative max-w-4xl max-h-full w-full h-full flex items-center justify-center p-4">
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <X className="h-8 w-8" />
            </button>

            {/* Navigation Buttons */}
            {getAllImages().length > 1 && (
              <>
                {expandedImageIndex > 0 && (
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
                  >
                    <ChevronLeft className="h-10 w-10" />
                  </button>
                )}
                {expandedImageIndex < getAllImages().length - 1 && (
                  <button
                    onClick={handleNextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
                  >
                    <ChevronRight className="h-10 w-10" />
                  </button>
                )}
              </>
            )}

            {/* Image */}
            <div className="relative max-w-full max-h-full">
              <img
                src={getAllImages()[expandedImageIndex]?.imageUrl}
                alt={`${item?.name} - Expanded view`}
                className="max-w-full max-h-full object-contain"
              />
              
              {/* Image Info */}
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg">
                <p className="text-sm">
                  {expandedImageIndex + 1} of {getAllImages().length}
                </p>
                {getAllImages()[expandedImageIndex]?.isPrimary && (
                  <span className="text-xs bg-green-500 px-2 py-1 rounded ml-2">Primary</span>
                )}
                {getAllImages()[expandedImageIndex]?.isLegacy && (
                  <span className="text-xs bg-blue-500 px-2 py-1 rounded ml-2">Legacy</span>
                )}
              </div>
            </div>

            {/* Keyboard Navigation Hint */}
            <div className="absolute bottom-4 right-4 text-white text-xs bg-black bg-opacity-50 px-3 py-2 rounded-lg">
              <p>Use arrow keys or click to navigate</p>
              <p>Press ESC to close</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}