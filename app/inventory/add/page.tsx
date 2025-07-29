'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Camera, Upload, Loader2, X, Tag, Plus } from 'lucide-react'
import Link from 'next/link'

interface Tag {
  id: string
  name: string
  color: string
}

export default function AddInventoryPage() {
  const router = useRouter()
  const { data: session } = useSession()

  useEffect(() => {
    fetchTags()
  }, [])

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

  const createTag = async () => {
    if (!newTagName.trim()) return

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTagName.trim(),
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setAvailableTags(prev => [...prev, result.tag])
        setSelectedTags(prev => [...prev, result.tag.id])
        setNewTagName('')
        setShowAddTag(false)
      }
    } catch (error) {
      console.error('Failed to create tag:', error)
    }
  }

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    quantity: '',
    lowStockThreshold: '10',
    notes: '',
  })
  const [image, setImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [showAddTag, setShowAddTag] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // For now, we'll just create a data URL
      // In production, you'd want to upload to a cloud storage service
      const reader = new FileReader()
      reader.onload = (e) => {
        setImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!formData.name.trim()) {
      setError('Item name is required')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity) || 0,
          lowStockThreshold: parseInt(formData.lowStockThreshold) || 10,
          image,
          tags: selectedTags,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        setError(result.error || 'Failed to create item')
        return
      }

      // Success - redirect back to dashboard
      router.push('/dashboard')
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!session?.user?.companyId) {
    router.push('/onboarding')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-4">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard"
              className="p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Add New Item
            </h1>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Item Photo (Optional)
            </label>
            <div className="flex items-center space-x-4">
              {image ? (
                <div className="relative w-20 h-20">
                  <img
                    src={image}
                    alt="Item preview"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setImage(null)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <Camera className="h-8 w-8 text-gray-400" />
                </div>
              )}
              
              <div className="flex-1">
                <label className="btn-secondary cursor-pointer inline-flex">
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Item Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="input-field mt-1"
                placeholder="Enter item name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="input-field mt-1 resize-none"
                placeholder="Optional description"
                value={formData.description}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Starting Quantity
                </label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0"
                  className="input-field mt-1"
                  placeholder="0"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
  
              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags
                </label>
                
                <div className="space-y-3">
                  {/* Selected Tags */}
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map(tagId => {
                        const tag = availableTags.find(t => t.id === tagId)
                        return tag ? (
                          <span
                            key={tag.id}
                            className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                          >
                            {tag.name}
                            <button
                              type="button"
                              onClick={() => toggleTag(tag.id)}
                              className="ml-1 text-primary-500 hover:text-primary-700"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ) : null
                      })}
                    </div>
                  )}
  
                  {/* Available Tags */}
                  <div className="flex flex-wrap gap-2">
                    {availableTags.filter(tag => !selectedTags.includes(tag.id)).map(tag => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {tag.name}
                      </button>
                    ))}
                  </div>
  
                  {/* Add New Tag */}
                  {showAddTag ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Tag name"
                        className="input-field text-sm flex-1"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && createTag()}
                      />
                      <button
                        type="button"
                        onClick={createTag}
                        className="btn-primary text-sm"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddTag(false)
                          setNewTagName('')
                        }}
                        className="btn-secondary text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddTag(true)}
                      className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Tag
                    </button>
                  )}
                </div>
              </div>
  
              <div>
                <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Low Stock Alert
                </label>
                <input
                  id="lowStockThreshold"
                  name="lowStockThreshold"
                  type="number"
                  min="0"
                  className="input-field mt-1"
                  placeholder="10"
                  value={formData.lowStockThreshold}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="input-field mt-1 resize-none"
                placeholder="Optional notes about this item"
                value={formData.notes}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating item...
                </>
              ) : (
                'Add to Inventory'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}