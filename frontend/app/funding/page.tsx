'use client'

import { useState, useEffect } from 'react'
import { DollarSign, Calendar, Building, Users, Search, Map, FileText, ExternalLink, Mail, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// Dynamically import ArcGIS map to avoid SSR issues
const ArcGISMap = dynamic(() => import('../../components/SimpleArcGISMap'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
    <div className="text-gray-500">Loading map...</div>
  </div>
})

interface FundingOpportunity {
  id: string
  title: string
  description: string
  provider: string
  amount: number
  maxAmount?: number
  deadline: string
  fundingType: string
  status: 'Open' | 'Closing Soon' | 'Closed'
  eligibility: string[]
  region: string
  coordinates?: { lat: number; lng: number }
  applicationsCount?: number
  website?: string
  contactEmail?: string
  requirements: string[]
}

const mockFunding: FundingOpportunity[] = [
  {
    id: 'fund-1',
    title: 'Small Business Infrastructure Grant',
    description: 'Grants for minority-owned construction businesses to upgrade equipment and facilities. Focus on sustainable building practices and modern technology adoption.',
    provider: 'California Economic Development Department',
    amount: 50000,
    maxAmount: 150000,
    deadline: '2024-11-30',
    fundingType: 'Grant',
    status: 'Open',
    eligibility: ['Minority-owned business', 'California-based', 'Construction industry', 'Annual revenue under $5M'],
    region: 'California Statewide',
    coordinates: { lat: 38.5767, lng: -121.4934 }, // Sacramento
    applicationsCount: 23,
    website: 'https://business.ca.gov/grants',
    contactEmail: 'grants@business.ca.gov',
    requirements: [
      'Business license verification',
      'Financial statements (last 2 years)',
      'Project proposal and timeline',
      'Environmental impact assessment'
    ]
  },
  {
    id: 'fund-2',
    title: 'Green Building Innovation Fund',
    description: 'Funding for construction projects that demonstrate innovative green building techniques and sustainable materials usage.',
    provider: 'Bay Area Air Quality Management District',
    amount: 25000,
    maxAmount: 100000,
    deadline: '2024-12-15',
    fundingType: 'Incentive Program',
    status: 'Open',
    eligibility: ['LEED certified projects', 'Bay Area location', 'Energy efficiency improvements'],
    region: 'San Francisco Bay Area',
    coordinates: { lat: 37.7749, lng: -122.4194 }, // San Francisco
    applicationsCount: 45,
    website: 'https://baaqmd.gov/funding',
    contactEmail: 'incentives@baaqmd.gov',
    requirements: [
      'LEED certification proof',
      'Energy efficiency calculations',
      'Project timeline and milestones',
      'Cost-benefit analysis'
    ]
  },
  {
    id: 'fund-3',
    title: 'Workforce Development Training Fund',
    description: 'Financial support for construction companies to train workers in new technologies, safety protocols, and specialized skills.',
    provider: 'Employment Development Department',
    amount: 15000,
    maxAmount: 75000,
    deadline: '2025-01-20',
    fundingType: 'Training Grant',
    status: 'Open',
    eligibility: ['Registered apprenticeship programs', 'Safety training certification', 'Technology skills development'],
    region: 'Northern California',
    coordinates: { lat: 37.8715, lng: -122.2730 }, // Berkeley
    applicationsCount: 67,
    website: 'https://edd.ca.gov/workforce',
    contactEmail: 'training@edd.ca.gov',
    requirements: [
      'Training program curriculum',
      'Instructor qualifications',
      'Student enrollment projections',
      'Outcome measurement plan'
    ]
  },
  {
    id: 'fund-4',
    title: 'Seismic Retrofit Assistance Program',
    description: 'Emergency funding to help contractors upgrade buildings for seismic safety compliance across earthquake-prone regions.',
    provider: 'California Seismic Safety Commission',
    amount: 75000,
    maxAmount: 300000,
    deadline: '2024-10-31',
    fundingType: 'Emergency Fund',
    status: 'Closing Soon',
    eligibility: ['Seismic retrofit specialists', 'Licensed structural engineers', 'Historical building preservation'],
    region: 'Earthquake Risk Zones',
    coordinates: { lat: 37.3382, lng: -121.8863 }, // San Jose
    applicationsCount: 12,
    website: 'https://ssc.ca.gov/retrofit',
    contactEmail: 'retrofit@ssc.ca.gov',
    requirements: [
      'Structural engineer certification',
      'Seismic analysis report',
      'Building permits and approvals',
      'Insurance coverage verification'
    ]
  },
  {
    id: 'fund-5',
    title: 'Community Development Block Grant',
    description: 'Federal funding channeled through local governments for community infrastructure projects in low-income areas.',
    provider: 'U.S. Department of Housing and Urban Development',
    amount: 100000,
    maxAmount: 500000,
    deadline: '2025-02-28',
    fundingType: 'Federal Grant',
    status: 'Open',
    eligibility: ['Community benefit projects', 'Low-income area focus', 'Public-private partnerships'],
    region: 'Alameda County',
    coordinates: { lat: 37.8044, lng: -122.2712 }, // Oakland
    applicationsCount: 34,
    website: 'https://hud.gov/cdbg',
    contactEmail: 'cdbg@alamedacounty.gov',
    requirements: [
      'Community impact assessment',
      'Local government endorsement',
      'Environmental review compliance',
      'Public participation documentation'
    ]
  }
]

export default function FundingPage() {
  const [funding, setFunding] = useState<FundingOpportunity[]>(mockFunding)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [amountRange, setAmountRange] = useState('All')
  const [selectedFunding, setSelectedFunding] = useState<FundingOpportunity | null>(null)
  const [showApplicationModal, setShowApplicationModal] = useState<FundingOpportunity | null>(null)
  const [showMap, setShowMap] = useState(false)
  const router = useRouter()

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
  }, [router])

  const filteredFunding = funding.filter(fund => {
    const matchesSearch = fund.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         fund.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         fund.provider.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = selectedType === 'All' || fund.fundingType === selectedType
    const matchesStatus = selectedStatus === 'All' || fund.status === selectedStatus
    
    let matchesAmount = true
    if (amountRange !== 'All') {
      const amount = fund.maxAmount || fund.amount
      switch (amountRange) {
        case 'Under $50k':
          matchesAmount = amount < 50000
          break
        case '$50k - $100k':
          matchesAmount = amount >= 50000 && amount <= 100000
          break
        case '$100k - $300k':
          matchesAmount = amount > 100000 && amount <= 300000
          break
        case 'Over $300k':
          matchesAmount = amount > 300000
          break
      }
    }
    
    return matchesSearch && matchesType && matchesStatus && matchesAmount
  })

  const fundingTypes = ['All', ...Array.from(new Set(funding.map(f => f.fundingType)))]
  const statuses = ['All', ...Array.from(new Set(funding.map(f => f.status)))]
  const amountRanges = ['All', 'Under $50k', '$50k - $100k', '$100k - $300k', 'Over $300k']

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-green-100 text-green-800'
      case 'Closing Soon':
        return 'bg-yellow-100 text-yellow-800'
      case 'Closed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDaysUntilDeadline = (deadline: string): number => {
    const today = new Date()
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  // Convert funding opportunities to project format for map
  const fundingAsProjects = filteredFunding.map(fund => ({
    id: fund.id,
    title: fund.title,
    description: fund.description,
    location: fund.region,
    budget: fund.maxAmount || fund.amount,
    deadline: fund.deadline,
    projectType: fund.fundingType,
    status: fund.status === 'Open' ? 'Open for Bids' as const : 
            fund.status === 'Closing Soon' ? 'In Progress' as const : 'Completed' as const,
    requiredSkills: fund.eligibility,
    contactEmail: fund.contactEmail || '',
    coordinates: fund.coordinates,
    bidCount: fund.applicationsCount
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Funding Opportunities</span>
            </div>
            <div className="flex items-center space-x-4">
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
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Funding</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatAmount(funding.reduce((sum, f) => sum + (f.maxAmount || f.amount), 0))}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Open Programs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {funding.filter(f => f.status === 'Open').length}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Closing Soon</p>
                <p className="text-2xl font-bold text-gray-900">
                  {funding.filter(f => f.status === 'Closing Soon').length}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Applications</p>
                <p className="text-2xl font-bold text-gray-900">
                  {funding.reduce((sum, f) => sum + (f.applicationsCount || 0), 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="card mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Search & Filter Funding</h3>
            <button
              onClick={() => setShowMap(!showMap)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                showMap 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Map className="h-4 w-4" />
              <span>{showMap ? 'Hide Map' : 'Show Map'}</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search funding opportunities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 input-field"
                />
              </div>
            </div>
            
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="input-field"
            >
              {fundingTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input-field"
            >
              {statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <select
              value={amountRange}
              onChange={(e) => setAmountRange(e.target.value)}
              className="input-field"
            >
              {amountRanges.map(range => (
                <option key={range} value={range}>{range}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ArcGIS Map */}
        {showMap && (
          <div className="card mb-8">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Funding Locations</h3>
              <p className="text-gray-600 text-sm">
                Interactive map showing funding opportunities across Northern California. 
                Click on markers to view funding details.
              </p>
            </div>
            <ArcGISMap
              projects={fundingAsProjects}
              selectedProject={selectedFunding ? fundingAsProjects.find(p => p.id === selectedFunding.id) : null}
              onProjectSelect={(project) => {
                const fundingItem = funding.find(f => f.id === project.id)
                if (fundingItem) setSelectedFunding(fundingItem)
              }}
              className="h-96"
            />
          </div>
        )}

        {/* Funding Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredFunding.map(fund => (
            <div key={fund.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(fund.status)}`}>
                      {fund.status}
                    </span>
                    <span className="text-xs text-gray-500">{fund.fundingType}</span>
                    {getDaysUntilDeadline(fund.deadline) <= 30 && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                        {getDaysUntilDeadline(fund.deadline)} days left
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{fund.title}</h3>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-3">{fund.description}</p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Building className="h-4 w-4 mr-2" />
                  {fund.provider}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <DollarSign className="h-4 w-4 mr-2" />
                  {fund.maxAmount ? 
                    `${formatAmount(fund.amount)} - ${formatAmount(fund.maxAmount)}` :
                    formatAmount(fund.amount)
                  }
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  Deadline: {new Date(fund.deadline).toLocaleDateString()}
                </div>
                {fund.applicationsCount && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    {fund.applicationsCount} applications submitted
                  </div>
                )}
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Eligibility:</p>
                <div className="flex flex-wrap gap-1">
                  {fund.eligibility.slice(0, 2).map(criteria => (
                    <span key={criteria} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      {criteria}
                    </span>
                  ))}
                  {fund.eligibility.length > 2 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                      +{fund.eligibility.length - 2} more
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedFunding(fund)}
                  className="flex-1 btn-outline text-sm"
                >
                  View Details
                </button>
                
                {fund.status === 'Open' && (
                  <button
                    onClick={() => setShowApplicationModal(fund)}
                    className="flex-1 btn-primary text-sm"
                  >
                    Apply Now
                  </button>
                )}
                
                {fund.website && (
                  <a
                    href={fund.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline p-2"
                    title="Visit website"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                
                {fund.contactEmail && (
                  <a
                    href={`mailto:${fund.contactEmail}?subject=Inquiry about ${fund.title}`}
                    className="btn-outline p-2"
                    title="Contact via email"
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredFunding.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No funding opportunities found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Funding Details Modal */}
      {selectedFunding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">{selectedFunding.title}</h2>
              <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(selectedFunding.status)}`}>
                {selectedFunding.status}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Provider</p>
                <p className="text-gray-900">{selectedFunding.provider}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Funding Amount</p>
                <p className="text-gray-900">
                  {selectedFunding.maxAmount ? 
                    `${formatAmount(selectedFunding.amount)} - ${formatAmount(selectedFunding.maxAmount)}` :
                    formatAmount(selectedFunding.amount)
                  }
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Deadline</p>
                <p className="text-gray-900">{new Date(selectedFunding.deadline).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Funding Type</p>
                <p className="text-gray-900">{selectedFunding.fundingType}</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium text-gray-600 mb-2">Description</p>
              <p className="text-gray-900">{selectedFunding.description}</p>
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium text-gray-600 mb-2">Eligibility Criteria</p>
              <div className="flex flex-wrap gap-2">
                {selectedFunding.eligibility.map(criteria => (
                  <span key={criteria} className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded">
                    {criteria}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium text-gray-600 mb-2">Application Requirements</p>
              <ul className="space-y-1">
                {selectedFunding.requirements.map((req, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-700">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium text-gray-600 mb-2">Contact Information</p>
              <div className="space-y-1">
                {selectedFunding.contactEmail && (
                  <p className="text-gray-900">Email: {selectedFunding.contactEmail}</p>
                )}
                {selectedFunding.website && (
                  <p className="text-gray-900">
                    Website: <a href={selectedFunding.website} className="text-blue-600 hover:text-blue-800" target="_blank" rel="noopener noreferrer">
                      {selectedFunding.website}
                    </a>
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              {selectedFunding.status === 'Open' && (
                <button 
                  onClick={() => {
                    setSelectedFunding(null)
                    setShowApplicationModal(selectedFunding)
                  }} 
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Apply for Funding
                </button>
              )}
              <button 
                onClick={() => setSelectedFunding(null)} 
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application Modal */}
      {showApplicationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Apply for Funding</h2>
            <p className="text-gray-600 mb-6">
              Funding application system coming soon! For now, please visit the provider's website or contact them directly at{' '}
              {showApplicationModal.contactEmail && (
                <a 
                  href={`mailto:${showApplicationModal.contactEmail}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {showApplicationModal.contactEmail}
                </a>
              )}
              {showApplicationModal.website && (
                <>
                  {' or visit '}
                  <a 
                    href={showApplicationModal.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    their website
                  </a>
                </>
              )}
            </p>
            <div className="flex justify-end">
              <button 
                onClick={() => setShowApplicationModal(null)} 
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}