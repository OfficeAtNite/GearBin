'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { ChevronDown, Building2, Check } from 'lucide-react'

interface Company {
  id: string
  name: string
  joinCode: string
  organizationType: string
  location?: string
  isCurrent: boolean
}

interface CompanySwitcherProps {
  onCompanySwitch?: () => void
  className?: string
}

export function CompanySwitcher({ onCompanySwitch, className = '' }: CompanySwitcherProps) {
  const { data: session } = useSession()
  const [companies, setCompanies] = useState<Company[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchCompanies()
  }, [session])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/user/companies')
      if (response.ok) {
        const data = await response.json()
        setCompanies(data.companies)
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error)
    }
  }

  const handleCompanySwitch = async (joinCode: string) => {
    if (isLoading) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/company/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode })
      })

      if (response.ok) {
        setIsOpen(false)
        onCompanySwitch?.()
        // Refresh the page to update session data
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
    } finally {
      setIsLoading(false)
    }
  }

  const currentCompany = companies.find(c => c.isCurrent)
  
  if (!currentCompany || companies.length <= 1) {
    return null
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        disabled={isLoading}
      >
        <Building2 className="h-4 w-4" />
        <span className="max-w-32 truncate">{currentCompany.name}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 mb-1">
              Switch Company
            </div>
            
            {companies.map((company) => (
              <button
                key={company.id}
                onClick={() => {
                  if (!company.isCurrent) {
                    handleCompanySwitch(company.joinCode)
                  }
                }}
                disabled={company.isCurrent || isLoading}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center justify-between transition-colors ${
                  company.isCurrent
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 cursor-default'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{company.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {company.organizationType.toLowerCase().replace('_', ' ')}
                    {company.location && ` • ${company.location}`}
                  </span>
                </div>
                {company.isCurrent && (
                  <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}