// Secure API utility with automatic token refresh and CSRF protection

interface ApiOptions extends RequestInit {
  requireAuth?: boolean
  includeCSRF?: boolean
}

class ApiClient {
  private baseURL: string
  private csrfToken: string = ''

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  }

  // Fetch CSRF token
  private async fetchCSRFToken(): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/csrf-token`, {
        credentials: 'include'
      })
      const data = await response.json()
      if (data.csrfToken) {
        this.csrfToken = data.csrfToken
        return data.csrfToken
      }
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error)
    }
    return ''
  }

  // Make authenticated API request with automatic token refresh
  async request(endpoint: string, options: ApiOptions = {}): Promise<Response> {
    const {
      requireAuth = true,
      includeCSRF = true,
      headers = {},
      ...restOptions
    } = options

    // Prepare headers
    const requestHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...headers,
    }

    // Add CSRF token for state-changing operations
    if (includeCSRF && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(restOptions.method?.toUpperCase() || 'GET')) {
      if (!this.csrfToken) {
        await this.fetchCSRFToken()
      }
      requestHeaders['X-CSRF-Token'] = this.csrfToken
    }

    // Make the request
    let response = await fetch(`${this.baseURL}${endpoint}`, {
      credentials: 'include', // Always include cookies
      headers: requestHeaders,
      ...restOptions,
    })

    // Handle token expiration
    if (response.status === 401 && requireAuth) {
      // Try to refresh the token
      const refreshResponse = await this.refreshToken()
      
      if (refreshResponse.ok) {
        // Retry the original request
        response = await fetch(`${this.baseURL}${endpoint}`, {
          credentials: 'include',
          headers: requestHeaders,
          ...restOptions,
        })
      } else {
        // Refresh failed, redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
    }

    return response
  }

  // Refresh access token
  private async refreshToken(): Promise<Response> {
    try {
      // Get fresh CSRF token for refresh request
      await this.fetchCSRFToken()
      
      return await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.csrfToken,
        },
      })
    } catch (error) {
      console.error('Token refresh failed:', error)
      throw error
    }
  }

  // Convenience methods
  async get(endpoint: string, options: ApiOptions = {}) {
    return this.request(endpoint, { method: 'GET', ...options })
  }

  async post(endpoint: string, data?: any, options: ApiOptions = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    })
  }

  async put(endpoint: string, data?: any, options: ApiOptions = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    })
  }

  async patch(endpoint: string, data?: any, options: ApiOptions = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    })
  }

  async delete(endpoint: string, options: ApiOptions = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options })
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Export convenience function for backwards compatibility
export const api = {
  get: (endpoint: string, options?: ApiOptions) => apiClient.get(endpoint, options),
  post: (endpoint: string, data?: any, options?: ApiOptions) => apiClient.post(endpoint, data, options),
  put: (endpoint: string, data?: any, options?: ApiOptions) => apiClient.put(endpoint, data, options),
  patch: (endpoint: string, data?: any, options?: ApiOptions) => apiClient.patch(endpoint, data, options),
  delete: (endpoint: string, options?: ApiOptions) => apiClient.delete(endpoint, options),
}

export default apiClient