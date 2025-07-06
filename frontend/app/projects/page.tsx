'use client'

import { useState, useEffect } from 'react'
import { MapPin, DollarSign, Calendar, Users, Filter, Search, ExternalLink, Mail, Map } from 'lucide-react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// Dynamically import ArcGIS map to avoid SSR issues
const ArcGISMap = dynamic(() => import('../../components/SimpleArcGISMap'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
    <div className="text-gray-500">Loading map...</div>
  </div>
})

interface ProjectOpportunity {
  id: string
  title: string
  description: string
  location: string
  budget: number
  deadline: string
  projectType: string
  status: 'Open for Bids' | 'In Progress' | 'Awarded' | 'Completed'
  requiredSkills: string[]
  contactEmail: string
  coordinates?: { lat: number; lng: number }
  bidCount?: number
}

const mockProjects: ProjectOpportunity[] = [
  {
    id: 'proj-1',
    title: 'Oakland Community Center Renovation',
    description: 'Complete renovation of a 5,000 sq ft community center including HVAC, electrical, and plumbing upgrades.',
    location: 'Oakland, CA',
    budget: 250000,
    deadline: '2024-12-15',
    projectType: 'Renovation',
    status: 'Open for Bids',
    requiredSkills: ['HVAC', 'Electrical', 'Plumbing', 'General Construction'],
    contactEmail: 'projects@oakland.gov',
    coordinates: { lat: 37.8044, lng: -122.2712 },
    bidCount: 8,
  },
  {
    id: 'proj-2',
    title: 'San Francisco Housing Development',
    description: 'New construction of 24-unit affordable housing complex with green building standards.',
    location: 'San Francisco, CA',
    budget: 1200000,
    deadline: '2025-02-28',
    projectType: 'New Construction',
    status: 'Open for Bids',
    requiredSkills: ['Construction Management', 'Green Building', 'Structural', 'MEP'],
    contactEmail: 'housing@sfgov.org',
    coordinates: { lat: 37.7749, lng: -122.4194 },
    bidCount: 15,
  },
  {
    id: 'proj-3',
    title: 'Berkeley School Solar Installation',
    description: 'Installation of 500kW solar panel system on school rooftops with battery storage.',
    location: 'Berkeley, CA',
    budget: 450000,
    deadline: '2024-11-30',
    projectType: 'Solar/Energy',
    status: 'In Progress',
    requiredSkills: ['Solar Installation', 'Electrical', 'Roofing'],
    contactEmail: 'facilities@berkeley.edu',
    coordinates: { lat: 37.8715, lng: -122.2730 },
    bidCount: 12,
  },
  {
    id: 'proj-4',
    title: 'San Jose Bridge Repair',
    description: 'Structural repairs and seismic retrofitting of downtown pedestrian bridge.',
    location: 'San Jose, CA',
    budget: 180000,
    deadline: '2024-10-15',
    projectType: 'Infrastructure',
    status: 'Open for Bids',
    requiredSkills: ['Structural Engineering', 'Concrete Work', 'Steel Fabrication'],
    contactEmail: 'infrastructure@sanjoseca.gov',
    coordinates: { lat: 37.3382, lng: -121.8863 },
    bidCount: 6,
  },
  {
    id: 'proj-5',
    title: 'Fremont Fire Station Construction',
    description: 'Ground-up construction of new fire station facility with modern equipment bays.',
    location: 'Fremont, CA',
    budget: 800000,
    deadline: '2025-04-20',
    projectType: 'Public Safety',
    status: 'Open for Bids',
    requiredSkills: ['Commercial Construction', 'Emergency Systems', 'Specialized Equipment'],
    contactEmail: 'fire@fremont.gov',
    coordinates: { lat: 37.5485, lng: -121.9886 },
    bidCount: 9,
  },
]

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectOpportunity[]>(mockProjects)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [budgetRange, setBudgetRange] = useState('All')
  const [selectedProject, setSelectedProject] = useState<ProjectOpportunity | null>(null)
  const [showApplicationModal, setShowApplicationModal] = useState<ProjectOpportunity | null>(null)
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

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.location.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = selectedType === 'All' || project.projectType === selectedType
    const matchesStatus = selectedStatus === 'All' || project.status === selectedStatus
    
    let matchesBudget = true
    if (budgetRange !== 'All') {
      const budget = project.budget
      switch (budgetRange) {
        case 'Under $100k':
          matchesBudget = budget < 100000
          break
        case '$100k - $500k':
          matchesBudget = budget >= 100000 && budget <= 500000
          break
        case '$500k - $1M':
          matchesBudget = budget > 500000 && budget <= 1000000
          break
        case 'Over $1M':
          matchesBudget = budget > 1000000
          break
      }
    }
    
    return matchesSearch && matchesType && matchesStatus && matchesBudget
  })

  const projectTypes = ['All', ...Array.from(new Set(projects.map(p => p.projectType)))]
  const statuses = ['All', ...Array.from(new Set(projects.map(p => p.status)))]
  const budgetRanges = ['All', 'Under $100k', '$100k - $500k', '$500k - $1M', 'Over $1M']

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open for Bids':
        return 'bg-green-100 text-green-800'
      case 'In Progress':
        return 'bg-blue-100 text-blue-800'
      case 'Awarded':
        return 'bg-yellow-100 text-yellow-800'
      case 'Completed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <MapPin className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Project Opportunities</span>
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
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Open for Bids</p>
                <p className="text-2xl font-bold text-gray-900">
                  {projects.filter(p => p.status === 'Open for Bids').length}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {projects.filter(p => p.status === 'In Progress').length}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatBudget(projects.reduce((sum, p) => sum + p.budget, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="card mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Search & Filter Projects</h3>
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
                  placeholder="Search projects..."
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
              {projectTypes.map(type => (
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
              value={budgetRange}
              onChange={(e) => setBudgetRange(e.target.value)}
              className="input-field"
            >
              {budgetRanges.map(range => (
                <option key={range} value={range}>{range}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ArcGIS Map */}
        {showMap && (
          <div className="card mb-8">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Project Locations</h3>
              <p className="text-gray-600 text-sm">
                Interactive map showing project opportunities across Northern California. 
                Click on markers to view project details.
              </p>
            </div>
            <ArcGISMap
              projects={filteredProjects}
              selectedProject={selectedProject}
              onProjectSelect={setSelectedProject}
              className="h-96"
            />
          </div>
        )}

        {/* Projects Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProjects.map(project => (
            <div key={project.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                    <span className="text-xs text-gray-500">{project.projectType}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.title}</h3>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-3">{project.description}</p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  {project.location}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Budget: {formatBudget(project.budget)}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  Deadline: {new Date(project.deadline).toLocaleDateString()}
                </div>
                {project.bidCount && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    {project.bidCount} bids submitted
                  </div>
                )}
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Required Skills:</p>
                <div className="flex flex-wrap gap-1">
                  {project.requiredSkills.slice(0, 3).map(skill => (
                    <span key={skill} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {skill}
                    </span>
                  ))}
                  {project.requiredSkills.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                      +{project.requiredSkills.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedProject(project)}
                  className="flex-1 btn-outline text-sm"
                >
                  View Details
                </button>
                
                {project.status === 'Open for Bids' && (
                  <button
                    onClick={() => setShowApplicationModal(project)}
                    className="flex-1 btn-primary text-sm"
                  >
                    Apply Now
                  </button>
                )}
                
                <a
                  href={`mailto:${project.contactEmail}?subject=Inquiry about ${project.title}`}
                  className="btn-outline p-2"
                  title="Contact via email"
                >
                  <Mail className="h-4 w-4" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No projects found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Project Details Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">{selectedProject.title}</h2>
              <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(selectedProject.status)}`}>
                {selectedProject.status}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Location</p>
                <p className="text-gray-900">{selectedProject.location}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Budget</p>
                <p className="text-gray-900">{formatBudget(selectedProject.budget)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Deadline</p>
                <p className="text-gray-900">{new Date(selectedProject.deadline).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Project Type</p>
                <p className="text-gray-900">{selectedProject.projectType}</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium text-gray-600 mb-2">Description</p>
              <p className="text-gray-900">{selectedProject.description}</p>
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium text-gray-600 mb-2">Required Skills</p>
              <div className="flex flex-wrap gap-2">
                {selectedProject.requiredSkills.map(skill => (
                  <span key={skill} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium text-gray-600 mb-2">Contact Information</p>
              <p className="text-gray-900">{selectedProject.contactEmail}</p>
            </div>
            
            <div className="flex justify-end space-x-2">
              {selectedProject.status === 'Open for Bids' && (
                <button 
                  onClick={() => {
                    setSelectedProject(null)
                    setShowApplicationModal(selectedProject)
                  }} 
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Apply for Project
                </button>
              )}
              <button 
                onClick={() => setSelectedProject(null)} 
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
            <h2 className="text-2xl font-bold mb-4">Apply for Project</h2>
            <p className="text-gray-600 mb-6">
              Project application feature coming soon! For now, please contact the project owner directly at{' '}
              <a 
                href={`mailto:${showApplicationModal.contactEmail}`}
                className="text-blue-600 hover:text-blue-800"
              >
                {showApplicationModal.contactEmail}
              </a>
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