import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Download, ArrowLeft, Search, Filter } from 'lucide-react'

interface Resource {
  id: string
  title: string
  description: string
  fileUrl: string
  fileType: string
  fileSize: number
  category: string
  downloadCount: number
  createdAt: string
  createdBy: {
    firstName: string
    lastName: string
  }
}

const mockResources: Resource[] = [
  {
    id: '1',
    title: 'NAMC Membership Benefits Guide',
    description: 'Comprehensive guide to all the benefits available to NAMC members.',
    fileUrl: '#',
    fileType: 'application/pdf',
    fileSize: 2048576, // 2MB
    category: 'Membership',
    downloadCount: 145,
    createdAt: '2023-12-15',
    createdBy: {
      firstName: 'Admin',
      lastName: 'User'
    }
  },
  {
    id: '2',
    title: 'Construction Safety Guidelines',
    description: 'Updated safety guidelines for construction projects.',
    fileUrl: '#',
    fileType: 'application/pdf',
    fileSize: 1536000, // 1.5MB
    category: 'Safety',
    downloadCount: 89,
    createdAt: '2024-01-20',
    createdBy: {
      firstName: 'John',
      lastName: 'Doe'
    }
  },
  {
    id: '3',
    title: 'Contract Templates Pack',
    description: 'Collection of standard contract templates for various construction projects.',
    fileUrl: '#',
    fileType: 'application/zip',
    fileSize: 5242880, // 5MB
    category: 'Legal',
    downloadCount: 210,
    createdAt: '2023-11-05',
    createdBy: {
      firstName: 'Jane',
      lastName: 'Smith'
    }
  },
  {
    id: '4',
    title: 'Minority Business Certification Guide',
    description: 'Step-by-step guide to obtaining minority business certification.',
    fileUrl: '#',
    fileType: 'application/pdf',
    fileSize: 3145728, // 3MB
    category: 'Certification',
    downloadCount: 178,
    createdAt: '2024-02-10',
    createdBy: {
      firstName: 'Admin',
      lastName: 'User'
    }
  }
]

export default function ResourcesPage() {
  const [resources] = useState<Resource[]>(mockResources)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const navigate = useNavigate()

  const categories = ['All', ...Array.from(new Set(resources.map(r => r.category)))]

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || resource.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    else return (bytes / 1048576).toFixed(1) + ' MB'
  }

  const getFileIcon = (fileType: string): JSX.Element => {
    return <FileText className="h-6 w-6" />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <FileText className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Resources</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 input-field"
            />
          </div>
          
          <div className="w-full md:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-field"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Resources List */}
        <div className="grid grid-cols-1 gap-6">
          {filteredResources.map(resource => (
            <div key={resource.id} className="card hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-4">
                      {getFileIcon(resource.fileType)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{resource.title}</h3>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-3">{resource.category}</span>
                        <span>{formatFileSize(resource.fileSize)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-4">{resource.description}</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="text-gray-600">
                      Uploaded on {new Date(resource.createdAt).toLocaleDateString()} by {resource.createdBy.firstName} {resource.createdBy.lastName}
                    </div>
                    
                    <div className="text-gray-600">
                      {resource.downloadCount} downloads
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 md:mt-0 md:ml-6">
                  <a
                    href={resource.fileUrl}
                    className="btn-primary flex items-center"
                    download
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </div>
              </div>
            </div>
          ))}

          {filteredResources.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No resources found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}