// Performance monitoring utility for tracking and optimizing app performance

interface PerformanceMetrics {
  timestamp: number
  page: string
  loadTime: number
  renderTime: number
  interactionTime?: number
  memoryUsage?: number
  cacheHitRate?: number
  apiResponseTimes: Record<string, number>
  errors: string[]
}

interface VitalMetrics {
  fcp: number // First Contentful Paint
  lcp: number // Largest Contentful Paint
  fid: number // First Input Delay
  cls: number // Cumulative Layout Shift
  ttfb: number // Time to First Byte
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private vitals: Partial<VitalMetrics> = {}
  private observer: PerformanceObserver | null = null
  private startTime = Date.now()
  private isEnabled = true

  constructor() {
    this.setupPerformanceObserver()
    this.setupErrorTracking()
    this.trackPageLoad()
  }

  private setupPerformanceObserver(): void {
    if (!('PerformanceObserver' in window)) return

    try {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        
        entries.forEach((entry) => {
          switch (entry.entryType) {
            case 'paint':
              if (entry.name === 'first-contentful-paint') {
                this.vitals.fcp = entry.startTime
              }
              break
            
            case 'largest-contentful-paint':
              this.vitals.lcp = (entry as any).startTime
              break
            
            case 'first-input':
              this.vitals.fid = (entry as any).processingStart - entry.startTime
              break
            
            case 'layout-shift':
              if (!(entry as any).hadRecentInput) {
                this.vitals.cls = (this.vitals.cls || 0) + (entry as any).value
              }
              break

            case 'navigation':
              const navEntry = entry as PerformanceNavigationTiming
              this.vitals.ttfb = navEntry.responseStart - navEntry.requestStart
              break
          }
        })
      })

      this.observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift', 'navigation'] })
    } catch (error) {
      console.warn('Performance Observer setup failed:', error)
    }
  }

  private setupErrorTracking(): void {
    window.addEventListener('error', (event) => {
      this.logError(`JavaScript Error: ${event.message}`, event.filename, event.lineno)
    })

    window.addEventListener('unhandledrejection', (event) => {
      this.logError(`Unhandled Promise Rejection: ${event.reason}`)
    })
  }

  private trackPageLoad(): void {
    if (document.readyState === 'complete') {
      this.recordPageLoad()
    } else {
      window.addEventListener('load', () => this.recordPageLoad())
    }
  }

  private recordPageLoad(): void {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    
    if (navigation) {
      const metrics: PerformanceMetrics = {
        timestamp: Date.now(),
        page: window.location.pathname,
        loadTime: navigation.loadEventEnd - navigation.navigationStart,
        renderTime: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        memoryUsage: this.getMemoryUsage(),
        cacheHitRate: this.calculateCacheHitRate(),
        apiResponseTimes: {},
        errors: []
      }

      this.metrics.push(metrics)
      this.cleanupOldMetrics()
    }
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return memory.usedJSHeapSize / memory.jsHeapSizeLimit
    }
    return 0
  }

  private calculateCacheHitRate(): number {
    const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    if (resourceEntries.length === 0) return 0

    const cachedResources = resourceEntries.filter(entry => 
      entry.transferSize === 0 || entry.transferSize < entry.encodedBodySize
    )

    return cachedResources.length / resourceEntries.length
  }

  private cleanupOldMetrics(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    this.metrics = this.metrics.filter(metric => metric.timestamp > oneHourAgo)
  }

  // Public methods for components to use
  startTracking(componentName: string): () => void {
    if (!this.isEnabled) return () => {}

    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime

      console.log(`Component ${componentName} render time: ${renderTime.toFixed(2)}ms`)
      
      // Store component performance data
      this.recordComponentMetric(componentName, renderTime)
    }
  }

  trackAPICall(endpoint: string, duration: number): void {
    if (!this.isEnabled) return

    const currentMetric = this.getCurrentPageMetric()
    if (currentMetric) {
      currentMetric.apiResponseTimes[endpoint] = duration
    }

    // Log slow API calls
    if (duration > 2000) {
      console.warn(`Slow API call detected: ${endpoint} took ${duration}ms`)
    }
  }

  trackUserInteraction(interactionType: string): () => void {
    if (!this.isEnabled) return () => {}

    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const interactionTime = endTime - startTime

      console.log(`${interactionType} interaction time: ${interactionTime.toFixed(2)}ms`)
      
      const currentMetric = this.getCurrentPageMetric()
      if (currentMetric) {
        currentMetric.interactionTime = interactionTime
      }
    }
  }

  logError(message: string, source?: string, line?: number): void {
    const errorInfo = `${message}${source ? ` at ${source}` : ''}${line ? `:${line}` : ''}`
    
    const currentMetric = this.getCurrentPageMetric()
    if (currentMetric) {
      currentMetric.errors.push(errorInfo)
    }

    console.error('Performance Monitor - Error logged:', errorInfo)
  }

  private recordComponentMetric(componentName: string, renderTime: number): void {
    // Store in session storage for debugging
    const componentMetrics = JSON.parse(sessionStorage.getItem('componentMetrics') || '{}')
    
    if (!componentMetrics[componentName]) {
      componentMetrics[componentName] = []
    }
    
    componentMetrics[componentName].push({
      timestamp: Date.now(),
      renderTime,
      page: window.location.pathname
    })

    // Keep only last 50 entries per component
    if (componentMetrics[componentName].length > 50) {
      componentMetrics[componentName] = componentMetrics[componentName].slice(-50)
    }

    sessionStorage.setItem('componentMetrics', JSON.stringify(componentMetrics))
  }

  private getCurrentPageMetric(): PerformanceMetrics | null {
    const currentPage = window.location.pathname
    return this.metrics.find(metric => 
      metric.page === currentPage && 
      Date.now() - metric.timestamp < 5 * 60 * 1000 // Within last 5 minutes
    ) || null
  }

  // Get performance summary
  getPerformanceSummary(): {
    vitals: Partial<VitalMetrics>
    avgLoadTime: number
    avgRenderTime: number
    avgMemoryUsage: number
    avgCacheHitRate: number
    errorCount: number
    slowestAPIs: { endpoint: string; duration: number }[]
  } {
    const recentMetrics = this.metrics.filter(metric => 
      Date.now() - metric.timestamp < 30 * 60 * 1000 // Last 30 minutes
    )

    if (recentMetrics.length === 0) {
      return {
        vitals: this.vitals,
        avgLoadTime: 0,
        avgRenderTime: 0,
        avgMemoryUsage: 0,
        avgCacheHitRate: 0,
        errorCount: 0,
        slowestAPIs: []
      }
    }

    const avgLoadTime = recentMetrics.reduce((sum, m) => sum + m.loadTime, 0) / recentMetrics.length
    const avgRenderTime = recentMetrics.reduce((sum, m) => sum + m.renderTime, 0) / recentMetrics.length
    const avgMemoryUsage = recentMetrics.reduce((sum, m) => sum + (m.memoryUsage || 0), 0) / recentMetrics.length
    const avgCacheHitRate = recentMetrics.reduce((sum, m) => sum + (m.cacheHitRate || 0), 0) / recentMetrics.length
    const errorCount = recentMetrics.reduce((sum, m) => sum + m.errors.length, 0)

    // Collect all API response times
    const allAPIs: { endpoint: string; duration: number }[] = []
    recentMetrics.forEach(metric => {
      Object.entries(metric.apiResponseTimes).forEach(([endpoint, duration]) => {
        allAPIs.push({ endpoint, duration })
      })
    })

    // Get slowest APIs
    const slowestAPIs = allAPIs
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)

    return {
      vitals: this.vitals,
      avgLoadTime,
      avgRenderTime,
      avgMemoryUsage,
      avgCacheHitRate,
      errorCount,
      slowestAPIs
    }
  }

  // Get detailed metrics for debugging
  getDetailedMetrics(): {
    metrics: PerformanceMetrics[]
    componentMetrics: Record<string, any[]>
    memoryInfo: any
    resourceTiming: PerformanceResourceTiming[]
  } {
    const componentMetrics = JSON.parse(sessionStorage.getItem('componentMetrics') || '{}')
    const resourceTiming = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    const memoryInfo = 'memory' in performance ? (performance as any).memory : null

    return {
      metrics: this.metrics,
      componentMetrics,
      memoryInfo,
      resourceTiming
    }
  }

  // Performance grade based on Web Vitals
  getPerformanceGrade(): {
    grade: 'A' | 'B' | 'C' | 'D' | 'F'
    score: number
    recommendations: string[]
  } {
    const { vitals } = this
    const recommendations: string[] = []
    let score = 100

    // LCP scoring (should be < 2.5s for good)
    if (vitals.lcp) {
      if (vitals.lcp > 4000) {
        score -= 30
        recommendations.push('Optimize Largest Contentful Paint (LCP) - consider image optimization and critical resource prioritization')
      } else if (vitals.lcp > 2500) {
        score -= 15
        recommendations.push('Improve Largest Contentful Paint (LCP) - reduce server response times')
      }
    }

    // FID scoring (should be < 100ms for good)
    if (vitals.fid) {
      if (vitals.fid > 300) {
        score -= 25
        recommendations.push('Reduce First Input Delay (FID) - optimize JavaScript execution and minimize main thread blocking')
      } else if (vitals.fid > 100) {
        score -= 10
        recommendations.push('Improve First Input Delay (FID) - consider code splitting and defer non-critical JavaScript')
      }
    }

    // CLS scoring (should be < 0.1 for good)
    if (vitals.cls) {
      if (vitals.cls > 0.25) {
        score -= 20
        recommendations.push('Fix Cumulative Layout Shift (CLS) - set dimensions for images and ads, avoid inserting content above existing content')
      } else if (vitals.cls > 0.1) {
        score -= 10
        recommendations.push('Improve Cumulative Layout Shift (CLS) - stabilize page layouts')
      }
    }

    // FCP scoring (should be < 1.8s for good)
    if (vitals.fcp) {
      if (vitals.fcp > 3000) {
        score -= 15
        recommendations.push('Optimize First Contentful Paint (FCP) - improve server response times and resource loading')
      } else if (vitals.fcp > 1800) {
        score -= 8
        recommendations.push('Improve First Contentful Paint (FCP) - optimize critical rendering path')
      }
    }

    const grade: 'A' | 'B' | 'C' | 'D' | 'F' = 
      score >= 90 ? 'A' :
      score >= 80 ? 'B' :
      score >= 70 ? 'C' :
      score >= 60 ? 'D' : 'F'

    return { grade, score, recommendations }
  }

  // Enable/disable monitoring
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    if (!enabled && this.observer) {
      this.observer.disconnect()
    }
  }

  // Clear all stored metrics
  clearMetrics(): void {
    this.metrics = []
    sessionStorage.removeItem('componentMetrics')
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()

// React hook for component performance tracking
export function usePerformanceTracking(componentName: string) {
  const trackRender = useCallback(() => {
    return performanceMonitor.startTracking(componentName)
  }, [componentName])

  const trackInteraction = useCallback((interactionType: string) => {
    return performanceMonitor.trackUserInteraction(interactionType)
  }, [])

  useEffect(() => {
    const stopTracking = trackRender()
    return stopTracking
  }, [trackRender])

  return { trackRender, trackInteraction }
}

// Utility for measuring async operations
export async function measureAsyncOperation<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = performance.now()
  
  try {
    const result = await operation()
    const duration = performance.now() - startTime
    
    performanceMonitor.trackAPICall(operationName, duration)
    return result
  } catch (error) {
    const duration = performance.now() - startTime
    performanceMonitor.trackAPICall(operationName, duration)
    performanceMonitor.logError(`${operationName} failed: ${error}`)
    throw error
  }
}

export default performanceMonitor