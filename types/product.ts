export interface Product {
  listing_id: number
  title: string
  description: string
  price: {
    amount: number
    divisor: number
    currency_code: string
  }
  images: Array<{
    listing_image_id?: number
    url_570xN: string
    url_fullxfull?: string
    alt_text: string
    cache_key?: string
  }>
  tags: string[]
  state: "active" | "inactive" | "draft"
  views?: number
  sold?: number
  quantity: number
  created_timestamp: number
  last_modified_timestamp: number
  shop_id: number
  url: string
  metrics?: {
    views: number
    favorites: number
    sold: number
  }
  taxonomy_id?: number
  shipping_profile_id?: number
  is_personalizable?: boolean
  personalization_is_required?: boolean
  personalization_instructions?: string
  materials?: string[]
}

export interface CreateProductForm {
  title: string
  description: string
  price: number
  quantity: number
  tags: string[]
  materials: string[]
  who_made: "i_did" | "someone_else" | "collective"
  when_made: string
  taxonomy_id: number
  shipping_profile_id: number
  is_personalizable: boolean
  personalization_is_required: boolean
  personalization_instructions: string
}

export interface TaxonomyNode {
  id: number
  level: number
  name: string
  parent_id: number | null
  path: string[]
  children?: TaxonomyNode[]
}

export interface EtsyStore {
  shop_id: number
  shop_name: string
} 