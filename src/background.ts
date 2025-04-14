import { DownloadService } from "./services/download"
import { OpenAIService } from "./services/openai"
import { Storage } from "@plasmohq/storage"

const storage = new Storage()
const downloadService = DownloadService.getInstance()
const openAIService = OpenAIService.getInstance()

// Cache pour suivre les téléchargements en cours
const processingDownloads = new Set<string>()
const notificationCooldown = new Set<string>()
const processingTimeouts = new Map<string, NodeJS.Timeout>()

// Initialize services
async function initializeServices() {
  try {
    await openAIService.initialize()
    console.log("Services initialized successfully")
  } catch (error) {
    console.error("Error initializing services:", error)
  }
}

// Fonction pour nettoyer et valider le nom de fichier
function sanitizeFilename(filename: string): string {
  // Supprimer les caractères invalides
  const sanitized = filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/^\.+/, '') // Supprimer les points au début
    .trim()
  
  // Si le nom est vide après nettoyage, retourner un nom par défaut
  return sanitized || 'untitled_document'
}

// Fonction pour afficher une notification
async function showNotification(title: string, message: string) {
  try {
    // Vérifier si les notifications sont autorisées
    const permission = await chrome.permissions.contains({
      permissions: ['notifications']
    })

    if (!permission) {
      return
    }

    // Vérifier si l'API est disponible
    if (typeof chrome.notifications === 'undefined') {
      return
    }

    // Créer un identifiant unique pour la notification
    const notificationId = `${title}-${message}`
    
    // Vérifier si la notification a déjà été affichée récemment
    if (notificationCooldown.has(notificationId)) {
      return
    }

    // Créer la notification
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icon128.png',
      title: title,
      message: message
    })

    // Ajouter à la liste des notifications récentes
    notificationCooldown.add(notificationId)
    
    // Supprimer après 5 secondes
    setTimeout(() => {
      notificationCooldown.delete(notificationId)
    }, 5000)
  } catch (error) {
    console.error("Error showing notification:", error instanceof Error ? error.message : 'Unknown error')
  }
}

// Fonction pour nettoyer le cache après un délai
function clearProcessingCache(url: string) {
  const timeout = processingTimeouts.get(url)
  if (timeout) {
    clearTimeout(timeout)
  }
  processingDownloads.delete(url)
  processingTimeouts.delete(url)
}

// Listen for downloads
chrome.downloads.onDeterminingFilename.addListener(
  (downloadItem, suggest) => {
    // Si ce n'est pas un PDF, on laisse Chrome gérer le téléchargement normalement
    if (!downloadItem.filename.toLowerCase().endsWith(".pdf")) {
      suggest({ filename: downloadItem.filename })
      return false
    }

    // Vérifier si ce téléchargement est déjà en cours de traitement
    if (processingDownloads.has(downloadItem.url)) {
      console.log("Download already being processed:", downloadItem.url)
      suggest({ filename: downloadItem.filename })
      return false
    }

    // Marquer le téléchargement comme en cours de traitement
    processingDownloads.add(downloadItem.url)
    
    // Ajouter un timeout pour nettoyer le cache en cas de problème
    processingTimeouts.set(downloadItem.url, setTimeout(() => {
      clearProcessingCache(downloadItem.url)
    }, 30000)) // 30 secondes de timeout
    
    // Afficher un indicateur de progression
    chrome.action.setBadgeText({ text: "..." })
    chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" })

    // Traiter le PDF de manière asynchrone
    downloadService.handleDownload(downloadItem)
      .then(suggestedTitle => {
        if (suggestedTitle) {
          const sanitizedTitle = sanitizeFilename(suggestedTitle)
          let newFilename = `${sanitizedTitle}.pdf`
          
          // Vérifier si le fichier existe déjà
          chrome.downloads.search({ filename: newFilename }, (existingFiles) => {
            if (existingFiles.length > 0) {
              // Si le fichier existe déjà, ajouter un suffixe numérique
              let counter = 1
              let uniqueFilename = newFilename
              while (existingFiles.some(file => file.filename === uniqueFilename)) {
                uniqueFilename = `${sanitizedTitle} (${counter}).pdf`
                counter++
              }
              newFilename = uniqueFilename
            }

            console.log("Suggesting new filename:", newFilename)
            
            // Suggérer le nouveau nom de fichier
            suggest({ 
              filename: newFilename,
              conflictAction: 'uniquify'
            })

            showNotification(
              'PDF Auto Rename - Success',
              `PDF will be saved as: ${newFilename}`
            )
          })
        } else {
          console.log("No title generated, using original filename")
          suggest({ filename: downloadItem.filename })
          showNotification(
            'PDF Auto Rename - Info',
            'Could not generate a new title. Using original filename.'
          )
        }
      })
      .catch(error => {
        console.error("Error processing download:", error instanceof Error ? error.message : 'Unknown error')
        suggest({ filename: downloadItem.filename })
        showNotification(
          'PDF Auto Rename - Error',
          'An error occurred while processing the PDF. Using original filename.'
        )
      })
      .finally(() => {
        chrome.action.setBadgeText({ text: "" })
        clearProcessingCache(downloadItem.url)
      })

    // Retourner true pour indiquer que nous allons appeler suggest de manière asynchrone
    return true
  }
)

// Listen for storage changes to reinitialize OpenAI client
chrome.storage.onChanged.addListener((changes) => {
  if (changes.apiKey) {
    console.log("API key changed, reinitializing OpenAI client")
    openAIService.initialize()
  }
})

// Initialize services on extension startup
initializeServices() 