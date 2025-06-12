export interface Product {
  id?: number;
  title: string;
  description: string;
  price: {
    amount: number;
    divisor: number;
    currency_code: string;
  };
  quantity: number;
  shipping_profile_id?: number;
  tags: string[];
  images: Array<{
    url: string;
    url_570xN?: string;
    file?: File | null;
  }>;
  image_url?: string;
  etsy_listing_id?: number;
  video_url?: string;
  has_variations: boolean;
  variations?: Array<{
    size: string;
    pattern: string;
    price: number;
    is_active: boolean;
  }>;
  shop_section_id?: number;
  taxonomy_id?: number;
  is_personalizable?: boolean;
  personalization_is_required?: boolean;
  personalization_instructions?: string;
  primary_color?: string;
  secondary_color?: string;
  width?: number;
  width_unit?: string;
  height?: number;
  height_unit?: string;
  created_at?: string;
  updated_at?: string;
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
}

export interface TaxonomyNode {
  id: number;
  name: string;
  children?: TaxonomyNode[];
}

export interface EtsyStore {
  shop_id: number
  shop_name: string
}

export interface ShippingProfile {
  shipping_profile_id: number;
  title: string;
  min_processing_days: number;
  max_processing_days: number;
  processing_time_unit: string;
  origin_country_iso: string;
  primary_cost: number;
  secondary_cost: number;
  destination_country_iso?: string;
  destination_region?: string;
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