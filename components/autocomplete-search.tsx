"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, X, TrendingUp } from "lucide-react"
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
}

export function AutocompleteSearch({
  onSearch,
  placeholder = "Search products...",
  className,
  apiKey,
  region = "com",
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
      if (!apiKey) {
        console.log("No API key provided")
        return
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      try {
        setIsLoading(true)

        console.log("=== FETCHING SUGGESTIONS ===")
        console.log("Search text:", searchText || "(empty)")

        const response = await fetch("/api/autocomplete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            apiKey,
            searchText,
            maxResults: 8,
            region,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          console.error("Autocomplete API error:", response.status)
          setSuggestions([])
          setShowDropdown(false)
          return
        }

        const data = await response.json()
        console.log("=== API RESPONSE ===")
        console.log(JSON.stringify(data, null, 2))

        const newSuggestions = data?.data?.suggestions || []

        console.log("=== EXTRACTED SUGGESTIONS ===")
        console.log("Count:", newSuggestions.length)
        console.log("Suggestions:", newSuggestions)

        setSuggestions(newSuggestions)

        if (newSuggestions.length > 0) {
          console.log("✅ Setting showDropdown to TRUE")
          setShowDropdown(true)
        } else {
          console.log("❌ No suggestions - showDropdown stays FALSE")
          setShowDropdown(false)
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Autocomplete fetch error:", error)
        }
        setSuggestions([])
        setShowDropdown(false)
      } finally {
        setIsLoading(false)
      }
    },
    [apiKey, region],
  )

  // Handle input change with debouncing
  useEffect(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current)
    }

    // Only fetch if 3+ characters
    if (query.length >= 3) {
      fetchTimeoutRef.current = setTimeout(() => {
        fetchSuggestions(query)
      }, 300)
    } else if (query.length === 0) {
      // On empty, clear immediately
      setSuggestions([])
      setShowDropdown(false)
    } else {
      // For 1-2 characters, clear suggestions
      setSuggestions([])
      setShowDropdown(false)
    }

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
    }
  }, [query, fetchSuggestions])

  // Handle input focus - fetch initial suggestions
  const handleFocus = () => {
    if (query.length === 0) {
      fetchSuggestions("")
    } else if (query.length >= 3 && suggestions.length > 0) {
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
    onSearch(text)
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
    if (!searchQuery || searchQuery.length < 3) {
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

  console.log("🎨 RENDER - showDropdown:", showDropdown, "suggestions.length:", suggestions.length)

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

      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-[9999] mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="max-h-[300px] overflow-y-auto py-1">
            {query.length === 0 && (
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" />
                Trending
              </div>
            )}
            {suggestions.map((suggestion, index) => (
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
                {query.length === 0 ? (
                  <TrendingUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
                {highlightMatch(suggestion.text, query)}
              </button>
            ))}
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
