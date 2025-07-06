'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { FileText, Upload, MessageCircle, Brain, Loader, CheckCircle, AlertCircle, Download, Eye, ArrowLeft, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAIModel, aiModelManager } from '../../services/aiModelManager'

interface Question {
  id: string
  text: string
  answer?: string
  confidence?: number
  timestamp: Date
}

interface DocumentInfo {
  name: string
  size: number
  type: string
  pages?: number
  uploadedAt: Date
}

interface AnalysisResult {
  keyTerms: string[]
  contractType: string
  riskLevel: 'Low' | 'Medium' | 'High'
  summary: string
  risks?: string[]
  recommendations?: string[]
}

export default function ContractAnalyzerPage() {
  const [document, setDocument] = useState<DocumentInfo | null>(null)
  const [documentText, setDocumentText] = useState<string>('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // AI model hook
  const { 
    loading: aiLoading, 
    error: aiError, 
    progress: aiProgress, 
    analyzeDocument: aiAnalyzeDocument,
    loadModel
  } = useAIModel('questionAnswering')

  // Check authentication
  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/login')
      return
    }
  }, [router])

  // Preload AI model when component mounts
  useEffect(() => {
    loadModel().catch(console.error)
  }, [loadModel])

  // Fallback basic analysis functions
  const extractBasicKeyTerms = useCallback((text: string): string[] => {
    const keywords = ['payment', 'delivery', 'liability', 'termination', 'scope', 'warranty', 'indemnity', 'force majeure', 'intellectual property', 'confidentiality']
    return keywords.filter(keyword => 
      text.toLowerCase().includes(keyword)
    ).map(keyword => keyword.charAt(0).toUpperCase() + keyword.slice(1))
  }, [])

  const detectContractType = useCallback((text: string): string => {
    const contractTypes = {
      'Construction Contract': ['construction', 'building', 'contractor', 'subcontractor', 'blueprint'],
      'Service Agreement': ['service', 'services', 'consultant', 'consulting', 'professional'],
      'Purchase Order': ['purchase', 'order', 'goods', 'products', 'procurement'],
      'Employment Contract': ['employment', 'employee', 'salary', 'benefits', 'position'],
      'Lease Agreement': ['lease', 'rent', 'tenant', 'landlord', 'premises'],
      'NDA': ['non-disclosure', 'confidentiality', 'proprietary', 'confidential'],
      'Partnership Agreement': ['partnership', 'joint venture', 'collaboration', 'alliance']
    }

    const lowerText = text.toLowerCase()
    for (const [type, keywords] of Object.entries(contractTypes)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return type
      }
    }
    
    return 'General Contract'
  }, [])

  const assessRisks = useCallback((text: string): { risks: string[], level: 'Low' | 'Medium' | 'High' } => {
    const riskIndicators = [
      { pattern: /unlimited.{0,50}liability/i, risk: 'Unlimited liability exposure' },
      { pattern: /without.{0,20}notice/i, risk: 'Termination without notice clause' },
      { pattern: /no.{0,20}warranty/i, risk: 'No warranty protection' },
      { pattern: /hold.{0,20}harmless/i, risk: 'Hold harmless clause' },
      { pattern: /indemnify/i, risk: 'Indemnification obligations' },
      { pattern: /liquidated.{0,20}damages/i, risk: 'Liquidated damages clause' },
      { pattern: /non-compete/i, risk: 'Non-compete restrictions' }
    ]

    const foundRisks = riskIndicators
      .filter(indicator => indicator.pattern.test(text))
      .map(indicator => indicator.risk)

    const riskLevel: 'Low' | 'Medium' | 'High' = 
      foundRisks.length >= 4 ? 'High' : 
      foundRisks.length >= 2 ? 'Medium' : 'Low'

    return { risks: foundRisks, level: riskLevel }
  }, [])

  // AI-powered contract analysis
  const analyzeDocument = useCallback(async (text: string) => {
    setIsAnalyzing(true)
    setError(null)
    
    try {
      // Prepare comprehensive analysis questions
      const analysisQuestions = [
        'What type of contract is this document?',
        'What are the main payment terms and conditions?',
        'What are the key deliverables and scope of work?',
        'What are the termination conditions?',
        'What liability and insurance requirements are specified?',
        'What are the key dates and deadlines?',
        'Who are the contracting parties and their roles?',
        'What dispute resolution mechanisms are included?'
      ]

      let analysis: AnalysisResult
      let qaResults: Question[] = []

      try {
        // Try AI analysis first
        const results = await aiAnalyzeDocument(text, analysisQuestions)
        
        // Process AI results
        analysis = {
          keyTerms: [],
          contractType: 'Unknown Contract',
          riskLevel: 'Medium',
          summary: 'AI analysis complete. Review Q&A section for detailed insights.',
          risks: [],
          recommendations: []
        }

        // Extract contract type
        const contractTypeResult = results.find(r => r.question.toLowerCase().includes('type of contract'))
        if (contractTypeResult && contractTypeResult.answer) {
          analysis.contractType = contractTypeResult.answer
        }

        // Extract key terms from high-confidence answers
        analysis.keyTerms = results
          .filter(r => r.confidence > 0.3)
          .map(r => r.question.replace(/What (are the |is the |type of )?/i, '').trim())
          .slice(0, 6)

        // Assess risk level
        const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length
        analysis.riskLevel = avgConfidence > 0.7 ? 'Low' : avgConfidence > 0.4 ? 'Medium' : 'High'

        // Generate summary
        const highConfidenceAnswers = results.filter(r => r.confidence > 0.5)
        analysis.summary = `AI analysis identified ${highConfidenceAnswers.length} key insights with ${analysis.riskLevel.toLowerCase()} risk level.`

        // Convert results to Q&A format
        qaResults = results.map((result, index) => ({
          id: `ai-${index}`,
          text: result.question,
          answer: result.answer,
          confidence: result.confidence,
          timestamp: new Date()
        }))

      } catch (aiError) {
        console.warn('AI analysis failed, using fallback:', aiError)
        
        // Fallback to basic analysis
        const basicKeyTerms = extractBasicKeyTerms(text)
        const basicContractType = detectContractType(text)
        const riskAssessment = assessRisks(text)

        analysis = {
          keyTerms: basicKeyTerms,
          contractType: basicContractType,
          riskLevel: riskAssessment.level,
          summary: `Basic text analysis completed. Found ${basicKeyTerms.length} key terms and ${riskAssessment.risks.length} potential risk indicators.`,
          risks: riskAssessment.risks,
          recommendations: [
            'Review all payment terms carefully',
            'Verify liability and insurance requirements',
            'Check termination and dispute resolution clauses',
            'Consider legal review for complex terms'
          ]
        }

        // Add basic Q&A
        qaResults = [
          {
            id: 'basic-1',
            text: 'What type of contract is this?',
            answer: basicContractType,
            confidence: 0.8,
            timestamp: new Date()
          },
          {
            id: 'basic-2', 
            text: 'What are the identified risks?',
            answer: riskAssessment.risks.length > 0 ? riskAssessment.risks.join(', ') : 'No major risks identified',
            confidence: 0.7,
            timestamp: new Date()
          }
        ]
      }
      
      setAnalysis(analysis)
      setQuestions(prev => [...qaResults, ...prev])

    } catch (error) {
      console.error('Analysis error:', error)
      setError('Document analysis failed. Please try uploading the document again.')
    } finally {
      setIsAnalyzing(false)
    }
  }, [aiAnalyzeDocument, extractBasicKeyTerms, detectContractType, assessRisks])

  // Handle file upload with improved parsing
  const handleFileUpload = useCallback(async (file: File) => {
    setError(null)
    setIsProcessing(true)

    try {
      const docInfo: DocumentInfo = {
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date()
      }

      setDocument(docInfo)

      // Extract text based on file type
      let text = ''
      
      if (file.type === 'text/plain') {
        text = await file.text()
      } else if (file.type === 'application/pdf') {
        // For demo purposes, we'll simulate PDF text extraction
        // In production, you'd use a PDF parsing library
        setError('PDF parsing requires additional setup. Please convert to text file for now.')
        return
      } else {
        // Try to read as text anyway
        text = await file.text()
      }

      if (!text.trim()) {
        setError('No text content found in the file.')
        return
      }

      setDocumentText(text)
      
      // Auto-analyze the document
      await analyzeDocument(text)

    } catch (err) {
      setError('Failed to process the file. Please ensure it\'s a valid text document.')
      console.error('File processing error:', err)
    } finally {
      setIsProcessing(false)
    }
  }, [analyzeDocument])

  // Handle question asking
  const askQuestion = useCallback(async () => {
    if (!currentQuestion.trim() || !documentText) return
    
    const questionId = Date.now().toString()
    const newQuestion: Question = {
      id: questionId,
      text: currentQuestion,
      timestamp: new Date()
    }
    
    setQuestions(prev => [newQuestion, ...prev])
    setCurrentQuestion('')
    setIsProcessing(true)
    
    try {
      const results = await aiAnalyzeDocument(documentText, [currentQuestion])
      const result = results[0]
      
      setQuestions(prev => 
        prev.map(q => 
          q.id === questionId 
            ? { 
                ...q, 
                answer: result?.answer || 'No relevant information found in the document.',
                confidence: result?.confidence || 0
              }
            : q
        )
      )
    } catch (error) {
      console.error('Q&A error:', error)
      setQuestions(prev => 
        prev.map(q => 
          q.id === questionId 
            ? { ...q, answer: 'AI analysis is currently unavailable. Please try again later.' }
            : q
        )
      )
    } finally {
      setIsProcessing(false)
    }
  }, [currentQuestion, documentText, aiAnalyzeDocument])

  // Export analysis report
  const exportReport = useCallback(() => {
    if (!analysis || !document) return

    const reportContent = `
CONTRACT ANALYSIS REPORT
Generated: ${new Date().toLocaleDateString()}
Document: ${document.name}

CONTRACT TYPE: ${analysis.contractType}
RISK LEVEL: ${analysis.riskLevel}

SUMMARY:
${analysis.summary}

KEY TERMS:
${analysis.keyTerms.map(term => `- ${term}`).join('\n')}

${analysis.risks && analysis.risks.length > 0 ? `
IDENTIFIED RISKS:
${analysis.risks.map(risk => `- ${risk}`).join('\n')}
` : ''}

${analysis.recommendations && analysis.recommendations.length > 0 ? `
RECOMMENDATIONS:
${analysis.recommendations.map(rec => `- ${rec}`).join('\n')}
` : ''}

Q&A SECTION:
${questions.map(q => `
Q: ${q.text}
A: ${q.answer || 'Pending...'}
${q.confidence ? `Confidence: ${Math.round(q.confidence * 100)}%` : ''}
`).join('\n')}
    `.trim()

    const blob = new Blob([reportContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contract-analysis-${document.name.replace(/\.[^/.]+$/, '')}-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [analysis, document, questions])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Brain className="h-8 w-8 text-purple-600" />
              <h1 className="text-xl font-bold text-gray-900">Contract Analyzer</h1>
              {aiLoading && (
                <div className="flex items-center space-x-2 text-sm text-blue-600">
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>AI Loading...</span>
                </div>
              )}
            </div>
            
            {analysis && document && (
              <button
                onClick={exportReport}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AI Progress */}
      {aiProgress && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center space-x-3">
              <Zap className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-900">{aiProgress.message}</div>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(aiProgress.loaded / aiProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {(error || aiError) && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error || aiError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <div className="space-y-6">
            {/* File Upload */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Contract</h2>
              
              {!document ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 transition-colors"
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
                  <p className="text-sm text-gray-500">TXT, PDF, or DOC files (max 10MB)</p>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".txt,.pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file)
                    }}
                  />
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">{document.name}</p>
                        <p className="text-sm text-gray-500">
                          {(document.size / 1024).toFixed(1)} KB • {document.type}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setDocument(null)
                        setDocumentText('')
                        setAnalysis(null)
                        setQuestions([])
                        setError(null)
                      }}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Analysis Results */}
            {analysis && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Analysis Results</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Contract Type</label>
                    <p className="text-gray-900">{analysis.contractType}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Risk Level</label>
                    <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                      analysis.riskLevel === 'Low' ? 'bg-green-100 text-green-800' :
                      analysis.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {analysis.riskLevel}
                    </span>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Key Terms</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {analysis.keyTerms.map((term, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                          {term}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Summary</label>
                    <p className="text-gray-700 text-sm">{analysis.summary}</p>
                  </div>

                  {analysis.risks && analysis.risks.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Identified Risks</label>
                      <ul className="mt-1 text-sm text-red-700">
                        {analysis.risks.map((risk, index) => (
                          <li key={index} className="flex items-center space-x-2">
                            <AlertCircle className="h-4 w-4" />
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Q&A Section */}
          <div className="space-y-6">
            {/* Ask Question */}
            {documentText && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Ask Questions</h2>
                
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={currentQuestion}
                    onChange={(e) => setCurrentQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && askQuestion()}
                    placeholder="Ask about the contract..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={isProcessing}
                  />
                  <button
                    onClick={askQuestion}
                    disabled={isProcessing || !currentQuestion.trim()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isProcessing ? <Loader className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Questions & Answers */}
            {questions.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Questions & Answers</h2>
                
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {questions.map((question) => (
                    <div key={question.id} className="border-l-4 border-purple-200 pl-4">
                      <div className="flex items-start justify-between">
                        <p className="font-medium text-gray-900">{question.text}</p>
                        <span className="text-xs text-gray-500">
                          {question.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      
                      {question.answer ? (
                        <div className="mt-2">
                          <p className="text-gray-700">{question.answer}</p>
                          {question.confidence && (
                            <div className="mt-1 flex items-center space-x-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-1">
                                <div 
                                  className="bg-purple-600 h-1 rounded-full" 
                                  style={{ width: `${question.confidence * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500">
                                {Math.round(question.confidence * 100)}% confidence
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center space-x-2 text-gray-500">
                          <Loader className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Processing...</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}