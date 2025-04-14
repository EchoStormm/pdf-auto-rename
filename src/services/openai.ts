import { OpenAI } from "openai"

export class OpenAIService {
  private static instance: OpenAIService
  private client: OpenAI | null = null
  private readonly MAX_PDF_SIZE = 20 * 1024 * 1024 // 20MB
  private readonly MAX_CONTENT_LENGTH = 100000 // Limite de caractères pour l'API
  private readonly CHUNK_SIZE = 50000 // Taille des morceaux pour l'analyse

  private constructor() {}

  public static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService()
    }
    return OpenAIService.instance
  }

  public async initialize(): Promise<void> {
    const { apiKey } = await chrome.storage.sync.get(['apiKey'])
    console.log("Initializing OpenAI with API key:", apiKey ? "present" : "missing")
    if (apiKey) {
      this.client = new OpenAI({
        apiKey: apiKey as string,
        dangerouslyAllowBrowser: true
      })
      console.log("OpenAI client initialized successfully")
    } else {
      console.error("OpenAI API key is missing")
      throw new Error("OpenAI API key is missing")
    }
  }

  public async analyzePDF(pdfContent: ArrayBuffer): Promise<string> {
    if (!this.client) {
      console.error("OpenAI client not initialized")
      throw new Error("OpenAI client not initialized")
    }

    try {
      // Vérifier la taille du PDF
      if (pdfContent.byteLength > this.MAX_PDF_SIZE) {
        console.error("PDF file is too large:", pdfContent.byteLength, "bytes")
        throw new Error("PDF file is too large")
      }

      // Convertir en base64 de manière plus efficace
      const uint8Array = new Uint8Array(pdfContent)
      let base64Content = ""
      for (let i = 0; i < uint8Array.length; i++) {
        base64Content += String.fromCharCode(uint8Array[i])
      }
      base64Content = btoa(base64Content)

      console.log("PDF converted to base64, size:", base64Content.length)

      // Extraire plusieurs morceaux du PDF pour une meilleure analyse
      const chunks = []
      for (let i = 0; i < base64Content.length; i += this.CHUNK_SIZE) {
        chunks.push(base64Content.substring(i, i + this.CHUNK_SIZE))
      }

      // Prendre le début, le milieu et la fin du document
      const selectedChunks = [
        chunks[0],
        chunks[Math.floor(chunks.length / 2)],
        chunks[chunks.length - 1]
      ].filter(Boolean)

      console.log("Sending request to OpenAI API...")
      const response = await this.client.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that analyzes PDF content and suggests appropriate titles. 
            Focus on the main subject and return only the title, nothing else.
            The title should be concise, descriptive, and reflect the actual content of the document.
            If the document appears to be a manual, guide, or technical document, include that in the title.
            Do not include file extensions or special characters in the title.`
          },
          {
            role: "user",
            content: `Analyze these sections of a PDF document and suggest a concise, descriptive title that represents its main subject. 
            Return only the title, nothing else. 
            PDF content sections:
            ${selectedChunks.map((chunk, i) => `Section ${i + 1}:\n${chunk}`).join('\n\n')}`
          }
        ],
        max_tokens: 50,
        temperature: 0.3
      })

      console.log("OpenAI API response received:", response)

      const title = response.choices[0]?.message?.content?.trim()
      if (!title) {
        console.error("No title generated from OpenAI response")
        throw new Error("No title generated")
      }

      console.log("Generated title:", title)
      return title
    } catch (error) {
      console.error("Error analyzing PDF:", error)
      throw error
    }
  }

  public async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const testClient = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
      })
      const response = await testClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 1
      })
      return response.choices[0]?.message?.content !== undefined
    } catch (error) {
      console.error("Error testing API key:", error)
      return false
    }
  }
} 