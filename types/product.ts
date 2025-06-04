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
  has_variations?: boolean
  variations?: ProductVariation[]
  inventory?: ProductInventory
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
  processing_profile_id: number
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
  has_variations?: boolean
  variations?: ProductVariation[]
  inventory?: ProductInventory
}

// Varyasyon tipleri
export interface ProductVariation {
  property_id: number
  property_name: string
  values: string[]
  options: {
    value: string
    disabled?: boolean
  }[]
}

export interface ProductVariationOption {
  value: string
}

export interface ProductInventory {
  products: ProductInventoryItem[]
  price_varies: boolean
  quantity_varies: boolean
}

export interface ProductInventoryItem {
  property_values: {
    property_id: number
    property_name: string
    value: string
  }[]
  price: {
    amount: number
    divisor: number
    currency_code: string
  }
  quantity: number
  is_enabled: boolean
}

export interface ProductInventoryPropertyValue {
  property_id: number
  property_name: string
  value_id?: number
  value: string
}

// Etsy API'sine gönderilecek inventory payload tipi
export interface EtsyInventoryPayload {
  products: EtsyInventoryProduct[]
  price_on_property: number[]
  quantity_on_property: number[]
  sku_on_property: number[]
}

// Standart varyasyon seçenekleri
export const DEFAULT_SIZE_OPTIONS = [
  "8\"x12\" - 20x30 cm",
  "14\"x20\" - 35x50cm",
  "16\"x24\" - 40x60cm",
  "20\"x28\" - 50x70cm",
  "24\"x36\" - 60x90cm",
  "28\"x40\" - 70x100cm",
  "32\"x48\" - 80x120cm",
  "36\"x51\" - 90x130cm"
];

export const DEFAULT_FRAME_OPTIONS = [
  "Roll",
  "Standard Canvas",
  "White Frame",
  "Gold Frame",
  "Silver Frame",
  "Black Frame"
];

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

export interface EtsyInventoryPropertyValue {
  property_id: number;
  property_name: string;
  values: string[];
}

export interface EtsyInventoryProduct {
  sku: string;
  property_values: EtsyInventoryPropertyValue[];
  offerings: {
    price: number;
    quantity: number;
    is_enabled: boolean;
  }[];
}

export interface CreateListingResponse {
  success: boolean;
  message?: string;
  listing_id?: number;
  listing?: {
    listing_id: number;
    title: string;
    description: string;
    state: string;
    url: string;
    price: {
      amount: number;
      divisor: number;
      currency_code: string;
    };
  };
  error?: string;
  details?: string;
} 