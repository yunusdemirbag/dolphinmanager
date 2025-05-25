export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          etsy_shop_name: string | null
          etsy_shop_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          etsy_shop_name?: string | null
          etsy_shop_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          etsy_shop_name?: string | null
          etsy_shop_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          price: number
          currency: string
          stock_quantity: number
          etsy_listing_id: string | null
          images: string[] | null
          tags: string[] | null
          category: string | null
          status: "active" | "inactive" | "draft"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          price: number
          currency?: string
          stock_quantity?: number
          etsy_listing_id?: string | null
          images?: string[] | null
          tags?: string[] | null
          category?: string | null
          status?: "active" | "inactive" | "draft"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          price?: number
          currency?: string
          stock_quantity?: number
          etsy_listing_id?: string | null
          images?: string[] | null
          tags?: string[] | null
          category?: string | null
          status?: "active" | "inactive" | "draft"
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          customer_name: string
          customer_email: string
          product_id: string
          quantity: number
          total_amount: number
          currency: string
          status: "pending" | "processing" | "shipped" | "delivered" | "cancelled"
          etsy_order_id: string | null
          shipping_address: any | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          customer_name: string
          customer_email: string
          product_id: string
          quantity: number
          total_amount: number
          currency?: string
          status?: "pending" | "processing" | "shipped" | "delivered" | "cancelled"
          etsy_order_id?: string | null
          shipping_address?: any | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          customer_name?: string
          customer_email?: string
          product_id?: string
          quantity?: number
          total_amount?: number
          currency?: string
          status?: "pending" | "processing" | "shipped" | "delivered" | "cancelled"
          etsy_order_id?: string | null
          shipping_address?: any | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      analytics: {
        Row: {
          id: string
          user_id: string
          product_id: string | null
          metric_type: "view" | "favorite" | "sale" | "revenue"
          value: number
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id?: string | null
          metric_type: "view" | "favorite" | "sale" | "revenue"
          value: number
          date: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string | null
          metric_type?: "view" | "favorite" | "sale" | "revenue"
          value?: number
          date?: string
          created_at?: string
        }
      }
      etsy_images: {
        Row: {
          id: number
          listing_id: number
          image_url: string
          local_path: string
          original_url: string
          cached_at: string
          last_updated: string
          status: string
        }
        Insert: {
          id?: number
          listing_id: number
          image_url: string
          local_path: string
          original_url: string
          cached_at?: string
          last_updated?: string
          status?: string
        }
        Update: {
          id?: number
          listing_id?: number
          image_url?: string
          local_path?: string
          original_url?: string
          cached_at?: string
          last_updated?: string
          status?: string
        }
      }
      cron_logs: {
        Row: {
          id: string
          task_name: string
          result: string
          details: any
          created_at: string
        }
        Insert: {
          id?: string
          task_name: string
          result: string
          details?: any
          created_at?: string
        }
        Update: {
          id?: string
          task_name?: string
          result?: string
          details?: any
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
