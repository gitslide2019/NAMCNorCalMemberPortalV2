import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Mail, Phone, Building, Calendar, Star, MapPin, ArrowLeft } from 'lucide-react'

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
  const [members] = useState<Member[]>(fallbackMembers)
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

  const filteredMembers = members.filter(member => 
    member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
              <Users className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Member Directory</h1>
              <span className="text-sm text-gray-500">({members.length} members)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search members by name, company, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
          />
        </div>

        {/* Members List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredMembers.map((member) => (
            <div key={member.id} className="p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors">
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
          ))}

          {filteredMembers.length === 0 && (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No members found matching your search criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}