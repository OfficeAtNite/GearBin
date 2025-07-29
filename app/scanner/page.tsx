'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Camera, Plus, Minus, Package } from 'lucide-react'
import Link from 'next/link'
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode'

interface InventoryItem {
  id: string
  name: string
  quantity: number
  lowStockThreshold: number
  image?: string
  description?: string
}

export default function ScannerPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isScanning, setIsScanning] = useState(false)
  const [scannedCode, setScannedCode] = useState('')
  const [foundItem, setFoundItem] = useState<InventoryItem | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  useEffect(() => {
    if (!session?.user?.companyId) {
      router.push('/auth/signin')
      return
    }
    fetchItems()
  }, [session, router])

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/inventory')
      if (response.ok) {
        const data = await response.json()
        setItems(data.items)
      }
    } catch (error) {
      console.error('Failed to fetch items:', error)
    }
  }

  const startScanner = () => {
    setIsScanning(true)
    setFoundItem(null)
    setScannedCode('')

    // Initialize scanner
    scannerRef.current = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
      },
      false
    )

    scannerRef.current.render(
      (decodedText: string) => {
        // Success callback
        setScannedCode(decodedText)
        searchByCode(decodedText)
        stopScanner()
      },
      (error: string) => {
        // Error callback - ignore
        console.warn('QR scan error:', error)
      }
    )
  }

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear()
      scannerRef.current = null
    }
    setIsScanning(false)
  }

  const searchByCode = (code: string) => {
    // Try to find item by name, description, or ID
    const found = items.find(item => 
      item.name.toLowerCase().includes(code.toLowerCase()) ||
      item.description?.toLowerCase().includes(code.toLowerCase()) ||
      item.id === code
    )
    
    if (found) {
      setFoundItem(found)
    } else {
      // If not found, set the scanned code for manual search
      setSearchTerm(code)
    }
  }

  const searchByName = (term: string) => {
    setSearchTerm(term)
    if (term.trim()) {
      const found = items.find(item =>
        item.name.toLowerCase().includes(term.toLowerCase()) ||
        item.description?.toLowerCase().includes(term.toLowerCase())
      )
      setFoundItem(found || null)
    } else {
      setFoundItem(null)
    }
  }

  const updateQuantity = async (itemId: string, change: number) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/inventory/update-quantity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId,
          change,
          note: `Updated via QR scanner: ${change > 0 ? '+' : ''}${change}`
        }),
      })

      if (response.ok) {
        // Refresh the found item
        await fetchItems()
        const updatedItem = items.find(item => item.id === itemId)
        if (updatedItem) {
          setFoundItem({
            ...updatedItem,
            quantity: updatedItem.quantity + change
          })
        }
      }
    } catch (error) {
      console.error('Failed to update quantity:', error)
    } finally {
      setIsLoading(false)
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
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard"
              className="p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              QR Scanner
            </h1>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Scanner Section */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Scan or Search Item
          </h2>

          {!isScanning && (
            <div className="space-y-4">
              <button
                onClick={startScanner}
                className="btn-primary w-full"
              >
                <Camera className="h-5 w-5 mr-2" />
                Start Camera Scanner
              </button>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Or type item name to search..."
                  className="input-field"
                  value={searchTerm}
                  onChange={(e) => searchByName(e.target.value)}
                />
              </div>
            </div>
          )}

          {isScanning && (
            <div className="space-y-4">
              <div id="qr-reader" className="w-full"></div>
              <button
                onClick={stopScanner}
                className="btn-secondary w-full"
              >
                Stop Scanner
              </button>
            </div>
          )}

          {scannedCode && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Scanned: <span className="font-mono">{scannedCode}</span>
              </p>
            </div>
          )}
        </div>

        {/* Found Item Section */}
        {foundItem && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Item Found
            </h3>

            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                {foundItem.image ? (
                  <img src={foundItem.image} alt={foundItem.name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <Package className="h-8 w-8 text-gray-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {foundItem.name}
                </h4>
                {foundItem.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {foundItem.description}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Current Stock: <span className="font-semibold">{foundItem.quantity}</span>
                    {foundItem.quantity <= foundItem.lowStockThreshold && (
                      <span className="ml-2 text-red-500 text-xs">LOW STOCK</span>
                    )}
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="mt-4 flex items-center space-x-3">
                  <button
                    onClick={() => updateQuantity(foundItem.id, -1)}
                    disabled={isLoading || foundItem.quantity <= 0}
                    className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white flex items-center justify-center"
                  >
                    <Minus className="h-5 w-5" />
                  </button>

                  <span className="text-2xl font-bold text-gray-900 dark:text-white min-w-[3rem] text-center">
                    {foundItem.quantity}
                  </span>

                  <button
                    onClick={() => updateQuantity(foundItem.id, 1)}
                    disabled={isLoading}
                    className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white flex items-center justify-center"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>

                {/* Quick Adjustment Buttons */}
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {[-10, -5, +5, +10].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => updateQuantity(foundItem.id, amount)}
                      disabled={isLoading || (amount < 0 && foundItem.quantity + amount < 0)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        amount < 0
                          ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400'
                          : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {amount > 0 ? '+' : ''}{amount}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Item Found */}
        {searchTerm && !foundItem && (
          <div className="card p-6">
            <div className="text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Item Found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No inventory item matches "{searchTerm}"
              </p>
              <Link href="/inventory/add" className="btn-primary">
                Add New Item
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}