"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface TrafficGeneratorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKey: string
  region: "com" | "eu"
}

export function TrafficGeneratorDialog({ open, onOpenChange, apiKey, region }: TrafficGeneratorDialogProps) {
  const [queries, setQueries] = useState("")
  const [count, setCount] = useState("50")
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!queries.trim()) {
      setError("Please enter at least one query")
      return
    }

    if (!apiKey) {
      setError("API key is required")
      return
    }

    const queryList = queries
      .split(",")
      .map((q) => q.trim())
      .filter((q) => q.length > 0)

    if (queryList.length === 0) {
      setError("Please enter valid queries")
      return
    }

    setIsGenerating(true)
    setError(null)
    setResults(null)
    setProgress(0)

    try {
      const countNum = Number.parseInt(count) || 50

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev
          return prev + 10
        })
      }, 500)

      const response = await fetch("/api/generate-traffic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey,
          queries: queryList,
          count: countNum,
          region,
        }),
      })

      clearInterval(progressInterval)
      setProgress(100)

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate traffic")
      }

      setResults(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReset = () => {
    setQueries("")
    setCount("50")
    setResults(null)
    setError(null)
    setProgress(0)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Autosuggest Traffic Generator</DialogTitle>
          <DialogDescription>
            Generate traffic to the /suggest endpoint to build up autosuggest data in Dynamic Yield. Enter
            comma-separated queries to simulate search traffic.
          </DialogDescription>
        </DialogHeader>

        {!results ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="queries">Search Queries (comma-separated)</Label>
              <Textarea
                id="queries"
                placeholder="red boots, blue jacket, summer dress, ..."
                value={queries}
                onChange={(e) => setQueries(e.target.value)}
                rows={6}
                disabled={isGenerating}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Enter multiple queries separated by commas. Each query will be sent to the suggest endpoint.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="count">Requests per Query</Label>
              <Input
                id="count"
                type="number"
                min="1"
                max="200"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">
                Number of times to call the suggest endpoint for each query (1-200).
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isGenerating && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Generating traffic...</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">Traffic generation completed successfully!</AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold">{results.total}</p>
                  <p className="text-xs text-muted-foreground">Total Requests</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{results.successful}</p>
                  <p className="text-xs text-muted-foreground">Successful</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{results.failed}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                <Label>Results by Query</Label>
                {results.queries.map((q: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                    <span className="font-medium truncate flex-1">{q.query}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-green-600">✓ {q.successful}</span>
                      {q.failed > 0 && <span className="text-red-600">✗ {q.failed}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {!results ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Traffic"
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleReset}>
                Generate More
              </Button>
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
