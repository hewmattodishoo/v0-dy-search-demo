export type ApiRegion = "com" | "eu"

export interface ApiEndpoints {
  search: string
  assistant: string
  suggest: string
  engagement: string
}

export function buildApiEndpoints(region: ApiRegion = "com"): ApiEndpoints {
  const tld = region === "eu" ? "eu" : "com"

  return {
    search: `https://direct.dy-api.${tld}/v2/serve/user/search`,
    assistant: `https://direct.dy-api.${tld}/v2/serve/user/assistant`,
    suggest: `https://dy-api.${tld}/v2/serve/user/suggest`,
    engagement: `https://direct-collect.dy-api.${tld}/v2/collect/user/engagement`,
  }
}
