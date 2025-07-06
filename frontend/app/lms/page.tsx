'use client'

import { useState, useEffect } from 'react'
import { BookOpen, CheckCircle, Award, PlusCircle, Search, Filter, Star, TrendingUp } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Course {
  id: string
  title: string
  description: string
  instructor: string
  duration: string
  category: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  modules: { id: string; title: string; completed?: boolean }[]
  isEnrolled?: boolean
  progress?: number
  isCompleted?: boolean
  certificateId?: string
}

const mockCourses: Course[] = [
  {
    id: 'course-1',
    title: 'Construction Safety Fundamentals',
    description: 'Essential safety protocols and regulations for construction sites.',
    instructor: 'John Safety Expert',
    duration: '4 hours',
    category: 'Safety',
    difficulty: 'Beginner',
    modules: [
      { id: 'm1', title: 'OSHA Standards', completed: true },
      { id: 'm2', title: 'Personal Protective Equipment' },
      { id: 'm3', title: 'Hazard Recognition' },
    ],
    isEnrolled: true,
    progress: 33,
  },
  {
    id: 'course-2',
    title: 'Project Management for Contractors',
    description: 'Learn effective project management techniques for construction projects.',
    instructor: 'Jane Project Manager',
    duration: '6 hours',
    category: 'Management',
    difficulty: 'Intermediate',
    modules: [
      { id: 'm1', title: 'Planning and Scheduling' },
      { id: 'm2', title: 'Budget Management' },
      { id: 'm3', title: 'Team Coordination' },
    ],
    isEnrolled: false,
    progress: 0,
  },
  {
    id: 'course-3',
    title: 'Green Building Practices',
    description: 'Sustainable construction methods and green building certifications.',
    instructor: 'Mark Green Builder',
    duration: '5 hours',
    category: 'Sustainability',
    difficulty: 'Advanced',
    modules: [
      { id: 'm1', title: 'LEED Certification' },
      { id: 'm2', title: 'Energy Efficiency' },
      { id: 'm3', title: 'Sustainable Materials' },
    ],
    isEnrolled: true,
    progress: 100,
    isCompleted: true,
    certificateId: 'CERT-2024-001',
  },
  {
    id: 'course-4',
    title: 'Business Development for Contractors',
    description: 'Grow your contracting business with proven strategies.',
    instructor: 'Sarah Business Coach',
    duration: '8 hours',
    category: 'Business',
    difficulty: 'Intermediate',
    modules: [
      { id: 'm1', title: 'Marketing and Branding' },
      { id: 'm2', title: 'Financial Management' },
      { id: 'm3', title: 'Customer Relations' },
    ],
    isEnrolled: false,
    progress: 0,
  },
]

export default function LMSPage() {
  const [courses, setCourses] = useState<Course[]>(mockCourses)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedDifficulty, setSelectedDifficulty] = useState('All')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [showCertificate, setShowCertificate] = useState<{ course: Course } | null>(null)
  const [showCreateCourse, setShowCreateCourse] = useState(false)
  const router = useRouter()

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
  }, [router])

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || course.category === selectedCategory
    const matchesDifficulty = selectedDifficulty === 'All' || course.difficulty === selectedDifficulty
    
    return matchesSearch && matchesCategory && matchesDifficulty
  })

  const categories = ['All', ...Array.from(new Set(courses.map(c => c.category)))]
  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced']

  const enrollInCourse = (courseId: string) => {
    setCourses(prev => prev.map(course =>
      course.id === courseId ? { ...course, isEnrolled: true, progress: 0 } : course
    ))
  }

  const addCourse = (newCourse: Course) => {
    setCourses(prev => [...prev, newCourse])
  }

  const enrolledCourses = courses.filter(c => c.isEnrolled)
  const completedCourses = courses.filter(c => c.isCompleted)
  const inProgressCourses = enrolledCourses.filter(c => c.progress! > 0 && !c.isCompleted)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">NAMC Learning Center</span>
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
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Available Courses</p>
                <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Enrolled</p>
                <p className="text-2xl font-bold text-gray-900">{enrolledCourses.length}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{inProgressCourses.length}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Award className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{completedCourses.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="card mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search courses..."
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
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="input-field"
            >
              {difficulties.map(difficulty => (
                <option key={difficulty} value={difficulty}>{difficulty}</option>
              ))}
            </select>

            <button
              onClick={() => setShowCreateCourse(true)}
              className="btn-primary flex items-center"
            >
              <PlusCircle className="h-5 w-5 mr-2" />
              Add Course
            </button>
          </div>
        </div>

        {/* Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => (
            <div key={course.id} className="card hover:shadow-lg transition-shadow">
              <div className="mb-4">
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    course.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
                    course.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {course.difficulty}
                  </span>
                  {course.isCompleted && (
                    <Award className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.title}</h3>
                <p className="text-gray-600 text-sm mb-3">{course.description}</p>
                
                <div className="text-sm text-gray-500 space-y-1">
                  <p><span className="font-medium">Instructor:</span> {course.instructor}</p>
                  <p><span className="font-medium">Duration:</span> {course.duration}</p>
                  <p><span className="font-medium">Category:</span> {course.category}</p>
                </div>
              </div>

              {course.isEnrolled && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedCourse(course)}
                  className="flex-1 btn-outline text-sm"
                >
                  View Details
                </button>
                
                {!course.isEnrolled ? (
                  <button
                    onClick={() => enrollInCourse(course.id)}
                    className="flex-1 btn-primary text-sm"
                  >
                    Enroll
                  </button>
                ) : course.isCompleted ? (
                  <button
                    onClick={() => setShowCertificate({ course })}
                    className="flex-1 btn-primary text-sm flex items-center justify-center"
                  >
                    <Award className="h-4 w-4 mr-1" />
                    Certificate
                  </button>
                ) : (
                  <button className="flex-1 btn-primary text-sm">
                    Continue
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No courses found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Course Details Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold mb-4">{selectedCourse.title}</h2>
            <p className="mb-2"><strong>Instructor:</strong> {selectedCourse.instructor}</p>
            <p className="mb-2"><strong>Duration:</strong> {selectedCourse.duration}</p>
            <p className="mb-4">{selectedCourse.description}</p>
            
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Course Modules:</h3>
              <ul className="space-y-1">
                {selectedCourse.modules.map((module, index) => (
                  <li key={module.id} className="flex items-center">
                    <CheckCircle className={`h-4 w-4 mr-2 ${module.completed ? 'text-green-500' : 'text-gray-300'}`} />
                    <span className={module.completed ? 'line-through text-gray-500' : ''}>{module.title}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="flex justify-end space-x-2">
              {!selectedCourse.isEnrolled && (
                <button 
                  onClick={() => { 
                    enrollInCourse(selectedCourse.id); 
                    setSelectedCourse(null); 
                  }} 
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Enroll
                </button>
              )}
              <button 
                onClick={() => setSelectedCourse(null)} 
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {showCertificate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 text-center">
            <Award size={48} className="mx-auto text-yellow-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Certificate of Completion</h2>
            <p className="mb-4">This certifies that you have successfully completed the course:</p>
            <p className="text-xl font-semibold mb-6">{showCertificate.course.title}</p>
            <p className="text-sm text-gray-500 mb-4">Certificate ID: {showCertificate.course.certificateId}</p>
            <button 
              onClick={() => setShowCertificate(null)} 
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Create Course Modal */}
      {showCreateCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Create New Course</h2>
            <p className="text-gray-600 mb-4">Course creation feature coming soon!</p>
            <div className="flex justify-end">
              <button 
                onClick={() => setShowCreateCourse(false)} 
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