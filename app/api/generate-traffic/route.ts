import { type NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { queries, apiKey, region = "com" } = body

    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 })
    }

    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json({ error: "Queries array is required" }, { status: 400 })
    }

    const tld = region === "eu" ? "eu" : "com"
    const suggestUrl = `https://dy-api.${tld}/v2/serve/user/suggest`

    const results = {
      total: 0,
      successful: 0,
      failed: 0,
      details: [] as any[],
    }

    // Process queries with rate limiting
    for (const queryItem of queries) {
      const { term, count } = queryItem

      for (let i = 0; i < count; i++) {
        try {
          const response = await fetch(suggestUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "DY-API-Key": apiKey,
            },
            body: JSON.stringify({
              selector: {
                names: ["dy.search"],
              },
              user: {},
              context: {
                page: {
                  type: "PRODUCT_LISTING",
                  data: [],
                  locale: "en_US",
                },
                device: {
                  ip: "127.0.0.1",
                },
              },
              options: {
                queries: [
                  {
                    name: "dy.search",
                    params: {
                      searchString: term,
                    },
                  },
                ],
              },
            }),
          })

          results.total++

          if (response.ok) {
            results.successful++
          } else {
            results.failed++
            results.details.push({
              term,
              iteration: i + 1,
              error: `HTTP ${response.status}`,
            })
          }

          // Small delay to avoid overwhelming the API
          if (i < count - 1) {
            await new Promise((resolve) => setTimeout(resolve, 100))
          }
        } catch (error: any) {
          results.total++
          results.failed++
          results.details.push({
            term,
            iteration: i + 1,
            error: error.message,
          })
        }
      }
    }

    return NextResponse.json(results)
  } catch (error: any) {
    console.error("Traffic generation error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
