import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { apiKey, queries, count = 50, region = "com" } = body

    if (!apiKey) {
      return NextResponse.json({ success: false, error: "API key is required" }, { status: 400 })
    }

    if (!queries || queries.length === 0) {
      return NextResponse.json({ success: false, error: "At least one query is required" }, { status: 400 })
    }

    const baseUrl = region === "eu" ? "https://direct.dy-api.eu" : "https://direct.dy-api.com"
    const apiEndpoint = `${baseUrl}/v2/serve/user/suggest`

    const results = {
      total: queries.length * count,
      successful: 0,
      failed: 0,
      queries: [] as any[],
    }

    // Process each query
    for (const query of queries) {
      const queryResults = {
        query,
        successful: 0,
        failed: 0,
      }

      // Make 'count' requests for this query
      for (let i = 0; i < count; i++) {
        try {
          const payload = {
            user: {
              active_consent_accepted: true,
              dyid: `traffic-gen-${Date.now()}-${i}`,
              dyid_server: `traffic-gen-${Date.now()}-${i}`,
            },
            session: {
              dy: `session-${Date.now()}-${i}`,
            },
            query: {
              suggestions: [
                {
                  type: "querySuggestions",
                  maxResults: 10,
                },
              ],
              text: query,
            },
            context: {
              page: {
                locale: "en_US",
              },
            },
          }

          const response = await fetch(apiEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "DY-API-Key": apiKey,
            },
            body: JSON.stringify(payload),
          })

          if (response.ok) {
            queryResults.successful++
            results.successful++
          } else {
            queryResults.failed++
            results.failed++
          }

          // Small delay to avoid overwhelming the API
          if (i < count - 1) {
            await new Promise((resolve) => setTimeout(resolve, 50))
          }
        } catch (error) {
          queryResults.failed++
          results.failed++
        }
      }

      results.queries.push(queryResults)
    }

    return NextResponse.json({
      success: true,
      data: results,
    })
  } catch (error) {
    console.error("[v0] Traffic generation error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
