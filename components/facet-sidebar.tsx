"use client"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { DYFacet, SearchFilters } from "../types/api"
import { PriceRangeFilter } from "./price-range-filter"

// Add setPriceRange prop to the interface
interface FacetSidebarProps {
  facets: DYFacet[]
  filters: SearchFilters
  expandedFacets: { [key: string]: boolean }
  onToggleFacet: (field: string, value: string) => void
  onToggleExpansion: (field: string) => void
  setPriceRange?: (min: number, max: number) => void
  priceBounds?: [number, number]
  priceFrom?: number
  priceTo?: number
}

export function FacetSidebar({
  facets,
  filters,
  expandedFacets,
  onToggleFacet,
  onToggleExpansion,
  setPriceRange,
  priceBounds,
  priceFrom,
  priceTo,
}: FacetSidebarProps) {
  if (facets.length === 0) return null

  return (
    <aside className="w-64 flex-none space-y-4">
      

      {facets.map((facet) => {
        const isExpanded = expandedFacets[facet.column]
        const selectedValues = filters[facet.column] || new Set()

        return (
          <div key={facet.column} className="border-b border-gray-200 pb-4">
            <button
              onClick={() => onToggleExpansion(facet.column)}
              className="flex items-center justify-between w-full py-2 text-left hover:text-gray-600"
            >
              <span className="font-medium text-sm">{facet.displayName}</span>
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>

            {isExpanded && (
              <div className="mt-2">
                {facet.column === "price" && facet.min !== undefined && facet.max !== undefined && setPriceRange ? (
                  <PriceRangeFilter
                    min={priceBounds?.[0] || facet.min}
                    max={priceBounds?.[1] || facet.max}
                    selectedMin={priceFrom || facet.min}
                    selectedMax={priceTo || facet.max}
                    onPriceChange={setPriceRange}
                  />
                ) : facet.values ? (
                  <div className="space-y-2">
                    {facet.values.slice(0, 10).map((value) => (
                      <div key={value.name} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${facet.column}-${value.name}`}
                          checked={selectedValues.has(value.name)}
                          onCheckedChange={() => onToggleFacet(facet.column, value.name)}
                        />
                        <label
                          htmlFor={`${facet.column}-${value.name}`}
                          className="text-sm cursor-pointer flex-1 flex items-center justify-between"
                        >
                          <span>{value.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {value.count}
                          </Badge>
                        </label>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )
      })}
    </aside>
  )
}
