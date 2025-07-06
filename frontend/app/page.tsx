'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowRight, Users, Calendar, FileText, MessageSquare, Building, 
  MapPin, ExternalLink, User, Phone, Mail, Calculator,
  ChevronLeft, ChevronRight, Play, Pause, Star, CheckCircle,
  Mic, Search, Bookmark, Download, Lock, ChevronDown,
  Facebook, Linkedin, Instagram, Monitor, Shield, Award,
  Headphones, Video, TrendingUp, BookOpen, Heart
} from 'lucide-react'

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [currentTimelineYear, setCurrentTimelineYear] = useState(1964)
  const [timelineAutoplay, setTimelineAutoplay] = useState(true)
  const [email, setEmail] = useState('')
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)

  // Timeline data
  const timelineEvents = {
    1964: {
      date: "September 24, 1965",
      title: "Executive Order 11246",
      description: "President Johnson signs landmark order requiring federal contractors to take affirmative action to ensure equal employment opportunity.",
      location: "Washington, D.C.",
      impact: "Established the foundation for minority business enterprise programs that would later inspire NAMC's formation.",
      category: "Economic Policy"
    },
    1965: {
      date: "August 17, 1965",
      title: "Small Business Act Amendment",
      description: "Congress expands SBA programs to include minority business development initiatives.",
      location: "Washington, D.C.",
      impact: "Created pathways for minority contractors to access federal contracting opportunities.",
      category: "Legislation"
    },
    1968: {
      date: "March 5, 1968",
      title: "Minority Business Enterprise Formation",
      description: "First organized efforts to create minority contractor associations begin in major metropolitan areas.",
      location: "Various Cities",
      impact: "Direct precursor to NAMC's founding and organizational structure.",
      category: "Organization"
    }
  }

  // Auto-advance timeline
  useEffect(() => {
    if (timelineAutoplay) {
      const interval = setInterval(() => {
        setCurrentTimelineYear(prev => {
          const years = Object.keys(timelineEvents).map(Number)
          const currentIndex = years.indexOf(prev)
          return years[(currentIndex + 1) % years.length]
        })
      }, 4000)
      return () => clearInterval(interval)
    }
  }, [timelineAutoplay])

  const timelineYears = Object.keys(timelineEvents).map(Number)
  const currentEvent = timelineEvents[currentTimelineYear as keyof typeof timelineEvents]

  return (
    <div className="min-h-screen bg-white">
      {/* Skip Navigation */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-[#F5C842] text-[#1F2938] px-4 py-2 rounded z-50">
        Skip to main content
      </a>

      {/* Header Navigation */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="flex justify-between items-center h-[72px]">
            <div className="flex items-center">
              <Building className="h-8 w-8 text-[#1F2938]" />
              <span className="ml-3 text-xl font-bold text-[#1F2938]">Northern California Minority Contractors</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-4">
              <Link 
                href="/login" 
                className="flex items-center bg-[#3B82F6] text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                <User className="h-4 w-4 mr-2" />
                Member Login
              </Link>
              <Link 
                href="/register" 
                className="flex items-center bg-[#F5C842] text-[#1F2938] px-6 py-2 rounded-lg hover:bg-yellow-500 transition-colors font-semibold"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Join
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-[#1F2938] hover:text-[#6B7280] p-2"
                aria-label="Toggle mobile menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {isMenuOpen && (
            <div className="md:hidden pb-4">
              <div className="space-y-2">
                <Link href="/login" className="flex items-center bg-[#3B82F6] text-white px-4 py-3 rounded-lg">
                  <User className="h-4 w-4 mr-2" />
                  Member Login
                </Link>
                <Link href="/register" className="flex items-center bg-[#F5C842] text-[#1F2938] px-4 py-3 rounded-lg font-semibold">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Join
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main id="main-content" className="relative overflow-hidden">
        <div 
          className="relative bg-cover bg-center bg-no-repeat min-h-[600px] flex items-center"
          style={{
            backgroundImage: `linear-gradient(rgba(31, 41, 56, 0.7), rgba(31, 41, 56, 0.7)), url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600"><rect fill="%23374151" width="1200" height="600"/><rect fill="%23475569" x="0" y="0" width="600" height="300"/><rect fill="%236B7280" x="600" y="300" width="600" height="300"/></svg>')`
          }}
        >
          <div className="max-w-[1200px] mx-auto px-4 py-12">
            <div className="text-center text-white">
              <div className="mb-6">
                <Link href="/tour" className="inline-flex items-center text-sm bg-yellow-300/20 hover:bg-yellow-300/30 text-yellow-300 hover:text-[#F5C842] px-3 py-1 rounded-full border border-yellow-300/50 transition-colors">
                  First time here? Take a guided tour →
                </Link>
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Building Northern California's Future
              </h1>
              
              <p className="text-base sm:text-lg md:text-xl leading-relaxed mb-8 max-w-4xl mx-auto px-4">
                Empowering minority contractors through advocacy, education, and economic opportunity since 1969. 
                Join a community dedicated to building stronger businesses and stronger communities.
              </p>
              
              <div className="mb-8">
                <h2 className="text-xl mb-4">Learn how we empower minority contractors through:</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-[#F5C842]" />
                    <span>Networking & Mentorship</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-[#F5C842]" />
                    <span>Business Development</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-[#F5C842]" />
                    <span>Certification Assistance</span>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <Link 
                  href="/register" 
                  className="inline-block bg-[#F5C842] text-[#1F2938] px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-base sm:text-lg font-semibold hover:bg-yellow-500 transition-colors w-full sm:w-auto"
                >
                  Become a Member
                </Link>
              </div>
              
              <div className="text-sm text-gray-300 mb-4">
                Join 500+ contractors • 5-minute application
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
                <Link href="/shop" className="inline-flex items-center bg-white text-[#1F2938] px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-semibold hover:bg-gray-100 transition-colors w-full sm:w-auto justify-center">
                  Visit Our Shop
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
                <Link href="/catalog" className="inline-flex items-center text-[#F5C842] hover:text-yellow-300 text-sm sm:text-base justify-center">
                  Browse Catalog
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Timeline Section */}
      <section className="py-12 bg-white">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1F2938] mb-2 px-4">
              The Path to NAMC: 1960s Civil Rights & Economic Empowerment
            </h2>
            <p className="text-lg text-[#6B7280]">1960-1969 Timeline</p>
          </div>
          
          <div className="mb-6 text-center">
            <div className="text-xl sm:text-2xl font-bold text-[#1F2938] mb-2 px-4">
              {currentTimelineYear} - {currentEvent.title}
            </div>
            <div className="flex justify-center items-center space-x-4">
              <button 
                onClick={() => {
                  const currentIndex = timelineYears.indexOf(currentTimelineYear)
                  const prevIndex = currentIndex === 0 ? timelineYears.length - 1 : currentIndex - 1
                  setCurrentTimelineYear(timelineYears[prevIndex])
                }}
                className="bg-[#F5C842] hover:bg-yellow-500 p-3 rounded-full transition-colors"
                aria-label="Previous year"
              >
                <ChevronLeft className="h-5 w-5 text-[#1F2938]" />
              </button>
              
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1F2938]">
                {currentTimelineYear}
              </div>
              
              <button 
                onClick={() => {
                  const currentIndex = timelineYears.indexOf(currentTimelineYear)
                  const nextIndex = (currentIndex + 1) % timelineYears.length
                  setCurrentTimelineYear(timelineYears[nextIndex])
                }}
                className="bg-[#F5C842] hover:bg-yellow-500 p-3 rounded-full transition-colors"
                aria-label="Next year"
              >
                <ChevronRight className="h-5 w-5 text-[#1F2938]" />
              </button>
            </div>
          </div>
          
          {/* Progress Dots */}
          <div className="flex justify-center space-x-2 mb-8">
            {timelineYears.map(year => (
              <button
                key={year}
                onClick={() => setCurrentTimelineYear(year)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  year === currentTimelineYear ? 'bg-[#F5C842]' : 'bg-[#E5E7EB]'
                }`}
                aria-label={`Go to year ${year}`}
                title={year.toString()}
              />
            ))}
          </div>
          
          {/* Event Card */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 max-w-4xl mx-auto">
            <div className="flex items-start space-x-3 sm:space-x-4">
              <div className="bg-purple-100 p-3 rounded-full">
                <Calculator className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-[#6B7280] mb-1">{currentEvent.date}</div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#1F2938] mb-2">{currentEvent.title}</h3>
                <p className="text-[#6B7280] mb-4">{currentEvent.description}</p>
                <div className="flex items-center text-sm text-[#6B7280] mb-4">
                  <MapPin className="h-4 w-4 mr-1" />
                  {currentEvent.location}
                </div>
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-[#1F2938] mb-2">Impact on NAMC Formation</h4>
                  <p className="text-[#6B7280] mb-4">{currentEvent.impact}</p>
                  <span className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                    {currentEvent.category}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <button
                onClick={() => setTimelineAutoplay(!timelineAutoplay)}
                className="bg-[#F5C842] hover:bg-yellow-500 px-6 py-2 rounded-lg text-[#1F2938] font-semibold transition-colors"
              >
                {timelineAutoplay ? (
                  <><Pause className="inline h-4 w-4 mr-2" />Pause Auto-play</>
                ) : (
                  <><Play className="inline h-4 w-4 mr-2" />Resume Auto-play</>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Corporate Partners Section */}
      <section className="py-12 bg-[#F3F4F6]">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-5 w-5 text-[#10B981] mr-2" />
              <span className="text-sm font-semibold text-[#10B981]">Verified Partners ✓</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1F2938] mb-4">
              Our Corporate Partners & Sponsors
            </h2>
            <p className="text-base sm:text-lg text-[#6B7280] max-w-3xl mx-auto px-4">
              Our trusted partners help create opportunities for minority contractors across Northern California
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Platinum Sponsor Card */}
            <div className="bg-gradient-to-br from-[#059669] to-[#047857] rounded-lg p-4 sm:p-6 text-white relative">
              <div className="absolute top-4 right-4">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div className="mb-4">
                <div className="text-3xl font-bold mb-2">PG&E</div>
                <div className="text-xl">Pacific Gas & Electric</div>
              </div>
              <p className="mb-6">Committed to fostering diversity and inclusion in our supply chain and supporting minority-owned businesses throughout Northern California.</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">$8.2B</div>
                  <div className="text-sm opacity-90">Annual Spend</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">26,000+</div>
                  <div className="text-sm opacity-90">Employees</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">Since 1905</div>
                  <div className="text-sm opacity-90">Established</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">25%</div>
                  <div className="text-sm opacity-90">Diverse Suppliers</div>
                </div>
              </div>
            </div>
            
            {/* Gold Sponsor Card */}
            <div className="bg-white rounded-lg p-4 sm:p-6 border-2 border-yellow-400">
              <div className="flex items-start justify-between mb-4">
                <div className="bg-blue-600 text-white px-4 py-2 rounded font-bold text-xl">BART</div>
                <span className="bg-yellow-400 text-[#1F2938] px-3 py-1 rounded-full text-sm font-semibold">Gold Sponsor</span>
              </div>
              <div className="text-xl font-bold text-[#1F2938] mb-2">Bay Area Rapid Transit</div>
              <p className="text-[#6B7280] mb-6">Investing in infrastructure that connects communities while creating opportunities for minority contractors in transit modernization projects.</p>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-[#10B981] mr-2" />
                  <span className="text-sm">$15B+ Capital Program</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-[#10B981] mr-2" />
                  <span className="text-sm">Fleet Modernization</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-[#10B981] mr-2" />
                  <span className="text-sm">Station Improvements</span>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Partnership CTA */}
          <div className="text-center">
            <h3 className="text-xl font-bold text-[#1F2938] mb-4">Interested in Partnership Opportunities?</h3>
            <p className="text-[#6B7280] mb-6">Join leading organizations committed to supplier diversity and economic inclusion.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/sponsors" className="bg-[#F5C842] hover:bg-yellow-500 text-[#1F2938] px-6 py-3 rounded-lg font-semibold transition-colors flex items-center">
                View All Sponsors
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link href="mailto:partnerships@namcnorcal.org" className="bg-[#3B82F6] hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors inline-flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                Corporate Membership
              </Link>
              <Link href="/partnership-faq" className="bg-gray-200 hover:bg-gray-300 text-[#1F2938] px-4 py-2 rounded-lg text-sm font-semibold transition-colors">Partnership FAQ</Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* Membership Packages Section */}
      <section className="py-12 bg-white">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-4 mb-4 text-sm text-[#6B7280]">
              <span className="flex items-center">
                <span className="bg-[#F5C842] text-[#1F2938] rounded-full w-6 h-6 flex items-center justify-center font-bold mr-2">1</span>
                Choose Package
              </span>
              <span>→</span>
              <span className="flex items-center">
                <span className="bg-[#F5C842] text-[#1F2938] rounded-full w-6 h-6 flex items-center justify-center font-bold mr-2">2</span>
                Apply
              </span>
              <span>→</span>
              <span className="flex items-center">
                <span className="bg-[#F5C842] text-[#1F2938] rounded-full w-6 h-6 flex items-center justify-center font-bold mr-2">3</span>
                Get Approved
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1F2938] mb-2">NAMC Membership Packages</h2>
            <p className="text-[#6B7280]">5-minute application process</p>
          </div>
          
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6 border">
              <h3 className="text-2xl font-bold text-[#1F2938] mb-2">Small Business</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-[#1F2938]">$400</span>
                <span className="text-[#6B7280] ml-2">per year</span>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-[#10B981] mr-3" />
                  <span>Full access to networking events</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-[#10B981] mr-3" />
                  <span>Business development resources</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-[#10B981] mr-3" />
                  <span>Certification assistance</span>
                </li>
              </ul>
              <Link href="/packages" className="bg-[#3B82F6] hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors inline-flex items-center">
                Compare all packages
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* Community Feed Section */}
      <section className="py-12 bg-white">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1F2938] mb-4">
              Community Feed
            </h2>
            <p className="text-lg text-[#6B7280] max-w-3xl mx-auto">
              Stay connected with the latest updates, success stories, and discussions from our vibrant community
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Recent Update */}
            <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 sm:p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-4">
                <div className="bg-[#F5C842] w-10 h-10 rounded-full flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-[#1F2938]" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-[#6B7280] mb-1">2 hours ago</div>
                  <h3 className="font-semibold text-[#1F2938] mb-2">New Partnership Announced</h3>
                  <p className="text-[#6B7280] text-sm mb-3">NAMC NorCal announces strategic partnership with Bay Area Transit Authority for upcoming infrastructure projects.</p>
                  <div className="flex items-center text-xs text-[#6B7280]">
                    <Heart className="h-3 w-3 mr-1" />
                    <span className="mr-3">24 likes</span>
                    <MessageSquare className="h-3 w-3 mr-1" />
                    <span>8 comments</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Member Success */}
            <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 sm:p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-4">
                <div className="bg-[#10B981] w-10 h-10 rounded-full flex items-center justify-center">
                  <Award className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-[#6B7280] mb-1">1 day ago</div>
                  <h3 className="font-semibold text-[#1F2938] mb-2">Member Milestone</h3>
                  <p className="text-[#6B7280] text-sm mb-3">Congratulations to Garcia Construction for winning the $2.5M Oakland Bridge renovation contract!</p>
                  <div className="flex items-center text-xs text-[#6B7280]">
                    <Heart className="h-3 w-3 mr-1" />
                    <span className="mr-3">42 likes</span>
                    <MessageSquare className="h-3 w-3 mr-1" />
                    <span>15 comments</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Industry News */}
            <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 sm:p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-4">
                <div className="bg-[#3B82F6] w-10 h-10 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-[#6B7280] mb-1">3 days ago</div>
                  <h3 className="font-semibold text-[#1F2938] mb-2">Industry Update</h3>
                  <p className="text-[#6B7280] text-sm mb-3">California announces $5B infrastructure spending plan focusing on minority contractor opportunities.</p>
                  <div className="flex items-center text-xs text-[#6B7280]">
                    <Heart className="h-3 w-3 mr-1" />
                    <span className="mr-3">38 likes</span>
                    <MessageSquare className="h-3 w-3 mr-1" />
                    <span>22 comments</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <Link href="/community" className="bg-[#F5C842] hover:bg-yellow-500 text-[#1F2938] px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center">
              View All Updates
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      
      {/* Industry Resources Section */}
      <section className="py-12 bg-[#F3F4F6]">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1F2938] mb-4">
              Industry Resources
            </h2>
            <p className="text-lg text-[#6B7280] max-w-3xl mx-auto">
              Access essential tools, guides, and resources to grow your construction business
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {/* Certification Guide */}
            <div className="bg-white rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow">
              <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-[#1F2938] mb-2">Certification Guide</h3>
              <p className="text-[#6B7280] text-sm mb-4">Complete guide to DBE, MBE, and WBE certifications</p>
              <Link href="/resources/certifications" className="bg-[#3B82F6] hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors inline-flex items-center">
                Download Guide
                <Download className="ml-1 h-3 w-3" />
              </Link>
            </div>
            
            {/* Business Templates */}
            <div className="bg-white rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow">
              <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-[#1F2938] mb-2">Business Templates</h3>
              <p className="text-[#6B7280] text-sm mb-4">Contracts, proposals, and business plan templates</p>
              <Link href="/resources/templates" className="bg-[#3B82F6] hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors inline-flex items-center">
                Browse Library
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </div>
            
            {/* Financial Planning */}
            <div className="bg-white rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow">
              <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Calculator className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-[#1F2938] mb-2">Financial Tools</h3>
              <p className="text-[#6B7280] text-sm mb-4">Calculators, budget templates, and financial planning</p>
              <Link href="/resources/financial" className="bg-[#3B82F6] hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors inline-flex items-center">
                Access Tools
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </div>
            
            {/* Legal Resources */}
            <div className="bg-white rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow">
              <div className="bg-red-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="font-semibold text-[#1F2938] mb-2">Legal Resources</h3>
              <p className="text-[#6B7280] text-sm mb-4">Labor laws, compliance guides, and legal templates</p>
              <Link href="/resources/legal" className="bg-[#3B82F6] hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors inline-flex items-center">
                Learn More
                <Bookmark className="ml-1 h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* Member Success Section */}
      <section className="py-12 bg-white">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1F2938] mb-4">
              Member Success Stories
            </h2>
            <p className="text-lg text-[#6B7280] max-w-3xl mx-auto">
              Celebrating the achievements and growth of our community members
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* Success Story 1 */}
            <div className="bg-gradient-to-br from-[#059669] to-[#047857] rounded-lg p-6 text-white">
              <div className="flex items-start space-x-4">
                <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center">
                  <Award className="h-8 w-8 text-[#059669]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">Martinez Construction</h3>
                  <div className="text-green-100 mb-3">Founded: 2018 • Growth: 340%</div>
                  <p className="mb-4">"NAMC helped us navigate DBE certification and connect with major contractors. We've grown from 3 employees to 25 and secured over $8M in contracts."</p>
                  <div className="text-sm">
                    <div className="mb-1"><strong>Maria Martinez</strong>, CEO</div>
                    <div className="text-green-100">Specialized in commercial electrical work</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Success Story 2 */}
            <div className="bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] rounded-lg p-6 text-white">
              <div className="flex items-start space-x-4">
                <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-8 w-8 text-[#3B82F6]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">Chen Plumbing Solutions</h3>
                  <div className="text-blue-100 mb-3">Founded: 2015 • Growth: 180%</div>
                  <p className="mb-4">"The networking events and mentorship program were game-changers. We learned best practices and formed partnerships that transformed our business."</p>
                  <div className="text-sm">
                    <div className="mb-1"><strong>David Chen</strong>, Owner</div>
                    <div className="text-blue-100">Residential and commercial plumbing</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <Link href="/success-stories" className="bg-[#F5C842] hover:bg-yellow-500 text-[#1F2938] px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center">
              Read More Stories
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      
      {/* Podcast Section */}
      <section className="py-12 bg-[#1F2938]">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="text-center mb-8">
            <div className="bg-[#F5C842] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <Headphones className="h-8 w-8 text-[#1F2938]" />
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
              NAMC NorCal Podcast
            </h2>
            <p className="text-gray-300 max-w-3xl mx-auto mb-8">
              Listen to industry insights, member interviews, and expert advice from leading voices in construction
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Latest Episode */}
            <div className="bg-[#374151] rounded-lg p-6 border border-gray-600">
              <div className="flex items-center mb-4">
                <div className="bg-[#F5C842] w-10 h-10 rounded-full flex items-center justify-center mr-3">
                  <Play className="h-5 w-5 text-[#1F2938]" />
                </div>
                <div>
                  <div className="text-xs text-gray-400">LATEST EPISODE</div>
                  <div className="text-sm text-[#F5C842] font-semibold">Episode 42</div>
                </div>
              </div>
              <h3 className="text-white font-semibold mb-2">Building Sustainable Infrastructure</h3>
              <p className="text-gray-300 text-sm mb-4">Green construction practices and sustainable building techniques with environmental engineer Dr. Sarah Kim.</p>
              <div className="text-xs text-gray-400 mb-4">45 min • Published 2 days ago</div>
              <button className="bg-[#F5C842] hover:bg-yellow-500 text-[#1F2938] px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center">
                <Play className="h-3 w-3 mr-2" />
                Listen Now
              </button>
            </div>
            
            {/* Popular Episode */}
            <div className="bg-[#374151] rounded-lg p-6 border border-gray-600">
              <div className="flex items-center mb-4">
                <div className="bg-purple-600 w-10 h-10 rounded-full flex items-center justify-center mr-3">
                  <Star className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-gray-400">MOST POPULAR</div>
                  <div className="text-sm text-purple-400 font-semibold">Episode 38</div>
                </div>
              </div>
              <h3 className="text-white font-semibold mb-2">From $50K to $5M: A Growth Story</h3>
              <p className="text-gray-300 text-sm mb-4">Interview with NAMC member Carlos Rivera on scaling his construction business through strategic partnerships.</p>
              <div className="text-xs text-gray-400 mb-4">52 min • 12K listens</div>
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center">
                <Play className="h-3 w-3 mr-2" />
                Listen Now
              </button>
            </div>
            
            {/* Subscribe Section */}
            <div className="bg-gradient-to-br from-[#F5C842] to-[#EAB308] rounded-lg p-6 text-[#1F2938]">
              <div className="text-center">
                <Mic className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Subscribe & Stay Updated</h3>
                <p className="text-sm mb-6">New episodes every Tuesday featuring industry leaders and successful contractors.</p>
                <div className="space-y-2">
                  <button className="w-full bg-[#1F2938] hover:bg-gray-800 text-white px-4 py-2 rounded font-semibold transition-colors">
                    Apple Podcasts
                  </button>
                  <button className="w-full bg-[#1F2938] hover:bg-gray-800 text-white px-4 py-2 rounded font-semibold transition-colors">
                    Spotify
                  </button>
                  <button className="w-full bg-[#1F2938] hover:bg-gray-800 text-white px-4 py-2 rounded font-semibold transition-colors">
                    Google Podcasts
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* NAMC TV Section */}
      <section className="py-12 bg-white">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="text-center mb-8">
            <div className="bg-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <Video className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1F2938] mb-4">
              NAMC TV
            </h2>
            <p className="text-lg text-[#6B7280] max-w-3xl mx-auto">
              Watch educational content, live events, and member spotlights on our video platform
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Featured Video */}
            <div className="bg-black rounded-lg overflow-hidden relative group">
              <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="bg-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Play className="h-8 w-8 text-white ml-1" />
                  </div>
                  <div className="text-xs text-gray-400">FEATURED CONTENT</div>
                </div>
              </div>
              <div className="p-4 bg-white">
                <h3 className="font-semibold text-[#1F2938] mb-2">2024 Annual Conference Highlights</h3>
                <p className="text-[#6B7280] text-sm mb-3">Key moments from our biggest networking event of the year.</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6B7280]">28 min • 2.1K views</span>
                  <Link href="/tv/conference-2024" className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-semibold transition-colors">
                    Watch Now
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Educational Series */}
            <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                <div className="text-center text-white">
                  <Monitor className="h-12 w-12 mx-auto mb-2" />
                  <div className="text-xs">EDUCATIONAL SERIES</div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-[#1F2938] mb-2">Construction Business 101</h3>
                <p className="text-[#6B7280] text-sm mb-3">12-part series covering business fundamentals for contractors.</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6B7280]">12 episodes • Series</span>
                  <Link href="/tv/business-101" className="bg-[#3B82F6] hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-semibold transition-colors">
                    Start Series
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Live Events */}
            <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="bg-red-500 w-4 h-4 rounded-full mx-auto mb-2 animate-pulse"></div>
                  <div className="text-xs">LIVE EVENTS</div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-[#1F2938] mb-2">Monthly Member Meetup</h3>
                <p className="text-[#6B7280] text-sm mb-3">Join our live virtual networking sessions every first Thursday.</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6B7280]">Next: Jan 4, 7PM PST</span>
                  <Link href="/tv/live" className="bg-[#10B981] hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-semibold transition-colors">
                    Join Live
                  </Link>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <Link href="/tv" className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center">
              <Video className="mr-2 h-4 w-4" />
              Browse All Videos
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-12 bg-[#1F2938]">
        <div className="max-w-[1200px] mx-auto px-4 text-center">
          <div className="max-w-md mx-auto">
            <div className="bg-[#F5C842] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="h-8 w-8 text-[#1F2938]" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Stay Connected</h2>
            <p className="text-gray-300 mb-6">Get the latest opportunities, events, and industry insights delivered to your inbox.</p>
            
            <form className="space-y-4">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full h-12 px-4 rounded-lg border-2 border-gray-300 focus:border-[#3B82F6] focus:outline-none"
                  required
                />
                {email && email.includes('@') && (
                  <CheckCircle className="absolute right-3 top-3 h-6 w-6 text-[#10B981]" />
                )}
              </div>
              <button
                type="submit"
                className="w-full bg-[#F5C842] hover:bg-yellow-500 text-[#1F2938] font-semibold py-3 rounded-lg transition-colors"
              >
                Subscribe
              </button>
            </form>
            
            <p className="text-xs text-gray-400 mt-4">We respect your privacy. Unsubscribe at any time.</p>
            <div className="flex items-center justify-center mt-2 text-xs text-gray-400">
              <Lock className="h-3 w-3 mr-1" />
              Your data is secure
            </div>
          </div>
        </div>
      </section>
      
      {/* FAQ Section */}
      <section className="py-12 bg-white">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#1F2938] mb-4">Frequently Asked Questions</h2>
            <div className="max-w-md mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-[#6B7280]" />
                <input
                  type="text"
                  placeholder="Search FAQ..."
                  className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#3B82F6] focus:outline-none"
                />
              </div>
            </div>
          </div>
          
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                question: "What are the membership requirements?",
                answer: "NAMC membership is open to minority-owned construction businesses, subcontractors, and related service providers. We welcome businesses of all sizes committed to our mission of economic empowerment."
              },
              {
                question: "How long does the application process take?",
                answer: "The online application takes about 5 minutes to complete. Review and approval typically takes 3-5 business days. You'll receive email updates throughout the process."
              },
              {
                question: "What certification assistance do you provide?",
                answer: "We help members navigate DBE, MBE, WBE, and other certification processes. This includes document preparation, application guidance, and ongoing compliance support."
              }
            ].map((faq, index) => (
              <div key={index} className="border border-[#E5E7EB] rounded-lg">
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-[#F3F4F6] transition-colors"
                >
                  <span className="font-semibold text-[#1F2938]">{faq.question}</span>
                  <ChevronDown className={`h-5 w-5 text-[#6B7280] transition-transform ${
                    expandedFAQ === index ? 'rotate-180' : ''
                  }`} />
                </button>
                {expandedFAQ === index && (
                  <div className="px-6 pb-4">
                    <p className="text-[#6B7280]">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Final CTA Section */}
      <section className="py-12 bg-[#F5C842]">
        <div className="max-w-[1200px] mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1F2938] mb-4">
            Ready to Join the NAMC Northern California Family?
          </h2>
          <p className="text-[#1F2938] mb-6">500+ Members • Established 1969 • BBB Accredited</p>
          
          <div className="space-y-4 max-w-md mx-auto">
            <Link 
              href="/register" 
              className="block w-full bg-[#1F2938] hover:bg-gray-800 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Start Your Application
            </Link>
            <Link 
              href="/login" 
              className="block w-full bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Member Login
            </Link>
          </div>
          
          <p className="mt-6 text-sm text-[#1F2938]">
            Need help? <Link href="/contact" className="bg-white hover:bg-gray-100 text-[#1F2938] px-3 py-1 rounded font-semibold transition-colors border border-[#1F2938]">Chat with us</Link>
          </p>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-[#1F2938] text-white py-12">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Building className="h-8 w-8 text-[#F5C842]" />
                <div className="ml-3">
                  <div className="text-xl font-bold">NAMC NorCal</div>
                  <div className="text-sm text-gray-400">Since 1969</div>
                </div>
              </div>
              <p className="text-gray-400 text-sm">
                Empowering minority contractors in Northern California through networking, education, and advocacy.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-gray-400 hover:text-white hover:underline focus:underline transition-colors">About Us</Link></li>
                <li><Link href="/events" className="text-gray-400 hover:text-white hover:underline focus:underline transition-colors">Events</Link></li>
                <li><Link href="/projects" className="text-gray-400 hover:text-white hover:underline focus:underline transition-colors">Projects</Link></li>
                <li><Link href="/funding" className="text-gray-400 hover:text-white hover:underline focus:underline transition-colors">Funding</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Membership</h3>
              <ul className="space-y-2">
                <li><Link href="/register" className="text-gray-400 hover:text-white hover:underline focus:underline transition-colors">Join Now</Link></li>
                <li><Link href="/login" className="text-gray-400 hover:text-white hover:underline focus:underline transition-colors">Member Login</Link></li>
                <li><Link href="/benefits" className="text-gray-400 hover:text-white hover:underline focus:underline transition-colors">Benefits</Link></li>
                <li><Link href="/shop" className="text-gray-400 hover:text-white hover:underline focus:underline transition-colors">Shop</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Info</h3>
              <div className="space-y-2">
                <Link href="mailto:info@namcnorcal.org" className="flex items-center text-gray-400 hover:text-white transition-colors">
                  <Mail className="h-4 w-4 mr-2" />
                  info@namcnorcal.org
                </Link>
                <Link href="tel:+15551234567" className="flex items-center text-gray-400 hover:text-white transition-colors">
                  <Phone className="h-4 w-4 mr-2" />
                  (555) 123-4567
                </Link>
                <Link href="/contact" className="flex items-center text-gray-400 hover:text-white transition-colors">
                  <MapPin className="h-4 w-4 mr-2" />
                  San Francisco, CA
                </Link>
              </div>
              
              <div className="flex space-x-3 mt-4">
                <Link href="#" className="bg-gray-700 hover:bg-[#F5C842] p-2 rounded-full transition-colors">
                  <Facebook className="h-4 w-4" />
                </Link>
                <Link href="#" className="bg-gray-700 hover:bg-[#F5C842] p-2 rounded-full transition-colors">
                  <Linkedin className="h-4 w-4" />
                </Link>
                <Link href="#" className="bg-gray-700 hover:bg-[#F5C842] p-2 rounded-full transition-colors">
                  <Instagram className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-sm text-gray-400 mb-4 md:mb-0">
                &copy; 2024 NAMC Northern California. All rights reserved.
              </div>
              <div className="flex space-x-6 text-sm">
                <Link href="/accessibility" className="text-gray-400 hover:text-white transition-colors">Accessibility Statement</Link>
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}