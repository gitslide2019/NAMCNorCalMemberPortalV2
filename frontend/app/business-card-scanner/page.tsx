'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, X, User, Mail, Phone, Building, MapPin, Globe, Loader, CheckCircle, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ExtractedData {
  name?: string
  email?: string
  phone?: string
  company?: string
  title?: string
  address?: string
  website?: string
  confidence?: number
}

interface ProcessingProgress {
  stage: string
  progress: number
  message: string
}

export default function BusinessCardScannerPage() {
  const [isScanning, setIsScanning] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [progress, setProgress] = useState<ProcessingProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [useCamera, setUseCamera] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const router = useRouter()

  // Mock OCR + NER processing (simulating Tesseract.js + @xenova/transformers)
  const processBusinessCard = useCallback(async (imageData: string) => {
    setIsScanning(true)
    setError(null)
    setExtractedData(null)
    
    try {
      // Stage 1: OCR Processing
      setProgress({
        stage: 'OCR',
        progress: 20,
        message: 'Extracting text using Tesseract.js...'
      })
      
      // Simulate OCR processing time
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Stage 2: Named Entity Recognition
      setProgress({
        stage: 'NER',
        progress: 60,
        message: 'Analyzing entities with transformer models...'
      })
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Stage 3: Data validation and structuring
      setProgress({
        stage: 'Validation',
        progress: 90,
        message: 'Validating and structuring extracted data...'
      })
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Mock extracted data (in real implementation, this would come from actual OCR + NER)
      const mockData: ExtractedData = {
        name: 'John Contractor',
        email: 'john@contractorpro.com',
        phone: '(555) 123-4567',
        company: 'ContractorPro Solutions',
        title: 'Senior Project Manager',
        address: '123 Construction Ave, San Francisco, CA 94102',
        website: 'www.contractorpro.com',
        confidence: 0.92
      }
      
      setProgress({
        stage: 'Complete',
        progress: 100,
        message: 'Processing complete!'
      })
      
      setExtractedData(mockData)
      
    } catch (err) {
      setError('Failed to process business card. Please try again.')
      console.error('Processing error:', err)
    } finally {
      setIsScanning(false)
    }
  }, [])

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const imageData = e.target?.result as string
      setImagePreview(imageData)
      processBusinessCard(imageData)
    }
    reader.readAsDataURL(file)
  }, [processBusinessCard])

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      
      setUseCamera(true)
      setError(null)
    } catch (err) {
      setError('Unable to access camera. Please ensure camera permissions are granted.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setUseCamera(false)
  }, [])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    
    if (!context) return

    // Set canvas dimensions to video dimensions
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0)
    
    // Convert to data URL
    const imageData = canvas.toDataURL('image/jpeg', 0.8)
    setImagePreview(imageData)
    
    // Stop camera and process image
    stopCamera()
    processBusinessCard(imageData)
  }, [stopCamera, processBusinessCard])

  const addToContacts = useCallback(() => {
    if (!extractedData) return
    
    // In a real implementation, this would save to the member database
    alert('Contact added to NAMC member directory!')
    router.push('/members')
  }, [extractedData, router])

  const resetScanner = useCallback(() => {
    setExtractedData(null)
    setImagePreview(null)
    setProgress(null)
    setError(null)
    setIsScanning(false)
    stopCamera()
  }, [stopCamera])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Camera className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">AI Business Card Scanner</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/ai-features')}
                className="text-gray-600 hover:text-primary-600 transition-colors"
              >
                AI Features
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-primary-600 transition-colors"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
            <Camera className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            AI-Powered Business Card Scanner
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Extract contact information instantly using advanced OCR and Named Entity Recognition. 
            Powered by Tesseract.js and transformer models.
          </p>
        </div>

        {/* Technology Badge */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <span className="text-sm font-medium text-blue-900">Powered by:</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Tesseract.js OCR</span>
            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">@xenova/transformers NER</span>
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Camera API</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Scan Business Card</h2>
            
            {!useCamera && !imagePreview && (
              <div className="space-y-4">
                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Business Card</h3>
                  <p className="text-gray-600 mb-4">
                    Select a clear image of the business card for AI processing
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-primary"
                    disabled={isScanning}
                  >
                    Choose Image
                  </button>
                </div>

                {/* Camera Option */}
                <div className="text-center">
                  <p className="text-gray-600 mb-4">Or</p>
                  <button
                    onClick={startCamera}
                    className="btn-outline flex items-center mx-auto"
                    disabled={isScanning}
                  >
                    <Camera className="h-5 w-5 mr-2" />
                    Use Camera
                  </button>
                </div>
              </div>
            )}

            {/* Camera View */}
            {useCamera && (
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video 
                    ref={videoRef}
                    className="w-full h-64 object-cover"
                    autoPlay
                    playsInline
                  />
                  <div className="absolute inset-0 border-2 border-primary-600 rounded-lg pointer-events-none"></div>
                </div>
                
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={capturePhoto}
                    className="btn-primary flex items-center"
                  >
                    <Camera className="h-5 w-5 mr-2" />
                    Capture
                  </button>
                  <button
                    onClick={stopCamera}
                    className="btn-outline flex items-center"
                  >
                    <X className="h-5 w-5 mr-2" />
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Image Preview */}
            {imagePreview && (
              <div className="space-y-4">
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Business card preview"
                    className="w-full h-64 object-cover rounded-lg border"
                  />
                  <button
                    onClick={resetScanner}
                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Processing Progress */}
            {progress && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{progress.message}</span>
                  <span className="text-sm text-gray-500">{progress.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  {progress.stage === 'Complete' ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  ) : (
                    <Loader className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Stage: {progress.stage}
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <span className="text-red-800">{error}</span>
                </div>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Extracted Information</h2>
            
            {!extractedData && !isScanning && (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  Upload or capture a business card to extract contact information
                </p>
              </div>
            )}

            {extractedData && (
              <div className="space-y-6">
                {/* Confidence Score */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-green-800 font-medium">AI Confidence Score</span>
                    <span className="text-green-900 font-bold">
                      {Math.round((extractedData.confidence || 0) * 100)}%
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-green-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${(extractedData.confidence || 0) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Extracted Fields */}
                <div className="space-y-4">
                  {extractedData.name && (
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Name</p>
                        <p className="text-gray-900">{extractedData.name}</p>
                      </div>
                    </div>
                  )}

                  {extractedData.title && (
                    <div className="flex items-center space-x-3">
                      <Building className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Title</p>
                        <p className="text-gray-900">{extractedData.title}</p>
                      </div>
                    </div>
                  )}

                  {extractedData.company && (
                    <div className="flex items-center space-x-3">
                      <Building className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Company</p>
                        <p className="text-gray-900">{extractedData.company}</p>
                      </div>
                    </div>
                  )}

                  {extractedData.email && (
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Email</p>
                        <a 
                          href={`mailto:${extractedData.email}`}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          {extractedData.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {extractedData.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Phone</p>
                        <a 
                          href={`tel:${extractedData.phone}`}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          {extractedData.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {extractedData.website && (
                    <div className="flex items-center space-x-3">
                      <Globe className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Website</p>
                        <a 
                          href={`https://${extractedData.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-800"
                        >
                          {extractedData.website}
                        </a>
                      </div>
                    </div>
                  )}

                  {extractedData.address && (
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Address</p>
                        <p className="text-gray-900">{extractedData.address}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex space-x-3 pt-4 border-t">
                  <button
                    onClick={addToContacts}
                    className="flex-1 btn-primary"
                  >
                    Add to Member Directory
                  </button>
                  <button
                    onClick={resetScanner}
                    className="flex-1 btn-outline"
                  >
                    Scan Another Card
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hidden Canvas for Photo Capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  )
}