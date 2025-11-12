export interface DYApiCredentials {
  apiKey: string
  dyid: string
  dyidServer: string
}

export interface DYProduct {
  name: string
  brand?: string
  price: number
  image_url: string
  url: string
  sku?: string
  category?: string
  description?: string
}

export interface DYProductSlot {
  productData: DYProduct
}

export interface DYFacetValue {
  name: string
  count: number
}

export interface DYFacet {
  column: string
  displayName: string
  values: DYFacetValue[]
  min?: number
  max?: number
}

export interface DYSearchResponse {
  choices?: Array<{
    variations?: Array<{
      payload?: {
        data?: {
          slots: DYProductSlot[]
          facets: DYFacet[]
          totalNumResults: number
        }
      }
    }>
  }>
}

export interface SearchFilters {
  [key: string]: Set<string>
}
