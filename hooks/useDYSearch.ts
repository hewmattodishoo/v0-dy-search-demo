"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { buildApiEndpoints, type ApiRegion } from "../utils/api-urls"

const PRESETS = {
  custom: "",
  MK: "a864b4b17b0110f5c0de0a7c38a5428582a3faf21e45090e2da96c3bffb90465",
  Myer: "e4f19ded7379acd82070b48749efee858e7acb6a6f508552989ca93da843f951",
}

const WARMUP_KEYWORDS = ["shoes", "jacket", "pants", "shirt", "skirt", "blouse", "sweater", "jeans", "boots", "handbag"]

const DEFAULT_AI_TRIGGER_WORDS = [
  "how",
  "for",
  "of",
  "what",
  "why",
  "when",
  "where",
  "who",
  "which",
  "whose",
  "can",
  "could",
  "would",
  "should",
  "will",
  "might",
  "may",
  "do",
  "does",
  "did",
  "i",
  "me",
  "my",
  "mine",
  "we",
  "us",
  "our",
  "ours",
  "you",
  "your",
  "yours",
  "is",
  "are",
  "was",
  "were",
  "am",
  "be",
  "being",
  "been",
  "explain",
  "show",
  "tell",
  "find",
  "give",
  "help",
  "recommend",
  "suggest",
  "guide",
  "want",
  "need",
  "looking",
  "interested",
  "like",
  "prefer",
  "buy",
  "purchase",
  "compare",
  "versus",
  "vs",
  "difference",
  "better",
  "cheaper",
  "best",
  "top",
  "price",
  "cost",
  "sale",
  "discount",
  "deal",
  "offer",
  "promo",
  "size",
  "fit",
  "color",
  "availability",
  "in stock",
  "shipping",
  "delivery",
  "return",
  "refund",
  "warranty",
  "guarantee",
  "above",
  "below",
  "under",
  "over",
  "between",
  "around",
  "near",
  "close to",
  "how do I",
  "can I",
  "should I",
  "do you",
  "what is",
  "which one",
  "tell me",
  "step by step",
  "walk me through",
  "help me",
  "how much",
  "how long",
  "how to",
]

const DEFAULT_QUICK_ACTIONS = [
  "Long red dress",
  "Shirt dress",
  "Elegant men's shirt",
  "Shoulder bag",
  "I'm looking for Shirt Dress and Dress Shirt",
  "How to dress for a party?",
  "I want to dress like Dua Lipa",
  "A wardrobe of dresses in different styles",
]

const searchCache = new Map<string, any>()

interface ConversationTurn {
  id: string
  userMessage: string
  displayMessage?: string
  assistantMessage: string
  widgets: Array<{ title: string; slots: any[] }>
  contextProducts: Array<{ messageIndex: number; product: any }>
  timestamp: Date
  products: any[]
}

export function useDYSearch() {
  const [state, setState] = useState({
    preset: "MK",
    apiKey: PRESETS.MK,
    dyid: "",
    dyidServer: "",
    locale: "none",
    region: "com" as ApiRegion,
    currencySymbol: "$", // Added currency symbol to state with default dollar sign
    queryText: "",
    originalQuery: "",
    spellCheckedQuery: "",
    enableSpellCheck: true,
    visualSearchImage: null as string | null,
    results: [],
    facets: [],
    total: 0,
    loading: false,
    isLoadingMore: false,
    itemsPerPage: 12,
    page: 1,
    sort: "relevance",
    expanded: {},
    selected: {},
    logic: {},
    priceBounds: [0, 1000],
    priceFrom: 0,
    priceTo: 1000,
    usePrice: false,
    hasSearched: false,
    isWarming: false,
    searchType: "text" as "text" | "visual" | "ai",
    cookies: {
      dyid_server: "",
      dyjsession: "",
    },
    isFirstSearch: true,
    debugMode: false,
    debugLogs: [] as any[],
    aiMode: false,
    aiTriggerWords: DEFAULT_AI_TRIGGER_WORDS,
    quickActions: DEFAULT_QUICK_ACTIONS,
    chatId: null as string | null,
    aiRequestCount: 0,
    chatHistory: [] as Array<{ type: "user" | "assistant"; message: string; timestamp: Date }>,
    widgets: [] as Array<{ title: string; slots: any[] }>,
    assistantMessage: "",
    contextProducts: [] as Array<{ messageIndex: number; product: any }>,
    conversationTurns: [] as ConversationTurn[],
    currentTurnIndex: -1,
    navigationIndex: 0,
    horizontalDisplayMode: false,
  })

  const chatIdRef = useRef<string | null>(null)
  const currentRequestRef = useRef<AbortController | null>(null)
  const lastRequestIdRef = useRef<string>("")
  const isRequestInProgressRef = useRef<boolean>(false)
  const loadedProductIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    chatIdRef.current = state.chatId
  }, [state.chatId])

  const getApiEndpoints = useCallback(() => {
    return buildApiEndpoints(state.region)
  }, [state.region])

  const buildFilters = useCallback(() => {
    const arr = []
    for (const f in state.selected) {
      const set = state.selected[f]
      if (set && set.size) {
        const lg = state.logic[f] || "OR"
        if (lg === "AND" && set.size > 1) {
          set.forEach((v) => arr.push({ field: f, values: [v] }))
        } else {
          arr.push({ field: f, values: Array.from(set) })
        }
      }
    }

    if (state.usePrice) {
      arr.push({
        field: "price",
        min: state.priceFrom,
        max: state.priceTo,
      })
    }

    return arr
  }, [state.selected, state.logic, state.usePrice, state.priceFrom, state.priceTo])

  const buildSortObj = useCallback(() => {
    if (state.sort === "price_asc") return { field: "price", order: "asc" }
    if (state.sort === "price_desc") return { field: "price", order: "desc" }
    if (state.sort === "popularity_desc") return { field: "popularity", order: "desc" }
    return null
  }, [state.sort])

  const containsAITriggerWords = useCallback(
    (query: string) => {
      const lowerQuery = query.toLowerCase()
      return state.aiTriggerWords.some((word) => {
        if (word.includes(" ")) {
          return lowerQuery.includes(word.toLowerCase())
        } else {
          const regex = new RegExp(`\\b${word.toLowerCase()}\\b`)
          return regex.test(lowerQuery)
        }
      })
    },
    [state.aiTriggerWords],
  )

  const generateCacheKey = useCallback(
    (
      searchTerm: string,
      imageBase64: string | null,
      page: number,
      sort: string,
      filters: any[],
      apiKey: string,
      enableSpellCheck: boolean,
      region: ApiRegion,
      isAI = false,
    ) => {
      const filtersStr = JSON.stringify(filters.sort((a, b) => a.field.localeCompare(b.field)))
      if (imageBase64) {
        const searchKey = `visual:${imageBase64.substring(0, 50)}`
        return `${apiKey}:${region}:${searchKey}:${sort}:${filtersStr}`
      } else if (isAI) {
        const searchKey = `ai:${searchTerm}`
        return `${apiKey}:${region}:${searchKey}`
      } else {
        const searchKey = `text:${searchTerm}:spellCheck=${enableSpellCheck}`
        return `${apiKey}:${region}:${searchKey}:${page}:${sort}:${filtersStr}`
      }
    },
    [],
  )

  const addDebugLog = useCallback(
    (type: "search" | "engagement" | "ai", method: string, url: string, body: any, response?: any) => {
      if (!state.debugMode) return
      if (!response) return

      const log = {
        id: Date.now().toString(),
        timestamp: new Date(),
        type,
        method,
        url,
        body,
        response,
      }

      setState((prev) => ({
        ...prev,
        debugLogs: [log, ...prev.debugLogs.slice(0, 49)],
      }))
    },
    [state.debugMode],
  )

  const performAISearch = useCallback(
    async (searchTerm: string, chatId?: string | null) => {
      console.log("=== performAISearch START ===")
      console.log("searchTerm:", searchTerm)
      console.log("chatId parameter:", chatId)

      if (!searchTerm || !state.apiKey) return null

      const endpoints = getApiEndpoints()
      const userDyid = state.cookies.dyid_server || state.dyid
      const sessionDy = state.cookies.dyjsession || state.dyid

      const queryObj = {
        text: searchTerm,
        ...(chatId && { chatId }),
      }

      console.log("Query object:", queryObj)

      const body = {
        query: queryObj,
        user: {
          dyid: userDyid,
          dyid_server: state.cookies.dyid_server || state.dyidServer,
          active_consent_accepted: true,
        },
        context: {
          page: {
            type: "HOMEPAGE",
            data: [],
            location: window.location.href,
            locale: state.locale === "none" ? "none" : state.locale || "none",
            referrer: document.referrer,
          },
          device: {
            userAgent: navigator.userAgent,
          },
        },
        session: {
          dy: sessionDy,
        },
        selector: {
          name: "Shopping Muse",
        },
        options: {
          returnAnalyticsMetadata: false,
          isImplicitClientData: false,
        },
      }

      console.log("Full request body:", JSON.stringify(body, null, 2))

      try {
        const response = await fetch(endpoints.assistant, {
          method: "POST",
          headers: {
            accept: "*/*",
            "content-type": "application/json",
            "dy-api-key": state.apiKey,
            "dy-explain": "internal",
          },
          body: JSON.stringify(body),
        })

        const j = await response.json()

        addDebugLog("ai", "POST", endpoints.assistant, body, j)

        const aiResult = j?.choices?.[0]?.variations?.[0]?.payload?.data
        console.log("AI Search result:", aiResult)
        console.log("ChatId in response:", aiResult?.chatId)

        if (j?.cookies && Array.isArray(j.cookies)) {
          const cookies = {
            dyid_server: state.cookies.dyid_server,
            dyjsession: state.cookies.dyjsession,
          }

          j.cookies.forEach((cookie) => {
            if (cookie.name === "_dyid_server") {
              cookies.dyid_server = cookie.value
            } else if (cookie.name === "_dyjsession") {
              cookies.dyjsession = cookie.value
            }
          })

          setState((prev) => ({
            ...prev,
            cookies,
            isFirstSearch: false,
          }))

          console.log("Updated cookies from AI response:", cookies)
        }

        console.log("=== performAISearch END ===")
        return aiResult
      } catch (error) {
        console.error("AI Search error:", error)
        return null
      }
    },
    [
      state.apiKey,
      state.dyid,
      state.dyidServer,
      state.locale,
      state.cookies.dyid_server,
      state.cookies.dyjsession,
      getApiEndpoints,
      addDebugLog,
    ],
  )

  const performSingleSearch = useCallback(
    async (searchTerm: string, imageBase64?: string | null, requestPage?: number) => {
      if ((!searchTerm && !imageBase64) || !state.apiKey) return null

      const currentPage = requestPage !== undefined ? requestPage : state.page

      const endpoints = getApiEndpoints()
      const filters = buildFilters()
      const sortObj = buildSortObj()
      const cacheKey = generateCacheKey(
        searchTerm,
        imageBase64 || null,
        currentPage,
        state.sort,
        filters,
        state.apiKey,
        state.enableSpellCheck,
        state.region,
      )

      const requestId = `${cacheKey}_${Date.now()}_${Math.random()}`

      console.log(`[SEARCH] Starting request ${requestId} for page ${currentPage}`)

      if (!imageBase64 && searchCache.has(cacheKey)) {
        console.log(`[SEARCH] Cache hit for: ${cacheKey}`)
        return searchCache.get(cacheKey)
      }

      if (currentRequestRef.current) {
        console.log(`[SEARCH] Cancelling previous request`)
        currentRequestRef.current.abort()
      }

      const abortController = new AbortController()
      currentRequestRef.current = abortController
      lastRequestIdRef.current = requestId

      const userDyid = state.cookies.dyid_server || state.dyid
      const sessionDy = state.cookies.dyjsession || state.dyid

      const body = {
        user: {
          dyid: userDyid,
          dyid_server: state.cookies.dyid_server || state.dyidServer,
          active_consent_accepted: true,
        },
        context: {
          page: {
            type: "HOMEPAGE",
            data: [],
            location: window.location.href,
            locale: state.locale === "none" ? "none" : state.locale || "none",
            referrer: document.referrer,
          },
          device: {
            userAgent: navigator.userAgent,
          },
        },
        session: {
          dy: sessionDy,
        },
        selector: {
          name: imageBase64 ? "Visual Search" : "Semantic Search",
        },
        options: {
          productData: {
            skusOnly: false,
          },
        },
        query: {
          ...(imageBase64
            ? { imageBase64 }
            : {
                text: searchTerm,
                enableSpellCheck: state.enableSpellCheck,
              }),
          ...(filters.length > 0 && { filters: filters }),
          ...(imageBase64
            ? {}
            : {
                pagination: {
                  offset: (currentPage - 1) * state.itemsPerPage,
                  numItems: state.itemsPerPage,
                },
              }),
        },
      }

      if (sortObj) body.query.sortBy = sortObj

      console.log(`[SEARCH] Request ${requestId} body:`, JSON.stringify(body, null, 2))

      try {
        const response = await fetch(endpoints.search, {
          method: "POST",
          headers: {
            accept: "*/*",
            "content-type": "application/json",
            "dy-api-key": state.apiKey,
            "dy-explain": "internal",
          },
          body: JSON.stringify(body),
          signal: abortController.signal,
        })

        if (abortController.signal.aborted) {
          console.log(`[SEARCH] Request ${requestId} was aborted`)
          return null
        }

        if (lastRequestIdRef.current !== requestId) {
          console.log(`[SEARCH] Request ${requestId} is stale, ignoring response`)
          return null
        }

        const j = await response.json()

        console.log(`[SEARCH] Request ${requestId} completed successfully`)

        addDebugLog("search", "POST", endpoints.search, body, j)

        const variation = j?.choices?.[0]?.variations?.[0]
        const result = variation?.payload?.data
        const facets = variation?.payload?.data?.facets || []

        console.log(`[SEARCH] Raw API response structure for ${requestId}:`, {
          choices: j?.choices?.length || 0,
          variations: j?.choices?.[0]?.variations?.length || 0,
          payloadData: !!variation?.payload?.data,
          facetsAtDataLevel: variation?.payload?.data?.facets?.length || 0,
          resultsCount: result?.slots?.length || 0,
        })

        const combinedResult = result
          ? {
              ...result,
              facets: facets,
              requestPage: currentPage,
            }
          : null

        if (j?.cookies && Array.isArray(j.cookies)) {
          const cookies = {
            dyid_server: state.cookies.dyid_server,
            dyjsession: state.cookies.dyjsession,
          }

          j.cookies.forEach((cookie) => {
            if (cookie.name === "_dyid_server") {
              cookies.dyid_server = cookie.value
            } else if (cookie.name === "_dyjsession") {
              cookies.dyjsession = cookie.value
            }
          })

          setState((prev) => ({
            ...prev,
            cookies,
            isFirstSearch: false,
          }))

          console.log(`[SEARCH] Updated cookies from response ${requestId}:`, cookies)
        }

        if (combinedResult && !imageBase64) {
          searchCache.set(cacheKey, combinedResult)
          console.log(`[SEARCH] Cached result for: ${cacheKey}`)

          if (searchCache.size > 100) {
            const firstKey = searchCache.keys().next().value
            searchCache.delete(firstKey)
          }
        }

        if (currentRequestRef.current === abortController) {
          currentRequestRef.current = null
        }

        return combinedResult
      } catch (error) {
        if (currentRequestRef.current === abortController) {
          currentRequestRef.current = null
        }

        if (error.name === "AbortError") {
          console.log(`[SEARCH] Request ${requestId} was cancelled`)
          return null
        }

        console.error(`[SEARCH] Request ${requestId} error:`, error)
        return null
      }
    },
    [
      state.apiKey,
      state.dyid,
      state.dyidServer,
      state.page,
      state.itemsPerPage,
      state.locale,
      state.cookies.dyid_server,
      state.cookies.dyjsession,
      state.enableSpellCheck,
      state.region,
      getApiEndpoints,
      buildFilters,
      buildSortObj,
      generateCacheKey,
      addDebugLog,
    ],
  )

  const createConversationTurn = useCallback(
    (
      userMessage: string,
      assistantMessage: string,
      widgets: any[],
      contextProducts: any[],
      displayMessage?: string,
    ): ConversationTurn => {
      const products = []
      widgets.forEach((widget) => {
        if (widget.slots && Array.isArray(widget.slots)) {
          products.push(...widget.slots)
        }
      })

      return {
        id: `turn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userMessage,
        displayMessage,
        assistantMessage,
        widgets,
        contextProducts,
        timestamp: new Date(),
        products,
      }
    },
    [],
  )

  const performAIModeSearch = useCallback(
    async (userQuery: string, isFollowUp = false) => {
      console.log("=== performAIModeSearch START ===")
      console.log("userQuery:", userQuery)
      console.log("isFollowUp:", isFollowUp)
      console.log("current state.chatId:", state.chatId)
      console.log("current aiRequestCount:", state.aiRequestCount)

      const newRequestCount = state.aiRequestCount + 1
      const chatIdToUse = newRequestCount === 1 ? null : state.chatId

      console.log("newRequestCount:", newRequestCount)
      console.log("chatIdToUse:", chatIdToUse)

      setState((prev) => ({
        ...prev,
        loading: true,
        hasSearched: true,
        searchType: "ai",
        aiMode: true,
        originalQuery: userQuery,
        aiRequestCount: newRequestCount,
      }))

      const result = await performAISearch(userQuery, chatIdToUse)
      console.log("AI Search result:", result)

      if (result) {
        const newChatId = result.chatId
        console.log("New chatId from response:", newChatId)

        let searchResults = []
        const facets = []
        let total = 0

        if (result.widgets && result.widgets.length > 0) {
          result.widgets.forEach((widget) => {
            if (widget.slots && Array.isArray(widget.slots)) {
              searchResults = [...searchResults, ...widget.slots]
            }
          })
          total = searchResults.length
        } else if (result.slots && Array.isArray(result.slots)) {
          searchResults = result.slots
          total = searchResults.length

          const singleWidget = {
            title: "Recommendations",
            slots: result.slots,
          }
          result.widgets = [singleWidget]
        }

        setState((prev) => {
          console.log("Updating state with new chatId:", newChatId)

          const newChatHistory = [
            ...prev.chatHistory,
            { type: "user", message: userQuery, timestamp: new Date() },
            {
              type: "assistant",
              message: result.assistant || "I found some great options for you!",
              timestamp: new Date(),
            },
          ]

          const newContextProducts = [...prev.contextProducts]
          if (prev.contextProduct) {
            newContextProducts.push({
              messageIndex: newChatHistory.length - 1,
              product: prev.contextProduct,
            })
          }

          const newTurn = createConversationTurn(
            userQuery,
            result.assistant || "I found some great options for you!",
            result.widgets || [],
            prev.contextProduct ? [{ messageIndex: newChatHistory.length - 1, product: prev.contextProduct }] : [],
            prev.shopTheStyleDisplay || undefined,
          )

          const newConversationTurns = [...prev.conversationTurns, newTurn]
          const newCurrentTurnIndex = newConversationTurns.length - 1

          return {
            ...prev,
            results: searchResults,
            facets: facets,
            total: total,
            widgets: result.widgets || [],
            assistantMessage: result.assistant || "",
            chatId: newChatId,
            chatHistory: newChatHistory,
            contextProducts: newContextProducts,
            conversationTurns: newConversationTurns,
            currentTurnIndex: newCurrentTurnIndex,
            navigationIndex: newCurrentTurnIndex,
            loading: false,
          }
        })
      } else {
        const errorMessage = "Sorry, I encountered an error. Please try again."
        setState((prev) => ({
          ...prev,
          results: [],
          facets: [],
          total: 0,
          widgets: [],
          assistantMessage: errorMessage,
          chatHistory: [
            ...prev.chatHistory,
            { type: "user", message: userQuery, timestamp: new Date() },
            { type: "assistant", message: errorMessage, timestamp: new Date() },
          ],
          loading: false,
        }))
      }
      console.log("=== performAIModeSearch END ===")
    },
    [performAISearch, state.chatId, state.aiRequestCount, createConversationTurn],
  )

  const warmupAndSearch = useCallback(
    async (userQuery: string) => {
      if (containsAITriggerWords(userQuery)) {
        setState((prev) => ({
          ...prev,
          loading: true,
          hasSearched: true,
          originalQuery: userQuery,
          searchType: "ai",
          aiMode: true,
        }))
        return performAIModeSearch(userQuery)
      }

      setState((prev) => ({
        ...prev,
        isWarming: true,
        loading: true,
        hasSearched: true,
        originalQuery: userQuery,
        searchType: "text",
        aiMode: false,
      }))

      for (let i = 0; i < 9; i++) {
        const randomKeyword = WARMUP_KEYWORDS[Math.floor(Math.random() * WARMUP_KEYWORDS.length)]
        await performSingleSearch(randomKeyword)
        await new Promise((resolve) => setTimeout(resolve, 300))
      }

      loadedProductIds.current.clear()
      setState((prev) => ({ ...prev, results: [], page: 1 }))

      const finalResult = await performSingleSearch(userQuery)

      if (finalResult) {
        const newState = {
          results: Array.isArray(finalResult.slots) ? finalResult.slots : [],
          facets: Array.isArray(finalResult.facets) ? finalResult.facets : [],
          total: finalResult.totalNumResults || 0,
          spellCheckedQuery: finalResult.spellCheckedQuery || userQuery,
          loading: false,
          isWarming: false,
        }

        if (Array.isArray(finalResult.slots)) {
          finalResult.slots.forEach((slot) => {
            const productId = slot.productData?.sku || slot.slotId
            if (productId) {
              loadedProductIds.current.add(productId)
            }
          })
        }

        const pf = (finalResult.facets || []).find((f) => f.column === "price")
        if (pf && pf.min !== undefined && pf.max !== undefined) {
          newState.priceBounds = [pf.min, pf.max]
          if (!state.usePrice) {
            newState.priceFrom = pf.min
            newState.priceTo = pf.max
          }
        }

        setState((prev) => ({ ...prev, ...newState }))
      } else {
        setState((prev) => ({
          ...prev,
          results: [],
          facets: [],
          total: 0,
          spellCheckedQuery: userQuery,
          loading: false,
          isWarming: false,
        }))
      }
    },
    [performSingleSearch, state.usePrice, containsAITriggerWords, performAIModeSearch],
  )

  const visualSearchInProgress = useRef(false)

  const performVisualSearch = useCallback(
    async (imageBase64: string) => {
      if (visualSearchInProgress.current) {
        console.log("Visual search already in progress, skipping...")
        return
      }

      visualSearchInProgress.current = true

      loadedProductIds.current.clear()

      setState((prev) => ({
        ...prev,
        loading: true,
        hasSearched: true,
        visualSearchImage: imageBase64,
        searchType: "visual",
        aiMode: false,
        spellCheckedQuery: "",
        originalQuery: "",
        page: 1,
        results: [],
      }))

      try {
        const result = await performSingleSearch("", imageBase64)

        if (result) {
          const newState = {
            results: Array.isArray(result.slots) ? result.slots : [],
            facets: Array.isArray(result.facets) ? result.facets : [],
            total: result.totalNumResults || 0,
            loading: false,
          }

          if (Array.isArray(result.slots)) {
            result.slots.forEach((slot) => {
              const productId = slot.productData?.sku || slot.slotId
              if (productId) {
                loadedProductIds.current.add(productId)
              }
            })
          }

          const pf = (result.facets || []).find((f) => f.column === "price")
          if (pf && pf.min !== undefined && pf.max !== undefined) {
            newState.priceBounds = [pf.min, pf.max]
            if (!state.usePrice) {
              newState.priceFrom = pf.min
              newState.priceTo = pf.max
            }
          }

          setState((prev) => ({ ...prev, ...newState }))
        } else {
          setState((prev) => ({
            ...prev,
            results: [],
            facets: [],
            total: 0,
            loading: false,
          }))
        }
      } catch (error) {
        console.error("Visual search error:", error)
        setState((prev) => ({
          ...prev,
          results: [],
          facets: [],
          total: 0,
          loading: false,
        }))
      } finally {
        visualSearchInProgress.current = false
      }
    },
    [performSingleSearch, state.usePrice],
  )

  const fetchData = useCallback(async () => {
    if (state.searchType === "ai") {
      return
    } else if (state.searchType === "visual" && state.visualSearchImage) {
      setState((prev) => ({ ...prev, loading: true }))
      const result = await performSingleSearch("", state.visualSearchImage)

      if (result) {
        const newState = {
          results: Array.isArray(result.slots) ? result.slots : [],
          facets: Array.isArray(result.facets) ? result.facets : [],
          total: result.totalNumResults || 0,
          loading: false,
        }

        const pf = (result.facets || []).find((f) => f.column === "price")
        if (pf && pf.min !== undefined && pf.max !== undefined) {
          newState.priceBounds = [pf.min, pf.max]
          if (!state.usePrice) {
            newState.priceFrom = pf.min
            newState.priceTo = pf.max
          }
        }

        setState((prev) => ({ ...prev, ...newState }))
      } else {
        setState((prev) => ({
          ...prev,
          results: [],
          facets: [],
          total: 0,
          loading: false,
        }))
      }
    } else if (state.searchType === "text") {
      const kw = state.queryText.trim()
      if (!kw || !state.apiKey) return

      if (isRequestInProgressRef.current) {
        console.log("[FETCH] Request already in progress, skipping...")
        return
      }

      isRequestInProgressRef.current = true

      try {
        const requestPage = state.page

        console.log(`[FETCH] Starting fetchData for page ${requestPage}`)

        if (requestPage === 1) {
          loadedProductIds.current.clear()
          setState((prev) => ({
            ...prev,
            loading: true,
            hasSearched: true,
            originalQuery: kw,
          }))
        } else {
          setState((prev) => ({
            ...prev,
            isLoadingMore: true,
          }))
        }

        const result = await performSingleSearch(kw, null, requestPage)

        if (result) {
          const newResults = Array.isArray(result.slots) ? result.slots : []
          const resultPage = result.requestPage || requestPage

          console.log(`[FETCH] Got ${newResults.length} results for page ${resultPage}`)

          setState((prev) => {
            if (resultPage !== requestPage) {
              console.log(
                `[FETCH] Page mismatch: expected ${requestPage}, got ${resultPage}, current page is ${prev.page}`,
              )
              return prev
            }

            const filteredResults = newResults.filter((slot) => {
              const productId = slot.productData?.sku || slot.slotId
              if (!productId) return true

              if (loadedProductIds.current.has(productId)) {
                console.log(`[FETCH] Filtering out duplicate product: ${productId}`)
                return false
              }

              loadedProductIds.current.add(productId)
              return true
            })

            console.log(`[FETCH] Filtered ${newResults.length} results to ${filteredResults.length} unique products`)

            const newState = {
              results: resultPage === 1 ? filteredResults : [...prev.results, ...filteredResults],
              facets: Array.isArray(result.facets) ? result.facets : [],
              total: result.totalNumResults || 0,
              spellCheckedQuery: result.spellCheckedQuery || kw,
              loading: false,
              isLoadingMore: false,
            }

            console.log(`[FETCH] Updating state: page ${resultPage}, total results: ${newState.results.length}`)

            const pf = (result.facets || []).find((f) => f.column === "price")
            if (pf && pf.min !== undefined && pf.max !== undefined) {
              newState.priceBounds = [pf.min, pf.max]
              if (!prev.usePrice) {
                newState.priceFrom = pf.min
                newState.priceTo = pf.max
              }
            }

            return { ...prev, ...newState }
          })
        } else {
          setState((prev) => ({
            ...prev,
            results: requestPage === 1 ? [] : prev.results,
            facets: requestPage === 1 ? [] : prev.facets,
            total: requestPage === 1 ? 0 : prev.total,
            spellCheckedQuery: kw,
            loading: false,
            isLoadingMore: false,
          }))
        }
      } finally {
        isRequestInProgressRef.current = false
      }
    }
  }, [
    performSingleSearch,
    state.queryText,
    state.apiKey,
    state.usePrice,
    state.searchType,
    state.visualSearchImage,
    state.page,
  ])

  const searchWithOriginalQuery = useCallback(() => {
    if (!state.originalQuery) return

    loadedProductIds.current.clear()

    setState((prev) => ({
      ...prev,
      enableSpellCheck: false,
      loading: true,
      spellCheckedQuery: state.originalQuery,
    }))

    performSingleSearch(state.originalQuery).then((result) => {
      if (result) {
        const newResults = Array.isArray(result.slots) ? result.slots : []

        newResults.forEach((slot) => {
          const productId = slot.productData?.sku || slot.slotId
          if (productId) {
            loadedProductIds.current.add(productId)
          }
        })

        setState((prev) => ({
          ...prev,
          results: newResults,
          facets: Array.isArray(result.facets) ? result.facets : [],
          total: result.totalNumResults || 0,
          loading: false,
        }))
      } else {
        setState((prev) => ({
          ...prev,
          results: [],
          facets: [],
          total: 0,
          loading: false,
        }))
      }
    })
  }, [state.originalQuery, performSingleSearch])

  const enableAIMode = useCallback(() => {
    setState((prev) => ({
      ...prev,
      aiMode: true,
      searchType: "ai",
      chatHistory: [],
      chatId: null,
      aiRequestCount: 0,
      widgets: [],
      assistantMessage: "",
      conversationTurns: [],
      currentTurnIndex: -1,
      navigationIndex: 0,
    }))
  }, [])

  const disableAIMode = useCallback(() => {
    setState((prev) => ({
      ...prev,
      aiMode: false,
      searchType: "text",
      chatHistory: [],
      chatId: null,
      aiRequestCount: 0,
      widgets: [],
      assistantMessage: "",
      conversationTurns: [],
      currentTurnIndex: -1,
      navigationIndex: 0,
    }))
  }, [])

  const sendFollowUpMessage = useCallback(
    (message: string) => {
      performAIModeSearch(message, true)
    },
    [performAIModeSearch],
  )

  const navigateToTurn = useCallback(
    (turnIndex: number) => {
      if (turnIndex < 0 || turnIndex >= state.conversationTurns.length) return

      const turn = state.conversationTurns[turnIndex]
      setState((prev) => ({
        ...prev,
        currentTurnIndex: turnIndex,
        navigationIndex: turnIndex,
        widgets: turn.widgets,
        assistantMessage: turn.assistantMessage,
        contextProducts: turn.contextProducts,
        results: turn.products,
      }))
    },
    [state.conversationTurns],
  )

  const navigatePrevious = useCallback(() => {
    if (state.navigationIndex > 0) {
      navigateToTurn(state.navigationIndex - 1)
    }
  }, [state.navigationIndex, navigateToTurn])

  const navigateNext = useCallback(() => {
    if (state.navigationIndex < state.conversationTurns.length - 1) {
      navigateToTurn(state.navigationIndex + 1)
    }
  }, [state.navigationIndex, state.conversationTurns.length, navigateToTurn])

  const getCurrentTurn = useCallback(() => {
    if (state.currentTurnIndex >= 0 && state.currentTurnIndex < state.conversationTurns.length) {
      return state.conversationTurns[state.currentTurnIndex]
    }
    return null
  }, [state.currentTurnIndex, state.conversationTurns])

  const canNavigatePrevious = useCallback(() => {
    return state.navigationIndex > 0
  }, [state.navigationIndex])

  const canNavigateNext = useCallback(() => {
    return state.navigationIndex < state.conversationTurns.length - 1
  }, [state.navigationIndex, state.conversationTurns.length])

  const updateState = useCallback((updates) => {
    setState((prev) => {
      const newUpdates = typeof updates === "function" ? updates(prev) : updates
      return { ...prev, ...newUpdates }
    })
  }, [])

  const setPriceRange = useCallback((min: number, max: number) => {
    setState((prev) => ({
      ...prev,
      priceFrom: min,
      priceTo: max,
      usePrice: min !== prev.priceBounds[0] || max !== prev.priceBounds[1],
      page: 1,
    }))
  }, [])

  const clearDebugLogs = useCallback(() => {
    setState((prev) => ({ ...prev, debugLogs: [] }))
  }, [])

  const isInitialized = useRef(false)

  useEffect(() => {
    isInitialized.current = true
  }, [])

  useEffect(() => {
    return () => {
      if (currentRequestRef.current) {
        currentRequestRef.current.abort()
      }
    }
  }, [])

  useEffect(() => {
    if (!isInitialized.current) return

    if (state.searchType === "text" && state.queryText && state.hasSearched) {
      const kw = state.queryText.trim()
      if (!kw || !state.apiKey) return

      console.log(`[EFFECT] Triggering fetchData for query: "${kw}", page: ${state.page}`)
      fetchData()
    }
  }, [
    state.searchType,
    state.queryText,
    state.page,
    state.sort,
    state.selected,
    state.usePrice,
    state.priceFrom,
    state.priceTo,
    state.hasSearched,
    state.apiKey,
    state.region,
    fetchData,
  ])

  const performDirectAISearch = useCallback(
    async (userQuery: string) => {
      return performAIModeSearch(userQuery, false)
    },
    [performAIModeSearch],
  )

  return {
    state,
    updateState,
    fetchData,
    warmupAndSearch,
    performVisualSearch,
    setPriceRange,
    searchWithOriginalQuery,
    addDebugLog,
    clearDebugLogs,
    enableAIMode,
    disableAIMode,
    sendFollowUpMessage,
    performAIModeSearch,
    performDirectAISearch,
    navigateToTurn,
    navigatePrevious,
    navigateNext,
    getCurrentTurn,
    canNavigatePrevious,
    canNavigateNext,
    presets: PRESETS,
  }
}
