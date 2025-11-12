"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface Suggestion {
  text: string
}

interface AutocompleteSearchProps {
  onSearch: (query: string) => void
  placeholder?: string
  className?: string
  apiKey: string
  region?: string
  disabled?: boolean // Add disabled prop to disable autocomplete when visual search is active
}

export function AutocompleteSearch({
  onSearch,
  placeholder = "Search products...",
  className,
  apiKey,
  region = "com",
  disabled = false, // Add disabled prop
}: AutocompleteSearchProps) {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const fetchTimeoutRef = useRef<NodeJS.Timeout>()
  const abortControllerRef = useRef<AbortController | null>(null)

  // Fetch suggestions via API route
  const fetchSuggestions = useCallback(
    async (searchText: string) => {
      if (!apiKey || disabled) {
        console.log("[v0] Autocomplete disabled or no API key")
        return
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      try {
        setIsLoading(true)

        console.log("[v0] === FETCHING SUGGESTIONS ===")
        console.log("[v0] Search text:", searchText || "(empty)")

        const response = await fetch("/api/autocomplete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            apiKey,
            searchText,
            maxResults: 10,
            region,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          console.error("[v0] Autocomplete API error:", response.status)
          setSuggestions([])
          setShowDropdown(true)
          return
        }

        const data = await response.json()
        console.log("[v0] === API RESPONSE ===")
        console.log("[v0]", JSON.stringify(data, null, 2))

        const newSuggestions = data?.data?.suggestions || []

        console.log("[v0] === EXTRACTED SUGGESTIONS ===")
        console.log("[v0] Count:", newSuggestions.length)
        console.log("[v0] Suggestions:", newSuggestions)

        setSuggestions(newSuggestions)
        setShowDropdown(true)
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("[v0] Autocomplete fetch error:", error)
        }
        setSuggestions([])
        setShowDropdown(true)
      } finally {
        setIsLoading(false)
      }
    },
    [apiKey, region, disabled],
  )

  useEffect(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current)
    }

    if (disabled) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    if (query.length >= 2) {
      fetchTimeoutRef.current = setTimeout(() => {
        fetchSuggestions(query)
      }, 300)
    } else {
      setSuggestions([])
      setShowDropdown(false)
    }

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
    }
  }, [query, fetchSuggestions, disabled])

  // Handle input focus - fetch initial suggestions
  const handleFocus = () => {
    if (disabled) return // Don't show dropdown if disabled

    if (query.length === 0) {
      fetchSuggestions("")
    } else if (query.length >= 2 && suggestions.length > 0) {
      setShowDropdown(true)
    }
  }

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault()
        handleSearch()
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case "Enter":
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex].text)
        } else {
          handleSearch()
        }
        break
      case "Escape":
        setShowDropdown(false)
        setSelectedIndex(-1)
        break
    }
  }

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query.trim())
      setShowDropdown(false)
      setSelectedIndex(-1)
    }
  }

  const handleSuggestionClick = (text: string) => {
    setQuery(text)
    onSearch(text) // Immediately perform the search
    setShowDropdown(false)
    setSelectedIndex(-1)
  }

  const handleClear = () => {
    setQuery("")
    setSuggestions([])
    setShowDropdown(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  // Highlight matching text
  const highlightMatch = (text: string, searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      return <span className="text-gray-700">{text}</span>
    }

    const parts = text.split(new RegExp(`(${searchQuery})`, "gi"))
    return (
      <span className="text-gray-700">
        {parts.map((part, index) =>
          part.toLowerCase() === searchQuery.toLowerCase() ? (
            <span key={index} className="font-semibold text-black">
              {part}
            </span>
          ) : (
            <span key={index}>{part}</span>
          ),
        )}
      </span>
    )
  }

  console.log(
    "[v0] 🎨 RENDER - showDropdown:",
    showDropdown,
    "suggestions.length:",
    suggestions.length,
    "disabled:",
    disabled,
  )

  return (
    <div ref={dropdownRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="w-full pl-10 pr-10"
          disabled={disabled} // Disable input when visual search is active
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!disabled && showDropdown && query.length >= 2 && (
        <div className="absolute z-[9999] mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="max-h-[300px] overflow-y-auto py-1">
            {suggestions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">autocomplete suggestions</div>
            ) : (
              suggestions.slice(0, 10).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors",
                    "hover:bg-gray-50",
                    selectedIndex === index && "bg-gray-100",
                  )}
                >
                  <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  {highlightMatch(suggestion.text, query)}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
        </div>
      )}
    </div>
  )
}
