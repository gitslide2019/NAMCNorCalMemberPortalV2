'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  company?: string
  memberType: string
  memberSince: string
  isActive: boolean
  isVerified: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [csrfToken, setCsrfToken] = useState('')
  const router = useRouter()

  const isAuthenticated = !!user

  // Fetch CSRF token
  const fetchCSRFToken = async (): Promise<string> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/csrf-token`, {
        credentials: 'include'
      })
      const data = await response.json()
      if (data.csrfToken) {
        setCsrfToken(data.csrfToken)
        return data.csrfToken
      }
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error)
    }
    return ''
  }

  // Check authentication status
  const checkAuth = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        
        // Also sync with localStorage for UI consistency
        localStorage.setItem('user', JSON.stringify(data.user))
      } else if (response.status === 401) {
        // Try to refresh token
        const refreshed = await refreshToken()
        if (!refreshed) {
          setUser(null)
          localStorage.removeItem('user')
        }
      } else {
        setUser(null)
        localStorage.removeItem('user')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setUser(null)
      localStorage.removeItem('user')
    } finally {
      setIsLoading(false)
    }
  }

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Get fresh CSRF token
      const token = await fetchCSRFToken()
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': token,
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        localStorage.setItem('user', JSON.stringify(data.user))
        return true
      } else {
        console.error('Login failed:', data.message)
        return false
      }
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  // Logout function
  const logout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setCsrfToken('')
      localStorage.removeItem('user')
      router.push('/login')
    }
  }

  // Refresh token function
  const refreshToken = async (): Promise<boolean> => {
    try {
      // Get fresh CSRF token for refresh request
      const token = await fetchCSRFToken()
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': token,
        },
        credentials: 'include',
      })

      if (response.ok) {
        // Token refreshed successfully, check auth again
        await checkAuth()
        return true
      } else {
        return false
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      return false
    }
  }

  // Set up automatic token refresh
  useEffect(() => {
    // Check auth on mount
    checkAuth()

    // Set up periodic token refresh (every 10 minutes)
    const refreshInterval = setInterval(() => {
      if (isAuthenticated) {
        refreshToken()
      }
    }, 10 * 60 * 1000) // 10 minutes

    return () => clearInterval(refreshInterval)
  }, [isAuthenticated])

  // Fetch CSRF token on mount
  useEffect(() => {
    fetchCSRFToken()
  }, [])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshToken,
    checkAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}