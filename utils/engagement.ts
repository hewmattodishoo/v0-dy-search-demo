import { buildApiEndpoints, type ApiRegion } from "./api-urls"

export async function sendEngagement(
  slotId: string,
  dyid: string,
  dyidServer: string,
  sessionDy: string,
  apiKey: string,
  addDebugLog?: (type: string, method: string, url: string, body: any, response?: any) => void,
  region: ApiRegion = "com",
) {
  if (!slotId || !apiKey) {
    console.warn("Missing slotId or apiKey for engagement tracking")
    return
  }

  const endpoints = buildApiEndpoints(region)

  const body = {
    user: {
      dyid: dyid,
      dyid_server: dyidServer,
      active_consent_accepted: true,
    },
    context: {
      page: {
        type: "HOMEPAGE",
        data: [],
        location: window.location.href,
        referrer: document.referrer,
      },
      device: {
        userAgent: navigator.userAgent,
      },
    },
    session: {
      dy: sessionDy,
    },
    events: [
      {
        name: "Product Click",
        properties: {
          slotId: slotId,
          timestamp: new Date().toISOString(),
        },
      },
    ],
  }

  try {
    const response = await fetch(endpoints.engagement, {
      method: "POST",
      headers: {
        accept: "*/*",
        "content-type": "application/json",
        "dy-api-key": apiKey,
      },
      body: JSON.stringify(body),
    })

    const result = await response.json()

    // Add debug logging if function is provided
    if (addDebugLog) {
      addDebugLog("engagement", "POST", endpoints.engagement, body, result)
    }

    console.log("Engagement sent successfully:", result)
    return result
  } catch (error) {
    console.error("Failed to send engagement:", error)
    return null
  }
}
