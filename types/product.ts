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
    listing_image_id: number
    url_570xN: string
    url_fullxfull?: string
    alt_text: string
    cache_key?: string
  }>
  video?: {
    video_id: number
    url: string
    thumbnail_url: string
  }
  tags: string[]
  materials: string[]
  who_made: "i_did" | "someone_else" | "collective"
  when_made: string
  taxonomy_id: number
  shipping_profile_id?: number
  is_personalizable: boolean
  personalization_is_required: boolean
  personalization_instructions: string
  primary_color?: string
  secondary_color?: string
  width?: number
  width_unit?: string
  height?: number
  height_unit?: string
  min_processing_days?: number
  max_processing_days?: number
  style?: string[]
  occasion?: string[]
  holiday?: string
  shop_section_id?: number
  production_location?: string
  care_instructions?: string
  is_digital?: boolean
  digital_files?: Array<{
    file_id: number
    name: string
    size: number
    type: string
  }>
  language?: string
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
  processing_profile_id?: number
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
  primary_color?: string
  secondary_color?: string
  width?: number
  width_unit?: string
  height?: number
  height_unit?: string
  min_processing_days?: number
  max_processing_days?: number
  style?: string[]
  occasion?: string[]
  holiday?: string
  shop_section_id?: number
  production_location?: string
  care_instructions?: string
  is_digital?: boolean
  digital_files: File[]
  images: File[]
  video?: File | null
  image_alt_texts: string[]
  language?: string
  state: "active" | "draft"
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

export interface ShippingProfile {
  shipping_profile_id: number;
  title: string;
  user_id: number;
  min_processing_days: number;
  max_processing_days: number;
  processing_days_display_label: string;
  origin_country_iso: string;
  is_deleted: boolean;
  shipping_carrier_id: number;
  mail_class: string;
  min_delivery_days: number;
  max_delivery_days: number;
  destination_country_iso: string;
  destination_region: string;
  primary_cost: {
    amount: number;
    divisor: number;
    currency_code: string;
  };
  secondary_cost: {
    amount: number;
    divisor: number;
    currency_code: string;
  };
}

export interface EtsyProcessingProfile {
  processing_profile_id: number;
  title: string;
  user_id: number;
  min_processing_days: number;
  max_processing_days: number;
  processing_days_display_label: string;
  is_deleted: boolean;
} 