'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Target, Users, DollarSign, Calendar, BarChart3, Lightbulb, Download, Share, ArrowRight, CheckCircle, AlertCircle, Building } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface BusinessProfile {
  companyName: string
  industry: string
  yearsInBusiness: number
  currentRevenue: string
  employeeCount: string
  specialties: string[]
  challenges: string[]
  goals: string[]
}

interface GrowthStrategy {
  id: string
  title: string
  description: string
  priority: 'High' | 'Medium' | 'Low'
  timeframe: string
  expectedImpact: string
  actionItems: string[]
  aiConfidence: number
}

interface GrowthPlan {
  businessProfile: BusinessProfile
  strategies: GrowthStrategy[]
  projectedGrowth: {
    revenueIncrease: string
    timeframe: string
    keyMetrics: { label: string; value: string }[]
  }
  nextSteps: string[]
  createdAt: Date
}

export default function BusinessGrowthPlannerPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>({
    companyName: '',
    industry: 'Construction',
    yearsInBusiness: 0,
    currentRevenue: '',
    employeeCount: '',
    specialties: [],
    challenges: [],
    goals: []
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPlan, setGeneratedPlan] = useState<GrowthPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
  }, [router])

  const industryOptions = [
    'General Construction',
    'Residential Building',
    'Commercial Building',
    'Civil Engineering',
    'Electrical',
    'Plumbing',
    'HVAC',
    'Roofing',
    'Landscaping',
    'Specialty Trades'
  ]

  const specialtyOptions = [
    'New Construction',
    'Renovations',
    'Green Building',
    'Historic Restoration',
    'Emergency Repairs',
    'Government Contracts',
    'Private Development',
    'Infrastructure',
    'Sustainable Building',
    'Smart Home Technology'
  ]

  const challengeOptions = [
    'Finding qualified workers',
    'Managing cash flow',
    'Winning more contracts',
    'Scaling operations',
    'Managing project timelines',
    'Regulatory compliance',
    'Technology adoption',
    'Supplier relationships',
    'Marketing and branding',
    'Customer retention'
  ]

  const goalOptions = [
    'Increase annual revenue',
    'Expand service offerings',
    'Hire more employees',
    'Improve profit margins',
    'Enter new markets',
    'Adopt new technologies',
    'Build strategic partnerships',
    'Enhance brand recognition',
    'Improve operational efficiency',
    'Achieve sustainability goals'
  ]

  const handleArrayFieldChange = (field: keyof BusinessProfile, value: string, checked: boolean) => {
    setBusinessProfile(prev => {
      const currentArray = prev[field] as string[]
      if (checked) {
        return { ...prev, [field]: [...currentArray, value] }
      } else {
        return { ...prev, [field]: currentArray.filter(item => item !== value) }
      }
    })
  }

  const generateGrowthPlan = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Mock AI-generated growth strategies based on business profile
      const mockStrategies: GrowthStrategy[] = []

      // Strategy generation based on challenges and goals
      if (businessProfile.challenges.includes('Finding qualified workers')) {
        mockStrategies.push({
          id: 'workforce-dev',
          title: 'Workforce Development Program',
          description: 'Implement a comprehensive training and apprenticeship program to build a skilled workforce pipeline.',
          priority: 'High',
          timeframe: '6-12 months',
          expectedImpact: '25% reduction in hiring time',
          actionItems: [
            'Partner with local trade schools',
            'Develop internal training curriculum',
            'Create apprenticeship positions',
            'Implement mentorship program'
          ],
          aiConfidence: 0.92
        })
      }

      if (businessProfile.challenges.includes('Winning more contracts')) {
        mockStrategies.push({
          id: 'bid-optimization',
          title: 'AI-Powered Bid Optimization',
          description: 'Use data analytics and AI to improve bid success rate and identify optimal project opportunities.',
          priority: 'High',
          timeframe: '3-6 months',
          expectedImpact: '35% increase in bid success rate',
          actionItems: [
            'Implement bid tracking software',
            'Analyze historical bid data',
            'Develop competitive intelligence',
            'Optimize pricing strategies'
          ],
          aiConfidence: 0.88
        })
      }

      if (businessProfile.goals.includes('Expand service offerings')) {
        mockStrategies.push({
          id: 'service-expansion',
          title: 'Strategic Service Expansion',
          description: 'Identify and develop complementary services that align with market demand and company capabilities.',
          priority: 'Medium',
          timeframe: '9-18 months',
          expectedImpact: '40% revenue increase',
          actionItems: [
            'Conduct market opportunity analysis',
            'Assess internal capabilities',
            'Develop new service protocols',
            'Train team on new offerings'
          ],
          aiConfidence: 0.85
        })
      }

      if (businessProfile.goals.includes('Adopt new technologies')) {
        mockStrategies.push({
          id: 'digital-transformation',
          title: 'Digital Transformation Initiative',
          description: 'Modernize operations with construction technology to improve efficiency and competitiveness.',
          priority: 'Medium',
          timeframe: '6-12 months',
          expectedImpact: '30% efficiency improvement',
          actionItems: [
            'Implement project management software',
            'Adopt drone and 3D scanning technology',
            'Digitize documentation processes',
            'Train staff on new technologies'
          ],
          aiConfidence: 0.90
        })
      }

      if (businessProfile.challenges.includes('Managing cash flow')) {
        mockStrategies.push({
          id: 'cash-flow-optimization',
          title: 'Cash Flow Optimization System',
          description: 'Implement financial controls and forecasting to maintain healthy cash flow throughout project cycles.',
          priority: 'High',
          timeframe: '3-6 months',
          expectedImpact: '50% reduction in cash flow gaps',
          actionItems: [
            'Implement automated invoicing',
            'Negotiate better payment terms',
            'Set up credit lines for smoothing',
            'Develop cash flow forecasting'
          ],
          aiConfidence: 0.94
        })
      }

      // Default strategies if no specific matches
      if (mockStrategies.length === 0) {
        mockStrategies.push(
          {
            id: 'market-expansion',
            title: 'Geographic Market Expansion',
            description: 'Expand operations to adjacent markets with high construction demand and limited competition.',
            priority: 'Medium',
            timeframe: '12-18 months',
            expectedImpact: '60% revenue increase',
            actionItems: [
              'Research target markets',
              'Establish local partnerships',
              'Build regional reputation',
              'Scale operations gradually'
            ],
            aiConfidence: 0.82
          },
          {
            id: 'client-retention',
            title: 'Client Retention Program',
            description: 'Develop a comprehensive program to increase repeat business and referrals from existing clients.',
            priority: 'High',
            timeframe: '3-6 months',
            expectedImpact: '25% increase in repeat business',
            actionItems: [
              'Implement customer feedback system',
              'Create loyalty incentive program',
              'Develop referral rewards',
              'Enhance post-project follow-up'
            ],
            aiConfidence: 0.91
          }
        )
      }

      const mockPlan: GrowthPlan = {
        businessProfile,
        strategies: mockStrategies,
        projectedGrowth: {
          revenueIncrease: '45-65%',
          timeframe: '18 months',
          keyMetrics: [
            { label: 'Revenue Growth', value: '45-65%' },
            { label: 'Profit Margin Improvement', value: '15-20%' },
            { label: 'Market Share Increase', value: '25-30%' },
            { label: 'Employee Productivity', value: '35%' }
          ]
        },
        nextSteps: [
          'Prioritize high-impact strategies based on current resources',
          'Develop detailed implementation timeline for top 2 strategies',
          'Secure funding or resources needed for strategy execution',
          'Establish key performance indicators (KPIs) for tracking progress',
          'Schedule monthly review meetings to assess strategy performance'
        ],
        createdAt: new Date()
      }

      setGeneratedPlan(mockPlan)
      setCurrentStep(4)

    } catch (err) {
      setError('Failed to generate business growth plan. Please try again.')
      console.error('Plan generation error:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800 border-red-200'
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Building className="h-16 w-16 text-primary-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Company Information</h2>
        <p className="text-gray-600">Tell us about your contracting business to create a personalized growth plan.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
          <input
            type="text"
            value={businessProfile.companyName}
            onChange={(e) => setBusinessProfile(prev => ({ ...prev, companyName: e.target.value }))}
            className="input-field"
            placeholder="Your Construction Company"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Industry Focus</label>
          <select
            value={businessProfile.industry}
            onChange={(e) => setBusinessProfile(prev => ({ ...prev, industry: e.target.value }))}
            className="input-field"
          >
            {industryOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Years in Business</label>
          <input
            type="number"
            value={businessProfile.yearsInBusiness}
            onChange={(e) => setBusinessProfile(prev => ({ ...prev, yearsInBusiness: parseInt(e.target.value) || 0 }))}
            className="input-field"
            placeholder="0"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Annual Revenue Range</label>
          <select
            value={businessProfile.currentRevenue}
            onChange={(e) => setBusinessProfile(prev => ({ ...prev, currentRevenue: e.target.value }))}
            className="input-field"
          >
            <option value="">Select revenue range</option>
            <option value="under-500k">Under $500K</option>
            <option value="500k-1m">$500K - $1M</option>
            <option value="1m-5m">$1M - $5M</option>
            <option value="5m-10m">$5M - $10M</option>
            <option value="over-10m">Over $10M</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Number of Employees</label>
          <select
            value={businessProfile.employeeCount}
            onChange={(e) => setBusinessProfile(prev => ({ ...prev, employeeCount: e.target.value }))}
            className="input-field"
          >
            <option value="">Select employee count</option>
            <option value="1-5">1-5 employees</option>
            <option value="6-15">6-15 employees</option>
            <option value="16-50">16-50 employees</option>
            <option value="51-100">51-100 employees</option>
            <option value="over-100">Over 100 employees</option>
          </select>
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Target className="h-16 w-16 text-primary-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Specialties & Focus Areas</h2>
        <p className="text-gray-600">Select your primary construction specialties and service areas.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">Construction Specialties (Select all that apply)</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {specialtyOptions.map(specialty => (
            <label key={specialty} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
              <input
                type="checkbox"
                checked={businessProfile.specialties.includes(specialty)}
                onChange={(e) => handleArrayFieldChange('specialties', specialty, e.target.checked)}
                className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">{specialty}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <BarChart3 className="h-16 w-16 text-primary-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Challenges & Goals</h2>
        <p className="text-gray-600">Help us understand your current challenges and future aspirations.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">Current Business Challenges</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {challengeOptions.map(challenge => (
            <label key={challenge} className="flex items-center p-3 bg-red-50 rounded-lg hover:bg-red-100 cursor-pointer">
              <input
                type="checkbox"
                checked={businessProfile.challenges.includes(challenge)}
                onChange={(e) => handleArrayFieldChange('challenges', challenge, e.target.checked)}
                className="mr-3 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">{challenge}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">Growth Goals</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {goalOptions.map(goal => (
            <label key={goal} className="flex items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 cursor-pointer">
              <input
                type="checkbox"
                checked={businessProfile.goals.includes(goal)}
                onChange={(e) => handleArrayFieldChange('goals', goal, e.target.checked)}
                className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">{goal}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )

  const renderGenerating = () => (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-6 animate-pulse">
        <Lightbulb className="h-8 w-8 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Generating Your Growth Plan</h2>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Our AI is analyzing your business profile and creating personalized growth strategies...
      </p>
      
      <div className="max-w-md mx-auto">
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }} />
        </div>
        <p className="text-sm text-gray-500">This may take a few moments...</p>
      </div>
    </div>
  )

  const renderResults = () => {
    if (!generatedPlan) return null

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-600 to-blue-600 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Your AI-Generated Growth Plan
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Based on your business profile, we've created a personalized growth strategy 
            to help {businessProfile.companyName} achieve its goals.
          </p>
        </div>

        {/* Projected Growth */}
        <div className="card bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Projected Growth Impact</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {generatedPlan.projectedGrowth.keyMetrics.map((metric, index) => (
              <div key={index} className="text-center">
                <p className="text-2xl font-bold text-green-600">{metric.value}</p>
                <p className="text-sm text-gray-600">{metric.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-white rounded-lg border">
            <p className="text-sm text-gray-700">
              <strong>Timeline:</strong> Expected results within {generatedPlan.projectedGrowth.timeframe}
            </p>
          </div>
        </div>

        {/* Growth Strategies */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-6">Recommended Growth Strategies</h3>
          <div className="space-y-6">
            {generatedPlan.strategies.map((strategy, index) => (
              <div key={strategy.id} className="card border-l-4 border-primary-600">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-primary-600 text-white text-sm font-bold rounded-full mr-3">
                        {index + 1}
                      </span>
                      <h4 className="text-lg font-semibold text-gray-900">{strategy.title}</h4>
                    </div>
                    <p className="text-gray-600 mb-3">{strategy.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className={`px-2 py-1 rounded-full border ${getPriorityColor(strategy.priority)}`}>
                        {strategy.priority} Priority
                      </span>
                      <span className="text-gray-600">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        {strategy.timeframe}
                      </span>
                      <span className="text-gray-600">
                        <TrendingUp className="h-4 w-4 inline mr-1" />
                        {strategy.expectedImpact}
                      </span>
                    </div>
                  </div>
                  
                  <div className="ml-4 text-right">
                    <div className="text-sm text-gray-500 mb-1">AI Confidence</div>
                    <div className="text-lg font-bold text-green-600">
                      {Math.round(strategy.aiConfidence * 100)}%
                    </div>
                  </div>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Action Items:</h5>
                  <ul className="space-y-1">
                    {strategy.actionItems.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-center text-sm text-gray-700">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next Steps */}
        <div className="card bg-blue-50 border-blue-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Immediate Next Steps</h3>
          <ol className="space-y-3">
            {generatedPlan.nextSteps.map((step, index) => (
              <li key={index} className="flex items-start">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-sm font-bold rounded-full mr-3 mt-0.5">
                  {index + 1}
                </span>
                <span className="text-gray-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Actions */}
        <div className="flex justify-center space-x-4">
          <button className="btn-primary flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Download Plan (PDF)
          </button>
          <button className="btn-outline flex items-center">
            <Share className="h-4 w-4 mr-2" />
            Share with Team
          </button>
          <button 
            onClick={() => router.push('/dashboard')}
            className="btn-outline"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">AI Business Growth Planner</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/ai-features')}
                className="text-gray-600 hover:text-primary-600 transition-colors"
              >
                AI Features
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Indicator */}
        {currentStep < 4 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500">Step {currentStep} of 3</span>
              <span className="text-sm text-gray-500">{Math.round((currentStep / 3) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="card">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {isGenerating && renderGenerating()}
          {currentStep === 4 && renderResults()}

          {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          {currentStep < 4 && !isGenerating && (
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
                className={`btn-outline ${
                  currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Previous
              </button>
              
              {currentStep === 3 ? (
                <button
                  onClick={generateGrowthPlan}
                  disabled={businessProfile.challenges.length === 0 || businessProfile.goals.length === 0}
                  className={`btn-primary flex items-center ${
                    businessProfile.challenges.length === 0 || businessProfile.goals.length === 0
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Generate AI Growth Plan
                </button>
              ) : (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={
                    (currentStep === 1 && (!businessProfile.companyName || !businessProfile.currentRevenue)) ||
                    (currentStep === 2 && businessProfile.specialties.length === 0)
                  }
                  className={`btn-primary flex items-center ${
                    (currentStep === 1 && (!businessProfile.companyName || !businessProfile.currentRevenue)) ||
                    (currentStep === 2 && businessProfile.specialties.length === 0)
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}