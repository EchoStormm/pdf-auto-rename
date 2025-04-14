import { OpenAIService } from "./openai"

export class DownloadService {
  private static instance: DownloadService
  private openAIService: OpenAIService
  private isProcessing: boolean = false
  private readonly MAX_RETRIES = 3
  private readonly RETRY_DELAY = 2000 // 2 secondes
  private processingUrls = new Set<string>()
  private processedUrls = new Set<string>()
  private retryCounts = new Map<string, number>()

  private constructor() {
    this.openAIService = OpenAIService.getInstance()
    this.loadProcessedUrls()
  }

  private async loadProcessedUrls() {
    try {
      const savedUrls = await chrome.storage.sync.get("processed_urls")
      if (savedUrls.processed_urls) {
        this.processedUrls = new Set(JSON.parse(savedUrls.processed_urls))
      }
    } catch (error) {
      console.error("Error loading processed URLs:", error)
    }
  }

  private async saveProcessedUrls() {
    try {
      await chrome.storage.sync.set({ processed_urls: JSON.stringify([...this.processedUrls]) })
    } catch (error) {
      console.error("Error saving processed URLs:", error)
    }
  }

  public static getInstance(): DownloadService {
    if (!DownloadService.instance) {
      DownloadService.instance = new DownloadService()
    }
    return DownloadService.instance
  }

  public async handleDownload(downloadItem: chrome.downloads.DownloadItem): Promise<string | null> {
    console.log("Handling download for URL:", downloadItem.url)
    
    if (this.processedUrls.has(downloadItem.url)) {
      console.log("URL already processed successfully:", downloadItem.url)
      return null
    }

    if (this.isProcessing) {
      console.log("Service is already processing a download")
      return null
    }

    if (this.processingUrls.has(downloadItem.url)) {
      console.log("URL is already being processed:", downloadItem.url)
      return null
    }

    this.isProcessing = true
    this.processingUrls.add(downloadItem.url)

    try {
      await this.openAIService.initialize()
      const pdfContent = await this.downloadWithRetry(downloadItem.url)
      
      if (!this.isValidPDF(pdfContent)) {
        throw new Error("Invalid PDF file")
      }

      if (pdfContent.byteLength === 0) {
        throw new Error("Empty PDF file")
      }

      const suggestedTitle = await this.openAIService.analyzePDF(pdfContent)
      
      if (!suggestedTitle || suggestedTitle.trim() === '') {
        throw new Error("Empty title generated")
      }

      this.processedUrls.add(downloadItem.url)
      await this.saveProcessedUrls()

      return suggestedTitle
    } catch (error) {
      console.error("Error processing PDF:", error)
      return null
    } finally {
      this.isProcessing = false
      this.processingUrls.delete(downloadItem.url)
      this.retryCounts.delete(downloadItem.url)
    }
  }

  private async downloadWithRetry(url: string): Promise<ArrayBuffer> {
    let retryCount = this.retryCounts.get(url) || 0

    while (retryCount < this.MAX_RETRIES) {
      try {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to download PDF: ${response.statusText}`)
        }
        const buffer = await response.arrayBuffer()
        if (buffer.byteLength === 0) {
          throw new Error("Downloaded file is empty")
        }
        return buffer
      } catch (error) {
        retryCount++
        this.retryCounts.set(url, retryCount)
        
        if (retryCount >= this.MAX_RETRIES) {
          throw error
        }

        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY))
      }
    }

    throw new Error("Max retries reached")
  }

  private isValidPDF(buffer: ArrayBuffer): boolean {
    const uint8Array = new Uint8Array(buffer)
    const pdfHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46]) // %PDF
    for (let i = 0; i < pdfHeader.length; i++) {
      if (uint8Array[i] !== pdfHeader[i]) {
        return false
      }
    }
    return true
  }

  public async clearProcessedUrls(): Promise<void> {
    this.processedUrls.clear()
    await this.saveProcessedUrls()
  }
} 