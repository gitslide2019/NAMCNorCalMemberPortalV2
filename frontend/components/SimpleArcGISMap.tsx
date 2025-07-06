'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader, AlertCircle, Maximize2, Minimize2, MapPin } from 'lucide-react'

interface ProjectOpportunity {
  id: string
  title: string
  description: string
  location: string
  budget: number
  deadline: string
  projectType: string
  status: 'Open for Bids' | 'In Progress' | 'Awarded' | 'Completed'
  requiredSkills: string[]
  contactEmail: string
  coordinates?: { lat: number; lng: number }
  bidCount?: number
}

interface SimpleArcGISMapProps {
  projects: ProjectOpportunity[]
  selectedProject?: ProjectOpportunity | null
  onProjectSelect?: (project: ProjectOpportunity) => void
  className?: string
}

const SimpleArcGISMap: React.FC<SimpleArcGISMapProps> = ({
  projects,
  selectedProject,
  onProjectSelect,
  className = "h-96"
}) => {
  const mapDiv = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    // Check API key
    const apiKey = process.env.NEXT_PUBLIC_ARCGIS_API_KEY
    if (!apiKey || apiKey === 'your_arcgis_api_key_here') {
      setError('ArcGIS API key not configured. Please set NEXT_PUBLIC_ARCGIS_API_KEY in your environment.')
      setIsLoading(false)
      return
    }

    // Load ArcGIS Maps SDK via script tag
    loadArcGISScript(apiKey)
  }, [])

  const loadArcGISScript = (apiKey: string) => {
    // Check if script is already loaded
    if (document.querySelector('script[src*="arcgis-maps-sdk"]')) {
      initializeMap(apiKey)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://js.arcgis.com/4.30/init.js'
    script.onload = () => initializeMap(apiKey)
    script.onerror = () => {
      setError('Failed to load ArcGIS Maps SDK. Please check your internet connection.')
      setIsLoading(false)
    }
    document.head.appendChild(script)

    // Also load CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://js.arcgis.com/4.30/esri/themes/light/main.css'
    document.head.appendChild(link)
  }

  const initializeMap = (apiKey: string) => {
    // Use the global require function from ArcGIS API
    ;(window as any).require([
      'esri/config',
      'esri/Map',
      'esri/views/MapView',
      'esri/layers/GraphicsLayer',
      'esri/Graphic',
      'esri/geometry/Point',
      'esri/symbols/SimpleMarkerSymbol',
      'esri/PopupTemplate'
    ], (
      esriConfig: any,
      Map: any,
      MapView: any,
      GraphicsLayer: any,
      Graphic: any,
      Point: any,
      SimpleMarkerSymbol: any,
      PopupTemplate: any
    ) => {
      try {
        // Set API key
        esriConfig.apiKey = apiKey

        // Create graphics layer
        const graphicsLayer = new GraphicsLayer({
          title: 'Project Opportunities'
        })

        // Create map
        const map = new Map({
          basemap: 'streets-navigation-vector',
          layers: [graphicsLayer]
        })

        // Create map view
        const view = new MapView({
          container: mapDiv.current,
          map: map,
          center: [-122.4194, 37.7749], // San Francisco
          zoom: 8
        })

        view.when(() => {
          setMapLoaded(true)
          setIsLoading(false)
          addProjectMarkers(view, graphicsLayer, Graphic, Point, SimpleMarkerSymbol, PopupTemplate)
        }).catch((err: any) => {
          console.error('Error initializing map view:', err)
          setError('Failed to initialize map view.')
          setIsLoading(false)
        })

      } catch (err) {
        console.error('Error setting up map:', err)
        setError('Failed to set up map.')
        setIsLoading(false)
      }
    })
  }

  const addProjectMarkers = (
    view: any,
    graphicsLayer: any,
    Graphic: any,
    Point: any,
    SimpleMarkerSymbol: any,
    PopupTemplate: any
  ) => {
    // Clear existing graphics
    graphicsLayer.removeAll()

    // Add markers for projects with coordinates
    const projectsWithCoords = projects.filter(project => project.coordinates)

    projectsWithCoords.forEach(project => {
      if (!project.coordinates) return

      const point = new Point({
        longitude: project.coordinates.lng,
        latitude: project.coordinates.lat
      })

      const isSelected = selectedProject?.id === project.id
      const symbol = new SimpleMarkerSymbol({
        style: 'circle',
        color: getProjectColor(project.status, isSelected),
        size: isSelected ? '14px' : '10px',
        outline: {
          color: isSelected ? [255, 255, 255] : [0, 0, 0],
          width: isSelected ? 3 : 1
        }
      })

      const formatBudget = (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount)
      }

      const popupTemplate = new PopupTemplate({
        title: project.title,
        content: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 300px;">
            <div style="margin-bottom: 12px;">
              <span style="background-color: ${getStatusBadgeColor(project.status)}; 
                           color: white; 
                           padding: 4px 8px; 
                           border-radius: 12px; 
                           font-size: 12px; 
                           font-weight: 500;">
                ${project.status}
              </span>
              <span style="color: #6b7280; font-size: 12px; margin-left: 8px;">
                ${project.projectType}
              </span>
            </div>
            
            <p style="color: #374151; margin: 8px 0; font-size: 14px; line-height: 1.5;">
              ${project.description.substring(0, 150)}${project.description.length > 150 ? '...' : ''}
            </p>
            
            <div style="margin: 12px 0; font-size: 13px;">
              <div style="margin-bottom: 6px;">
                <strong style="color: #1f2937;">Location:</strong>
                <span style="color: #6b7280; margin-left: 6px;">${project.location}</span>
              </div>
              <div style="margin-bottom: 6px;">
                <strong style="color: #1f2937;">Budget:</strong>
                <span style="color: #059669; font-weight: 600; margin-left: 6px;">
                  ${formatBudget(project.budget)}
                </span>
              </div>
              <div style="margin-bottom: 6px;">
                <strong style="color: #1f2937;">Deadline:</strong>
                <span style="color: #6b7280; margin-left: 6px;">
                  ${new Date(project.deadline).toLocaleDateString()}
                </span>
              </div>
              <div style="margin-bottom: 6px;">
                <strong style="color: #1f2937;">Bids:</strong>
                <span style="color: #6b7280; margin-left: 6px;">${project.bidCount || 0} submitted</span>
              </div>
            </div>
            
            <div style="margin: 12px 0;">
              <strong style="color: #1f2937; font-size: 13px;">Skills:</strong><br>
              <div style="margin-top: 4px;">
                ${project.requiredSkills.slice(0, 2).map(skill => 
                  `<span style="background-color: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-right: 4px; display: inline-block; margin-bottom: 2px;">${skill}</span>`
                ).join('')}
                ${project.requiredSkills.length > 2 ? 
                  `<span style="color: #6b7280; font-size: 11px;">+${project.requiredSkills.length - 2} more</span>` : ''
                }
              </div>
            </div>
            
            <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #e5e7eb; text-align: center;">
              <a href="mailto:${project.contactEmail}?subject=Inquiry about ${encodeURIComponent(project.title)}"
                 style="background-color: #2563eb; 
                        color: white; 
                        text-decoration: none; 
                        padding: 8px 16px; 
                        border-radius: 6px; 
                        font-size: 13px; 
                        font-weight: 500; 
                        display: inline-block;">
                Contact About Project
              </a>
            </div>
          </div>
        `
      })

      const graphic = new Graphic({
        geometry: point,
        symbol: symbol,
        popupTemplate: popupTemplate,
        attributes: {
          projectId: project.id,
          title: project.title,
          status: project.status,
          budget: project.budget
        }
      })

      graphicsLayer.add(graphic)
    })

    // Fit view to show all markers
    if (projectsWithCoords.length > 0) {
      const extent = graphicsLayer.fullExtent
      if (extent) {
        view.goTo(extent.expand(1.2), { duration: 1000 })
      }
    }
  }

  const getProjectColor = (status: string, isSelected: boolean): number[] => {
    if (isSelected) return [37, 99, 235] // Blue for selected

    switch (status) {
      case 'Open for Bids':
        return [34, 197, 94] // Green
      case 'In Progress':
        return [59, 130, 246] // Blue
      case 'Awarded':
        return [245, 158, 11] // Yellow/Orange
      case 'Completed':
        return [107, 114, 128] // Gray
      default:
        return [107, 114, 128] // Gray
    }
  }

  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'Open for Bids':
        return '#059669'
      case 'In Progress':
        return '#3b82f6'
      case 'Awarded':
        return '#f59e0b'
      case 'Completed':
        return '#6b7280'
      default:
        return '#6b7280'
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  if (error) {
    return (
      <div className={`${className} bg-gray-100 rounded-lg flex items-center justify-center`}>
        <div className="text-center p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Error</h3>
          <p className="text-gray-600 text-sm">{error}</p>
          <p className="text-gray-500 text-xs mt-2">
            Please add your ArcGIS API key to the .env.local file
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : className}`}>
      {/* Map Container */}
      <div 
        ref={mapDiv}
        className="w-full h-full rounded-lg overflow-hidden"
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
          <div className="text-center">
            <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading ArcGIS map...</p>
          </div>
        </div>
      )}

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2">
        <button
          onClick={toggleFullscreen}
          className="bg-white hover:bg-gray-50 p-2 rounded-lg shadow-md transition-colors"
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4 text-gray-600" />
          ) : (
            <Maximize2 className="h-4 w-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Project Status</h4>
        <div className="space-y-1">
          {[
            { status: 'Open for Bids', color: 'bg-green-500' },
            { status: 'In Progress', color: 'bg-blue-500' },
            { status: 'Awarded', color: 'bg-yellow-500' },
            { status: 'Completed', color: 'bg-gray-500' }
          ].map(({ status, color }) => (
            <div key={status} className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${color}`}></div>
              <span className="text-xs text-gray-600">{status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Project Count */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md px-3 py-2">
        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-900">
            {projects.filter(p => p.coordinates).length} Mapped Projects
          </span>
        </div>
      </div>

      {/* Powered by ArcGIS */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-md px-2 py-1">
        <span className="text-xs text-gray-500">Powered by ArcGIS</span>
      </div>
    </div>
  )
}

export default SimpleArcGISMap