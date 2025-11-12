import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { apiKey, searchText, maxResults = 8, region = "com" } = body

    console.log("=== AUTOCOMPLETE API ROUTE ===")
    console.log("Region:", region)
    console.log("Search Text:", searchText || "(empty)")
    console.log("Max Results:", maxResults)

    // Use direct.dy-api for client-side keys
    const baseUrl = region === "eu" ? "https://direct.dy-api.eu" : "https://direct.dy-api.com"
    const apiEndpoint = `${baseUrl}/v2/serve/user/suggest`

    // Build the exact payload structure
    const payload = {
      user: {
        active_consent_accepted: false,
        dyid: "",
        dyid_server: "",
      },
      session: {
        dy: "",
      },
      query: {
        text: searchText,
        suggestions: [
          {
            type: "querySuggestions",
            maxResults: maxResults,
          },
        ],
      },
      context: {
        page: {
          locale: "en_us",
        },
      },
    }

    console.log("Request URL:", apiEndpoint)
    console.log("Payload:", JSON.stringify(payload, null, 2))

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "DY-API-Key": apiKey,
      },
      body: JSON.stringify(payload),
    })

    console.log("DY API Response Status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("DY API Error:", errorText)
      return NextResponse.json(
        {
          success: false,
          error: `DY API returned ${response.status}`,
          data: { suggestions: [] },
        },
        { status: 200 },
      )
    }

    const data = await response.json()
    console.log("DY API Response:", JSON.stringify(data, null, 2))

    // Extract suggestions from variations[0].payload.data.suggestions.querySuggestions
    let suggestions: { text: string }[] = []

    // The actual structure is: variations[0].payload.data.suggestions.querySuggestions
    if (data?.variations?.[0]?.payload?.data?.suggestions?.querySuggestions) {
      const querySuggestions = data.variations[0].payload.data.suggestions.querySuggestions
      suggestions = querySuggestions.map((s: any) => ({
        text: s.term || s.text || s,
      }))
      console.log("✅ Extracted", suggestions.length, "suggestions:", suggestions)
    } else {
      console.log("❌ No suggestions found in response structure")
      console.log("Response keys:", Object.keys(data))
      if (data.variations) {
        console.log("Variations[0] keys:", Object.keys(data.variations[0] || {}))
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        suggestions,
      },
    })
  } catch (error) {
    console.error("Autocomplete API route error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: { suggestions: [] },
      },
      { status: 200 },
    )
  }
}
