'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Copy, Check, Users, Shield, Trash2, Mail, UserPlus, Building, GitBranch, MapPin, Briefcase, Home, Tag, Edit2, Palette } from 'lucide-react'
import Link from 'next/link'

interface CompanyUser {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

interface Company {
  id: string
  name: string
  joinCode: string
  organizationType: string
  parentCompanyId?: string
  location?: string
  description?: string
  users: CompanyUser[]
  childCompanies?: Company[]
  parentCompany?: Company
}

interface Category {
  id: string
  name: string
  description?: string
  color?: string
  _count: {
    items: number
  }
}

interface OrganizationTree {
  organizationTree: Company
  currentCompanyId: string
  userRole: string
}

export default function AdminPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [company, setCompany] = useState<Company | null>(null)
  const [organizationTree, setOrganizationTree] = useState<OrganizationTree | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showOrgTree, setShowOrgTree] = useState(false)
  const [showCreateChild, setShowCreateChild] = useState(false)
  const [isCreatingChild, setIsCreatingChild] = useState(false)
  const [childOrgForm, setChildOrgForm] = useState({
    name: '',
    organizationType: 'BRANCH' as const,
    location: '',
    description: ''
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [showCreateCategory, setShowCreateCategory] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  })

  useEffect(() => {
    if (!session?.user?.companyId) {
      router.push('/auth/signin')
      return
    }

    if (session.user.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }

    fetchCompanyData()
    fetchOrganizationTree()
    fetchCategories()
  }, [session, router])

  const fetchOrganizationTree = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/organization-tree')
      if (response.ok) {
        const tree = await response.json()
        setOrganizationTree(tree)
      }
    } catch (error) {
      console.error('Failed to fetch organization tree:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCompanyData = async () => {
    try {
      const response = await fetch('/api/admin/company')
      if (response.ok) {
        const data = await response.json()
        setCompany(data.company)
      }
    } catch (error) {
      console.error('Failed to fetch company data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const copyJoinCode = async () => {
    if (company?.joinCode) {
      try {
        await navigator.clipboard.writeText(company.joinCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setIsInviting(true)
    try {
      const response = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
        }),
      })

      if (response.ok) {
        alert('Invitation sent successfully!')
        setInviteEmail('')
      } else {
        const error = await response.json()
        alert(`Failed to send invite: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to send invite:', error)
      alert('Failed to send invitation')
    } finally {
      setIsInviting(false)
    }
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          role: newRole,
        }),
      })

      if (response.ok) {
        fetchCompanyData() // Refresh data
      } else {
        const error = await response.json()
        alert(`Failed to update role: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to update role:', error)
      alert('Failed to update user role')
    }
  }

  const removeUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user from the company?')) {
      return
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
        }),
      })

      if (response.ok) {
        fetchCompanyData() // Refresh data
      } else {
        const error = await response.json()
        alert(`Failed to remove user: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to remove user:', error)
      alert('Failed to remove user')
    }
  }

  const createChildOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!childOrgForm.name.trim()) return

    setIsCreatingChild(true)
    try {
      const response = await fetch('/api/admin/child-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: childOrgForm.name.trim(),
          organizationType: childOrgForm.organizationType,
          location: childOrgForm.location.trim() || undefined,
          description: childOrgForm.description.trim() || undefined,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Child organization "${result.company.name}" created successfully!\nJoin Code: ${result.company.joinCode}`)
        setChildOrgForm({
          name: '',
          organizationType: 'BRANCH',
          location: '',
          description: ''
        })
        setShowCreateChild(false)
        // Refresh organization tree
        fetchOrganizationTree()
      } else {
        const error = await response.json()
        alert(`Failed to create child organization: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to create child organization:', error)
      alert('Failed to create child organization')
    } finally {
      setIsCreatingChild(false)
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

  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryForm.name.trim()) return

    setIsCreatingCategory(true)
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || undefined,
          color: categoryForm.color,
        }),
      })

      if (response.ok) {
        alert('Category created successfully!')
        setCategoryForm({
          name: '',
          description: '',
          color: '#3B82F6'
        })
        setShowCreateCategory(false)
        fetchCategories()
      } else {
        const error = await response.json()
        alert(`Failed to create category: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to create category:', error)
      alert('Failed to create category')
    } finally {
      setIsCreatingCategory(false)
    }
  }

  const updateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategory || !categoryForm.name.trim()) return

    setIsCreatingCategory(true)
    try {
      const response = await fetch(`/api/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || undefined,
          color: categoryForm.color,
        }),
      })

      if (response.ok) {
        alert('Category updated successfully!')
        setCategoryForm({
          name: '',
          description: '',
          color: '#3B82F6'
        })
        setEditingCategory(null)
        setShowCreateCategory(false)
        fetchCategories()
      } else {
        const error = await response.json()
        alert(`Failed to update category: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to update category:', error)
      alert('Failed to update category')
    } finally {
      setIsCreatingCategory(false)
    }
  }

  const deleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? Items in this category will be uncategorized.')) {
      return
    }

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Category deleted successfully!')
        fetchCategories()
      } else {
        const error = await response.json()
        alert(`Failed to delete category: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to delete category:', error)
      alert('Failed to delete category')
    }
  }

  const startEditCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      color: category.color || '#3B82F6'
    })
    setShowCreateCategory(true)
  }

  const cancelCategoryForm = () => {
    setShowCreateCategory(false)
    setEditingCategory(null)
    setCategoryForm({
      name: '',
      description: '',
      color: '#3B82F6'
    })
  }

  if (!session?.user?.companyId || session.user.role !== 'ADMIN') {
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
              Company Admin
            </h1>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
          </div>
        ) : (
          <>
            {/* Company Info */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Company Information
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Company Name
                  </label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {company?.name}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Join Code
                  </label>
                  <div className="flex items-center space-x-2">
                    <code className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg font-mono text-lg tracking-wider flex-1">
                      {company?.joinCode}
                    </code>
                    <button
                      onClick={copyJoinCode}
                      className="btn-secondary"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Share this code with new team members to join your company
                  </p>
                </div>
              </div>
            </div>

            {/* Invite Users */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Invite New User
              </h2>
              
              <form onSubmit={sendInvite} className="space-y-4">
                <div>
                  <label htmlFor="inviteEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    id="inviteEmail"
                    type="email"
                    required
                    className="input-field"
                    placeholder="Enter email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={isInviting}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isInviting || !inviteEmail.trim()}
                  className="btn-primary"
                >
                  {isInviting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Company Users */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Company Users ({company?.users?.length || 0})
              </h2>

              {company?.users && company.users.length > 0 ? (
                <div className="space-y-3">
                  {company.users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {user.name || 'Unnamed User'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <select
                          value={user.role}
                          onChange={(e) => updateUserRole(user.id, e.target.value)}
                          disabled={user.id === session.user.id}
                          className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                          <option value="USER">User</option>
                          <option value="ADMIN">Admin</option>
                        </select>

                        {user.id !== session.user.id && (
                          <button
                            onClick={() => removeUser(user.id)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No users found. Invite team members to get started.
                  </p>
                </div>
              )}
            </div>

            {/* Create Child Organization */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Create Child Organization
                </h2>
                <button
                  onClick={() => setShowCreateChild(!showCreateChild)}
                  className="btn-secondary text-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {showCreateChild ? 'Cancel' : 'New Organization'}
                </button>
              </div>

              {showCreateChild && (
                <form onSubmit={createChildOrganization} className="space-y-4">
                  <div>
                    <label htmlFor="childOrgName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Organization Name *
                    </label>
                    <input
                      id="childOrgName"
                      type="text"
                      required
                      className="input-field"
                      placeholder="Enter organization name"
                      value={childOrgForm.name}
                      onChange={(e) => setChildOrgForm(prev => ({ ...prev, name: e.target.value }))}
                      disabled={isCreatingChild}
                    />
                  </div>

                  <div>
                    <label htmlFor="childOrgType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Organization Type *
                    </label>
                    <select
                      id="childOrgType"
                      className="input-field"
                      value={childOrgForm.organizationType}
                      onChange={(e) => setChildOrgForm(prev => ({ ...prev, organizationType: e.target.value as any }))}
                      disabled={isCreatingChild}
                    >
                      <option value="SUBSIDIARY">Subsidiary</option>
                      <option value="BRANCH">Branch</option>
                      <option value="LOCATION">Location</option>
                      <option value="DIVISION">Division</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="childOrgLocation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Location
                    </label>
                    <input
                      id="childOrgLocation"
                      type="text"
                      className="input-field"
                      placeholder="Enter location (optional)"
                      value={childOrgForm.location}
                      onChange={(e) => setChildOrgForm(prev => ({ ...prev, location: e.target.value }))}
                      disabled={isCreatingChild}
                    />
                  </div>

                  <div>
                    <label htmlFor="childOrgDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      id="childOrgDescription"
                      rows={3}
                      className="input-field"
                      placeholder="Enter description (optional)"
                      value={childOrgForm.description}
                      onChange={(e) => setChildOrgForm(prev => ({ ...prev, description: e.target.value }))}
                      disabled={isCreatingChild}
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={isCreatingChild || !childOrgForm.name.trim()}
                      className="btn-primary flex-1"
                    >
                      {isCreatingChild ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <Building className="h-4 w-4 mr-2" />
                          Create Organization
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateChild(false)}
                      className="btn-secondary"
                      disabled={isCreatingChild}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Building className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                      Organization Types
                    </p>
                    <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                      <li><strong>Subsidiary:</strong> A separate legal entity owned by the parent</li>
                      <li><strong>Branch:</strong> An extension of the parent company</li>
                      <li><strong>Location:</strong> A physical location or office</li>
                      <li><strong>Division:</strong> A functional division within the company</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Management */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Category Management
                </h2>
                <button
                  onClick={() => setShowCreateCategory(!showCreateCategory)}
                  className="btn-secondary text-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {showCreateCategory ? 'Cancel' : 'New Category'}
                </button>
              </div>

              {showCreateCategory && (
                <form onSubmit={editingCategory ? updateCategory : createCategory} className="space-y-4 mb-6">
                  <div>
                    <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category Name *
                    </label>
                    <input
                      id="categoryName"
                      type="text"
                      required
                      className="input-field"
                      placeholder="Enter category name"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                      disabled={isCreatingCategory}
                    />
                  </div>

                  <div>
                    <label htmlFor="categoryDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      id="categoryDescription"
                      rows={2}
                      className="input-field"
                      placeholder="Enter category description (optional)"
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                      disabled={isCreatingCategory}
                    />
                  </div>

                  <div>
                    <label htmlFor="categoryColor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Color
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        id="categoryColor"
                        type="color"
                        className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        value={categoryForm.color}
                        onChange={(e) => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                        disabled={isCreatingCategory}
                      />
                      <div
                        className="px-3 py-2 rounded-lg text-white text-sm font-medium"
                        style={{ backgroundColor: categoryForm.color }}
                      >
                        {categoryForm.name || 'Preview'}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={isCreatingCategory || !categoryForm.name.trim()}
                      className="btn-primary"
                    >
                      {isCreatingCategory ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {editingCategory ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        <>
                          <Tag className="h-4 w-4 mr-2" />
                          {editingCategory ? 'Update Category' : 'Create Category'}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={cancelCategoryForm}
                      className="btn-secondary"
                      disabled={isCreatingCategory}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {categories.length > 0 ? (
                <div className="space-y-3">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color || '#3B82F6' }}
                        />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {category.name}
                          </p>
                          {category.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {category.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {category._count.items} item{category._count.items !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => startEditCategory(category)}
                          className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteCategory(category.id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Tag className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No categories created yet. Create categories to organize your inventory items.
                  </p>
                </div>
              )}
            </div>

            {/* Organization Tree */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Organization Tree
                </h2>
                <button
                  onClick={() => setShowOrgTree(!showOrgTree)}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {showOrgTree ? 'Hide Tree' : 'Show Tree'}
                </button>
              </div>

              {showOrgTree && (
                <div className="space-y-4">
                  {organizationTree ? (
                    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                      <OrganizationTreeNode
                        company={organizationTree.organizationTree}
                        currentCompanyId={organizationTree.currentCompanyId}
                        level={0}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                      <p className="text-gray-500 dark:text-gray-400">
                        Loading organization tree...
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Organization Tree Component
function OrganizationTreeNode({ company, currentCompanyId, level }: {
  company: any
  currentCompanyId: string
  level: number
}) {
  const getOrgTypeIcon = (orgType: string) => {
    switch (orgType) {
      case 'PARENT':
        return '🏢'
      case 'SUBSIDIARY':
        return '🏬'
      case 'BRANCH':
        return '🏪'
      case 'LOCATION':
        return '📍'
      case 'DIVISION':
        return '🏗️'
      default:
        return '🏢'
    }
  }

  const getOrgTypeLabel = (orgType: string) => {
    switch (orgType) {
      case 'PARENT':
        return 'Parent Company'
      case 'SUBSIDIARY':
        return 'Subsidiary'
      case 'BRANCH':
        return 'Branch'
      case 'LOCATION':
        return 'Location'
      case 'DIVISION':
        return 'Division'
      default:
        return 'Company'
    }
  }

  const isCurrentCompany = company.id === currentCompanyId
  const userCount = company._count?.users || 0

  return (
    <div className={`${level > 0 ? 'ml-6 border-l-2 border-gray-300 dark:border-gray-600 pl-4' : ''}`}>
      <div className={`p-3 rounded-lg border ${
        isCurrentCompany
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl" title={getOrgTypeLabel(company.organizationType || 'PARENT')}>
              {getOrgTypeIcon(company.organizationType || 'PARENT')}
            </span>
            <div>
              <h3 className={`font-medium ${
                isCurrentCompany
                  ? 'text-blue-900 dark:text-blue-100'
                  : 'text-gray-900 dark:text-white'
              }`}>
                {company.name}
                {isCurrentCompany && (
                  <span className="ml-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full">
                    Current
                  </span>
                )}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <span>{getOrgTypeLabel(company.organizationType || 'PARENT')}</span>
                <span>•</span>
                <span>{userCount} user{userCount !== 1 ? 's' : ''}</span>
                {company.location && (
                  <>
                    <span>•</span>
                    <span>{company.location}</span>
                  </>
                )}
              </div>
              {company.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {company.description}
                </p>
              )}
            </div>
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            ID: {company.id.slice(-8)}
          </div>
        </div>
      </div>
      
      {company.childCompanies && company.childCompanies.length > 0 && (
        <div className="mt-3 space-y-2">
          {company.childCompanies.map((child: any) => (
            <OrganizationTreeNode
              key={child.id}
              company={child}
              currentCompanyId={currentCompanyId}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}