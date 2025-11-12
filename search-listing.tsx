"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Heart, ChevronLeft, ChevronRight, Grid3X3, List, Search } from "lucide-react"
import Image from "next/image"
import { useDYSearch } from "./hooks/useDYSearch"
import { WelcomeScreen } from "./components/welcome-screen"
import { LoadingSpinner } from "./components/loading-spinner"
import { sendEngagement } from "./utils/engagement"
import { FacetSidebar } from "./components/facet-sidebar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AutocompleteSearch } from "./components/autocomplete-search"
import { VisualSearchUpload } from "./components/visual-search-upload" // Assuming this is the component for visual search upload

export default function Component() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [favorites, setFavorites] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [expandedMobileFacets, setExpandedMobileFacets] = useState<Record<string, boolean>>({})
  const [isInitialized, setIsInitialized] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const [showSearchField, setShowSearchField] = useState(false)
  const [headerSearchQuery, setHeaderSearchQuery] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)
  const horizontalContainerRef = useRef<HTMLDivElement | null>(null)
  const [scrollProgress, setScrollProgress] = useState(0)

  // Add ref to prevent multiple simultaneous load more operations
  const loadMoreInProgressRef = useRef(false)

  const [isVisualSearchActive, setIsVisualSearchActive] = useState(false)

  const {
    state,
    updateState,
    fetchData,
    warmupAndSearch,
    performVisualSearch,
    setPriceRange,
    searchWithOriginalQuery,
    addDebugLog,
    clearDebugLogs,
    performDirectAISearch,
    navigatePrevious,
    navigateNext,
    getCurrentTurn,
    canNavigatePrevious,
    canNavigateNext,
    presets,
    quickActions,
    horizontalDisplayMode,
  } = useDYSearch()

  // Store current state values in refs for the observer
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Refs for infinite scroll state
  const pageRef = useRef(state.page)
  const loadingRef = useRef(state.loading)
  const isLoadingMoreRef = useRef(state.isLoadingMore)
  const totalRef = useRef(state.total)
  const itemsPerPageRef = useRef(state.itemsPerPage)
  const resultsLengthRef = useRef(state.results.length)

  // Update refs when state changes
  useEffect(() => {
    pageRef.current = state.page
    loadingRef.current = state.loading
    isLoadingMoreRef.current = state.isLoadingMore
    totalRef.current = state.total
    itemsPerPageRef.current = state.itemsPerPage
    resultsLengthRef.current = state.results.length
  }, [state.page, state.loading, state.isLoadingMore, state.total, state.itemsPerPage, state.results.length])

  // Check if query contains AI trigger words
  const containsAITriggerWords = (query: string) => {
    const lowerQuery = query.toLowerCase()
    return state.aiTriggerWords.some((word) => {
      if (word.includes(" ")) {
        // For phrases, check exact match
        return lowerQuery.includes(word.toLowerCase())
      } else {
        // For single words, check word boundaries
        const regex = new RegExp(`\\b${word.toLowerCase()}\\b`)
        return regex.test(lowerQuery)
      }
    })
  }

  // Scroll animation for horizontal display mode
  useEffect(() => {
    if (!state.horizontalDisplayMode || !horizontalContainerRef.current) return

    const handleScroll = () => {
      if (!horizontalContainerRef.current) return

      const container = horizontalContainerRef.current
      const containerRect = container.getBoundingClientRect()
      const containerTop = containerRect.top
      const windowHeight = window.innerHeight

      // Calculate scroll progress (0 to 1)
      const scrollStart = containerTop + windowHeight * 0.3
      const scrollEnd = containerTop - windowHeight * 0.7
      const scrollRange = scrollStart - scrollEnd

      let progress = 0
      if (scrollStart > 0) {
        progress = 0
      } else if (scrollEnd > 0) {
        progress = (scrollStart - 0) / scrollRange
      } else {
        progress = 1
      }

      progress = Math.max(0, Math.min(1, progress))
      setScrollProgress(progress)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [state.horizontalDisplayMode])

  // Focus input when search field is shown or auto-focus is triggered
  useEffect(() => {
    if (showSearchField && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [showSearchField])

  // Handle header search
  const handleHeaderSearch = () => {
    if (headerSearchQuery.trim()) {
      if (containsAITriggerWords(headerSearchQuery)) {
        updateState({
          queryText: headerSearchQuery,
          originalQuery: headerSearchQuery,
          page: 1,
          searchType: "ai",
          aiMode: true,
          hasSearched: true,
          contextProduct: null,
          shopTheStyleDisplay: undefined,
        })
        performDirectAISearch(headerSearchQuery.trim())
      } else {
        updateState({
          queryText: headerSearchQuery.trim(),
          originalQuery: headerSearchQuery.trim(),
          page: 1,
          searchType: "text",
          aiMode: false,
          loading: true,
          hasSearched: true,
          isWarming: false,
        })
      }
      setHeaderSearchQuery("")
      setShowSearchField(false)
    }
  }

  // Initialize state from URL parameters
  useEffect(() => {
    if (!isInitialized) {
      const query = searchParams.get("q") || ""
      const page = Number.parseInt(searchParams.get("page") || "1")
      const sort = searchParams.get("sort") || "relevance"
      const priceFrom = Number.parseInt(searchParams.get("priceFrom") || "0")
      const priceTo = Number.parseInt(searchParams.get("priceTo") || "1000")
      const usePrice = searchParams.get("usePrice") === "true"

      const filters: { [key: string]: Set<string> } = {}
      searchParams.forEach((value, key) => {
        if (key.startsWith("filter_")) {
          const filterKey = key.replace("filter_", "")
          filters[filterKey] = new Set(value.split(",").filter((v) => v))
        }
      })

      setSearchQuery(query)
      updateState({
        queryText: query,
        originalQuery: query,
        page,
        sort,
        priceFrom,
        priceTo,
        usePrice,
        selected: filters,
        hasSearched: !!query,
        searchType: "text",
      })
      setIsInitialized(true)
    }
  }, [searchParams, updateState, isInitialized])

  // Auto-focus search input when arriving at the listing page
  useEffect(() => {
    if (state.hasSearched && searchInputRef.current) {
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus()
        }
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [state.hasSearched])

  // Auto-focus search input when arriving at the listing page for semantic search
  useEffect(() => {
    if (state.hasSearched && !state.aiMode && searchInputRef.current) {
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus()
          setShowSearchField(true)
        }
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [state.hasSearched, state.aiMode])

  // Update URL when state changes (but not for AI mode)
  useEffect(() => {
    if (!isInitialized || state.searchType === "ai") return

    const params = new URLSearchParams()

    if (state.queryText && state.searchType === "text") {
      params.set("q", state.queryText)
    }

    if (state.page > 1) {
      params.set("page", state.page.toString())
    }

    if (state.sort !== "relevance") {
      params.set("sort", state.sort)
    }

    if (state.usePrice) {
      params.set("priceFrom", state.priceFrom.toString())
      params.set("priceTo", state.priceTo.toString())
      params.set("usePrice", "true")
    }

    Object.entries(state.selected).forEach(([key, valueSet]) => {
      if (valueSet && valueSet.size > 0) {
        params.set(`filter_${key}`, Array.from(valueSet).join(","))
      }
    })

    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname
    router.replace(newUrl, { scroll: false })
  }, [
    state.queryText,
    state.page,
    state.sort,
    state.selected,
    state.usePrice,
    state.priceFrom,
    state.priceTo,
    state.searchType,
    router,
    isInitialized,
  ])

  const toggleFavorite = (id: number) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((fav) => fav !== id) : [...prev, id]))
  }

  const handleSearch = () => {
    if (searchQuery.trim()) {
      if (containsAITriggerWords(searchQuery)) {
        updateState({
          queryText: searchQuery,
          originalQuery: searchQuery,
          page: 1,
          searchType: "ai",
          aiMode: true,
          hasSearched: true,
          contextProduct: null,
          shopTheStyleDisplay: undefined,
        })
        performDirectAISearch(searchQuery.trim())
        setSearchQuery("")
      } else {
        updateState({
          queryText: searchQuery.trim(),
          originalQuery: searchQuery.trim(),
          page: 1,
          searchType: "text",
          aiMode: false,
          loading: true,
          hasSearched: true,
          isWarming: false,
        })
      }
    }
  }

  const handleVisualSearch = (base64: string) => {
    setSearchQuery("")
    setIsVisualSearchActive(true) // Set visual search as active
    performVisualSearch(base64)
  }

  const handleClearVisualSearch = () => {
    updateState({
      visualSearchImage: null,
      searchType: "text",
    })
    setIsVisualSearchActive(false) // Reset visual search state
  }

  const handleBackToWelcome = () => {
    updateState({
      hasSearched: false,
      queryText: "",
      originalQuery: "",
      spellCheckedQuery: "",
      results: [],
      facets: [],
      total: 0,
      selected: {},
      page: 1,
      visualSearchImage: null,
      searchType: "text",
      enableSpellCheck: true,
      aiMode: false,
      chatHistory: [],
      chatId: null,
      aiRequestCount: 0,
      widgets: [],
      conversationTurns: [],
      currentTurnIndex: -1,
      navigationIndex: 0,
      contextProduct: null,
      shopTheStyleDisplay: undefined,
    })
    setSearchQuery("")
    setIsVisualSearchActive(false) // Reset visual search state
    router.replace(window.location.pathname, { scroll: false })
  }

  const handleSearchAgain = () => {
    if (state.searchType === "visual" && state.visualSearchImage) {
      performVisualSearch(state.visualSearchImage)
    } else if (searchQuery.trim()) {
      warmupAndSearch(searchQuery.trim())
    }
  }

  const handleFacetToggle = (field: string, value: string) => {
    const newSelected = { ...state.selected }
    if (!newSelected[field]) {
      newSelected[field] = new Set()
    }

    if (newSelected[field].has(value)) {
      newSelected[field].delete(value)
    } else {
      newSelected[field].add(value)
    }

    updateState({ selected: newSelected, page: 1 })
  }

  const toggleMobileFacetExpansion = (facetName: string) => {
    setExpandedMobileFacets((prev) => ({
      ...prev,
      [facetName]: !prev[facetName],
    }))
  }

  // Convert API results to fashion items format
  const fashionItemsWithWidgets: any[] = []

  const fashionItems = state.results.map((slot, index) => {
    const product = slot.productData
    return {
      id: index,
      name: product.name,
      brand: product.brand || "Unknown Brand",
      price: product.price,
      originalPrice: null,
      discount: 0,
      image: product.image_url,
      url: product.url,
      slotId: slot.slotId || `fallback_${index}`,
    }
  })

  // Enhanced infinite scroll for text search
  useEffect(() => {
    if (state.searchType !== "text" || state.aiMode) {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
      loadMoreInProgressRef.current = false
      return
    }

    if (state.results.length === 0) {
      return
    }

    console.log(`[INFINITE_SCROLL] Setting up observer, results: ${state.results.length}`)

    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    const loadMore = () => {
      const currentPage = state.page
      const currentLoading = state.loading
      const currentIsLoadingMore = state.isLoadingMore
      const currentTotal = state.total
      const currentItemsPerPage = state.itemsPerPage

      const maxPages = Math.ceil(currentTotal / currentItemsPerPage)

      console.log(`[INFINITE_SCROLL] loadMore called:`, {
        currentPage,
        maxPages,
        currentLoading,
        currentIsLoadingMore,
        inProgress: loadMoreInProgressRef.current,
      })

      if (currentLoading || currentIsLoadingMore || loadMoreInProgressRef.current || currentPage >= maxPages) {
        console.log(`[INFINITE_SCROLL] Skipping - conditions not met`)
        return
      }

      console.log(`[INFINITE_SCROLL] Incrementing page: ${currentPage} -> ${currentPage + 1}`)
      loadMoreInProgressRef.current = true
      updateState({ page: currentPage + 1 })
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        console.log(`[INFINITE_SCROLL] Intersection:`, entry.isIntersecting, loadMoreInProgressRef.current)
        if (entry.isIntersecting && !loadMoreInProgressRef.current) {
          console.log(`[INFINITE_SCROLL] Trigger detected!`)
          loadMore()
        }
      },
      {
        threshold: 0.1,
        rootMargin: "200px",
      },
    )

    if (loadMoreRef.current) {
      console.log(`[INFINITE_SCROLL] Observer attached to element`)
      observer.observe(loadMoreRef.current)
      observerRef.current = observer
    }

    return () => {
      console.log(`[INFINITE_SCROLL] Cleaning up observer`)
      observer.disconnect()
    }
  }, [
    state.searchType,
    state.aiMode,
    state.results.length,
    state.page,
    state.loading,
    state.isLoadingMore,
    state.total,
    state.itemsPerPage,
    updateState,
  ])

  // Reset loadMoreInProgress when loading states change
  useEffect(() => {
    if (!state.loading && !state.isLoadingMore) {
      loadMoreInProgressRef.current = false
      console.log(`[INFINITE_SCROLL] Reset loadMoreInProgress flag`)
    }
  }, [state.loading, state.isLoadingMore])

  // Reset when starting a new search
  useEffect(() => {
    if (state.page === 1 && state.searchType === "text") {
      loadMoreInProgressRef.current = false
      console.log(`[INFINITE_SCROLL] Reset for new search (page 1)`)
    }
  }, [state.page, state.searchType, state.queryText])

  // Get current turn for display
  const currentTurn = getCurrentTurn()

  if (state.aiMode && (state.widgets.length > 0 || state.results.length > 0)) {
    if (state.widgets.length > 0) {
      state.widgets.forEach((widget, widgetIndex) => {
        if (widget.slots && widget.slots.length > 0) {
          fashionItemsWithWidgets.push({
            widgetTitle: widget.title || `Recommendation ${widgetIndex + 1}`,
            items: widget.slots.map((slot, index) => {
              const product = slot.productData
              return {
                id: `${widgetIndex}-${index}`,
                name: product.name,
                brand: product.brand || "Unknown Brand",
                price: product.price,
                originalPrice: null,
                discount: 0,
                image: product.image_url,
                url: product.url,
                slotId: slot.slotId || `fallback_${widgetIndex}_${index}`,
              }
            }),
          })
        }
      })
    } else if (state.results.length > 0) {
      fashionItemsWithWidgets.push({
        widgetTitle: "Recommendations",
        items: state.results.map((slot, index) => {
          const product = slot.productData
          return {
            id: `0-${index}`,
            name: product.name,
            brand: product.brand || "Unknown Brand",
            price: product.price,
            originalPrice: null,
            discount: 0,
            image: product.image_url,
            url: product.url,
            slotId: slot.slotId || `fallback_0_${index}`,
          }
        }),
      })
    }
  }

  const priceFacet = state.facets.find((f) => f.column === "price")
  const nonPriceFacets = state.facets.filter((f) => f.column !== "price")

  const wasSpellCorrected =
    state.searchType === "text" &&
    state.originalQuery &&
    state.spellCheckedQuery &&
    state.originalQuery.toLowerCase() !== state.spellCheckedQuery.toLowerCase() &&
    state.enableSpellCheck

  if (!state.hasSearched) {
    return (
      <WelcomeScreen
        onSearch={(query, mode) => {
          setSearchQuery(query)
          if (mode === "semantic") {
            updateState({
              queryText: query,
              originalQuery: query,
              page: 1,
              searchType: "text",
              aiMode: false,
              hasSearched: true,
              loading: true,
              isWarming: false,
            })
          } else if (mode === "hybrid") {
            if (containsAITriggerWords(query)) {
              updateState({
                queryText: query,
                originalQuery: query,
                page: 1,
                searchType: "ai",
                aiMode: true,
                hasSearched: true,
                contextProduct: null,
                shopTheStyleDisplay: undefined,
              })
              performDirectAISearch(query)
              setSearchQuery("")
            } else {
              updateState({
                queryText: query,
                originalQuery: query,
                page: 1,
                searchType: "text",
                enableSpellCheck: true,
                aiMode: false,
                hasSearched: true,
                loading: true,
                isWarming: false,
              })
            }
          }
        }}
        onVisualSearch={handleVisualSearch}
        onAISearch={(query, mode) => {
          updateState({
            queryText: query,
            originalQuery: query,
            page: 1,
            searchType: "ai",
            aiMode: true,
            hasSearched: true,
            contextProduct: null,
            shopTheStyleDisplay: undefined,
          })
          performDirectAISearch(query)
          setSearchQuery("")
        }}
        credentials={{ apiKey: state.apiKey, dyidServer: state.dyidServer, locale: state.locale, region: state.region }}
        onCredentialsChange={(newCredentials) => {
          updateState({
            apiKey: newCredentials.apiKey,
            dyidServer: newCredentials.dyidServer,
            locale: newCredentials.locale || "none",
            region: newCredentials.region || "com",
            preset: "custom",
          })
        }}
        presets={presets}
        preset={state.preset}
        debugMode={state.debugMode}
        onDebugModeChange={(enabled) => updateState({ debugMode: enabled })}
        aiTriggerWords={state.aiTriggerWords}
        onAITriggerWordsChange={(words) => updateState({ aiTriggerWords: words })}
        quickActions={state.quickActions}
        onQuickActionsChange={(actions) => updateState({ quickActions: actions })}
        horizontalDisplayMode={state.horizontalDisplayMode}
        onHorizontalDisplayModeChange={(enabled) => updateState({ horizontalDisplayMode: enabled })}
      />
    )
  }

  const handleAISearch = () => {
    if (searchQuery.trim()) {
      updateState({
        queryText: searchQuery,
        originalQuery: searchQuery,
        page: 1,
        searchType: "ai",
        aiMode: true,
        hasSearched: true,
        contextProduct: null,
        shopTheStyleDisplay: undefined,
      })
      performDirectAISearch(searchQuery.trim())
      setSearchQuery("")
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Enhanced for AI Mode */}
      <div className="sticky top-0 z-20 border-b-2 rounded-b-3xl bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between py-6 lg:px-2.5">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={handleBackToWelcome}
              className="flex items-center gap-2 px-3 py-2 h-auto hover:bg-gray-100 rounded-lg bg-transparent"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Return</span>
            </Button>

            <div className="relative flex items-center gap-2">
              <VisualSearchUpload
                onImageUpload={(base64) => {
                  handleVisualSearch(base64)
                }}
              />
              <div className="relative flex items-center">
                <AutocompleteSearch
                  onSearch={(searchTerm) => {
                    setIsVisualSearchActive(false) // Reset visual search state when doing text search
                    if (containsAITriggerWords(searchTerm)) {
                      updateState({
                        queryText: searchTerm,
                        originalQuery: searchTerm,
                        page: 1,
                        searchType: "ai",
                        aiMode: true,
                        hasSearched: true,
                        contextProduct: null,
                        shopTheStyleDisplay: undefined,
                      })
                      performDirectAISearch(searchTerm.trim())
                    } else {
                      updateState({
                        queryText: searchTerm.trim(),
                        originalQuery: searchTerm.trim(),
                        page: 1,
                        searchType: "text",
                        aiMode: false,
                        loading: true,
                        hasSearched: true,
                        isWarming: false,
                      })
                    }
                  }}
                  placeholder="Search products..."
                  className="w-96"
                  region={state.region}
                  apiKey={state.apiKey}
                />
              </div>
            </div>
          </div>

          {state.aiMode && state.conversationTurns.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="rounded-full rounded-tr-none px-4 py-2 max-w-xs text-slate-200 bg-slate-200 overflow-hidden">
                <span className="text-sm font-medium text-slate-700 truncate block">
                  {(() => {
                    const message = currentTurn?.displayMessage || currentTurn?.userMessage || "Search Results"
                    return message.length > 50 ? `${message.substring(0, 50)}...` : message
                  })()}
                </span>
              </div>

              <div className="rounded-full flex items-center justify-center flex-shrink-0 bg-slate-600 pb-0 mb-3.5 pl-0 ml-[-9px] w-6 h-6">
                <span className="text-white text-sm font-semibold">U</span>
              </div>

              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                  disabled={!canNavigatePrevious()}
                  onClick={navigatePrevious}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                  disabled={!canNavigateNext()}
                  onClick={navigateNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {!state.aiMode && (
            <div className="flex items-center">
              {state.searchType === "text" ? (
                <span className="text-sm font-medium text-gray-700">
                  Results for "{state.spellCheckedQuery || state.queryText}"
                </span>
              ) : state.searchType === "visual" && state.visualSearchImage ? (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Visual Search</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-6 h-6 rounded border border-gray-200 overflow-hidden cursor-pointer">
                          <Image
                            src={`data:image/jpeg;base64,${state.visualSearchImage}`}
                            alt="Search image"
                            width={24}
                            height={24}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="p-0 overflow-hidden">
                        <div className="w-48 h-48 relative">
                          <Image
                            src={`data:image/jpeg;base64,${state.visualSearchImage}`}
                            alt="Search image preview"
                            fill
                            className="object-contain"
                          />
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ) : (
                <span className="text-sm font-medium text-gray-700">Search Results</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full">
        {state.aiMode && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-2.5 py-4 space-y-6">
            {state.loading && (
              <div className="fixed inset-0 flex items-center justify-center bg-white z-40">
                <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    <svg
                      className="w-16 h-16 text-gray-300"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"
                        fill="currentColor"
                        className="animate-pulse"
                        style={{ animationDelay: "0ms", animationDuration: "2s" }}
                      />
                      <path
                        d="M19 12L19.5 14.5L22 15L19.5 15.5L19 18L18.5 15.5L16 15L18.5 14.5L19 12Z"
                        fill="currentColor"
                        className="animate-pulse"
                        style={{ animationDelay: "400ms", animationDuration: "2s" }}
                      />
                      <path
                        d="M5 6L5.5 8.5L8 9L5.5 9.5L5 12L4.5 9.5L2 9L4.5 8.5L5 6Z"
                        fill="currentColor"
                        className="animate-pulse"
                        style={{ animationDelay: "800ms", animationDuration: "2s" }}
                      />
                    </svg>
                  </div>

                  <div className="space-y-2">
                    <p className="text-lg font-light text-gray-700">Your muse, your way.</p>
                    <div className="flex items-center justify-center gap-1">
                      <div
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></div>
                      <div
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentTurn && !state.loading && (
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg
                      className="h-4 w-4 text-gray-600"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"
                        fill="currentColor"
                      />
                      <path
                        d="M19 12L19.5 14.5L22 15L19.5 15.5L19 18L18.5 15.5L16 15L18.5 14.5L19 12Z"
                        fill="currentColor"
                      />
                      <path d="M5 6L5.5 8.5L8 9L5.5 9.5L5 12L4.5 9.5L2 9L4.5 8.5L5 6Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="bg-gray-100 text-gray-800 rounded-lg p-3 text-sm max-w-[40%]">
                    <div className="space-y-3">
                      <div>{currentTurn.assistantMessage}</div>

                      {currentTurn.contextProducts.length > 0 && state.contextProduct && (
                        <div className="border-t border-gray-200 pt-3">
                          <p className="text-xs text-gray-600 mb-3">Showing matching styles to:</p>
                          <div className="grid grid-cols-1 gap-3">
                            <div className="flex items-center space-x-3 bg-white rounded-lg p-2">
                              <div className="w-24 h-32 flex-shrink-0">
                                <Image
                                  src={state.contextProduct.image || "/placeholder.svg"}
                                  alt={state.contextProduct.name}
                                  width={96}
                                  height={128}
                                  className="object-cover w-full h-full rounded"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500 uppercase tracking-wide">
                                  {state.contextProduct.brand}
                                </p>
                                <h4 className="font-medium text-gray-900 text-xs line-clamp-2">
                                  {state.contextProduct.name}
                                </h4>
                                <p className="font-semibold text-xs">
                                  {state.currencySymbol}
                                  {state.contextProduct.price}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!state.aiMode && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div>
                {!state.loading && wasSpellCorrected && (
                  <p className="text-xs text-gray-500 mt-1">
                    Search for "
                    <button onClick={searchWithOriginalQuery} className="text-blue-600 hover:underline cursor-pointer">
                      {state.originalQuery}
                    </button>
                    " instead
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Heart className="h-4 w-4" />
                <span>{favorites.length} favorites</span>
              </div>
            </div>

            <div className="flex gap-8">
              {(state.facets.length > 0 || state.searchType === "text") && (
                <div className="w-64 flex-none space-y-4">
                  <h2 className="text-sm tracking-wider text-gray-600 font-semibold mb-5">REFINE BY</h2>

                  <FacetSidebar
                    facets={state.facets}
                    filters={state.selected}
                    expandedFacets={state.expanded}
                    onToggleFacet={handleFacetToggle}
                    onToggleExpansion={(field) =>
                      updateState({
                        expanded: { ...state.expanded, [field]: !state.expanded[field] },
                      })
                    }
                    setPriceRange={setPriceRange}
                    priceBounds={state.priceBounds}
                    priceFrom={state.priceFrom}
                    priceTo={state.priceTo}
                  />
                </div>
              )}

              {state.debugMode && state.facets.length >= 0 && (
                <div className="mb-4 p-2 bg-yellow-100 text-xs">
                  <strong>Debug - Facets:</strong> {state.facets.length} facets found
                  {state.facets.map((f, i) => (
                    <div key={i}>
                      • {f.displayName || f.column} ({f.values?.length || 0} values)
                    </div>
                  ))}
                </div>
              )}

              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">{state.total.toLocaleString()} results</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <select
                      value={state.sort}
                      onChange={(e) => updateState({ sort: e.target.value, page: 1 })}
                      className="text-sm border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 border-0"
                    >
                      <option value="relevance">Relevance</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                      <option value="popularity_desc">Most Popular</option>
                    </select>

                    <div className="flex border-gray-300 rounded border-0">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`px-3 py-1 text-sm flex items-center gap-1 ${viewMode === "grid" ? "bg-gray-100" : "hover:bg-gray-50"}`}
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`px-3 py-1 text-sm border-l border-gray-300 flex items-center gap-1 ${
                          viewMode === "list" ? "bg-gray-100" : "hover:bg-gray-50"
                        }`}
                      >
                        <List className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {state.loading && state.page === 1 ? (
                  <div className="text-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <LoadingSpinner size="lg" />
                      {state.isWarming && <p className="text-gray-500 text-sm">Warming up server...</p>}
                    </div>
                  </div>
                ) : fashionItems.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-sm mb-4">
                      No results found.{" "}
                      <Button
                        variant="link"
                        onClick={handleSearchAgain}
                        className="p-0 h-auto text-sm underline"
                        disabled={state.isWarming}
                      >
                        {state.isWarming ? "Warming up..." : "Search again"}
                      </Button>
                    </p>
                  </div>
                ) : (
                  <div
                    className={
                      viewMode === "grid"
                        ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6"
                        : "space-y-4"
                    }
                  >
                    {fashionItems.map((item) => (
                      <Card
                        key={item.id}
                        className={`group overflow-hidden border-0 hover:shadow-md transition-all duration-300 ${
                          viewMode === "list" ? "flex flex-row" : ""
                        }`}
                        style={{ borderRadius: 0 }}
                      >
                        <div className={`relative ${viewMode === "list" ? "w-24 sm:w-32 flex-shrink-0" : ""}`}>
                          <div
                            className={`${
                              viewMode === "list" ? "w-full h-full" : "w-full h-[340px]"
                            } overflow-hidden rounded-none`}
                            onClick={() => {
                              sendEngagement(
                                item.slotId,
                                state.dyid,
                                state.cookies.dyid_server,
                                state.cookies.dyjsession,
                                state.apiKey,
                                addDebugLog,
                                state.region,
                              )
                              window.open(item.url, "_blank")
                            }}
                          >
                            <Image
                              src={item.image || "/placeholder.svg"}
                              alt={item.name}
                              width={250}
                              height={340}
                              className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                            />
                          </div>

                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex flex-col space-y-1">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="bg-white text-black hover:bg-gray-100 text-xs px-2 py-1 h-auto"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const contextProduct = {
                                    name: item.name,
                                    brand: item.brand || "Unknown Brand",
                                    price: item.price,
                                    image: item.image,
                                  }
                                  const displayPrompt = "Shop The Style"
                                  const actualPrompt = `Please help me find a total look for this item: ${item.brand || "Unknown Brand"} ${item.name} ${state.currencySymbol}${item.price}`

                                  const newHistory = [
                                    ...state.chatHistory,
                                    { type: "user", message: actualPrompt, timestamp: new Date() },
                                  ]

                                  updateState({
                                    queryText: actualPrompt,
                                    originalQuery: actualPrompt,
                                    page: 1,
                                    searchType: "ai",
                                    aiMode: true,
                                    hasSearched: true,
                                    chatHistory: newHistory,
                                    contextProduct: contextProduct,
                                    shopTheStyleDisplay: displayPrompt,
                                  })
                                  performDirectAISearch(actualPrompt)
                                }}
                              >
                                <svg
                                  className="h-3 w-3 mr-1"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"
                                    fill="currentColor"
                                  />
                                  <path
                                    d="M19 12L19.5 14.5L22 15L19.5 15.5L19 18L18.5 15.5L16 15L18.5 14.5L19 12Z"
                                    fill="currentColor"
                                  />
                                  <path
                                    d="M5 6L5.5 8.5L8 9L5.5 9.5L5 12L4.5 9.5L2 9L4.5 8.5L5 6Z"
                                    fill="currentColor"
                                  />
                                </svg>
                                Shop the style
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="bg-white text-black hover:bg-gray-100 text-xs px-2 py-1 h-auto"
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  try {
                                    const response = await fetch(item.image)
                                    const blob = await response.blob()
                                    const reader = new FileReader()
                                    reader.onloadend = () => {
                                      const base64 = reader.result?.toString().split(",")[1]
                                      if (base64) {
                                        handleVisualSearch(base64)
                                      }
                                    }
                                    reader.readAsDataURL(blob)
                                  } catch (error) {
                                    console.error("Error converting image to base64:", error)
                                  }
                                }}
                              >
                                <Search className="h-3 w-3 mr-1" />
                                Similar style
                              </Button>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 p-1 bg-white bg-opacity-80 hover:bg-opacity-100 h-auto w-auto"
                            onClick={() => toggleFavorite(item.id)}
                          >
                            <Heart
                              className={`h-3 w-3 ${favorites.includes(item.id) ? "fill-red-500 text-red-500" : "text-gray-600"}`}
                            />
                          </Button>
                        </div>

                        <CardContent className={`p-3 ${viewMode === "list" ? "flex-1" : ""}`}>
                          <div className="space-y-2">
                            <div>
                              <h3
                                className="font-medium text-gray-900 line-clamp-2 text-sm cursor-pointer hover:underline"
                                onClick={() => {
                                  sendEngagement(
                                    item.slotId,
                                    state.dyid,
                                    state.cookies.dyid_server,
                                    state.cookies.dyjsession,
                                    state.apiKey,
                                    addDebugLog,
                                    state.region,
                                  )
                                  window.open(item.url, "_blank")
                                }}
                              >
                                {item.name}
                              </h3>
                            </div>

                            <div
                              className="flex items-center space-x-2 cursor-pointer"
                              onClick={() => {
                                sendEngagement(
                                  item.slotId,
                                  state.dyid,
                                  state.cookies.dyid_server,
                                  state.cookies.dyjsession,
                                  state.apiKey,
                                  addDebugLog,
                                  state.region,
                                )
                                window.open(item.url, "_blank")
                              }}
                            >
                              <span className="font-semibold text-base">
                                {state.currencySymbol}
                                {item.price}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {state.isLoadingMore && fashionItems.length > 0 && (
                  <div className="mt-8 text-center py-4">
                    <div className="flex flex-col items-center gap-2">
                      <LoadingSpinner size="md" />
                      <p className="text-gray-500 text-sm">Loading more results...</p>
                    </div>
                  </div>
                )}

                {fashionItems.length > 0 &&
                  state.searchType === "text" &&
                  !state.isLoadingMore &&
                  !state.loading &&
                  state.page < Math.ceil(state.total / state.itemsPerPage) && (
                    <div ref={loadMoreRef} className="mt-8 text-center py-4">
                      <p className="text-xs text-gray-400">Scroll to load more...</p>
                    </div>
                  )}

                {fashionItems.length > 0 &&
                  state.searchType === "text" &&
                  state.page >= Math.ceil(state.total / state.itemsPerPage) && (
                    <div className="mt-8 text-center">
                      <p className="text-sm text-gray-500">You've reached the end of the results</p>
                    </div>
                  )}

                {fashionItems.length > 0 && state.searchType === "visual" && <div className="mt-8 text-center"></div>}
              </div>
            </div>
          </div>
        )}

        {state.aiMode && !state.loading && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-2.5 py-4 pb-32">
            {fashionItemsWithWidgets.length === 0 ? (
              <div className="text-center py-16">
                <div className="flex flex-col items-center gap-4">
                  <svg
                    className="w-12 h-12 text-gray-300"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"
                      fill="currentColor"
                    />
                    <path
                      d="M19 12L19.5 14.5L22 15L19.5 15.5L19 18L18.5 15.5L16 15L18.5 14.5L19 12Z"
                      fill="currentColor"
                    />
                    <path d="M5 6L5.5 8.5L8 9L5.5 9.5L5 12L4.5 9.5L2 9L4.5 8.5L5 6Z" fill="currentColor" />
                  </svg>
                  <p className="text-gray-500 text-sm">Let's try a different approach</p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {fashionItemsWithWidgets.map((widget, widgetIndex) => (
                  <div key={widgetIndex} className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">{widget.widgetTitle}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                      {widget.items.map((item: any) => (
                        <Card
                          key={item.id}
                          className="group overflow-hidden border-0 hover:shadow-md transition-all duration-300"
                          style={{ borderRadius: 0 }}
                        >
                          <div className="relative">
                            <div
                              className="w-full h-[340px] overflow-hidden rounded-none"
                              onClick={() => {
                                sendEngagement(
                                  item.slotId,
                                  state.dyid,
                                  state.cookies.dyid_server,
                                  state.cookies.dyjsession,
                                  state.apiKey,
                                  addDebugLog,
                                  state.region,
                                )
                                window.open(item.url, "_blank")
                              }}
                            >
                              <Image
                                src={item.image || "/placeholder.svg"}
                                alt={item.name}
                                width={250}
                                height={340}
                                className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                              />
                            </div>

                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="flex flex-col space-y-1">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="bg-white text-black hover:bg-gray-100 text-xs px-2 py-1 h-auto"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const contextProduct = {
                                      name: item.name,
                                      brand: item.brand || "Unknown Brand",
                                      price: item.price,
                                      image: item.image,
                                    }
                                    const displayPrompt = "Shop The Style"
                                    const actualPrompt = `Please help me find a total look for this item: ${item.brand || "Unknown Brand"} ${item.name} ${state.currencySymbol}${item.price}`

                                    const newHistory = [
                                      ...state.chatHistory,
                                      { type: "user", message: actualPrompt, timestamp: new Date() },
                                    ]

                                    updateState({
                                      queryText: actualPrompt,
                                      originalQuery: actualPrompt,
                                      page: 1,
                                      searchType: "ai",
                                      aiMode: true,
                                      hasSearched: true,
                                      chatHistory: newHistory,
                                      contextProduct: contextProduct,
                                      shopTheStyleDisplay: displayPrompt,
                                    })
                                    performDirectAISearch(actualPrompt)
                                  }}
                                >
                                  <svg
                                    className="h-3 w-3 mr-1"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"
                                      fill="currentColor"
                                    />
                                    <path
                                      d="M19 12L19.5 14.5L22 15L19.5 15.5L19 18L18.5 15.5L16 15L18.5 14.5L19 12Z"
                                      fill="currentColor"
                                    />
                                    <path
                                      d="M5 6L5.5 8.5L8 9L5.5 9.5L5 12L4.5 9.5L2 9L4.5 8.5L5 6Z"
                                      fill="currentColor"
                                    />
                                  </svg>
                                  Shop the style
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="bg-white text-black hover:bg-gray-100 text-xs px-2 py-1 h-auto"
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    try {
                                      const response = await fetch(item.image)
                                      const blob = await response.blob()
                                      const reader = new FileReader()
                                      reader.onloadend = () => {
                                        const base64 = reader.result?.toString().split(",")[1]
                                        if (base64) {
                                          handleVisualSearch(base64)
                                        }
                                      }
                                      reader.readAsDataURL(blob)
                                    } catch (error) {
                                      console.error("Error converting image to base64:", error)
                                    }
                                  }}
                                >
                                  <Search className="h-3 w-3 mr-1" />
                                  Similar style
                                </Button>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="absolute top-2 right-2 p-1 bg-white bg-opacity-80 hover:bg-opacity-100 h-auto w-auto"
                              onClick={() => toggleFavorite(Number(item.id.split("-")[1]))}
                            >
                              <Heart
                                className={`h-3 w-3 ${favorites.includes(Number(item.id.split("-")[1])) ? "fill-red-500 text-red-500" : "text-gray-600"}`}
                              />
                            </Button>
                          </div>

                          <CardContent className="p-3">
                            <div className="space-y-2">
                              <div>
                                <h3
                                  className="font-medium text-gray-900 line-clamp-2 text-sm cursor-pointer hover:underline"
                                  onClick={() => {
                                    sendEngagement(
                                      item.slotId,
                                      state.dyid,
                                      state.cookies.dyid_server,
                                      state.cookies.dyjsession,
                                      state.apiKey,
                                      addDebugLog,
                                      state.region,
                                    )
                                    window.open(item.url, "_blank")
                                  }}
                                >
                                  {item.name}
                                </h3>
                              </div>

                              <div
                                className="flex items-center space-x-2 cursor-pointer"
                                onClick={() => {
                                  sendEngagement(
                                    item.slotId,
                                    state.dyid,
                                    state.cookies.dyid_server,
                                    state.cookies.dyjsession,
                                    state.apiKey,
                                    addDebugLog,
                                    state.region,
                                  )
                                  window.open(item.url, "_blank")
                                }}
                              >
                                <span className="font-semibold text-base">
                                  {state.currencySymbol}
                                  {item.price}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {state.aiMode && (
        <div className="fixed bottom-0 left-0 right-0 w-full bg-transparent border-t-0 z-30">
          <div className="w-full rounded-t-[2rem] shadow-lg border-gray-200 p-6 border-2 bg-slate-50 py-3.5">
            <div className="max-w-3xl mx-auto">
              <div className="relative bg-white rounded-3xl shadow-sm border border-gray-200 p-4 py-2.5">
                <div className="w-full mb-3">
                  <input
                    type="text"
                    placeholder="Ask a follow up question..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchQuery.trim()) {
                        updateState({ contextProduct: null, shopTheStyleDisplay: undefined })
                        performDirectAISearch(searchQuery.trim())
                        setSearchQuery("")
                      }
                    }}
                    className="w-full text-base bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 outline-none placeholder:text-gray-400"
                    style={{ fontSize: "16px" }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="flex-shrink-0"
                    >
                      <g clipPath="url(#clip0_4082_5186_bottom)">
                        <path
                          d="M11.6757 9.81054C8.73958 9.81054 6.35089 7.42177 6.35089 4.48562C6.35089 2.62899 7.30664 0.992133 8.75134 0.0388074C8.50309 0.0155936 8.25193 0.00238037 7.99762 0.00238037C3.58066 0.00238037 0 3.58304 0 8C0 12.417 3.58066 16 7.99762 16C7.74331 16 7.49215 15.987 7.24391 15.9638C8.68861 15.0104 9.64436 13.3736 9.64436 11.517C9.64436 8.58087 7.25567 6.19209 4.3195 6.19209C2.46287 6.19209 0.826018 7.14784 -0.127308 8.59254C-0.150522 8.34429 -0.163735 8.09313 -0.163735 7.83882C-0.163735 3.42186 3.41692 -0.158813 7.8339 -0.158813C12.2509 -0.158813 15.8315 3.42186 15.8315 7.83882C15.8315 8.17203 15.8142 8.50106 15.7809 8.82591C13.9699 8.97903 12.5605 10.2163 12.1968 11.8531C11.9928 10.9421 11.2373 10.2223 10.2992 10.0359C10.6629 9.30544 10.8669 8.47862 10.8669 7.59926C10.8669 4.66311 8.47817 2.27432 5.54202 2.27432C4.66266 2.27432 3.83584 2.47836 3.10537 2.84204C2.91898 1.90389 2.19909 1.14838 1.28811 0.944342C2.92496 0.390675 4.70316 0.0838928 6.5598 0.0838928C11.8128 0.0838928 16.0762 4.34731 16.0762 9.60028C16.0762 11.457 15.5226 13.2352 14.969 14.8721Z"
                          fill="currentColor"
                        />
                      </g>
                      <defs>
                        <clipPath id="clip0_4082_5186_bottom">
                          <rect width="16" height="16" fill="white" />
                        </clipPath>
                      </defs>
                    </svg>
                    <span className="text-xs text-gray-500">Shopping Muse</span>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleAISearch}
                    disabled={!searchQuery.trim() || state.loading}
                    className="rounded-full bg-black text-white hover:bg-gray-800 px-4 h-8"
                  >
                    {state.loading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M7.99999 1.33334V14.6667M7.99999 14.6667L14.6667 8.00001M7.99999 14.6667L1.33333 8.00001"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
