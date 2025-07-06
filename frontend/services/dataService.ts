// Centralized data service with caching and pagination
import { apiClient } from '../utils/api'

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiry: number
}

interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface SearchParams {
  query?: string
  category?: string
  status?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

class DataService {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly DEFAULT_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private readonly DEFAULT_PAGE_SIZE = 20

  // Generic cache management
  private getCacheKey(endpoint: string, params?: any): string {
    return `${endpoint}:${params ? JSON.stringify(params) : ''}`
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }

  private setCache<T>(key: string, data: T, duration = this.DEFAULT_CACHE_DURATION): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + duration
    })
  }

  private clearCacheByPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  // Generic paginated fetch with caching
  private async fetchPaginated<T>(
    endpoint: string, 
    params: SearchParams = {},
    cacheDuration?: number,
    transform?: (data: any) => T[]
  ): Promise<PaginatedResponse<T>> {
    const { page = 1, limit = this.DEFAULT_PAGE_SIZE, ...searchParams } = params
    const cacheKey = this.getCacheKey(endpoint, { page, limit, ...searchParams })
    
    // Check cache first
    const cached = this.getFromCache<PaginatedResponse<T>>(cacheKey)
    if (cached) return cached

    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.entries(searchParams).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== '') {
            acc[key] = value.toString()
          }
          return acc
        }, {} as Record<string, string>)
      })

      const response = await apiClient.get(`${endpoint}?${queryParams}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${endpoint}: ${response.statusText}`)
      }

      const result = await response.json()
      
      const transformedData = transform ? transform(result.data || result) : (result.data || result)
      
      const paginatedResponse: PaginatedResponse<T> = {
        data: transformedData,
        pagination: result.pagination || {
          page,
          limit,
          total: transformedData.length,
          totalPages: Math.ceil(transformedData.length / limit)
        }
      }

      this.setCache(cacheKey, paginatedResponse, cacheDuration)
      return paginatedResponse
    } catch (error) {
      console.error(`DataService fetch error for ${endpoint}:`, error)
      throw error
    }
  }

  // Members API
  async getMembers(params: SearchParams = {}): Promise<PaginatedResponse<any>> {
    return this.fetchPaginated('/api/users', params, this.DEFAULT_CACHE_DURATION)
  }

  async getMember(id: string): Promise<any> {
    const cacheKey = this.getCacheKey('/api/users', { id })
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    const response = await apiClient.get(`/api/users/${id}`)
    if (!response.ok) throw new Error('Failed to fetch member')
    
    const member = await response.json()
    this.setCache(cacheKey, member)
    return member
  }

  // Events API
  async getEvents(params: SearchParams = {}): Promise<PaginatedResponse<any>> {
    return this.fetchPaginated('/api/events', params)
  }

  async getEvent(id: string): Promise<any> {
    const cacheKey = this.getCacheKey('/api/events', { id })
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    const response = await apiClient.get(`/api/events/${id}`)
    if (!response.ok) throw new Error('Failed to fetch event')
    
    const event = await response.json()
    this.setCache(cacheKey, event)
    return event
  }

  async createEvent(eventData: any): Promise<any> {
    const response = await apiClient.post('/api/events', eventData)
    if (!response.ok) throw new Error('Failed to create event')
    
    // Clear events cache to force refresh
    this.clearCacheByPattern('/api/events')
    return response.json()
  }

  // Resources API
  async getResources(params: SearchParams = {}): Promise<PaginatedResponse<any>> {
    return this.fetchPaginated('/api/resources', params)
  }

  async uploadResource(file: File, metadata: any): Promise<any> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('metadata', JSON.stringify(metadata))

    const response = await apiClient.request('/api/resources/upload', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set content-type for FormData
    })

    if (!response.ok) throw new Error('Failed to upload resource')
    
    // Clear resources cache
    this.clearCacheByPattern('/api/resources')
    return response.json()
  }

  // Announcements API
  async getAnnouncements(params: SearchParams = {}): Promise<PaginatedResponse<any>> {
    return this.fetchPaginated('/api/announcements', params)
  }

  async createAnnouncement(announcementData: any): Promise<any> {
    const response = await apiClient.post('/api/announcements', announcementData)
    if (!response.ok) throw new Error('Failed to create announcement')
    
    this.clearCacheByPattern('/api/announcements')
    return response.json()
  }

  // Messages API
  async getMessages(params: SearchParams = {}): Promise<PaginatedResponse<any>> {
    return this.fetchPaginated('/api/messages', params, 60000) // 1 minute cache for messages
  }

  async sendMessage(messageData: any): Promise<any> {
    const response = await apiClient.post('/api/messages', messageData)
    if (!response.ok) throw new Error('Failed to send message')
    
    this.clearCacheByPattern('/api/messages')
    return response.json()
  }

  // Search across multiple entities
  async globalSearch(query: string, entities: string[] = ['users', 'events', 'resources']): Promise<any> {
    const cacheKey = this.getCacheKey('/search', { query, entities })
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    const response = await apiClient.post('/api/search', {
      query,
      entities,
      limit: 10 // Limit global search results
    })

    if (!response.ok) throw new Error('Search failed')
    
    const results = await response.json()
    this.setCache(cacheKey, results, 2 * 60 * 1000) // 2 minute cache for search
    return results
  }

  // Batch operations
  async batchUpdate(entityType: string, operations: any[]): Promise<any> {
    const response = await apiClient.post(`/api/${entityType}/batch`, { operations })
    if (!response.ok) throw new Error('Batch update failed')
    
    // Clear related cache
    this.clearCacheByPattern(`/api/${entityType}`)
    return response.json()
  }

  // Cache management utilities
  clearCache(pattern?: string): void {
    if (pattern) {
      this.clearCacheByPattern(pattern)
    } else {
      this.cache.clear()
    }
  }

  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    }
  }

  // Preload common data
  async preloadData(): Promise<void> {
    try {
      // Preload first page of common entities
      await Promise.all([
        this.getMembers({ limit: 50 }),
        this.getEvents({ limit: 20 }),
        this.getAnnouncements({ limit: 10 }),
        this.getResources({ limit: 20 })
      ])
    } catch (error) {
      console.warn('Failed to preload some data:', error)
    }
  }
}

// Export singleton instance
export const dataService = new DataService()

// Hook for React components
export const useDataService = () => dataService

export type { PaginatedResponse, SearchParams }