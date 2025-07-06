'use client'

import { useState, useEffect } from 'react'
import { Brain, Camera, FileText, BarChart3, Sparkles, Bot, Search, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AIFeature {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  status: 'available' | 'beta' | 'coming-soon'
  category: string
  capabilities: string[]
}

const aiFeatures: AIFeature[] = [
  {
    id: 'business-card-scanner',
    title: 'Enhanced Business Card Scanner',
    description: 'AI-powered OCR with Named Entity Recognition for intelligent contact extraction',
    icon: <Camera className="h-8 w-8" />,
    status: 'available',
    category: 'Document Processing',
    capabilities: [
      'Tesseract.js OCR text extraction',
      'Named Entity Recognition (NER)',
      'Camera capture & file upload',
      'Real-time processing progress',
      'Intelligent data validation'
    ]
  },
  {
    id: 'contract-analyzer',
    title: 'AI Contract Analysis Assistant',
    description: 'Upload contracts and ask natural language questions using transformer models',
    icon: <FileText className="h-8 w-8" />,
    status: 'available',
    category: 'Legal AI',
    capabilities: [
      'PDF & text document upload',
      'Natural language Q&A',
      'Key clause extraction',
      'Payment terms analysis',
      'Confidence scoring'
    ]
  },
  {
    id: 'sentiment-analysis',
    title: 'Member Feedback Sentiment Analysis',
    description: 'Real-time sentiment analysis and topic extraction from member feedback',
    icon: <BarChart3 className="h-8 w-8" />,
    status: 'available',
    category: 'Analytics',
    capabilities: [
      'Real-time sentiment scoring',
      'Topic extraction with TF-IDF',
      'Visual analytics dashboard',
      'Positive/negative categorization',
      'Common term analysis'
    ]
  },
  {
    id: 'member-matching',
    title: 'Intelligent Member Matching',
    description: 'AI-powered member recommendations based on skills and project compatibility',
    icon: <Sparkles className="h-8 w-8" />,
    status: 'beta',
    category: 'Networking',
    capabilities: [
      'Skill-based matching algorithms',
      'Project compatibility scoring',
      'Network effect analysis',
      'Recommendation engine',
      'Collaboration suggestions'
    ]
  },
  {
    id: 'invoice-processor',
    title: 'Intelligent Invoice Processor',
    description: 'Automated invoice data extraction and categorization with ML',
    icon: <Upload className="h-8 w-8" />,
    status: 'beta',
    category: 'Financial AI',
    capabilities: [
      'Automated data extraction',
      'Expense categorization',
      'Duplicate detection',
      'Vendor identification',
      'Approval workflow automation'
    ]
  },
  {
    id: 'business-growth-planner',
    title: 'AI Business Growth Planner',
    description: 'AI-powered business planning tool that creates customized growth strategies',
    icon: <Bot className="h-8 w-8" />,
    status: 'available',
    category: 'Business Strategy',
    capabilities: [
      'Personalized growth strategies',
      'Market analysis and recommendations',
      'Financial projection modeling',
      'Action item generation',
      'Performance tracking suggestions'
    ]
  },
  {
    id: 'interactive-onboarding',
    title: 'Interactive Onboarding Tutorial',
    description: 'AI-guided onboarding experience for new NAMC members',
    icon: <Bot className="h-8 w-8" />,
    status: 'available',
    category: 'User Experience',
    capabilities: [
      'Personalized learning paths',
      'Interactive tutorial system',
      'Progress tracking',
      'Feature discovery guidance',
      'Member journey optimization'
    ]
  },
  {
    id: 'smart-forms',
    title: 'Smart Form Auto-Completion',
    description: 'AI-powered form completion using historical data and context',
    icon: <Bot className="h-8 w-8" />,
    status: 'coming-soon',
    category: 'Productivity',
    capabilities: [
      'Contextual auto-completion',
      'Historical data learning',
      'Form field prediction',
      'Data validation assistance',
      'Smart suggestions'
    ]
  }
]

export default function AIFeaturesPage() {
  const [selectedFeature, setSelectedFeature] = useState<AIFeature | null>(null)
  const router = useRouter()

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
  }, [router])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800'
      case 'beta':
        return 'bg-blue-100 text-blue-800'
      case 'coming-soon':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Document Processing':
        return 'bg-purple-100 text-purple-800'
      case 'Legal AI':
        return 'bg-red-100 text-red-800'
      case 'Analytics':
        return 'bg-yellow-100 text-yellow-800'
      case 'Networking':
        return 'bg-pink-100 text-pink-800'
      case 'Financial AI':
        return 'bg-indigo-100 text-indigo-800'
      case 'Productivity':
        return 'bg-teal-100 text-teal-800'
      case 'Business Strategy':
        return 'bg-orange-100 text-orange-800'
      case 'User Experience':
        return 'bg-cyan-100 text-cyan-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const availableFeatures = aiFeatures.filter(f => f.status === 'available')
  const betaFeatures = aiFeatures.filter(f => f.status === 'beta')
  const comingSoonFeatures = aiFeatures.filter(f => f.status === 'coming-soon')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">AI-Powered Features</span>
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
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI-Powered Member Portal
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Leverage cutting-edge artificial intelligence to streamline your contracting business. 
            From document analysis to intelligent matching, our AI tools are designed to save time and boost productivity.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="card text-center">
            <div className="p-3 bg-green-100 rounded-lg mx-auto w-fit mb-3">
              <Sparkles className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{availableFeatures.length}</p>
            <p className="text-sm font-medium text-gray-600">Available Now</p>
          </div>

          <div className="card text-center">
            <div className="p-3 bg-blue-100 rounded-lg mx-auto w-fit mb-3">
              <Bot className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{betaFeatures.length}</p>
            <p className="text-sm font-medium text-gray-600">Beta Features</p>
          </div>

          <div className="card text-center">
            <div className="p-3 bg-purple-100 rounded-lg mx-auto w-fit mb-3">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{aiFeatures.length}</p>
            <p className="text-sm font-medium text-gray-600">Total AI Features</p>
          </div>

          <div className="card text-center">
            <div className="p-3 bg-yellow-100 rounded-lg mx-auto w-fit mb-3">
              <Search className="h-6 w-6 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">3</p>
            <p className="text-sm font-medium text-gray-600">AI Libraries</p>
          </div>
        </div>

        {/* Available Features */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Available AI Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableFeatures.map(feature => (
              <div key={feature.id} className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    {feature.icon}
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(feature.status)}`}>
                      {feature.status.replace('-', ' ')}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(feature.category)}`}>
                      {feature.category}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{feature.description}</p>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Key Capabilities:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {feature.capabilities.slice(0, 3).map((capability, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                        {capability}
                      </li>
                    ))}
                    {feature.capabilities.length > 3 && (
                      <li className="text-gray-500">+{feature.capabilities.length - 3} more...</li>
                    )}
                  </ul>
                </div>

                <button
                  onClick={() => {
                    if (feature.id === 'business-card-scanner') {
                      router.push('/business-card-scanner')
                    } else if (feature.id === 'contract-analyzer') {
                      router.push('/contract-analyzer')
                    } else if (feature.id === 'business-growth-planner') {
                      router.push('/business-growth-planner')
                    } else if (feature.id === 'interactive-onboarding') {
                      router.push('/interactive-onboarding')
                    } else {
                      setSelectedFeature(feature)
                    }
                  }}
                  className="w-full btn-primary"
                >
                  {['business-card-scanner', 'contract-analyzer', 'business-growth-planner', 'interactive-onboarding'].includes(feature.id) ? 'Try Now' : 'Learn More'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Beta Features */}
        {betaFeatures.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Beta Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {betaFeatures.map(feature => (
                <div key={feature.id} className="card border-blue-200 bg-blue-50">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      {feature.icon}
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(feature.status)}`}>
                      {feature.status.replace('-', ' ')}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm mb-4">{feature.description}</p>

                  <button className="w-full btn-outline">
                    Request Beta Access
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coming Soon */}
        {comingSoonFeatures.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Coming Soon</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {comingSoonFeatures.map(feature => (
                <div key={feature.id} className="card opacity-75 bg-gray-50 border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-gray-200 rounded-lg">
                      {feature.icon}
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(feature.status)}`}>
                      {feature.status.replace('-', ' ')}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-600 mb-2">{feature.title}</h3>
                  <p className="text-gray-500 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Feature Details Modal */}
      {selectedFeature && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center">
                <div className="p-3 bg-gray-100 rounded-lg mr-4">
                  {selectedFeature.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedFeature.title}</h2>
                  <div className="flex gap-2 mt-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedFeature.status)}`}>
                      {selectedFeature.status.replace('-', ' ')}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(selectedFeature.category)}`}>
                      {selectedFeature.category}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedFeature(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <p className="text-gray-600 mb-6">{selectedFeature.description}</p>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Full Capabilities:</h3>
              <ul className="space-y-2">
                {selectedFeature.capabilities.map((capability, index) => (
                  <li key={index} className="flex items-center text-gray-700">
                    <span className="w-2 h-2 bg-primary-600 rounded-full mr-3"></span>
                    {capability}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-900 mb-2">AI Technology Stack:</h4>
              <div className="text-sm text-blue-800">
                {selectedFeature.id === 'business-card-scanner' && (
                  <p>• Tesseract.js for OCR • @xenova/transformers for NER • Camera API integration</p>
                )}
                {selectedFeature.id === 'contract-analyzer' && (
                  <p>• @xenova/transformers for Q&A • PDF.js for document parsing • Client-side processing</p>
                )}
                {selectedFeature.id === 'sentiment-analysis' && (
                  <p>• Natural.js for sentiment scoring • TF-IDF for topic extraction • Real-time analytics</p>
                )}
                {selectedFeature.id === 'member-matching' && (
                  <p>• Custom ML algorithms • Similarity scoring • Graph-based recommendations</p>
                )}
                {selectedFeature.id === 'invoice-processor' && (
                  <p>• OCR + ML classification • Pattern recognition • Automated categorization</p>
                )}
                {selectedFeature.id === 'smart-forms' && (
                  <p>• Predictive text models • Context-aware suggestions • Historical data learning</p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              {selectedFeature.status === 'available' && (
                <>
                  <button className="flex-1 btn-primary">
                    Try {selectedFeature.title}
                  </button>
                  <button className="flex-1 btn-outline">
                    View Documentation
                  </button>
                </>
              )}
              {selectedFeature.status === 'beta' && (
                <button className="w-full btn-primary">
                  Request Beta Access
                </button>
              )}
              {selectedFeature.status === 'coming-soon' && (
                <button className="w-full btn-outline">
                  Get Notified When Available
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}