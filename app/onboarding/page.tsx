'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Users, Loader2, Copy, Check } from 'lucide-react'

export default function OnboardingPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [companyName, setCompanyName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdJoinCode, setCreatedJoinCode] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (session?.user?.companyId) {
      router.push('/dashboard')
    }
  }, [session, router])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyName.trim()) {
      setError('Company name is required')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/company/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: companyName.trim(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to create company')
        return
      }

      setCreatedJoinCode(result.joinCode)
      
      // Update session to reflect new company
      await update()
      
      // Show success state with join code
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) {
      setError('Join code is required')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/company/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          joinCode: joinCode.trim().toUpperCase(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to join company')
        return
      }

      // Update session to reflect new company
      await update()
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (createdJoinCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Company Created!
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Your company has been successfully created. Share this join code with your team members.
            </p>
          </div>

          <div className="card p-6">
            <div className="text-center">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Company Join Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={createdJoinCode}
                  readOnly
                  className="input-field text-center text-lg font-mono tracking-wider pr-10"
                />
                <button
                  onClick={() => copyToClipboard(createdJoinCode)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Team members can use this code to join your company
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="btn-primary w-full"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome to GearBin
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Set up your company to start managing inventory
          </p>
        </div>

        <div className="space-y-6">
          {/* Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              How would you like to proceed?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('create')}
                className={`p-4 rounded-lg border text-sm font-medium transition-colors ${
                  mode === 'create'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Plus className="h-6 w-6 mx-auto mb-2" />
                Create New Company
              </button>
              <button
                type="button"
                onClick={() => setMode('join')}
                className={`p-4 rounded-lg border text-sm font-medium transition-colors ${
                  mode === 'join'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Users className="h-6 w-6 mx-auto mb-2" />
                Join Existing Company
              </button>
            </div>
          </div>

          {/* Form */}
          {mode === 'create' ? (
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Company Name
                </label>
                <input
                  id="companyName"
                  type="text"
                  required
                  className="input-field mt-1"
                  placeholder="Enter your company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating company...
                  </>
                ) : (
                  'Create Company'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinCompany} className="space-y-4">
              <div>
                <label htmlFor="joinCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Company Join Code
                </label>
                <input
                  id="joinCode"
                  type="text"
                  required
                  className="input-field mt-1 uppercase tracking-wider"
                  placeholder="Enter 8-character join code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  disabled={isLoading}
                  maxLength={8}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Ask your company admin for the join code
                </p>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Joining company...
                  </>
                ) : (
                  'Join Company'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}