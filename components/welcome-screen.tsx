"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Plus } from "lucide-react"
import { VisualSearchUpload } from "./visual-search-upload"
import { useSearchParams } from "next/navigation"
import type { ApiRegion } from "../utils/api-urls"

interface WelcomeScreenProps {
  onSearch: (query: string, mode?: string) => void
  onVisualSearch: (base64: string) => void
  onAISearch: (query: string, mode?: string) => void
  credentials: {
    apiKey: string
    dyid: string
    locale: string
    region?: ApiRegion
    currencySymbol?: string
  }
  onCredentialsChange: (credentials: any) => void
  presets: { [key: string]: string }
  preset: string
  debugMode: boolean
  onDebugModeChange: (enabled: boolean) => void
  aiTriggerWords?: string[]
  onAITriggerWordsChange?: (words: string[]) => void
  quickActions?: string[]
  onQuickActionsChange?: (actions: string[]) => void
  horizontalDisplayMode?: boolean
  onHorizontalDisplayModeChange?: (enabled: boolean) => void
}

export function WelcomeScreen({
  onSearch,
  onVisualSearch,
  onAISearch,
  credentials,
  onCredentialsChange,
  presets,
  preset,
  debugMode,
  onDebugModeChange,
  aiTriggerWords,
  onAITriggerWordsChange,
  quickActions = [
    "Bag",
    "Shirt Dress",
    "Wallet",
    "Shoulder bag",
    "How to dress for a party?",
    "I want to dress like Dua Lipa",
    "A wardrobe of dresses in different styles",
  ],
  onQuickActionsChange,
  horizontalDisplayMode = false,
  onHorizontalDisplayModeChange,
}: WelcomeScreenProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showSettings, setShowSettings] = useState(false)
  const [searchMode, setSearchMode] = useState("auto")
  const [tempCredentials, setTempCredentials] = useState(credentials)
  const [tempTriggerWords, setTempTriggerWords] = useState((aiTriggerWords || []).join(", "))
  const [tempQuickActions, setTempQuickActions] = useState((quickActions || []).join(", "))
  const [tempHorizontalDisplayMode, setTempHorizontalDisplayMode] = useState(horizontalDisplayMode)

  const searchParams = useSearchParams()
  const isDemoMode = searchParams.get("mode") === "demo"

  // Update tempCredentials when credentials prop changes
  useEffect(() => {
    setTempCredentials(credentials)
  }, [credentials])

  // Update tempTriggerWords when aiTriggerWords prop changes
  useEffect(() => {
    setTempTriggerWords((aiTriggerWords || []).join(", "))
  }, [aiTriggerWords])

  // Update tempQuickActions when quickActions prop changes
  useEffect(() => {
    setTempQuickActions((quickActions || []).join(", "))
  }, [quickActions])

  // Update tempHorizontalDisplayMode when horizontalDisplayMode prop changes
  useEffect(() => {
    setTempHorizontalDisplayMode(horizontalDisplayMode)
  }, [horizontalDisplayMode])

  const handleSearch = () => {
    if (searchQuery.trim()) {
      if (searchMode === "discover") {
        onSearch(searchQuery, "semantic")
      } else if (searchMode === "assistant") {
        onAISearch(searchQuery, "assistant")
      } else {
        // Auto mode - use existing logic with trigger word detection
        onSearch(searchQuery, "hybrid")
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const handleQuickAction = (query: string) => {
    setSearchQuery(query)
    if (searchMode === "discover") {
      onSearch(query, "semantic")
    } else if (searchMode === "assistant") {
      onAISearch(query, "assistant")
    } else {
      // Auto mode - use existing logic with trigger word detection
      onSearch(query, "hybrid")
    }
  }

  const quickActionsList = quickActions

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden md:flex min-h-screen w-full flex-col items-center justify-center bg-gray-50 px-8">
        {/* Settings Button */}
        {!isDemoMode && (
          <div className="fixed top-6 right-6 z-50">
            <Button
              variant="ghost"
              onClick={() => setShowSettings(!showSettings)}
              className="h-10 w-10 p-0 hover:bg-gray-100 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full shadow-sm"
              size="sm"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        )}

        <div className="w-full max-w-3xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="font-normal text-gray-800 mb-8 text-4xl text-left">Are you ready to experience search?</h1>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-12"
          >
            <div className="relative bg-white rounded-3xl shadow-lg border-gray-200 p-4 border-2 pb-4">
              {/* Search Input on top */}
              <div className="w-full mb-3">
                <Input
                  placeholder="Search anything, anyway..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyPress}
                  autoFocus
                  className="border-0 bg-transparent text-lg placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 w-full"
                  style={{ fontSize: "18px" }}
                />
              </div>

              {/* Controls below */}
              <div className="flex items-center gap-4">
                {/* Mode Selector with Copilot-style icon */}
                <div className="flex items-center gap-3">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="flex-shrink-0"
                  >
                    <g clipPath="url(#clip0_4082_5186)" id="cap-search-svg-bg">
                      <path
                        d="M11.6757 9.81054C8.73958 9.81054 6.35089 7.42177 6.35089 4.48562C6.35089 2.62899 7.30664 0.992133 8.75134 0.0388074C8.50309 0.0155936 8.25193 0.00238037 7.99762 0.00238037C3.58066 0.00238037 0 3.58304 0 8C0 12.417 3.58066 15.9976 7.99762 15.9976C12.4146 15.9976 15.9952 12.417 15.9952 8C15.9952 7.86848 15.9916 7.73782 15.9853 7.60785C15.0166 8.94122 13.4462 9.81054 11.6757 9.81054Z"
                        fill="black"
                      ></path>
                      <path
                        id="cap-search-svg-circle"
                        d="M11.6757 0.161346C11.2226 0.161346 10.7857 0.231773 10.3749 0.361649C8.62429 0.915114 7.35156 2.55436 7.35156 4.48561C7.35156 6.87003 9.29141 8.80988 11.6757 8.80988C13.5373 8.80988 15.1277 7.62753 15.7358 5.97437C15.9066 5.51 16 5.00851 16 4.48561C16 2.10119 14.0602 0.161346 11.6757 0.161346Z"
                        fill="#FFC61E"
                      ></path>
                    </g>
                    <defs>
                      <clipPath id="clip0_4082_5186">
                        <rect width="16" height="16" fill="white"></rect>
                      </clipPath>
                    </defs>
                  </svg>
                  <Select value={searchMode} onValueChange={setSearchMode}>
                    <SelectTrigger className="border-0 bg-transparent hover:bg-gray-50 min-w-[120px] font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Hybrid</SelectItem>
                      <SelectItem value="discover">Semantic</SelectItem>
                      <SelectItem value="assistant">Shopping Muse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Action Icons */}
                <div className="flex items-center gap-2 ml-auto">
                  <VisualSearchUpload
                    onImageUpload={onVisualSearch}
                    className="h-10 w-10 p-0 rounded-full hover:bg-gray-100 overflow-hidden flex items-center justify-center"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions Grid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex flex-wrap gap-3 text-left flex-row justify-center"
          >
            {quickActionsList.slice(0, 8).map((action, index) => (
              <motion.div
                key={action}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
              >
                <Button
                  variant="outline"
                  onClick={() => handleQuickAction(action)}
                  className="h-12 bg-white hover:bg-gray-50 border-gray-200 rounded-2xl text-sm font-normal text-gray-700 px-6 whitespace-nowrap"
                >
                  {action}
                </Button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden min-h-screen w-full flex flex-col bg-gray-50">
        {/* Settings Button */}
        {!isDemoMode && (
          <div className="fixed top-4 right-4 z-50">
            <Button
              variant="ghost"
              onClick={() => setShowSettings(!showSettings)}
              className="h-10 w-10 p-0 hover:bg-gray-100 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full shadow-sm"
              size="sm"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="flex-1 flex flex-col justify-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h1 className="text-4xl font-normal text-gray-800 leading-tight">Hey, what's on your mind today?</h1>
          </motion.div>

          {/* Quick Actions - Mobile Top */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="flex flex-wrap justify-center gap-3 mb-8"
          >
            {quickActionsList.slice(0, 6).map((action, index) => (
              <motion.div
                key={action}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1, duration: 0.4 }}
              >
                <Button
                  variant="outline"
                  onClick={() => handleQuickAction(action)}
                  className="h-12 bg-white hover:bg-gray-50 border-gray-200 rounded-2xl text-sm font-normal text-gray-700 px-4 whitespace-nowrap"
                >
                  <span className="truncate">{action}</span>
                </Button>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Search Bar - Mobile Bottom */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="p-6 pb-8"
        >
          <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-4">
            {/* Search Input on top */}
            <div className="w-full mb-3">
              <Input
                placeholder="Ask anything"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyPress}
                autoFocus
                className="border-0 bg-transparent text-base placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 w-full"
                style={{ fontSize: "16px" }}
              />
            </div>

            {/* Controls below */}
            <div className="flex items-center gap-3">
              {/* Mode Selector with Copilot-style icon */}
              <div className="flex items-center gap-2">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="flex-shrink-0"
                >
                  <g clipPath="url(#clip0_4082_5186_mobile)" id="cap-search-svg-bg">
                    <path
                      d="M11.6757 9.81054C8.73958 9.81054 6.35089 7.42177 6.35089 4.48562C6.35089 2.62899 7.30664 0.992133 8.75134 0.0388074C8.50309 0.0155936 8.25193 0.00238037 7.99762 0.00238037C3.58066 0.00238037 0 3.58304 0 8C0 12.417 3.58066 15.9976 7.99762 15.9976C12.4146 15.9976 15.9952 12.417 15.9952 8C15.9952 7.86848 15.9916 7.73782 15.9853 7.60785C15.0166 8.94122 13.4462 9.81054 11.6757 9.81054Z"
                      fill="black"
                    ></path>
                    <path
                      id="cap-search-svg-circle"
                      d="M11.6757 0.161346C11.2226 0.161346 10.7857 0.231773 10.3749 0.361649C8.62429 0.915114 7.35156 2.55436 7.35156 4.48561C7.35156 6.87003 9.29141 8.80988 11.6757 8.80988C13.5373 8.80988 15.1277 7.62753 15.7358 5.97437C15.9066 5.51 16 5.00851 16 4.48561C16 2.10119 14.0602 0.161346 11.6757 0.161346Z"
                      fill="#FFC61E"
                    ></path>
                  </g>
                  <defs>
                    <clipPath id="clip0_4082_5186_mobile">
                      <rect width="16" height="16" fill="white"></rect>
                    </clipPath>
                  </defs>
                </svg>
                <Select value={searchMode} onValueChange={setSearchMode}>
                  <SelectTrigger className="border-0 bg-transparent hover:bg-gray-50 min-w-[100px] text-sm font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="discover">Discover</SelectItem>
                    <SelectItem value="assistant">Search Assistant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-1 ml-auto">
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full hover:bg-gray-100">
                  <Plus className="h-4 w-4 text-gray-500" />
                </Button>
                <VisualSearchUpload
                  onImageUpload={onVisualSearch}
                  className="h-9 w-9 p-0 rounded-full hover:bg-gray-100 overflow-hidden flex items-center justify-center"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <Card className="w-full max-w-md max-h-[80vh] overflow-y-auto">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">API Settings</h3>
                  <Button variant="ghost" onClick={() => setShowSettings(false)} className="h-8 w-8 p-0">
                    ×
                  </Button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-600">REGION</label>
                    <Select
                      value={tempCredentials.region || "com"}
                      onValueChange={(value: ApiRegion) => setTempCredentials({ ...tempCredentials, region: value })}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="com">US (.com)</SelectItem>
                        <SelectItem value="eu">Europe (.eu)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-600">API KEY</label>
                    <Input
                      value={tempCredentials.apiKey || ""}
                      onChange={(e) => setTempCredentials({ ...tempCredentials, apiKey: e.target.value })}
                      className="text-sm"
                      placeholder="Enter your API key"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-600">LOCALE</label>
                    <Input
                      value={tempCredentials.locale || ""}
                      onChange={(e) => setTempCredentials({ ...tempCredentials, locale: e.target.value })}
                      className="text-sm"
                      placeholder="e.g en_US"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-600">CURRENCY SYMBOL</label>
                    <Input
                      value={tempCredentials.currencySymbol || "$"}
                      onChange={(e) => setTempCredentials({ ...tempCredentials, currencySymbol: e.target.value })}
                      className="text-sm"
                      placeholder="$"
                      maxLength={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Symbol displayed before product prices (e.g. $, €, £, ¥)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-600">DEV MODE</label>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Enable developer tools and debug console</span>
                      <div
                        className="relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-gray-200 data-[state=checked]:bg-blue-600"
                        data-state={debugMode ? "checked" : "unchecked"}
                        onClick={() => onDebugModeChange(!debugMode)}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            debugMode ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-600">HORIZONTAL WIDGET DISPLAY</label>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Display all AI widgets in a single horizontal line</span>
                      <div
                        className="relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-gray-200 data-[state=checked]:bg-blue-600"
                        data-state={tempHorizontalDisplayMode ? "checked" : "unchecked"}
                        onClick={() => setTempHorizontalDisplayMode(!tempHorizontalDisplayMode)}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            tempHorizontalDisplayMode ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-600">AI TRIGGER WORDS</label>
                    <Textarea
                      value={tempTriggerWords}
                      onChange={(e) => setTempTriggerWords(e.target.value)}
                      className="text-sm h-24"
                      placeholder="Enter comma-separated words that trigger AI mode..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Words or phrases that automatically enable AI mode when detected in search queries
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-600">QUICK ACTIONS</label>
                    <Textarea
                      value={tempQuickActions}
                      onChange={(e) => setTempQuickActions(e.target.value)}
                      className="text-sm h-24"
                      placeholder="Enter comma-separated quick action suggestions..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Quick action chips displayed on the welcome screen for easy access
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => {
                        const wordsArray = tempTriggerWords
                          .split(",")
                          .map((word) => word.trim())
                          .filter((word) => word.length > 0)

                        const actionsArray = tempQuickActions
                          .split(",")
                          .map((action) => action.trim())
                          .filter((action) => action.length > 0)

                        onCredentialsChange(tempCredentials)
                        if (onAITriggerWordsChange) {
                          onAITriggerWordsChange(wordsArray)
                        }
                        if (onQuickActionsChange) {
                          onQuickActionsChange(actionsArray)
                        }
                        if (onHorizontalDisplayModeChange) {
                          onHorizontalDisplayModeChange(tempHorizontalDisplayMode)
                        }
                        setShowSettings(false)
                      }}
                      className="flex-1"
                    >
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTempCredentials(credentials)
                        setTempTriggerWords((aiTriggerWords || []).join(", "))
                        setTempQuickActions((quickActions || []).join(", "))
                        setTempHorizontalDisplayMode(horizontalDisplayMode)
                        setShowSettings(false)
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </>
  )
}
