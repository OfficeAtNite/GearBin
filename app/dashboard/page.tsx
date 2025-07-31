'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter, MoreVertical, Package, AlertTriangle, QrCode, Download, Upload, Moon, Sun, Shield, LogOut, Building2, X, Eye } from 'lucide-react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { CompanySwitcher } from '@/components/ui/company-switcher'

interface InventoryItem {
  id: string
  name: string
  quantity: number
  lowStockThreshold: number
  image?: string
  notes?: string
  updatedAt: string
  category?: {
    id: string
    name: string
    color: string
  }
}

interface Category {
  id: string
  name: string
  description?: string
  color: string
  itemCount: number
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [categories, setCategories] = useState<Category[]>([])
  const [showImportModal, setShowImportModal] = useState(false)
  const [importMode, setImportMode] = useState<'overwrite' | 'increment' | 'restore'>('overwrite')
  const [showMenu, setShowMenu] = useState(false)
  const [showSwitchCompanyModal, setShowSwitchCompanyModal] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [newCompanyName, setNewCompanyName] = useState('')
  const [companyMode, setCompanyMode] = useState<'join' | 'create'>('join')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!session?.user?.companyId) {
      router.push('/onboarding')
      return
    }
    fetchItems()
    fetchCategories()
  }, [session, router])

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/inventory')
      if (response.ok) {
        const data = await response.json()
        setItems(data.items)
      }
    } catch (error) {
      console.error('Failed to fetch items:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories)
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const updateQuantity = async (itemId: string, change: number) => {
    try {
      const response = await fetch('/api/inventory/update-quantity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId,
          change,
        }),
      })

      if (response.ok) {
        fetchItems() // Refresh the list
      }
    } catch (error) {
      console.error('Failed to update quantity:', error)
    }
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
    const isLowStock = item.quantity <= item.lowStockThreshold
    const matchesCategory = !selectedCategory || item.category?.id === selectedCategory
    
    if (showLowStockOnly) {
      return matchesSearch && isLowStock && matchesCategory
    }
    
    return matchesSearch && matchesCategory
  })

  const handleExport = async () => {
    try {
      const response = await fetch('/api/inventory/export')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `gearbin-inventory-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setShowImportModal(true)
      // Store file for import
      ;(window as any).pendingImportFile = file
    }
  }

  const handleImport = async () => {
    const file = (window as any).pendingImportFile
    if (!file) return

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('mode', importMode)

      const response = await fetch('/api/inventory/import', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Import completed: ${result.summary.created} created, ${result.summary.updated} updated`)
        fetchItems() // Refresh the list
      } else {
        const error = await response.json()
        alert(`Import failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Import failed:', error)
      alert('Import failed')
    } finally {
      setShowImportModal(false)
      delete (window as any).pendingImportFile
    }
  }

  const lowStockCount = items.filter(item => item.quantity <= item.lowStockThreshold).length

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

  const handleSwitchCompany = async () => {
    if (companyMode === 'join') {
      if (!joinCode.trim()) return

      try {
        const response = await fetch('/api/company/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ joinCode: joinCode.trim() })
        })

        if (response.ok) {
          // Refresh the session to get updated company info
          if (typeof window !== 'undefined') {
            window.location.reload()
          }
        } else {
          const error = await response.json()
          alert(error.message || 'Failed to switch company')
        }
      } catch (error) {
        console.error('Switch company error:', error)
        alert('Failed to switch company')
      }
    } else {
      // Create new company
      if (!newCompanyName.trim()) return

      try {
        const response = await fetch('/api/company/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newCompanyName.trim() })
        })

        if (response.ok) {
          const result = await response.json()
          // Update user's company and refresh
          const switchResponse = await fetch('/api/company/switch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ joinCode: result.company.joinCode })
          })

          if (switchResponse.ok) {
            if (typeof window !== 'undefined') {
              window.location.reload()
            }
          }
        } else {
          const error = await response.json()
          alert(error.message || 'Failed to create company')
        }
      } catch (error) {
        console.error('Create company error:', error)
        alert('Failed to create company')
      }
    }
  }

  if (!session?.user?.companyId) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                <span className="text-red-500">Gear</span><span className="text-green-500">Bin</span>
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {session.user.company?.name}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Company Switcher */}
              <CompanySwitcher />
              
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {/* QR Scanner */}
              <Link href="/scanner" className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                <QrCode className="h-5 w-5" />
              </Link>

              {/* Admin Panel (for admins only) */}
              {session.user.role === 'ADMIN' && (
                <Link href="/admin" className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Shield className="h-5 w-5" />
                </Link>
              )}

              {/* Menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                    <div className="p-2">
                      <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                        {session.user.name}
                        <div className="text-xs text-gray-400">{session.user.email}</div>
                      </div>
                      
                      <button
                        onClick={() => {
                          setShowMenu(false)
                          setShowSwitchCompanyModal(true)
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center space-x-2 mt-1"
                      >
                        <Building2 className="h-4 w-4" />
                        <span>Switch Company</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowMenu(false)
                          handleSignOut()
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md flex items-center space-x-2"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {items.length} Items
              </span>
            </div>
            {lowStockCount > 0 && (
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-600 dark:text-red-400">
                  {lowStockCount} Low Stock
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="p-1.5 rounded text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer">
              <Upload className="h-4 w-4" />
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <button
              onClick={handleExport}
              className="p-1.5 rounded text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search inventory..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-0 focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({category.itemCount})
              </option>
            ))}
          </select>

          {/* Low Stock Filter */}
          <button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showLowStockOnly
                ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            <Filter className="h-3 w-3 mr-1" />
            Low Stock Only
          </button>

          {/* Clear Filters */}
          {(selectedCategory || showLowStockOnly) && (
            <button
              onClick={() => {
                setSelectedCategory('')
                setShowLowStockOnly(false)
              }}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <X className="h-3 w-3 mr-1" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Inventory List */}
      <div className="px-4 pb-20">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {items.length === 0 ? 'No inventory items yet' : 'No items match your search'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`card p-4 ${
                  item.quantity <= item.lowStockThreshold ? 'ring-2 ring-red-200 dark:ring-red-800' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  {/* Item Image/Icon */}
                  <Link href={`/inventory/${item.id}`} className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Package className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  </Link>

                  {/* Item Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <Link href={`/inventory/${item.id}`} className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer">
                            {item.name}
                          </h3>
                          {item.category && (
                            <span
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: item.category.color + '20',
                                color: item.category.color
                              }}
                            >
                              {item.category.name}
                            </span>
                          )}
                        </div>
                      </Link>
                      <div className="flex items-center space-x-2 ml-2">
                        {item.quantity <= item.lowStockThreshold && (
                          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                        <Link href={`/inventory/${item.id}`}>
                          <button className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <Eye className="h-4 w-4" />
                          </button>
                        </Link>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Stock: {item.quantity}
                      </p>
                      <div className="flex items-center space-x-2 ml-3">
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            updateQuantity(item.id, -1)
                          }}
                          disabled={item.quantity <= 0}
                          className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white flex items-center justify-center text-sm font-semibold"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            updateQuantity(item.id, 1)
                          }}
                          className="w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center text-sm font-semibold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <Link
        href="/inventory/add"
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center"
      >
        <Plus className="h-6 w-6" />
      </Link>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Import CSV File
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Import Mode
                </label>
                <select
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as any)}
                  className="input-field"
                >
                  <option value="overwrite">Overwrite existing quantities</option>
                  <option value="increment">Add to existing quantities</option>
                  <option value="restore">Restore complete item data</option>
                </select>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400">
                {importMode === 'overwrite' && 'Existing item quantities will be replaced with CSV values.'}
                {importMode === 'increment' && 'CSV quantities will be added to existing stock.'}
                {importMode === 'restore' && 'Complete item data will be updated from CSV.'}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  className="btn-primary flex-1"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Switch Company Modal */}
      {showSwitchCompanyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Company Management
              </h3>
              <button
                onClick={() => {
                  setShowSwitchCompanyModal(false)
                  setCompanyMode('join')
                  setJoinCode('')
                  setNewCompanyName('')
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Mode Selection */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setCompanyMode('join')}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    companyMode === 'join'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Join Company
                </button>
                <button
                  onClick={() => setCompanyMode('create')}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    companyMode === 'create'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Create New
                </button>
              </div>

              {companyMode === 'join' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Company Join Code
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="Enter company join code"
                    className="input-field"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Company Name
                  </label>
                  <input
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Enter company name"
                    className="input-field"
                  />
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Multi-Business Support:</strong> Perfect for managing multiple locations,
                  subsidiaries, or separate businesses. Each company has isolated inventory data.
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowSwitchCompanyModal(false)
                    setCompanyMode('join')
                    setJoinCode('')
                    setNewCompanyName('')
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSwitchCompany}
                  disabled={companyMode === 'join' ? !joinCode.trim() : !newCompanyName.trim()}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {companyMode === 'join' ? 'Switch Company' : 'Create & Switch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}