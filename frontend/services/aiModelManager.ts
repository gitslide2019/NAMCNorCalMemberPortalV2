// Optimized AI Model Manager with lazy loading and error handling

interface ModelConfig {
  name: string
  modelId: string
  task: string
  size: 'small' | 'medium' | 'large'
  priority: 'high' | 'medium' | 'low'
  fallbackEnabled: boolean
}

interface LoadingProgress {
  loaded: number
  total: number
  status: 'loading' | 'complete' | 'error'
  message?: string
}

class AIModelManager {
  private models = new Map<string, any>()
  private loadingPromises = new Map<string, Promise<any>>()
  private loadingProgress = new Map<string, LoadingProgress>()
  private isOnline = navigator.onLine
  private hasHighMemory = 'memory' in performance && (performance as any).memory?.jsHeapSizeLimit > 4 * 1024 * 1024 * 1024 // 4GB
  
  // Model configurations with fallback options
  private modelConfigs: Record<string, ModelConfig> = {
    questionAnswering: {
      name: 'Question Answering',
      modelId: this.hasHighMemory 
        ? 'Xenova/distilbert-base-uncased-distilled-squad'
        : 'Xenova/distilbert-base-cased-distilled-squad', // Smaller fallback
      task: 'question-answering',
      size: this.hasHighMemory ? 'medium' : 'small',
      priority: 'high',
      fallbackEnabled: true
    },
    textClassification: {
      name: 'Text Classification',
      modelId: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      task: 'text-classification',
      size: 'small',
      priority: 'medium',
      fallbackEnabled: true
    },
    tokenClassification: {
      name: 'Token Classification',
      modelId: 'Xenova/bert-base-NER',
      task: 'token-classification',
      size: 'medium',
      priority: 'low',
      fallbackEnabled: true
    },
    textGeneration: {
      name: 'Text Generation',
      modelId: 'Xenova/gpt2',
      task: 'text-generation',
      size: 'large',
      priority: 'low',
      fallbackEnabled: false // Too resource intensive for fallback
    }
  }

  constructor() {
    this.setupNetworkListeners()
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true
      console.log('AI Models: Network connection restored')
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      console.log('AI Models: Network connection lost')
    })
  }

  // Check if device has sufficient resources for AI processing
  private checkDeviceCapability(): { canRunAI: boolean; reason?: string } {
    // Check memory (if available)
    if ('memory' in performance) {
      const memory = (performance as any).memory
      const freeMemory = memory.jsHeapSizeLimit - memory.usedJSHeapSize
      
      if (freeMemory < 512 * 1024 * 1024) { // Less than 512MB free
        return { canRunAI: false, reason: 'Insufficient memory available' }
      }
    }

    // Check CPU cores (rough proxy for performance)
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 2) {
      return { canRunAI: false, reason: 'Device may be too slow for AI processing' }
    }

    // Check if WebAssembly is supported (required for transformers.js)
    if (!('WebAssembly' in window)) {
      return { canRunAI: false, reason: 'WebAssembly not supported' }
    }

    return { canRunAI: true }
  }

  // Get model loading progress
  getLoadingProgress(modelKey: string): LoadingProgress | null {
    return this.loadingProgress.get(modelKey) || null
  }

  // Load model with progress tracking and error handling
  async loadModel(modelKey: string): Promise<any> {
    const config = this.modelConfigs[modelKey]
    if (!config) {
      throw new Error(`Unknown model: ${modelKey}`)
    }

    // Check if model is already loaded
    if (this.models.has(modelKey)) {
      return this.models.get(modelKey)
    }

    // Check if already loading
    if (this.loadingPromises.has(modelKey)) {
      return this.loadingPromises.get(modelKey)
    }

    // Check device capability
    const capability = this.checkDeviceCapability()
    if (!capability.canRunAI) {
      if (config.fallbackEnabled) {
        console.warn(`AI Model ${modelKey}: ${capability.reason}. Using server-side fallback.`)
        return this.getServerSideFallback(modelKey)
      } else {
        throw new Error(`Cannot load AI model: ${capability.reason}`)
      }
    }

    // Check network connection
    if (!this.isOnline) {
      throw new Error('No network connection available for model loading')
    }

    // Initialize loading progress
    this.loadingProgress.set(modelKey, {
      loaded: 0,
      total: 100,
      status: 'loading',
      message: `Loading ${config.name}...`
    })

    // Create loading promise
    const loadingPromise = this.doLoadModel(modelKey, config)
    this.loadingPromises.set(modelKey, loadingPromise)

    try {
      const model = await loadingPromise
      this.models.set(modelKey, model)
      
      this.loadingProgress.set(modelKey, {
        loaded: 100,
        total: 100,
        status: 'complete',
        message: `${config.name} ready`
      })

      console.log(`AI Model ${modelKey} loaded successfully`)
      return model
    } catch (error) {
      this.loadingProgress.set(modelKey, {
        loaded: 0,
        total: 100,
        status: 'error',
        message: `Failed to load ${config.name}: ${error.message}`
      })

      console.error(`Failed to load AI model ${modelKey}:`, error)
      
      // Try fallback if enabled
      if (config.fallbackEnabled) {
        console.log(`Attempting server-side fallback for ${modelKey}`)
        return this.getServerSideFallback(modelKey)
      }
      
      throw error
    } finally {
      this.loadingPromises.delete(modelKey)
    }
  }

  private async doLoadModel(modelKey: string, config: ModelConfig): Promise<any> {
    // Dynamic import to avoid bundle bloat
    const { pipeline } = await import('@xenova/transformers')
    
    // Create pipeline with progress callback
    const model = await pipeline(config.task, config.modelId, {
      progress_callback: (progress: any) => {
        if (progress.status === 'downloading') {
          this.loadingProgress.set(modelKey, {
            loaded: progress.loaded || 0,
            total: progress.total || 100,
            status: 'loading',
            message: `Downloading ${config.name}... ${Math.round((progress.loaded / progress.total) * 100)}%`
          })
        }
      }
    })

    return model
  }

  // Server-side fallback for when client-side AI fails
  private async getServerSideFallback(modelKey: string): Promise<any> {
    const { apiClient } = await import('../utils/api')
    
    return {
      async predict(input: any, options: any = {}) {
        const response = await apiClient.post('/api/ai/predict', {
          model: modelKey,
          input,
          options
        })
        
        if (!response.ok) {
          throw new Error('Server-side AI prediction failed')
        }
        
        return response.json()
      },
      isServerSide: true,
      modelKey
    }
  }

  // High-level inference methods with automatic fallback
  async analyzeDocument(text: string, questions: string[]): Promise<any[]> {
    try {
      const model = await this.loadModel('questionAnswering')
      
      if (model.isServerSide) {
        return model.predict({ text, questions })
      }
      
      const results = await Promise.all(
        questions.map(async (question) => {
          const result = await model(question, text)
          return {
            question,
            answer: result.answer,
            confidence: result.score
          }
        })
      )
      
      return results
    } catch (error) {
      console.error('Document analysis failed:', error)
      throw new Error('Unable to analyze document. Please try again or contact support.')
    }
  }

  async classifyText(text: string): Promise<any> {
    try {
      const model = await this.loadModel('textClassification')
      
      if (model.isServerSide) {
        return model.predict({ text })
      }
      
      const result = await model(text)
      return result[0] // Return top classification
    } catch (error) {
      console.error('Text classification failed:', error)
      throw new Error('Unable to classify text. Please try again.')
    }
  }

  async extractEntities(text: string): Promise<any[]> {
    try {
      const model = await this.loadModel('tokenClassification')
      
      if (model.isServerSide) {
        return model.predict({ text })
      }
      
      const results = await model(text)
      
      // Group consecutive tokens of the same entity type
      const entities = []
      let currentEntity = null
      
      for (const token of results) {
        if (token.entity.startsWith('B-') || !currentEntity || currentEntity.entity !== token.entity.replace('I-', '')) {
          if (currentEntity) entities.push(currentEntity)
          currentEntity = {
            entity: token.entity.replace(/^[BI]-/, ''),
            score: token.score,
            word: token.word,
            start: token.start,
            end: token.end
          }
        } else {
          currentEntity.word += token.word.replace('##', '')
          currentEntity.end = token.end
          currentEntity.score = Math.min(currentEntity.score, token.score)
        }
      }
      
      if (currentEntity) entities.push(currentEntity)
      return entities
    } catch (error) {
      console.error('Entity extraction failed:', error)
      throw new Error('Unable to extract entities. Please try again.')
    }
  }

  // Preload high-priority models
  async preloadModels(): Promise<void> {
    const highPriorityModels = Object.entries(this.modelConfigs)
      .filter(([_, config]) => config.priority === 'high')
      .map(([key, _]) => key)

    // Load models in background without blocking UI
    highPriorityModels.forEach(modelKey => {
      this.loadModel(modelKey).catch(error => {
        console.warn(`Failed to preload model ${modelKey}:`, error.message)
      })
    })
  }

  // Clean up resources
  cleanup(): void {
    this.models.clear()
    this.loadingPromises.clear()
    this.loadingProgress.clear()
  }

  // Get model status for debugging
  getModelStatus(): Record<string, any> {
    const status: Record<string, any> = {}
    
    for (const [key, config] of Object.entries(this.modelConfigs)) {
      status[key] = {
        config,
        loaded: this.models.has(key),
        loading: this.loadingPromises.has(key),
        progress: this.loadingProgress.get(key)
      }
    }
    
    return status
  }
}

// Export singleton instance
export const aiModelManager = new AIModelManager()

// React hook for using AI models
export function useAIModel(modelKey: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<LoadingProgress | null>(null)

  const loadModel = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      await aiModelManager.loadModel(modelKey)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [modelKey])

  // Update progress
  useEffect(() => {
    const interval = setInterval(() => {
      const currentProgress = aiModelManager.getLoadingProgress(modelKey)
      setProgress(currentProgress)
    }, 100)

    return () => clearInterval(interval)
  }, [modelKey])

  return {
    loading,
    error,
    progress,
    loadModel,
    analyzeDocument: aiModelManager.analyzeDocument.bind(aiModelManager),
    classifyText: aiModelManager.classifyText.bind(aiModelManager),
    extractEntities: aiModelManager.extractEntities.bind(aiModelManager)
  }
}

export default aiModelManager