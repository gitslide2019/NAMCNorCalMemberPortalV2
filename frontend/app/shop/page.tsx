'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Star, Filter, Search, Package, DollarSign, TrendingUp, Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ShopItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  imageUrl?: string
  inStock: number
  rating: number
  reviews: number
  revenueAllocation: {
    generalFund: number
    projectFunding: number
    scholarships: number
    events: number
  }
}

interface CartItem extends ShopItem {
  quantity: number
}

const mockShopItems: ShopItem[] = [
  {
    id: 'item-1',
    name: 'NAMC Safety Helmet',
    description: 'High-quality construction safety helmet with NAMC branding. ANSI Z89.1 certified.',
    price: 45.99,
    category: 'Safety Equipment',
    inStock: 25,
    rating: 4.8,
    reviews: 42,
    revenueAllocation: {
      generalFund: 25,
      projectFunding: 50,
      scholarships: 15,
      events: 10,
    },
  },
  {
    id: 'item-2',
    name: 'NAMC Polo Shirt',
    description: 'Professional polo shirt with embroidered NAMC logo. 100% cotton, available in multiple sizes.',
    price: 29.99,
    category: 'Apparel',
    inStock: 50,
    rating: 4.6,
    reviews: 28,
    revenueAllocation: {
      generalFund: 30,
      projectFunding: 40,
      scholarships: 20,
      events: 10,
    },
  },
  {
    id: 'item-3',
    name: 'Professional Tool Set',
    description: 'Complete 24-piece professional tool set in durable carrying case. Perfect for contractors.',
    price: 189.99,
    category: 'Tools',
    inStock: 15,
    rating: 4.9,
    reviews: 67,
    revenueAllocation: {
      generalFund: 20,
      projectFunding: 60,
      scholarships: 10,
      events: 10,
    },
  },
  {
    id: 'item-4',
    name: 'Construction Training Manual',
    description: 'Comprehensive training manual covering modern construction techniques and safety protocols.',
    price: 34.99,
    category: 'Training Materials',
    inStock: 100,
    rating: 4.7,
    reviews: 89,
    revenueAllocation: {
      generalFund: 15,
      projectFunding: 35,
      scholarships: 35,
      events: 15,
    },
  },
  {
    id: 'item-5',
    name: 'NAMC Branded Work Boots',
    description: 'Steel-toe work boots with NAMC branding. Slip-resistant sole, waterproof leather.',
    price: 129.99,
    category: 'Safety Equipment',
    inStock: 30,
    rating: 4.5,
    reviews: 55,
    revenueAllocation: {
      generalFund: 20,
      projectFunding: 55,
      scholarships: 15,
      events: 10,
    },
  },
  {
    id: 'item-6',
    name: 'Level and Measuring Set',
    description: 'Professional-grade level and measuring tools set for accurate construction work.',
    price: 79.99,
    category: 'Tools',
    inStock: 20,
    rating: 4.8,
    reviews: 34,
    revenueAllocation: {
      generalFund: 25,
      projectFunding: 50,
      scholarships: 15,
      events: 10,
    },
  },
]

export default function ShopPage() {
  const [items, setItems] = useState<ShopItem[]>(mockShopItems)
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [priceRange, setPriceRange] = useState('All')
  const [sortBy, setSortBy] = useState('name')
  const [showCart, setShowCart] = useState(false)
  const router = useRouter()

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
  }, [router])

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory
    
    let matchesPrice = true
    if (priceRange !== 'All') {
      const price = item.price
      switch (priceRange) {
        case 'Under $50':
          matchesPrice = price < 50
          break
        case '$50 - $100':
          matchesPrice = price >= 50 && price <= 100
          break
        case '$100 - $200':
          matchesPrice = price > 100 && price <= 200
          break
        case 'Over $200':
          matchesPrice = price > 200
          break
      }
    }
    
    return matchesSearch && matchesCategory && matchesPrice
  }).sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price
      case 'price-high':
        return b.price - a.price
      case 'rating':
        return b.rating - a.rating
      case 'name':
      default:
        return a.name.localeCompare(b.name)
    }
  })

  const categories = ['All', ...Array.from(new Set(items.map(i => i.category)))]
  const priceRanges = ['All', 'Under $50', '$50 - $100', '$100 - $200', 'Over $200']
  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
  ]

  const addToCart = (item: ShopItem, quantity: number = 1) => {
    setCart(prev => {
      const existingItem = prev.find(cartItem => cartItem.id === item.id)
      if (existingItem) {
        return prev.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem
        )
      } else {
        return [...prev, { ...item, quantity }]
      }
    })
  }

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId))
  }

  const updateCartQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId)
    } else {
      setCart(prev => prev.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      ))
    }
  }

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0)

  const getAllocationTotals = () => {
    return cart.reduce((totals, item) => {
      const itemTotal = item.price * item.quantity
      return {
        generalFund: totals.generalFund + (itemTotal * item.revenueAllocation.generalFund / 100),
        projectFunding: totals.projectFunding + (itemTotal * item.revenueAllocation.projectFunding / 100),
        scholarships: totals.scholarships + (itemTotal * item.revenueAllocation.scholarships / 100),
        events: totals.events + (itemTotal * item.revenueAllocation.events / 100),
      }
    }, { generalFund: 0, projectFunding: 0, scholarships: 0, events: 0 })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">NAMC Shop</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCart(true)}
                className="relative p-2 text-gray-600 hover:text-primary-600 transition-colors"
              >
                <ShoppingCart className="h-6 w-6" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-primary-600 transition-colors"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Products</p>
                <p className="text-2xl font-bold text-gray-900">{items.length}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Cart Items</p>
                <p className="text-2xl font-bold text-gray-900">{cartItemCount}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Cart Total</p>
                <p className="text-2xl font-bold text-gray-900">${cartTotal.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(items.reduce((sum, item) => sum + item.rating, 0) / items.length).toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="card mb-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 input-field"
                />
              </div>
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-field"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              className="input-field"
            >
              {priceRanges.map(range => (
                <option key={range} value={range}>{range}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Revenue Allocation Info */}
        <div className="card mb-8 bg-blue-50 border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Revenue Allocation</h3>
          <p className="text-blue-800 text-sm">
            All purchases support NAMC's mission! Revenue from each item is allocated to:
            Project Funding, General Operations, Scholarships, and Events.
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map(item => (
            <div key={item.id} className="card hover:shadow-lg transition-shadow">
              <div className="aspect-w-1 aspect-h-1 w-full mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                <Package className="h-16 w-16 text-gray-400" />
              </div>

              <div className="mb-3">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.name}</h3>
                <p className="text-gray-600 text-sm line-clamp-2">{item.description}</p>
              </div>

              <div className="flex items-center mb-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(item.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="ml-1 text-sm text-gray-600">({item.reviews})</span>
                </div>
              </div>

              <div className="mb-3">
                <p className="text-2xl font-bold text-gray-900">${item.price}</p>
                <p className="text-sm text-gray-600">
                  {item.inStock > 0 ? `${item.inStock} in stock` : 'Out of stock'}
                </p>
              </div>

              <div className="mb-4">
                <p className="text-xs font-medium text-gray-700 mb-1">Revenue Allocation:</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className="flex justify-between">
                    <span>Projects:</span>
                    <span>{item.revenueAllocation.projectFunding}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>General:</span>
                    <span>{item.revenueAllocation.generalFund}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Scholarships:</span>
                    <span>{item.revenueAllocation.scholarships}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Events:</span>
                    <span>{item.revenueAllocation.events}%</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => addToCart(item)}
                disabled={item.inStock === 0}
                className={`w-full flex items-center justify-center py-2 px-4 rounded-lg font-medium ${
                  item.inStock > 0
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                {item.inStock > 0 ? 'Add to Cart' : 'Out of Stock'}
              </button>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No products found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Shopping Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Shopping Cart</h2>
              <button
                onClick={() => setShowCart(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Your cart is empty</p>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center justify-between border-b pb-4">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-gray-600">${item.price} each</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="ml-4 text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <div className="mb-4">
                    <h3 className="font-semibold mb-2">Revenue Allocation for This Order:</h3>
                    {(() => {
                      const totals = getAllocationTotals()
                      return (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span>Project Funding:</span>
                            <span>${totals.projectFunding.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>General Fund:</span>
                            <span>${totals.generalFund.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Scholarships:</span>
                            <span>${totals.scholarships.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Events:</span>
                            <span>${totals.events.toFixed(2)}</span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                  
                  <div className="flex justify-between items-center text-lg font-bold mb-4">
                    <span>Total:</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>

                  <button className="w-full btn-primary py-3">
                    Proceed to Checkout (Coming Soon)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}