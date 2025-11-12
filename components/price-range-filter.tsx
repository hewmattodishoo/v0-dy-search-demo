"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PriceRangeFilterProps {
  min: number
  max: number
  selectedMin: number
  selectedMax: number
  onPriceChange: (min: number, max: number) => void
}

export function PriceRangeFilter({ min, max, selectedMin, selectedMax, onPriceChange }: PriceRangeFilterProps) {
  const [localMin, setLocalMin] = useState(selectedMin)
  const [localMax, setLocalMax] = useState(selectedMax)

  useEffect(() => {
    setLocalMin(selectedMin)
    setLocalMax(selectedMax)
  }, [selectedMin, selectedMax])

  const handleApply = () => {
    onPriceChange(localMin, localMax)
  }

  const handleReset = () => {
    setLocalMin(min)
    setLocalMax(max)
    onPriceChange(min, max)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="min-price" className="text-xs">
            Min
          </Label>
          <Input
            id="min-price"
            type="number"
            value={localMin}
            onChange={(e) => setLocalMin(Number(e.target.value))}
            min={min}
            max={max}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="max-price" className="text-xs">
            Max
          </Label>
          <Input
            id="max-price"
            type="number"
            value={localMax}
            onChange={(e) => setLocalMax(Number(e.target.value))}
            min={min}
            max={max}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleApply} size="sm" className="flex-1 h-8 text-xs">
          Apply
        </Button>
        <Button onClick={handleReset} variant="outline" size="sm" className="flex-1 h-8 text-xs">
          Reset
        </Button>
      </div>
    </div>
  )
}
