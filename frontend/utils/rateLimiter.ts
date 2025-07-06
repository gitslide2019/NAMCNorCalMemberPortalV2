// Advanced rate limiter with retry logic and queue management

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  retryAfter?: number
  maxRetries?: number
  backoffMultiplier?: number
}

interface QueuedRequest {
  id: string
  url: string
  options: RequestInit
  resolve: (response: Response) => void
  reject: (error: Error) => void
  retryCount: number
  timestamp: number
}

interface RateLimitState {
  requests: number[]
  queue: QueuedRequest[]
  processing: boolean
}

class APIRateLimiter {
  private limits = new Map<string, RateLimitState>()
  private defaultConfig: RateLimitConfig = {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
    retryAfter: 1000, // 1 second
    maxRetries: 3,
    backoffMultiplier: 2
  }

  // API-specific configurations
  private apiConfigs: Record<string, RateLimitConfig> = {
    // Mapbox Geocoding API
    'api.mapbox.com': {
      maxRequests: 600, // 600 requests per minute
      windowMs: 60000,
      retryAfter: 1000,
      maxRetries: 3,
      backoffMultiplier: 1.5
    },
    // OpenWeatherMap API
    'api.openweathermap.org': {
      maxRequests: 60, // 60 requests per minute for free tier
      windowMs: 60000,
      retryAfter: 2000,
      maxRetries: 2,
      backoffMultiplier: 2
    },
    // Internal API
    'localhost': {
      maxRequests: 100,
      windowMs: 60000,
      retryAfter: 500,
      maxRetries: 3,
      backoffMultiplier: 1.2
    }
  }

  private getHostFromUrl(url: string): string {
    try {
      return new URL(url).hostname
    } catch {
      return 'unknown'
    }
  }

  private getConfig(host: string): RateLimitConfig {
    return this.apiConfigs[host] || this.defaultConfig
  }

  private getLimitState(host: string): RateLimitState {
    if (!this.limits.has(host)) {
      this.limits.set(host, {
        requests: [],
        queue: [],
        processing: false
      })
    }
    return this.limits.get(host)!
  }

  private cleanOldRequests(state: RateLimitState, windowMs: number): void {
    const now = Date.now()
    state.requests = state.requests.filter(timestamp => now - timestamp < windowMs)
  }

  private canMakeRequest(host: string): boolean {
    const config = this.getConfig(host)
    const state = this.getLimitState(host)
    
    this.cleanOldRequests(state, config.windowMs)
    return state.requests.length < config.maxRequests
  }

  private addRequest(host: string): void {
    const state = this.getLimitState(host)
    state.requests.push(Date.now())
  }

  private async processQueue(host: string): Promise<void> {
    const state = this.getLimitState(host)
    
    if (state.processing || state.queue.length === 0) {
      return
    }

    state.processing = true

    while (state.queue.length > 0 && this.canMakeRequest(host)) {
      const request = state.queue.shift()!
      
      try {
        this.addRequest(host)
        const response = await fetch(request.url, request.options)
        
        if (response.status === 429) {
          // Rate limited by server
          await this.handleRateLimit(request, host)
        } else {
          request.resolve(response)
        }
      } catch (error) {
        if (request.retryCount < this.getConfig(host).maxRetries!) {
          await this.retryRequest(request, host)
        } else {
          request.reject(error as Error)
        }
      }
    }

    state.processing = false

    // Continue processing if there are more items in queue
    if (state.queue.length > 0) {
      const config = this.getConfig(host)
      const delay = Math.max(0, config.windowMs / config.maxRequests)
      setTimeout(() => this.processQueue(host), delay)
    }
  }

  private async handleRateLimit(request: QueuedRequest, host: string): Promise<void> {
    const config = this.getConfig(host)
    
    if (request.retryCount < config.maxRetries!) {
      // Calculate exponential backoff delay
      const delay = config.retryAfter! * Math.pow(config.backoffMultiplier!, request.retryCount)
      
      setTimeout(() => {
        request.retryCount++
        this.getLimitState(host).queue.unshift(request) // Add to front of queue
        this.processQueue(host)
      }, delay)
    } else {
      request.reject(new Error('Rate limit exceeded and max retries reached'))
    }
  }

  private async retryRequest(request: QueuedRequest, host: string): Promise<void> {
    const config = this.getConfig(host)
    const delay = config.retryAfter! * Math.pow(config.backoffMultiplier!, request.retryCount)
    
    setTimeout(() => {
      request.retryCount++
      this.getLimitState(host).queue.push(request)
      this.processQueue(host)
    }, delay)
  }

  // Main rate-limited fetch method
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const host = this.getHostFromUrl(url)
    const state = this.getLimitState(host)

    return new Promise<Response>((resolve, reject) => {
      const request: QueuedRequest = {
        id: Math.random().toString(36).substr(2, 9),
        url,
        options,
        resolve,
        reject,
        retryCount: 0,
        timestamp: Date.now()
      }

      if (this.canMakeRequest(host)) {
        // Can make request immediately
        this.addRequest(host)
        fetch(url, options)
          .then(response => {
            if (response.status === 429) {
              this.handleRateLimit(request, host)
            } else {
              resolve(response)
            }
          })
          .catch(error => {
            if (request.retryCount < this.getConfig(host).maxRetries!) {
              this.retryRequest(request, host)
            } else {
              reject(error)
            }
          })
      } else {
        // Add to queue
        state.queue.push(request)
        this.processQueue(host)
      }
    })
  }

  // Batch geocoding with rate limiting
  async batchGeocode(addresses: string[], apiKey: string): Promise<any[]> {
    const results = []
    
    for (const address of addresses) {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${apiKey}&limit=1`
        const response = await this.fetch(url)
        
        if (response.ok) {
          const data = await response.json()
          results.push({
            address,
            coordinates: data.features[0]?.center || null,
            success: true
          })
        } else {
          results.push({
            address,
            coordinates: null,
            success: false,
            error: `HTTP ${response.status}`
          })
        }
      } catch (error) {
        results.push({
          address,
          coordinates: null,
          success: false,
          error: error.message
        })
      }
    }
    
    return results
  }

  // Get rate limit status for debugging
  getStatus(): Record<string, any> {
    const status: Record<string, any> = {}
    
    for (const [host, state] of this.limits.entries()) {
      const config = this.getConfig(host)
      this.cleanOldRequests(state, config.windowMs)
      
      status[host] = {
        requests: state.requests.length,
        maxRequests: config.maxRequests,
        queueLength: state.queue.length,
        canMakeRequest: this.canMakeRequest(host),
        processing: state.processing
      }
    }
    
    return status
  }

  // Clear all rate limit data
  reset(): void {
    this.limits.clear()
  }

  // Preemptively cache geocoding results
  async preloadGeocodingCache(addresses: string[], apiKey: string): Promise<void> {
    const cacheKey = 'geocoding_cache'
    const cached = localStorage.getItem(cacheKey)
    const cache = cached ? JSON.parse(cached) : {}
    
    const uncachedAddresses = addresses.filter(addr => !cache[addr])
    
    if (uncachedAddresses.length === 0) return

    console.log(`Preloading geocoding for ${uncachedAddresses.length} addresses`)
    
    try {
      const results = await this.batchGeocode(uncachedAddresses, apiKey)
      
      results.forEach(result => {
        if (result.success) {
          cache[result.address] = result.coordinates
        }
      })
      
      localStorage.setItem(cacheKey, JSON.stringify(cache))
      console.log(`Geocoding cache updated with ${results.filter(r => r.success).length} new entries`)
    } catch (error) {
      console.error('Failed to preload geocoding cache:', error)
    }
  }

  // Get cached geocoding result
  getCachedGeocode(address: string): [number, number] | null {
    try {
      const cached = localStorage.getItem('geocoding_cache')
      const cache = cached ? JSON.parse(cached) : {}
      return cache[address] || null
    } catch {
      return null
    }
  }
}

// Export singleton instance
export const rateLimiter = new APIRateLimiter()

// Convenience methods for common APIs
export const mapboxGeocode = async (address: string, apiKey: string): Promise<[number, number] | null> => {
  // Check cache first
  const cached = rateLimiter.getCachedGeocode(address)
  if (cached) return cached

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${apiKey}&limit=1`
    const response = await rateLimiter.fetch(url)
    
    if (!response.ok) return null
    
    const data = await response.json()
    const coordinates = data.features[0]?.center || null
    
    // Cache the result
    if (coordinates) {
      const cacheKey = 'geocoding_cache'
      const cached = localStorage.getItem(cacheKey)
      const cache = cached ? JSON.parse(cached) : {}
      cache[address] = coordinates
      localStorage.setItem(cacheKey, JSON.stringify(cache))
    }
    
    return coordinates
  } catch (error) {
    console.error('Geocoding failed:', error)
    return null
  }
}

export const weatherAPI = async (lat: number, lon: number, apiKey: string): Promise<any> => {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
    const response = await rateLimiter.fetch(url)
    
    if (!response.ok) return null
    
    return response.json()
  } catch (error) {
    console.error('Weather API failed:', error)
    return null
  }
}

export default rateLimiter