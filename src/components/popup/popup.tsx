import { useState, useEffect } from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert"
import { Loader2, Check, Bell, BellOff } from "lucide-react"
import { Switch } from "../ui/switch"

export function Popup() {
  const [apiKey, setApiKey] = useState("")
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false)

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await chrome.storage.sync.get(['apiKey', 'notificationsEnabled'])
      setApiKey(settings.apiKey || '')
      setNotificationsEnabled(settings.notificationsEnabled === 'true')
    }
    loadSettings()
  }, [])

  const saveApiKey = async () => {
    await chrome.storage.sync.set({ apiKey })
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  const handleToggleNotifications = async () => {
    const newValue = !notificationsEnabled
    setNotificationsEnabled(newValue)
    await chrome.storage.sync.set({ notificationsEnabled: newValue.toString() })
  }

  const testApiKey = async () => {
    setIsLoading(true)
    setIsValid(null)
    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })
      setIsValid(response.ok)
    } catch (error) {
      setIsValid(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-[400px] p-6 bg-background">
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="debug">Debug</TabsTrigger>
        </TabsList>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>OpenAI API Key</CardTitle>
              <CardDescription>
                Enter your OpenAI API key to enable PDF auto-renaming functionality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  type="password"
                  placeholder="Enter your OpenAI API key"
                  value={apiKey}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
                  className="w-full"
                />
                <Button 
                  onClick={saveApiKey} 
                  className="w-full transition-all duration-200"
                  variant={isSaved ? "secondary" : "default"}
                >
                  {isSaved ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Saved!
                    </>
                  ) : (
                    "Save API Key"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Enable or disable notifications for PDF renaming events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {notificationsEnabled ? (
                    <Bell className="h-5 w-5 text-green-500" />
                  ) : (
                    <BellOff className="h-5 w-5 text-gray-500" />
                  )}
                  <span>Enable Notifications</span>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={handleToggleNotifications}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debug">
          <Card>
            <CardHeader>
              <CardTitle>Debug Tools</CardTitle>
              <CardDescription>
                Test your API key and check the extension status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  onClick={testApiKey}
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test API Key"
                  )}
                </Button>
                {isValid !== null && (
                  <Alert variant={isValid ? "default" : "destructive"}>
                    <AlertTitle className={isValid ? "text-green-600" : "text-red-600"}>
                      {isValid ? "Success" : "Error"}
                    </AlertTitle>
                    <AlertDescription className={isValid ? "text-green-600" : "text-red-600"}>
                      {isValid ? "API Key is valid" : "API Key is invalid"}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 