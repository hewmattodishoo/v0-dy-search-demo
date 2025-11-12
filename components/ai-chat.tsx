"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, Bot } from "lucide-react"

interface AIChatProps {
  chatHistory: Array<{ type: "user" | "assistant"; message: string; timestamp: Date }>
  contextProducts?: Array<{ messageIndex: number; product: any }>
  onSendMessage: (message: string) => void
  loading: boolean
  onClose: () => void
}

export function AIChat({ chatHistory, contextProducts = [], onSendMessage, loading, onClose }: AIChatProps) {
  const [message, setMessage] = useState("")
  const chatContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Scroll to bottom when chat history changes
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatHistory])

  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(message)
      setMessage("")
    }
  }

  // Find the first assistant message to show context product
  const firstAssistantMessageIndex = chatHistory.findIndex((item) => item.type === "assistant")

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 flex items-center justify-center">
        <h2 className="text-lg font-semibold">AI Assistant</h2>
      </div>

      <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4">
        {chatHistory.length === 0 && !loading ? (
          <div className="text-center text-gray-500 py-8">
            <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : null}

        {loading && chatHistory.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm">Thinking</span>
              <div className="flex gap-1">
                <div
                  className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {chatHistory.map((item, index) => (
          <div key={index} className={`flex ${item.type === "user" ? "justify-end" : "justify-start"}`}>
            <div className="flex items-start space-x-2 max-w-[80%]">
              {item.type === "assistant" && (
                <Avatar className="h-6 w-6">
                  <AvatarImage src="/bot.png" />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
              )}
              <div className="space-y-3">
                {/* Context Product Display - show for assistant messages that have a context product */}
                {item.type === "assistant" && contextProducts.find((cp) => cp.messageIndex === index) && (
                  <div className="bg-white border rounded-lg p-3 shadow-sm">
                    <p className="text-xs text-gray-600 mb-2">Showing matching styles to:</p>
                    <div className="flex items-center space-x-3">
                      <div className="w-16 h-20 flex-shrink-0">
                        <img
                          src={
                            contextProducts.find((cp) => cp.messageIndex === index)?.product.image || "/placeholder.svg"
                          }
                          alt={contextProducts.find((cp) => cp.messageIndex === index)?.product.name}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          {contextProducts.find((cp) => cp.messageIndex === index)?.product.brand}
                        </p>
                        <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                          {contextProducts.find((cp) => cp.messageIndex === index)?.product.name}
                        </h4>
                        <p className="font-semibold text-sm">
                          ${contextProducts.find((cp) => cp.messageIndex === index)?.product.price}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div
                  className={`rounded-lg p-3 text-sm ${
                    item.type === "user" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                  } ${
                    item.type === "user" && item.message.includes("Please help me find a total look for this item:")
                      ? "hidden"
                      : ""
                  }`}
                >
                  {item.message}
                </div>
              </div>
            </div>
          </div>
        ))}

        {loading && chatHistory.length > 0 && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2 max-w-[80%]">
              <Avatar className="h-6 w-6">
                <AvatarImage src="/bot.png" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
              <div className="rounded-lg p-3 text-sm bg-gray-100 text-gray-800">Thinking...</div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSendMessage()
              }
            }}
            className="flex-1 text-sm"
          />
          <Button onClick={handleSendMessage} disabled={loading} className="h-9">
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
