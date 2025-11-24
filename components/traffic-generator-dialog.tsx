"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Loader2, Zap } from "lucide-react"

interface TrafficGeneratorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKey: string
  region: string
}

export function TrafficGeneratorDialog({ open, onOpenChange, apiKey, region }: TrafficGeneratorDialogProps) {
  const [queries, setQueries] = useState("")
  const [countPerQuery, setCountPerQuery] = useState(50)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<{
    total: number
    successful: number
    failed: number
    details: any[]
  } | null>(null)

  const handleGenerate = async () => {
    if (!queries.trim()) {
      alert("Please enter at least one query")
      return
    }

    if (!apiKey) {
      alert("API key is required")
      return
    }

    setIsGenerating(true)
    setProgress(0)
    setResults(null)

    // Parse comma-separated queries
    const queryList = queries
      .split(",")
      .map((q) => q.trim())
      .filter((q) => q)
      .map((term) => ({
        term,
        count: countPerQuery,
      }))

    try {
      const response = await fetch("/api/generate-traffic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          queries: queryList,
          apiKey,
          region,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate traffic")
      }

      setResults(data)
      setProgress(100)
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReset = () => {
    setQueries("")
    setCountPerQuery(50)
    setProgress(0)
    setResults(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Autosuggest Traffic Generator
          </DialogTitle>
          <DialogDescription>
            Generate traffic to the autosuggest endpoint to train Dynamic Yield&apos;s autosuggest feature. Enter
            comma-separated queries below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="queries">Search Queries (comma-separated)</Label>
            <Textarea
              id="queries"
              placeholder="red long boots, black women dress, blue denim jacket..."
              value={queries}
              onChange={(e) => setQueries(e.target.value)}
              rows={6}
              disabled={isGenerating}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Enter multiple queries separated by commas. Each query will be sent {countPerQuery} times.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="count">Requests per Query</Label>
            <Input
              id="count"
              type="number"
              min={1}
              max={500}
              value={countPerQuery}
              onChange={(e) => setCountPerQuery(Number(e.target.value))}
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">Number of times each query will be sent (1-500)</p>
          </div>

          {isGenerating && (
            <div className="space-y-2">
              <Label>Progress</Label>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating traffic... This may take a few minutes.
              </p>
            </div>
          )}

          {results && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <h4 className="font-semibold text-sm">Results</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Requests</p>
                  <p className="text-2xl font-bold">{results.total}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Successful</p>
                  <p className="text-2xl font-bold text-green-600">{results.successful}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{results.failed}</p>
                </div>
              </div>
              {results.details.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-2">Errors:</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {results.details.slice(0, 10).map((detail, i) => (
                      <p key={i} className="text-xs font-mono bg-background rounded px-2 py-1">
                        {detail.term} (#{detail.iteration}): {detail.error}
                      </p>
                    ))}
                    {results.details.length > 10 && (
                      <p className="text-xs text-muted-foreground">... and {results.details.length - 10} more errors</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2">
          <Button variant="outline" onClick={handleReset} disabled={isGenerating}>
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
              Close
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating || !queries.trim()}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Traffic
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
