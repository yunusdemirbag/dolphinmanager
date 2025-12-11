export interface Product {
  id: string;
  user_id: string;
  shop_id: number;
  title: string;
  description: string;
  tags: string[];
  images: string[];
  variations: Array<{
    size: string;
    pattern: string;
    price: number;
    is_active: boolean;
  }>;
  category_id?: number;
  shop_section_id?: number;
  shipping_profile_id?: number;
  is_personalized: boolean;
  processing_min: number;
  processing_max: number;
  created_at: Date;
}

export interface CreateProductForm {
  title: string;
  description: string;
  tags: string[];
  quantity: number;
  taxonomy_id: number;
  shipping_profile_id: number;
  shop_section_id?: number;
  is_personalizable: boolean;
  personalization_is_required: boolean;
  personalization_instructions: string;
  has_variations: boolean;
  variations: Array<{
    size: string;
    pattern: string;
    price: number;
    is_active: boolean;
  }>;
  images: Array<{
    file: File;
    alt_text: string;
    rank: number;
  }>;
  video: File | null;
  materials: string[];
  who_made: string;
  when_made: string;
  state: string;
  action: string;
  created_at: string;
}

export interface TaxonomyNode {
  id: number;
  name: string;
  path: string[];
  level: number;
}

export interface ShippingProfile {
  shipping_profile_id: number;
  title: string;
  min_processing_days: number;
  max_processing_days: number;
}

export interface EtsyProcessingProfile {
  processing_min: number;
  processing_max: number;
}