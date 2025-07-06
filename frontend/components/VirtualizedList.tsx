'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Search, Filter, ChevronDown, Loader } from 'lucide-react'

interface VirtualizedListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  itemHeight: number
  containerHeight: number
  searchFields?: (keyof T)[]
  filterOptions?: {
    key: keyof T
    options: { value: any; label: string }[]
  }[]
  sortOptions?: {
    key: keyof T
    label: string
  }[]
  loading?: boolean
  error?: string
  onLoadMore?: () => void
  hasMore?: boolean
  searchPlaceholder?: string
  className?: string
}

export default function VirtualizedList<T extends Record<string, any>>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  searchFields = [],
  filterOptions = [],
  sortOptions = [],
  loading = false,
  error,
  onLoadMore,
  hasMore = false,
  searchPlaceholder = 'Search...',
  className = ''
}: VirtualizedListProps<T>) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [sortBy, setSortBy] = useState<keyof T | ''>('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [scrollTop, setScrollTop] = useState(0)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef<HTMLDivElement>(null)

  // Memoized filtered and sorted items
  const processedItems = useMemo(() => {
    let result = [...items]

    // Apply search filter
    if (searchQuery && searchFields.length > 0) {
      const query = searchQuery.toLowerCase()
      result = result.filter(item =>
        searchFields.some(field => {
          const value = item[field]
          return value && value.toString().toLowerCase().includes(query)
        })
      )
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        result = result.filter(item => item[key] === value)
      }
    })

    // Apply sorting
    if (sortBy) {
      result.sort((a, b) => {
        const aVal = a[sortBy]
        const bVal = b[sortBy]
        
        let comparison = 0
        if (aVal < bVal) comparison = -1
        else if (aVal > bVal) comparison = 1
        
        return sortOrder === 'desc' ? -comparison : comparison
      })
    }

    return result
  }, [items, searchQuery, searchFields, filters, sortBy, sortOrder])

  // Calculate visible items for virtualization
  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      processedItems.length
    )
    
    return processedItems.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index,
      top: (startIndex + index) * itemHeight
    }))
  }, [processedItems, scrollTop, itemHeight, containerHeight])

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    setScrollTop(target.scrollTop)

    // Check if we need to load more items
    if (
      onLoadMore &&
      hasMore &&
      !loading &&
      target.scrollTop + target.clientHeight >= target.scrollHeight - 100
    ) {
      onLoadMore()
    }
  }, [onLoadMore, hasMore, loading])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadingRef.current || !onLoadMore || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          onLoadMore()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(loadingRef.current)
    return () => observer.disconnect()
  }, [onLoadMore, hasMore, loading])

  // Handle filter change
  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  // Handle sort change
  const handleSortChange = useCallback((field: keyof T) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }, [sortBy])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setFilters({})
    setSortBy('')
    setSortOrder('asc')
  }, [])

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg mb-4">
        {/* Search */}
        {searchFields.length > 0 && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Filters */}
        {filterOptions.map(({ key, options }) => (
          <div key={String(key)} className="relative">
            <select
              value={filters[String(key)] || ''}
              onChange={(e) => handleFilterChange(String(key), e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All {String(key)}</option>
              {options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        ))}

        {/* Sort */}
        {sortOptions.length > 0 && (
          <div className="relative">
            <select
              value={sortBy as string}
              onChange={(e) => setSortBy(e.target.value as keyof T)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Sort by...</option>
              {sortOptions.map(option => (
                <option key={String(option.key)} value={String(option.key)}>
                  {option.label} {sortBy === option.key ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        )}

        {/* Clear Filters */}
        {(searchQuery || Object.values(filters).some(v => v) || sortBy) && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors whitespace-nowrap"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600 mb-2">
        Showing {processedItems.length} of {items.length} items
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Virtualized List Container */}
      <div
        ref={containerRef}
        className="border border-gray-200 rounded-lg overflow-auto"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        {/* Virtual list content */}
        <div style={{ height: processedItems.length * itemHeight, position: 'relative' }}>
          {visibleItems.map(({ item, index, top }) => (
            <div
              key={`${index}-${JSON.stringify(item).slice(0, 50)}`}
              style={{
                position: 'absolute',
                top,
                left: 0,
                right: 0,
                height: itemHeight
              }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>

        {/* Loading indicator for infinite scroll */}
        {hasMore && (
          <div ref={loadingRef} className="flex justify-center p-4">
            {loading ? (
              <div className="flex items-center space-x-2">
                <Loader className="h-4 w-4 animate-spin" />
                <span className="text-gray-600">Loading more...</span>
              </div>
            ) : (
              <button
                onClick={onLoadMore}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Load More
              </button>
            )}
          </div>
        )}
      </div>

      {/* Empty State */}
      {processedItems.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          {searchQuery || Object.values(filters).some(v => v) 
            ? 'No items match your search criteria'
            : 'No items found'
          }
        </div>
      )}
    </div>
  )
}