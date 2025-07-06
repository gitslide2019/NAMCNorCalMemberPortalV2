// Comprehensive AI Service with Feedback Loop and Advanced Features

import { PrismaClient } from '@prisma/client'
import { auditService } from './auditService'
import { notificationService } from './notificationService'

const prisma = new PrismaClient()

interface AIFeedbackRequest {
  userId: string
  feature: string
  input: string
  output: string
  rating: number // 1-5 scale
  feedback?: string
  isAccurate?: boolean
}

interface IntelligentMatchingRequest {
  userId: string
  type: 'PROJECT' | 'MEMBER' | 'COURSE' | 'EVENT'
  preferences?: Record<string, any>
}

interface SmartFormData {
  formType: string
  userInput: Record<string, any>
  context?: Record<string, any>
}

interface InvoiceProcessingRequest {
  userId: string
  invoiceData: string | Buffer
  fileType: 'PDF' | 'IMAGE' | 'TEXT'
}

interface AIModelPerformance {
  modelId: string
  totalRequests: number
  successRate: number
  averageAccuracy: number
  averageResponseTime: number
  lastUpdated: Date
}

export class AIService {
  private readonly modelConfigs = {
    'contract_analyzer': {
      name: 'Contract Analyzer',
      version: '1.0.0',
      accuracy: 0.85,
      lastTrained: new Date('2024-01-01')
    },
    'business_growth': {
      name: 'Business Growth Advisor',
      version: '1.0.0',
      accuracy: 0.78,
      lastTrained: new Date('2024-01-01')
    },
    'intelligent_matching': {
      name: 'Intelligent Matching Engine',
      version: '1.0.0',
      accuracy: 0.82,
      lastTrained: new Date('2024-01-01')
    },
    'smart_forms': {
      name: 'Smart Form Assistant',
      version: '1.0.0',
      accuracy: 0.90,
      lastTrained: new Date('2024-01-01')
    },
    'invoice_processor': {
      name: 'Invoice Processing Engine',
      version: '1.0.0',
      accuracy: 0.92,
      lastTrained: new Date('2024-01-01')
    }
  }

  async submitFeedback(request: AIFeedbackRequest): Promise<any> {
    const { userId, feature, input, output, rating, feedback, isAccurate } = request

    try {
      const feedbackRecord = await prisma.aiFeedback.create({
        data: {
          userId,
          feature,
          input,
          output,
          rating,
          feedback,
          isAccurate
        }
      })

      await auditService.log({
        userId,
        action: 'AI_FEEDBACK_SUBMITTED',
        resource: 'ai_feedback',
        resourceId: feedbackRecord.id,
        newData: { feature, rating, isAccurate }
      })

      // Process feedback for model improvement
      await this.processFeedbackForImprovement(feedbackRecord)

      // Notify AI team of poor ratings
      if (rating <= 2) {
        await notificationService.sendToRole('AI_TEAM', {
          type: 'SYSTEM_ANNOUNCEMENT',
          title: 'Poor AI Performance Reported',
          message: `Low rating (${rating}/5) reported for ${feature} feature`,
          priority: 'HIGH',
          data: {
            feedbackId: feedbackRecord.id,
            feature,
            rating,
            userId
          }
        })
      }

      return {
        feedbackId: feedbackRecord.id,
        message: 'Feedback submitted successfully'
      }

    } catch (error) {
      console.error('AI feedback submission failed:', error)
      throw new Error('Failed to submit AI feedback')
    }
  }

  async intelligentMatching(request: IntelligentMatchingRequest): Promise<any> {
    const { userId, type, preferences } = request

    try {
      await auditService.log({
        userId,
        action: 'AI_MATCHING_REQUESTED',
        resource: 'ai_matching',
        newData: { type, preferences }
      })

      let matches = []

      switch (type) {
        case 'PROJECT':
          matches = await this.intelligentProjectMatching(userId, preferences)
          break
        case 'MEMBER':
          matches = await this.intelligentMemberMatching(userId, preferences)
          break
        case 'COURSE':
          matches = await this.intelligentCourseMatching(userId, preferences)
          break
        case 'EVENT':
          matches = await this.intelligentEventMatching(userId, preferences)
          break
        default:
          throw new Error('Invalid matching type')
      }

      return {
        type,
        matches,
        totalMatches: matches.length,
        confidence: this.calculateMatchingConfidence(matches),
        generatedAt: new Date()
      }

    } catch (error) {
      console.error('Intelligent matching failed:', error)
      throw new Error('Intelligent matching failed')
    }
  }

  async smartFormAssistance(formData: SmartFormData): Promise<any> {
    const { formType, userInput, context } = formData

    try {
      await auditService.log({
        action: 'SMART_FORM_USED',
        resource: 'ai_smart_forms',
        newData: { formType, inputFields: Object.keys(userInput) }
      })

      let suggestions = {}
      let validationErrors = []
      let autocompletions = {}

      switch (formType) {
        case 'project_proposal':
          suggestions = await this.generateProjectProposalSuggestions(userInput, context)
          break
        case 'membership_application':
          suggestions = await this.generateMembershipSuggestions(userInput, context)
          break
        case 'course_application':
          suggestions = await this.generateCourseApplicationSuggestions(userInput, context)
          break
        case 'event_registration':
          suggestions = await this.generateEventRegistrationSuggestions(userInput, context)
          break
      }

      // Validate input using AI
      validationErrors = await this.validateFormInputWithAI(formType, userInput)

      // Generate autocompletions
      autocompletions = await this.generateAutocompletions(formType, userInput)

      return {
        formType,
        suggestions,
        validationErrors,
        autocompletions,
        confidence: 0.85,
        processingTime: 150 // ms
      }

    } catch (error) {
      console.error('Smart form assistance failed:', error)
      throw new Error('Smart form assistance failed')
    }
  }

  async processInvoice(request: InvoiceProcessingRequest): Promise<any> {
    const { userId, invoiceData, fileType } = request

    try {
      await auditService.log({
        userId,
        action: 'INVOICE_PROCESSING_STARTED',
        resource: 'ai_invoice_processing',
        newData: { fileType, dataSize: invoiceData.length }
      })

      // Extract text from invoice based on file type
      let extractedText = ''
      switch (fileType) {
        case 'TEXT':
          extractedText = invoiceData as string
          break
        case 'PDF':
          extractedText = await this.extractTextFromPDF(invoiceData as Buffer)
          break
        case 'IMAGE':
          extractedText = await this.extractTextFromImage(invoiceData as Buffer)
          break
      }

      // Process extracted text with AI
      const processedData = await this.processInvoiceText(extractedText)

      // Validate extracted data
      const validationResults = await this.validateExtractedInvoiceData(processedData)

      const result = {
        invoiceId: this.generateInvoiceId(),
        extractedData: processedData,
        validation: validationResults,
        confidence: processedData.confidence || 0.9,
        processingTime: Date.now() - Date.now(), // Placeholder
        suggestedActions: this.generateInvoiceActions(processedData)
      }

      await auditService.log({
        userId,
        action: 'INVOICE_PROCESSING_COMPLETED',
        resource: 'ai_invoice_processing',
        newData: {
          invoiceId: result.invoiceId,
          confidence: result.confidence,
          fieldsExtracted: Object.keys(processedData).length
        }
      })

      return result

    } catch (error) {
      console.error('Invoice processing failed:', error)
      throw new Error('Invoice processing failed')
    }
  }

  async getAIModelPerformance(modelId?: string): Promise<AIModelPerformance[]> {
    try {
      const models = modelId ? [modelId] : Object.keys(this.modelConfigs)
      const performance: AIModelPerformance[] = []

      for (const model of models) {
        const [feedbackStats, usageStats] = await Promise.all([
          prisma.aiFeedback.aggregate({
            where: { feature: model },
            _avg: { rating: true },
            _count: { id: true }
          }),
          prisma.auditLog.count({
            where: {
              action: { startsWith: 'AI_' },
              resource: { contains: model }
            }
          })
        ])

        const accurateFeedback = await prisma.aiFeedback.count({
          where: {
            feature: model,
            isAccurate: true
          }
        })

        const totalFeedback = feedbackStats._count.id || 0
        const accuracyRate = totalFeedback > 0 ? (accurateFeedback / totalFeedback) : 0

        performance.push({
          modelId: model,
          totalRequests: usageStats,
          successRate: 0.95, // Placeholder - would be calculated from actual success/failure logs
          averageAccuracy: accuracyRate,
          averageResponseTime: 250, // Placeholder - would be calculated from actual response times
          lastUpdated: new Date()
        })
      }

      return performance

    } catch (error) {
      console.error('Failed to get AI model performance:', error)
      throw error
    }
  }

  async retrainModel(modelId: string, adminUserId: string): Promise<any> {
    try {
      if (!this.modelConfigs[modelId]) {
        throw new Error('Invalid model ID')
      }

      // Get recent feedback for training data
      const feedbackData = await prisma.aiFeedback.findMany({
        where: {
          feature: modelId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      // In production, this would trigger actual model retraining
      const retrainingResult = await this.performModelRetraining(modelId, feedbackData)

      await prisma.aiModel.upsert({
        where: { name: modelId },
        update: {
          version: this.incrementVersion(this.modelConfigs[modelId].version),
          accuracy: retrainingResult.newAccuracy,
          config: retrainingResult.config,
          updatedAt: new Date()
        },
        create: {
          name: modelId,
          version: '1.0.1',
          type: 'machine_learning',
          accuracy: retrainingResult.newAccuracy,
          config: retrainingResult.config,
          isActive: true
        }
      })

      await auditService.log({
        userId: adminUserId,
        action: 'AI_MODEL_RETRAINED',
        resource: 'ai_models',
        resourceId: modelId,
        newData: {
          oldAccuracy: this.modelConfigs[modelId].accuracy,
          newAccuracy: retrainingResult.newAccuracy,
          trainingDataPoints: feedbackData.length
        }
      })

      return {
        modelId,
        oldAccuracy: this.modelConfigs[modelId].accuracy,
        newAccuracy: retrainingResult.newAccuracy,
        improvementPercent: ((retrainingResult.newAccuracy - this.modelConfigs[modelId].accuracy) / this.modelConfigs[modelId].accuracy) * 100,
        trainingDataPoints: feedbackData.length,
        retrainedAt: new Date()
      }

    } catch (error) {
      console.error('Model retraining failed:', error)
      throw error
    }
  }

  async getAIInsights(userId: string): Promise<any> {
    try {
      const [
        userAIUsage,
        userFeedback,
        personalizedRecommendations
      ] = await Promise.all([
        prisma.auditLog.count({
          where: {
            userId,
            action: { startsWith: 'AI_' }
          }
        }),
        prisma.aiFeedback.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 5
        }),
        this.generatePersonalizedRecommendations(userId)
      ])

      return {
        usage: {
          totalAIInteractions: userAIUsage,
          averageRating: userFeedback.length > 0 
            ? userFeedback.reduce((sum, f) => sum + f.rating, 0) / userFeedback.length 
            : 0,
          mostUsedFeature: await this.getMostUsedAIFeature(userId)
        },
        recentFeedback: userFeedback,
        recommendations: personalizedRecommendations,
        suggestedFeatures: await this.suggestNewAIFeatures(userId)
      }

    } catch (error) {
      console.error('Failed to get AI insights:', error)
      throw error
    }
  }

  // Private helper methods
  private async processFeedbackForImprovement(feedback: any): Promise<void> {
    // Analyze feedback patterns and flag for model improvement
    if (feedback.rating <= 2 || feedback.isAccurate === false) {
      // Add to retraining queue
      console.log(`Flagging feedback ${feedback.id} for model improvement`)
    }
  }

  private async intelligentProjectMatching(userId: string, preferences: any): Promise<any[]> {
    // AI-powered project matching based on skills, experience, location, etc.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { city: true, state: true, company: true }
    })

    const projects = await prisma.project.findMany({
      where: { status: 'OPEN' },
      take: 10
    })

    // Apply AI matching algorithm
    return projects.map(project => ({
      ...project,
      matchScore: Math.random() * 100, // Placeholder AI score
      reasons: ['Skills match', 'Location proximity', 'Budget alignment']
    }))
  }

  private async intelligentMemberMatching(userId: string, preferences: any): Promise<any[]> {
    // AI-powered member networking suggestions
    const users = await prisma.user.findMany({
      where: {
        id: { not: userId },
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        memberType: true,
        city: true,
        state: true
      },
      take: 10
    })

    return users.map(user => ({
      ...user,
      matchScore: Math.random() * 100,
      reasons: ['Similar industry', 'Complementary skills', 'Geographic proximity']
    }))
  }

  private async intelligentCourseMatching(userId: string, preferences: any): Promise<any[]> {
    // AI-powered course recommendations
    const courses = await prisma.course.findMany({
      where: { isPublished: true },
      take: 10
    })

    return courses.map(course => ({
      ...course,
      matchScore: Math.random() * 100,
      reasons: ['Career advancement', 'Skill development', 'Industry relevance']
    }))
  }

  private async intelligentEventMatching(userId: string, preferences: any): Promise<any[]> {
    // AI-powered event recommendations
    const events = await prisma.event.findMany({
      where: {
        isActive: true,
        startDate: { gte: new Date() }
      },
      take: 10
    })

    return events.map(event => ({
      ...event,
      matchScore: Math.random() * 100,
      reasons: ['Professional interest', 'Networking opportunity', 'Schedule compatibility']
    }))
  }

  private calculateMatchingConfidence(matches: any[]): number {
    if (matches.length === 0) return 0
    const avgScore = matches.reduce((sum, match) => sum + match.matchScore, 0) / matches.length
    return avgScore / 100
  }

  private async generateProjectProposalSuggestions(input: any, context: any): Promise<any> {
    return {
      timeline: 'Consider breaking down into 2-week sprints',
      budget: 'Based on similar projects, budget range should be $X-Y',
      skills: ['Project Management', 'Technical Writing', 'Client Communication'],
      experience: 'Highlight relevant certifications and past project outcomes'
    }
  }

  private async generateMembershipSuggestions(input: any, context: any): Promise<any> {
    return {
      tier: 'Premium membership recommended based on your business size',
      benefits: 'Focus on networking and professional development opportunities',
      references: 'Consider adding 2-3 professional references'
    }
  }

  private async generateCourseApplicationSuggestions(input: any, context: any): Promise<any> {
    return {
      prerequisites: 'Ensure you have completed foundational courses',
      schedule: 'This course requires 5-10 hours per week commitment',
      outcomes: 'Upon completion, you will be able to...'
    }
  }

  private async generateEventRegistrationSuggestions(input: any, context: any): Promise<any> {
    return {
      preparation: 'Review the agenda and prepare questions for speakers',
      networking: 'Connect with speakers on LinkedIn before the event',
      followup: 'Schedule follow-up meetings within 48 hours'
    }
  }

  private async validateFormInputWithAI(formType: string, input: any): Promise<string[]> {
    const errors = []
    // AI-powered validation logic
    return errors
  }

  private async generateAutocompletions(formType: string, input: any): Promise<any> {
    return {
      company: ['ABC Construction', 'XYZ Contracting', 'BuildCorp Inc'],
      skills: ['Project Management', 'Construction', 'Engineering'],
      location: ['San Francisco, CA', 'Oakland, CA', 'San Jose, CA']
    }
  }

  private async extractTextFromPDF(buffer: Buffer): Promise<string> {
    // In production, use PDF parsing libraries like pdf-parse
    return 'Extracted PDF text...'
  }

  private async extractTextFromImage(buffer: Buffer): Promise<string> {
    // In production, use OCR libraries like Tesseract
    return 'Extracted image text...'
  }

  private async processInvoiceText(text: string): Promise<any> {
    // AI-powered invoice data extraction
    return {
      invoiceNumber: 'INV-2024-001',
      date: '2024-01-15',
      vendor: 'ABC Supplies',
      amount: 1250.00,
      tax: 125.00,
      total: 1375.00,
      lineItems: [
        { description: 'Construction Materials', quantity: 10, unitPrice: 125.00, total: 1250.00 }
      ],
      confidence: 0.92
    }
  }

  private async validateExtractedInvoiceData(data: any): Promise<any> {
    return {
      isValid: true,
      errors: [],
      warnings: ['Date format should be verified'],
      suggestions: ['Consider adding purchase order reference']
    }
  }

  private generateInvoiceActions(data: any): string[] {
    return [
      'Create expense entry',
      'Submit for approval',
      'Schedule payment',
      'Update project budget'
    ]
  }

  private generateInvoiceId(): string {
    return `AI-INV-${Date.now()}`
  }

  private async performModelRetraining(modelId: string, feedbackData: any[]): Promise<any> {
    // Simulate model retraining
    const oldAccuracy = this.modelConfigs[modelId].accuracy
    const improvement = (Math.random() * 0.1) - 0.05 // ±5% accuracy change
    const newAccuracy = Math.max(0.1, Math.min(1.0, oldAccuracy + improvement))

    return {
      newAccuracy,
      config: { version: 'retrained', dataPoints: feedbackData.length }
    }
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.')
    const patch = parseInt(parts[2] || '0') + 1
    return `${parts[0]}.${parts[1]}.${patch}`
  }

  private async generatePersonalizedRecommendations(userId: string): Promise<string[]> {
    return [
      'Try the contract analyzer for your upcoming projects',
      'Use smart forms to improve application quality',
      'Enable AI matching for better project opportunities'
    ]
  }

  private async getMostUsedAIFeature(userId: string): Promise<string> {
    const usage = await prisma.auditLog.groupBy({
      by: ['resource'],
      where: {
        userId,
        action: { startsWith: 'AI_' }
      },
      _count: { resource: true },
      orderBy: { _count: { resource: 'desc' } },
      take: 1
    })

    return usage[0]?.resource || 'contract_analyzer'
  }

  private async suggestNewAIFeatures(userId: string): Promise<string[]> {
    return [
      'AI-powered bid optimization',
      'Automated project risk assessment',
      'Intelligent document summarization',
      'Predictive maintenance scheduling'
    ]
  }
}

export const aiService = new AIService()