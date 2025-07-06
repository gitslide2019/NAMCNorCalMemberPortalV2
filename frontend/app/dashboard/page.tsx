'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Calendar, 
  FileText, 
  MessageSquare, 
  Building, 
  LogOut,
  User,
  Settings,
  BookOpen,
  ShoppingCart,
  MapPin,
  DollarSign,
  TrendingUp,
  Share2
} from 'lucide-react'
import toast from 'react-hot-toast'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  company: string
  memberType: string
  memberSince: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    try {
      setUser(JSON.parse(userData))
    } catch (error) {
      router.push('/login')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    toast.success('Logged out successfully')
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Building className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">NAMC NorCal</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-600" />
                <span className="text-gray-700">{user.firstName} {user.lastName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user.firstName}!
          </h1>
          <p className="text-gray-600">
            Member since {new Date(user.memberSince).toLocaleDateString()}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Users className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Members</p>
                <p className="text-2xl font-bold text-gray-900">150+</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-accent-100 rounded-lg">
                <Calendar className="h-6 w-6 text-accent-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Upcoming Events</p>
                <p className="text-2xl font-bold text-gray-900">3</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Resources</p>
                <p className="text-2xl font-bold text-gray-900">25</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Messages</p>
                <p className="text-2xl font-bold text-gray-900">5</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Core Features */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Core Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link href="/members" className="card hover:shadow-md transition-shadow">
              <div className="text-center">
                <Users className="h-12 w-12 text-primary-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Member Directory</h3>
                <p className="text-gray-600">Connect with fellow contractors</p>
              </div>
            </Link>

            <Link href="/events" className="card hover:shadow-md transition-shadow">
              <div className="text-center">
                <Calendar className="h-12 w-12 text-primary-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Events</h3>
                <p className="text-gray-600">Browse and register for events</p>
              </div>
            </Link>

            <Link href="/resources" className="card hover:shadow-md transition-shadow">
              <div className="text-center">
                <FileText className="h-12 w-12 text-primary-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Resources</h3>
                <p className="text-gray-600">Access documents and guides</p>
              </div>
            </Link>

            <Link href="/messages" className="card hover:shadow-md transition-shadow">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-primary-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Messages</h3>
                <p className="text-gray-600">View your messages</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Advanced Features */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Advanced Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link href="/lms" className="card hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <div className="text-center">
                <BookOpen className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Learning Center</h3>
                <p className="text-gray-600">Courses, certifications & training</p>
                <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">LMS</span>
              </div>
            </Link>

            <Link href="/projects" className="card hover:shadow-md transition-shadow bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Project Opportunities</h3>
                <p className="text-gray-600">Find and bid on projects with ArcGIS maps</p>
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">ARCGIS</span>
              </div>
            </Link>

            <Link href="/shop" className="card hover:shadow-md transition-shadow bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
              <div className="text-center">
                <ShoppingCart className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">NAMC Shop</h3>
                <p className="text-gray-600">Purchase gear & support projects</p>
                <span className="inline-block mt-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">E-COMMERCE</span>
              </div>
            </Link>

            <Link href="/funding" className="card hover:shadow-md transition-shadow bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
              <div className="text-center">
                <DollarSign className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Funding Opportunities</h3>
                <p className="text-gray-600">Browse grants & funding with ArcGIS maps</p>
                <span className="inline-block mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">ARCGIS</span>
              </div>
            </Link>
          </div>
        </div>

        {/* AI-Powered Features */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🤖 AI-Powered Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/interactive-onboarding" className="card hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <div className="text-center">
                <div className="h-12 w-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <span className="text-white font-bold">🎯</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Interactive Onboarding</h3>
                <p className="text-gray-600 text-sm mb-4">AI-guided tutorial for new members to discover all features</p>
                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">AI TUTORIAL</span>
              </div>
            </Link>

            <Link href="/business-growth-planner" className="card hover:shadow-md transition-shadow bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <div className="text-center">
                <div className="h-12 w-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <span className="text-white font-bold">📈</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Business Growth Planner</h3>
                <p className="text-gray-600 text-sm mb-4">AI-powered business planning with personalized growth strategies</p>
                <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">AI PLANNING</span>
              </div>
            </Link>

            <Link href="/business-card-scanner" className="card hover:shadow-md transition-shadow bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <div className="text-center">
                <div className="h-12 w-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <span className="text-white font-bold">📱</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Business Card Scanner</h3>
                <p className="text-gray-600 text-sm mb-4">AI OCR and NER for instant contact extraction</p>
                <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">AI OCR</span>
              </div>
            </Link>

            <Link href="/contract-analyzer" className="card hover:shadow-md transition-shadow bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
              <div className="text-center">
                <div className="h-12 w-12 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <span className="text-white font-bold">📄</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Contract Analyzer</h3>
                <p className="text-gray-600 text-sm mb-4">AI-powered contract Q&A and analysis tool</p>
                <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">AI Q&A</span>
              </div>
            </Link>

            <Link href="/ai-features" className="card hover:shadow-md transition-shadow bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
              <div className="text-center">
                <div className="h-12 w-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <span className="text-white font-bold">🧠</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">All AI Features</h3>
                <p className="text-gray-600 text-sm mb-4">Explore our complete suite of AI-powered tools</p>
                <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">VIEW ALL</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Coming Soon Features */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Coming Soon</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="card opacity-75 bg-gray-50 border-gray-200">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Tool Lending Library</h3>
                <p className="text-gray-500">Borrow and lend construction tools</p>
                <span className="inline-block mt-2 px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">COMING SOON</span>
              </div>
            </div>

            <div className="card opacity-75 bg-gray-50 border-gray-200">
              <div className="text-center">
                <Share2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Influencer Program</h3>
                <p className="text-gray-500">Earn commissions through referrals</p>
                <span className="inline-block mt-2 px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">COMING SOON</span>
              </div>
            </div>

            <div className="card opacity-75 bg-gray-50 border-gray-200">
              <div className="text-center">
                <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Advanced Analytics</h3>
                <p className="text-gray-500">Business intelligence & reporting</p>
                <span className="inline-block mt-2 px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">COMING SOON</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
          <div className="card">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-900">You registered for "Construction Technology Workshop"</p>
                  <p className="text-xs text-gray-500">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-900">New resource available: "Safety Guidelines 2024"</p>
                  <p className="text-xs text-gray-500">1 day ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-900">Message received from John Doe</p>
                  <p className="text-xs text-gray-500">2 days ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 