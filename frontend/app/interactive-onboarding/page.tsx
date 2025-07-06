'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Play, CheckCircle, Lightbulb, Target, Users, FileText, Star, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface OnboardingStep {
  id: string
  title: string
  description: string
  content: React.ReactNode
  completed?: boolean
}

interface UserProgress {
  currentStep: number
  completedSteps: Set<string>
  startedAt: Date
  completionPercentage: number
}

export default function InteractiveOnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState<UserProgress>({
    currentStep: 0,
    completedSteps: new Set(),
    startedAt: new Date(),
    completionPercentage: 0
  })
  const [isStarted, setIsStarted] = useState(false)
  const router = useRouter()

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to NAMC NorCal',
      description: 'Get started with your member journey',
      content: (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-primary-600 to-blue-600 rounded-full mb-6">
            <Star className="h-12 w-12 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to NAMC Northern California!
          </h3>
          <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
            You're now part of California's premier network of minority contractors. 
            This interactive tutorial will help you make the most of your membership.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <h4 className="font-semibold text-blue-900 mb-2">What you'll learn:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Navigate the member portal</li>
              <li>• Connect with other contractors</li>
              <li>• Find project opportunities</li>
              <li>• Access learning resources</li>
              <li>• Utilize AI-powered tools</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'profile-setup',
      title: 'Complete Your Profile',
      description: 'Set up your contractor profile for maximum visibility',
      content: (
        <div className="py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Profile Essentials</h3>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <span className="font-medium text-green-900">Business Information</span>
                  </div>
                  <p className="text-sm text-green-800">Company name, licenses, certifications</p>
                </div>
                
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Target className="h-5 w-5 text-yellow-600 mr-2" />
                    <span className="font-medium text-yellow-900">Skills & Specialties</span>
                  </div>
                  <p className="text-sm text-yellow-800">Construction categories, project types</p>
                </div>
                
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Users className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="font-medium text-blue-900">Contact Preferences</span>
                  </div>
                  <p className="text-sm text-blue-800">How you want to be contacted for opportunities</p>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Interactive Demo</h4>
              <div className="bg-gray-100 rounded-lg p-6 text-center">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Try our AI Business Card Scanner!</p>
                <button 
                  onClick={() => router.push('/business-card-scanner')}
                  className="btn-primary"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Try Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'navigation-tour',
      title: 'Portal Navigation',
      description: 'Learn to navigate the member portal efficiently',
      content: (
        <div className="py-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Member Portal Tour</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/dashboard')}>
              <div className="p-4 bg-blue-100 rounded-lg mb-3 w-fit">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Dashboard</h4>
              <p className="text-sm text-gray-600">Your home base with quick access to everything</p>
            </div>
            
            <div className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/projects')}>
              <div className="p-4 bg-green-100 rounded-lg mb-3 w-fit">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Projects</h4>
              <p className="text-sm text-gray-600">Find and bid on construction opportunities</p>
            </div>
            
            <div className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/members')}>
              <div className="p-4 bg-purple-100 rounded-lg mb-3 w-fit">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Members</h4>
              <p className="text-sm text-gray-600">Connect with other contractors and partners</p>
            </div>
            
            <div className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/lms')}>
              <div className="p-4 bg-yellow-100 rounded-lg mb-3 w-fit">
                <Lightbulb className="h-6 w-6 text-yellow-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Learning</h4>
              <p className="text-sm text-gray-600">Access courses and training materials</p>
            </div>
            
            <div className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/shop')}>
              <div className="p-4 bg-red-100 rounded-lg mb-3 w-fit">
                <Star className="h-6 w-6 text-red-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Shop</h4>
              <p className="text-sm text-gray-600">Support NAMC while getting quality products</p>
            </div>
            
            <div className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/ai-features')}>
              <div className="p-4 bg-indigo-100 rounded-lg mb-3 w-fit">
                <Target className="h-6 w-6 text-indigo-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">AI Tools</h4>
              <p className="text-sm text-gray-600">Leverage AI for business growth</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'networking',
      title: 'Networking & Connections',
      description: 'Build valuable relationships with other contractors',
      content: (
        <div className="py-6">
          <div className="text-center mb-8">
            <Users className="h-16 w-16 text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-4">Build Your Network</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              NAMC NorCal is more than a directory - it's a community. Here's how to make the most of it.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900">Networking Tips</h4>
              
              <div className="p-4 bg-blue-50 border-l-4 border-blue-400">
                <h5 className="font-medium text-blue-900 mb-2">1. Complete Your Profile</h5>
                <p className="text-sm text-blue-800">A complete profile gets 5x more connection requests</p>
              </div>
              
              <div className="p-4 bg-green-50 border-l-4 border-green-400">
                <h5 className="font-medium text-green-900 mb-2">2. Join Project Teams</h5>
                <p className="text-sm text-green-800">Collaborate on projects to build lasting relationships</p>
              </div>
              
              <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400">
                <h5 className="font-medium text-yellow-900 mb-2">3. Attend Events</h5>
                <p className="text-sm text-yellow-800">NAMC events are perfect for face-to-face networking</p>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h4>
              <div className="space-y-3">
                <button 
                  onClick={() => router.push('/members')}
                  className="w-full btn-outline text-left flex items-center justify-between"
                >
                  <span>Browse Member Directory</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                
                <button 
                  onClick={() => router.push('/events')}
                  className="w-full btn-outline text-left flex items-center justify-between"
                >
                  <span>View Upcoming Events</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                
                <button 
                  onClick={() => router.push('/projects')}
                  className="w-full btn-outline text-left flex items-center justify-between"
                >
                  <span>Find Project Partners</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'ai-tools',
      title: 'AI-Powered Tools',
      description: 'Discover how AI can accelerate your business',
      content: (
        <div className="py-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mb-4">
              <Lightbulb className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">AI Tools for Contractors</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              NAMC NorCal offers cutting-edge AI tools to help you work smarter, not harder.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card border-purple-200 bg-purple-50">
              <h4 className="font-semibold text-purple-900 mb-3">Business Card Scanner</h4>
              <p className="text-sm text-purple-800 mb-4">
                Instantly extract contact information from business cards using AI OCR and Named Entity Recognition.
              </p>
              <button 
                onClick={() => router.push('/business-card-scanner')}
                className="btn-primary bg-purple-600 hover:bg-purple-700"
              >
                Try Scanner
              </button>
            </div>
            
            <div className="card border-blue-200 bg-blue-50">
              <h4 className="font-semibold text-blue-900 mb-3">Contract Analyzer</h4>
              <p className="text-sm text-blue-800 mb-4">
                Upload contracts and ask questions in natural language. Get instant answers about terms and conditions.
              </p>
              <button 
                onClick={() => router.push('/contract-analyzer')}
                className="btn-primary bg-blue-600 hover:bg-blue-700"
              >
                Analyze Contract
              </button>
            </div>
            
            <div className="card border-green-200 bg-green-50">
              <h4 className="font-semibold text-green-900 mb-3">Business Growth Planner</h4>
              <p className="text-sm text-green-800 mb-4">
                AI-powered business planning tool that creates customized growth strategies for your contracting business.
              </p>
              <button 
                onClick={() => router.push('/business-growth-planner')}
                className="btn-primary bg-green-600 hover:bg-green-700"
              >
                Create Plan
              </button>
            </div>
            
            <div className="card border-yellow-200 bg-yellow-50">
              <h4 className="font-semibold text-yellow-900 mb-3">All AI Features</h4>
              <p className="text-sm text-yellow-800 mb-4">
                Explore our complete suite of AI-powered tools designed specifically for contractors.
              </p>
              <button 
                onClick={() => router.push('/ai-features')}
                className="btn-primary bg-yellow-600 hover:bg-yellow-700"
              >
                View All Tools
              </button>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'completion',
      title: 'Onboarding Complete!',
      description: 'You\'re ready to make the most of your NAMC membership',
      content: (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-green-600 to-blue-600 rounded-full mb-6">
            <CheckCircle className="h-12 w-12 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Congratulations! 🎉
          </h3>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            You've completed the NAMC NorCal member onboarding. You're now ready to 
            connect, grow, and succeed with Northern California's premier contractor network.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
            <div className="card text-center">
              <div className="p-3 bg-blue-100 rounded-lg mx-auto w-fit mb-3">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Next Steps</h4>
              <p className="text-sm text-gray-600">Complete your profile and start connecting</p>
            </div>
            
            <div className="card text-center">
              <div className="p-3 bg-green-100 rounded-lg mx-auto w-fit mb-3">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Network</h4>
              <p className="text-sm text-gray-600">Connect with contractors in your area</p>
            </div>
            
            <div className="card text-center">
              <div className="p-3 bg-purple-100 rounded-lg mx-auto w-fit mb-3">
                <Lightbulb className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Grow</h4>
              <p className="text-sm text-gray-600">Use AI tools to accelerate your business</p>
            </div>
          </div>
          
          <div className="flex justify-center space-x-4">
            <button 
              onClick={() => router.push('/dashboard')}
              className="btn-primary"
            >
              Go to Dashboard
            </button>
            <button 
              onClick={() => router.push('/business-growth-planner')}
              className="btn-outline"
            >
              Start Business Planning
            </button>
          </div>
        </div>
      )
    }
  ]

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      const newStep = currentStep + 1
      setCurrentStep(newStep)
      
      // Mark current step as completed
      const newCompletedSteps = new Set(progress.completedSteps)
      newCompletedSteps.add(onboardingSteps[currentStep].id)
      
      setProgress(prev => ({
        ...prev,
        currentStep: newStep,
        completedSteps: newCompletedSteps,
        completionPercentage: Math.round((newCompletedSteps.size / onboardingSteps.length) * 100)
      }))
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex)
  }

  const startOnboarding = () => {
    setIsStarted(true)
    setCurrentStep(0)
    setProgress({
      currentStep: 0,
      completedSteps: new Set(),
      startedAt: new Date(),
      completionPercentage: 0
    })
  }

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
  }, [router])

  if (!isStarted) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Play className="h-8 w-8 text-primary-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">Interactive Onboarding</span>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="text-gray-600 hover:text-primary-600 transition-colors"
                >
                  Skip to Dashboard
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-primary-600 to-blue-600 rounded-full mb-8">
              <Play className="h-12 w-12 text-white" />
            </div>
            
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              Welcome to NAMC NorCal!
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Ready to unlock the full potential of your membership? Our interactive onboarding 
              will guide you through everything you need to know to succeed as a NAMC member.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="card text-center">
                <div className="p-4 bg-blue-100 rounded-lg mx-auto w-fit mb-4">
                  <Target className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">5-Minute Setup</h3>
                <p className="text-gray-600">Quick, interactive lessons to get you started</p>
              </div>
              
              <div className="card text-center">
                <div className="p-4 bg-green-100 rounded-lg mx-auto w-fit mb-4">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Networking Guide</h3>
                <p className="text-gray-600">Learn how to connect with other contractors</p>
              </div>
              
              <div className="card text-center">
                <div className="p-4 bg-purple-100 rounded-lg mx-auto w-fit mb-4">
                  <Lightbulb className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Tools Demo</h3>
                <p className="text-gray-600">Discover AI-powered features for your business</p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-primary-600 to-blue-600 rounded-2xl p-8 text-white mb-8">
              <h3 className="text-2xl font-bold mb-4">What You'll Learn</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                  <span>Navigate the member portal efficiently</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                  <span>Find and bid on project opportunities</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                  <span>Connect with other contractors</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                  <span>Leverage AI tools for business growth</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={startOnboarding}
                className="btn-primary text-lg px-8 py-3"
              >
                <Play className="h-5 w-5 mr-2" />
                Start Interactive Tour
              </button>
              
              <button
                onClick={() => router.push('/dashboard')}
                className="btn-outline text-lg px-8 py-3"
              >
                Skip for Now
              </button>
            </div>
          </div>
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
              <Play className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Interactive Onboarding</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Step {currentStep + 1} of {onboardingSteps.length}
              </span>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Step Navigation */}
          <div className="lg:col-span-1">
            <div className="card sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Progress</h3>
              
              <div className="space-y-3">
                {onboardingSteps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => goToStep(index)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      index === currentStep
                        ? 'bg-primary-100 border-primary-300 border-2'
                        : progress.completedSteps.has(step.id)
                        ? 'bg-green-50 border-green-200 border'
                        : 'bg-gray-50 border-gray-200 border hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                        progress.completedSteps.has(step.id)
                          ? 'bg-green-600 text-white'
                          : index === currentStep
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        {progress.completedSteps.has(step.id) ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <span className="text-sm font-medium">{index + 1}</span>
                        )}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${
                          index === currentStep ? 'text-primary-900' : 'text-gray-900'
                        }`}>
                          {step.title}
                        </p>
                        <p className="text-xs text-gray-600">{step.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-1">
                  {progress.completionPercentage}% Complete
                </p>
                <p className="text-xs text-blue-700">
                  You're doing great! Keep going to unlock all features.
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="card">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {onboardingSteps[currentStep].title}
                </h2>
                <p className="text-gray-600">
                  {onboardingSteps[currentStep].description}
                </p>
              </div>
              
              <div className="min-h-[400px]">
                {onboardingSteps[currentStep].content}
              </div>
              
              {/* Navigation Buttons */}
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className={`flex items-center px-6 py-2 rounded-lg font-medium transition-colors ${
                    currentStep === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </button>
                
                <span className="text-sm text-gray-500">
                  {currentStep + 1} of {onboardingSteps.length}
                </span>
                
                {currentStep === onboardingSteps.length - 1 ? (
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center btn-primary"
                  >
                    Complete Onboarding
                    <CheckCircle className="h-4 w-4 ml-2" />
                  </button>
                ) : (
                  <button
                    onClick={nextStep}
                    className="flex items-center btn-primary"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}