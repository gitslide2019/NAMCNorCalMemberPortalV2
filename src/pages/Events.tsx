import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Users, ArrowLeft, Clock } from 'lucide-react'

interface Event {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  location?: string
  isVirtual: boolean
  meetingLink?: string
  maxAttendees?: number
  registeredAttendees: number
  isRegistered?: boolean
}

const mockEvents: Event[] = [
  {
    id: '1',
    title: 'NAMC NorCal Annual Meeting',
    description: 'Join us for our annual chapter meeting where we will discuss the year ahead and network with fellow members.',
    startDate: '2024-03-15T18:00:00Z',
    endDate: '2024-03-15T21:00:00Z',
    location: 'San Francisco Marriott Marquis',
    isVirtual: false,
    maxAttendees: 100,
    registeredAttendees: 78,
    isRegistered: true
  },
  {
    id: '2',
    title: 'Construction Technology Workshop',
    description: 'Learn about the latest construction technologies and how they can improve your business efficiency.',
    startDate: '2024-04-10T14:00:00Z',
    endDate: '2024-04-10T17:00:00Z',
    isVirtual: true,
    meetingLink: 'https://zoom.us/j/123456789',
    maxAttendees: 50,
    registeredAttendees: 32
  },
  {
    id: '3',
    title: 'Networking Mixer',
    description: 'Connect with other contractors and industry professionals in a casual setting.',
    startDate: '2024-03-28T17:30:00Z',
    endDate: '2024-03-28T19:30:00Z',
    location: 'Oakland Chamber of Commerce',
    isVirtual: false,
    maxAttendees: 40,
    registeredAttendees: 25
  }
]

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>(mockEvents)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const navigate = useNavigate()

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const registerForEvent = (eventId: string) => {
    setEvents(prev => prev.map(event => 
      event.id === eventId 
        ? { ...event, isRegistered: true, registeredAttendees: event.registeredAttendees + 1 }
        : event
    ))
  }

  const cancelRegistration = (eventId: string) => {
    setEvents(prev => prev.map(event => 
      event.id === eventId 
        ? { ...event, isRegistered: false, registeredAttendees: event.registeredAttendees - 1 }
        : event
    ))
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
              <Calendar className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Events</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 gap-6">
          {events.map(event => (
            <div key={event.id} className="card hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mr-4">
                      <Calendar className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>
                          {formatDate(event.startDate)} • {formatTime(event.startDate)} - {formatTime(event.endDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-4">{event.description}</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center text-gray-600">
                      {event.isVirtual ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          Virtual Event
                        </span>
                      ) : (
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <Users className="h-4 w-4 mr-1" />
                      <span>{event.registeredAttendees} / {event.maxAttendees || 'Unlimited'} registered</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 md:mt-0 md:ml-6 flex flex-col space-y-2">
                  {event.isRegistered ? (
                    <>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-green-100 text-green-800 mb-2">
                        Registered
                      </span>
                      <button
                        onClick={() => cancelRegistration(event.id)}
                        className="btn-outline"
                      >
                        Cancel Registration
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => registerForEvent(event.id)}
                      className="btn-primary"
                    >
                      Register
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedEvent(event)}
                    className="btn-outline"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold mb-4">{selectedEvent.title}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Date & Time</p>
                <p className="text-gray-900">{formatDate(selectedEvent.startDate)}</p>
                <p className="text-gray-900">{formatTime(selectedEvent.startDate)} - {formatTime(selectedEvent.endDate)}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-600">Location</p>
                {selectedEvent.isVirtual ? (
                  <div>
                    <p className="text-gray-900">Virtual Event</p>
                    {selectedEvent.meetingLink && (
                      <a href={selectedEvent.meetingLink} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-800">
                        Join Meeting
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-900">{selectedEvent.location}</p>
                )}
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-600 mb-2">Description</p>
              <p className="text-gray-900">{selectedEvent.description}</p>
            </div>
            
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-600 mb-2">Attendees</p>
              <p className="text-gray-900">{selectedEvent.registeredAttendees} registered out of {selectedEvent.maxAttendees || 'unlimited'} spots</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full" 
                  style={{ width: selectedEvent.maxAttendees ? `${(selectedEvent.registeredAttendees / selectedEvent.maxAttendees) * 100}%` : '100%' }}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              {selectedEvent.isRegistered ? (
                <button 
                  onClick={() => {
                    cancelRegistration(selectedEvent.id)
                    setSelectedEvent(null)
                  }} 
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Cancel Registration
                </button>
              ) : (
                <button 
                  onClick={() => {
                    registerForEvent(selectedEvent.id)
                    setSelectedEvent(null)
                  }} 
                  className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                  Register for Event
                </button>
              )}
              <button 
                onClick={() => setSelectedEvent(null)} 
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