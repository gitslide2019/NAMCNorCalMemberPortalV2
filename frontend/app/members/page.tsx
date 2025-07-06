'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Users, Mail, Phone, Building, Calendar, Star, MapPin, ArrowLeft, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import VirtualizedList from '../../components/VirtualizedList'
import { dataService, useDataService } from '../../services/dataService'
import { rateLimiter, mapboxGeocode } from '../../utils/rateLimiter'

interface Member {
  id: string
  firstName: string
  lastName: string
  company: string
  email: string
  phone?: string
  memberType: string
  memberSince: string
  city?: string
  state?: string
  coordinates?: [number, number]
}

// Fallback data for development
const fallbackMembers: Member[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    company: 'Doe Construction',
    email: 'john.doe@example.com',
    phone: '(555) 123-4567',
    memberType: 'PREMIUM',
    memberSince: '2023-01-15',
    city: 'San Francisco',
    state: 'CA',
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    company: 'Smith Contracting',
    email: 'jane.smith@example.com',
    phone: '(555) 987-6543',
    memberType: 'REGULAR',
    memberSince: '2023-03-20',
    city: 'Oakland',
    state: 'CA',
  },
  {
    id: '3',
    firstName: 'Admin',
    lastName: 'User',
    company: 'NAMC NorCal',
    email: 'admin@namcnorcal.org',
    memberType: 'ADMIN',
    memberSince: '2022-01-01',
    city: 'San Jose',
    state: 'CA',
  }
]

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const router = useRouter()
  const ds = useDataService()

  // Check authentication
  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/login')
      return
    }
  }, [router])

  // Load members with pagination and geocoding
  const loadMembers = useCallback(async (pageNum = 1, append = false) => {
    try {
      setIsLoading(true)
      setError(null)

      const result = await ds.getMembers({
        page: pageNum,
        limit: 50,
        sortBy: 'memberSince',
        sortOrder: 'desc'
      })

      const newMembers = result.data
      
      // Add geocoding for new members if Mapbox API key is available
      const apiKey = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
      if (apiKey) {
        await Promise.all(
          newMembers.map(async (member: Member) => {
            if (member.city && member.state && !member.coordinates) {
              const address = `${member.city}, ${member.state}`
              const coords = await mapboxGeocode(address, apiKey)
              if (coords) {
                member.coordinates = coords
              }
            }
          })
        )
      }

      setMembers(prev => append ? [...prev, ...newMembers] : newMembers)
      setHasMore(result.pagination.page < result.pagination.totalPages)
      setPage(pageNum)
    } catch (err) {
      console.error('Failed to load members:', err)
      setError('Failed to load members. Using offline data.')
      
      // Fallback to mock data
      if (!append) {
        setMembers(fallbackMembers)
        setHasMore(false)
      }
    } finally {
      setIsLoading(false)
    }
  }, [ds])

  // Load more members
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadMembers(page + 1, true)
    }
  }, [loadMembers, page, isLoading, hasMore])

  // Initial load
  useEffect(() => {
    loadMembers(1)
  }, [loadMembers])

  // Render member item for virtualized list
  const renderMemberItem = useCallback((member: Member, index: number) => (
    <div className="p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
            {member.firstName[0]}{member.lastName[0]}
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {member.firstName} {member.lastName}
            </h3>
            
            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1 flex-wrap">
              <div className="flex items-center space-x-1">
                <Building className="h-4 w-4" />
                <span>{member.company}</span>
              </div>
              
              {member.city && member.state && (
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>{member.city}, {member.state}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Member since {new Date(member.memberSince).getFullYear()}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            member.memberType === 'PREMIUM' ? 'bg-yellow-100 text-yellow-800' :
            member.memberType === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
            member.memberType === 'LIFETIME' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {member.memberType === 'ADMIN' && <Star className="h-3 w-3 inline mr-1" />}
            {member.memberType}
          </span>
          
          <div className="flex space-x-2">
            <a
              href={`mailto:${member.email}`}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Send email"
            >
              <Mail className="h-4 w-4" />
            </a>
            
            {member.phone && (
              <a
                href={`tel:${member.phone}`}
                className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                title="Call member"
              >
                <Phone className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  ), [])

  // Filter and sort options for the virtualized list
  const filterOptions = useMemo(() => [
    {
      key: 'memberType' as keyof Member,
      options: [
        { value: 'REGULAR', label: 'Regular' },
        { value: 'PREMIUM', label: 'Premium' },
        { value: 'ADMIN', label: 'Admin' },
        { value: 'LIFETIME', label: 'Lifetime' },
        { value: 'HONORARY', label: 'Honorary' }
      ]
    }
  ], [])

  const sortOptions = useMemo(() => [
    { key: 'firstName' as keyof Member, label: 'First Name' },
    { key: 'lastName' as keyof Member, label: 'Last Name' },
    { key: 'company' as keyof Member, label: 'Company' },
    { key: 'memberSince' as keyof Member, label: 'Member Since' },
    { key: 'memberType' as keyof Member, label: 'Member Type' }
  ], [])

  const searchFields = useMemo(() => [
    'firstName' as keyof Member,
    'lastName' as keyof Member, 
    'company' as keyof Member,
    'email' as keyof Member
  ], [])

  // Export members data
  const exportMembers = useCallback(() => {
    const csvContent = [
      ['First Name', 'Last Name', 'Company', 'Email', 'Phone', 'Member Type', 'Member Since', 'City', 'State'],
      ...members.map(member => [
        member.firstName,
        member.lastName,
        member.company,
        member.email,
        member.phone || '',
        member.memberType,
        member.memberSince,
        member.city || '',
        member.state || ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `namc-members-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [members])

  // Show loading spinner for initial load
  if (isLoading && members.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading members...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Users className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Member Directory</h1>
              <span className="text-sm text-gray-500">({members.length} members)</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={exportMembers}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <VirtualizedList
          items={members}
          renderItem={renderMemberItem}
          itemHeight={80}
          containerHeight={600}
          searchFields={searchFields}
          filterOptions={filterOptions}
          sortOptions={sortOptions}
          loading={isLoading}
          error={error}
          onLoadMore={loadMore}
          hasMore={hasMore}
          searchPlaceholder="Search members by name, company, or email..."
          className="bg-white rounded-lg shadow"
        />
      </div>
    </div>
  )
}