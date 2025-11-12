"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Code, Trash2, Copy, ChevronDown, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface JsonViewerProps {
  data: any
  title: string
}

function JsonTreeNode({ data, level = 0, isLast = true }: { data: any; level?: number; isLast?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(level < 2) // Auto-expand only first two levels

  // Handle primitive types
  if (data === null) return <span className="text-gray-500">null</span>
  if (data === undefined) return <span className="text-gray-500">undefined</span>
  if (typeof data === "string") {
    return <span className="text-green-600 break-all">{`"${data}"`}</span>
  }
  if (typeof data === "number") return <span className="text-blue-600">{data}</span>
  if (typeof data === "boolean") return <span className="text-purple-600">{data.toString()}</span>

  // Handle arrays
  if (Array.isArray(data)) {
    if (data.length === 0) return <span>[]</span>

    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-700 hover:bg-gray-100 rounded px-1 inline-flex items-center"
        >
          {isExpanded ? "[-]" : "[+]"} Array({data.length})
        </button>

        {isExpanded && (
          <div className="pl-4 border-l border-gray-200">
            {data.map((item, index) => (
              <div key={index} className="flex items-start">
                <span className="text-gray-400 mr-1 flex-shrink-0 w-6 text-right">{index}:</span>
                <div className="flex-1 min-w-0 max-w-full overflow-hidden">
                  <JsonTreeNode data={item} level={level + 1} isLast={index === data.length - 1} />
                  {index < data.length - 1 && <span className="text-gray-400">,</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Handle objects
  if (typeof data === "object") {
    const keys = Object.keys(data)
    if (keys.length === 0) return <span>{"{}"}</span>

    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-700 hover:bg-gray-100 rounded px-1 inline-flex items-center"
        >
          {isExpanded ? "[-]" : "[+]"} Object({keys.length})
        </button>

        {isExpanded && (
          <div className="pl-4 border-l border-gray-200">
            {keys.map((key, index) => (
              <div key={key} className="flex items-start">
                <span className="text-blue-800 mr-1 flex-shrink-0 break-all">{`"${key}":`}</span>
                <div className="flex-1 min-w-0 max-w-full overflow-hidden">
                  <JsonTreeNode data={data[key]} level={level + 1} isLast={index === keys.length - 1} />
                  {index < keys.length - 1 && <span className="text-gray-400">,</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return <span>{String(data)}</span>
}

function JsonViewer({ data, title }: JsonViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [viewMode, setViewMode] = useState<"tree" | "raw">("tree")

  const formattedJson = JSON.stringify(data, null, 2)

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedJson)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  return (
    <div className="border border-gray-200 rounded-lg">
      <div
        className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <h4 className="text-sm font-medium text-gray-700">{title}</h4>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded && (
            <div className="flex border border-gray-200 rounded-md mr-2">
              <Button
                variant={viewMode === "tree" ? "default" : "ghost"}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setViewMode("tree")
                }}
                className="h-6 text-xs rounded-r-none"
              >
                Tree
              </Button>
              <Button
                variant={viewMode === "raw" ? "default" : "ghost"}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setViewMode("raw")
                }}
                className="h-6 text-xs rounded-l-none"
              >
                Raw
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleCopy()
            }}
            className="h-6 w-6 p-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
          {copySuccess && <span className="text-xs text-green-600">Copied!</span>}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200">
          <div className="max-h-96 overflow-auto">
            {viewMode === "tree" ? (
              <div className="p-3 text-xs font-mono">
                <JsonTreeNode data={data} />
              </div>
            ) : (
              <pre className="p-3 text-xs overflow-auto whitespace-pre-wrap break-all bg-gray-50 max-w-full">
                {formattedJson}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface DebugLog {
  id: string
  timestamp: Date
  type: "search" | "engagement"
  method: string
  url: string
  body: any
  response?: any
}

interface DebugDrawerProps {
  logs: DebugLog[]
  onClearLogs: () => void
}

export function DebugDrawer({ logs, onClearLogs }: DebugDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<"all" | "search" | "engagement">("all")

  const toggleLogExpansion = (logId: string) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedLogs(newExpanded)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatJson = (obj: any) => {
    return JSON.stringify(obj, null, 2)
  }

  const filteredLogs = logs.filter((log) => {
    if (activeTab === "all") return log.type !== "search" || (log.type === "search" && log.response)
    return log.type === activeTab && (log.type !== "search" || (log.type === "search" && log.response))
  })

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen} modal={false}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
        >
          <Code className="h-4 w-4 mr-2" />
          Console ({logs.filter((log) => log.type !== "search" || (log.type === "search" && log.response)).length})
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[900px] max-w-[90vw] border-l border-gray-200 bg-white shadow-lg p-0"
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          height: "100vh",
          zIndex: 40,
        }}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="h-full flex flex-col">
          <SheetHeader className="border-b border-gray-200 p-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle>Console</SheetTitle>
                <SheetDescription>API requests and responses</SheetDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onClearLogs} className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Clear
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b mt-2">
              <button
                className={`px-4 py-2 text-sm font-medium ${activeTab === "all" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}
                onClick={() => setActiveTab("all")}
              >
                All
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${activeTab === "search" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}
                onClick={() => setActiveTab("search")}
              >
                Search
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${activeTab === "engagement" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}
                onClick={() => setActiveTab("engagement")}
              >
                Engagement
              </button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {filteredLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No API calls yet. Perform a search or click on products to see debug information.</p>
                  </div>
                ) : (
                  filteredLogs.map((log) => {
                    const isExpanded = expandedLogs.has(log.id)
                    return (
                      <Card key={log.id} className="border border-gray-200">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge
                                variant={log.type === "search" ? "default" : "secondary"}
                                className={
                                  log.type === "search" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                                }
                              >
                                {log.type.toUpperCase()}
                              </Badge>
                              <div>
                                <CardTitle className="text-sm font-medium">
                                  {log.method} {log.url.split("/").pop()}
                                </CardTitle>
                                <p className="text-xs text-gray-500">{log.timestamp.toLocaleTimeString()}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(formatJson(log.body))}
                                className="h-8 w-8 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleLogExpansion(log.id)}
                                className="h-8 w-8 p-0"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardHeader>

                        {isExpanded && (
                          <CardContent className="pt-0">
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-sm font-medium mb-2 text-gray-700">Request URL</h4>
                                <div className="flex items-center">
                                  <code className="text-xs bg-gray-100 p-2 rounded block break-all flex-1">
                                    {log.method} {log.url}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(log.url)}
                                    className="ml-2 h-6 w-6 p-0"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>

                              <JsonViewer data={log.body} title="Request Body" />

                              {log.response && <JsonViewer data={log.response} title="Response" />}

                              {log.type === "search" && (
                                <div className="bg-blue-50 p-3 rounded">
                                  <h4 className="text-sm font-medium mb-2 text-blue-800">Search API Guide</h4>
                                  <ul className="text-xs text-blue-700 space-y-1">
                                    <li>
                                      • <strong>query.text:</strong> The search term
                                    </li>
                                    <li>
                                      • <strong>query.filters:</strong> Applied facet filters
                                    </li>
                                    <li>
                                      • <strong>query.pagination:</strong> Page offset and items per page
                                    </li>
                                    <li>
                                      • <strong>query.sortBy:</strong> Sort field and order
                                    </li>
                                  </ul>
                                </div>
                              )}

                              {log.type === "engagement" && (
                                <div className="bg-green-50 p-3 rounded">
                                  <h4 className="text-sm font-medium mb-2 text-green-800">Engagement API Guide</h4>
                                  <ul className="text-xs text-green-700 space-y-1">
                                    <li>
                                      • <strong>engagements.type:</strong> Type of interaction (SLOT_CLICK)
                                    </li>
                                    <li>
                                      • <strong>engagements.slotId:</strong> Unique identifier for the clicked item
                                    </li>
                                    <li>
                                      • <strong>user.dyid_server:</strong> Server-side user identifier
                                    </li>
                                    <li>
                                      • <strong>session.dy:</strong> Session identifier for tracking
                                    </li>
                                  </ul>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
