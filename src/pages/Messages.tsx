import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, ArrowLeft, Send, User, Trash, Mail } from 'lucide-react'

interface Message {
  id: string
  senderId: string
  sender: {
    firstName: string
    lastName: string
    company?: string
  }
  receiverId: string
  subject: string
  content: string
  isRead: boolean
  createdAt: string
}

const mockMessages: Message[] = [
  {
    id: '1',
    senderId: '2',
    sender: {
      firstName: 'John',
      lastName: 'Doe',
      company: 'Doe Construction'
    },
    receiverId: '1',
    subject: 'Project Collaboration Opportunity',
    content: 'Hello, I wanted to discuss a potential collaboration on an upcoming project in San Francisco. Would you be available for a call next week?',
    isRead: true,
    createdAt: '2024-03-01T14:30:00Z'
  },
  {
    id: '2',
    senderId: '3',
    sender: {
      firstName: 'Jane',
      lastName: 'Smith',
      company: 'Smith Contracting'
    },
    receiverId: '1',
    subject: 'Question about upcoming event',
    content: 'Hi there, I had a question about the Construction Technology Workshop next month. Is there a detailed agenda available yet?',
    isRead: false,
    createdAt: '2024-03-05T09:15:00Z'
  },
  {
    id: '3',
    senderId: '4',
    sender: {
      firstName: 'Admin',
      lastName: 'User',
      company: 'NAMC NorCal'
    },
    receiverId: '1',
    subject: 'Your membership renewal',
    content: 'This is a reminder that your NAMC NorCal membership is due for renewal in 30 days. Please log in to your account to complete the renewal process.',
    isRead: false,
    createdAt: '2024-03-07T16:45:00Z'
  }
]

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>(mockMessages)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [showComposeModal, setShowComposeModal] = useState(false)
  const [newMessage, setNewMessage] = useState({
    recipient: '',
    subject: '',
    content: ''
  })
  const navigate = useNavigate()

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const markAsRead = (messageId: string) => {
    setMessages(prev => prev.map(message => 
      message.id === messageId ? { ...message, isRead: true } : message
    ))
  }

  const deleteMessage = (messageId: string) => {
    setMessages(prev => prev.filter(message => message.id !== messageId))
    if (selectedMessage?.id === messageId) {
      setSelectedMessage(null)
    }
  }

  const sendMessage = () => {
    // In a real app, this would send the message to the API
    setShowComposeModal(false)
    setNewMessage({
      recipient: '',
      subject: '',
      content: ''
    })
  }

  const unreadCount = messages.filter(message => !message.isRead).length

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
              <MessageSquare className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Messages</h1>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <button
              onClick={() => setShowComposeModal(true)}
              className="btn-primary"
            >
              Compose Message
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {messages.length === 0 ? (
            <div className="p-8 text-center">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Your inbox is empty</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3">
              {/* Message List */}
              <div className="md:col-span-1 border-r border-gray-200">
                {messages.map(message => (
                  <div 
                    key={message.id}
                    onClick={() => {
                      setSelectedMessage(message)
                      if (!message.isRead) {
                        markAsRead(message.id)
                      }
                    }}
                    className={`p-4 border-b border-gray-200 cursor-pointer ${
                      selectedMessage?.id === message.id ? 'bg-primary-50' : 
                      message.isRead ? 'bg-white' : 'bg-blue-50'
                    } hover:bg-gray-50`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${message.isRead ? 'bg-gray-300' : 'bg-blue-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${message.isRead ? 'text-gray-900' : 'text-black'}`}>
                          {message.sender.firstName} {message.sender.lastName}
                        </p>
                        <p className="text-sm truncate text-gray-600">{message.subject}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(message.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Content */}
              <div className="md:col-span-2 p-6">
                {selectedMessage ? (
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedMessage.subject}</h2>
                        <div className="flex items-center text-sm text-gray-600">
                          <User className="h-4 w-4 mr-1" />
                          <span>From: {selectedMessage.sender.firstName} {selectedMessage.sender.lastName}</span>
                          {selectedMessage.sender.company && (
                            <span className="ml-1">({selectedMessage.sender.company})</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{formatDate(selectedMessage.createdAt)}</p>
                      </div>
                      <button
                        onClick={() => deleteMessage(selectedMessage.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <div className="prose max-w-none">
                      <p className="text-gray-800 whitespace-pre-line">{selectedMessage.content}</p>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <button
                        onClick={() => setShowComposeModal(true)}
                        className="btn-primary"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Select a message to view</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Message Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h2 className="text-xl font-bold mb-4">Compose Message</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="recipient" className="form-label">
                  Recipient
                </label>
                <input
                  id="recipient"
                  type="text"
                  value={newMessage.recipient}
                  onChange={(e) => setNewMessage({...newMessage, recipient: e.target.value})}
                  className="input-field"
                  placeholder="Enter recipient name or email"
                />
              </div>
              
              <div>
                <label htmlFor="subject" className="form-label">
                  Subject
                </label>
                <input
                  id="subject"
                  type="text"
                  value={newMessage.subject}
                  onChange={(e) => setNewMessage({...newMessage, subject: e.target.value})}
                  className="input-field"
                  placeholder="Enter message subject"
                />
              </div>
              
              <div>
                <label htmlFor="content" className="form-label">
                  Message
                </label>
                <textarea
                  id="content"
                  rows={6}
                  value={newMessage.content}
                  onChange={(e) => setNewMessage({...newMessage, content: e.target.value})}
                  className="input-field"
                  placeholder="Type your message here..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button 
                onClick={() => setShowComposeModal(false)} 
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button 
                onClick={sendMessage}
                className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}