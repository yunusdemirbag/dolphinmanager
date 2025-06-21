export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_prompt_cache: {
        Row: {
          created_at: string
          id: string
          input: string
          output: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          input: string
          output: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          input?: string
          output?: string
          type?: string
        }
        Relationships: []
      }
      api_logs: {
        Row: {
          details: Json | null
          duration_ms: number | null
          endpoint: string | null
          id: number
          method: string | null
          status_code: number | null
          success: boolean | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          details?: Json | null
          duration_ms?: number | null
          endpoint?: string | null
          id?: never
          method?: string | null
          status_code?: number | null
          success?: boolean | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          details?: Json | null
          duration_ms?: number | null
          endpoint?: string | null
          id?: never
          method?: string | null
          status_code?: number | null
          success?: boolean | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      books: {
        Row: {
          author: string | null
          created_at: string | null
          genre: string | null
          id: string
          pub_year: number | null
          publisher: string | null
          title: string
        }
        Insert: {
          author?: string | null
          created_at?: string | null
          genre?: string | null
          id?: string
          pub_year?: number | null
          publisher?: string | null
          title: string
        }
        Update: {
          author?: string | null
          created_at?: string | null
          genre?: string | null
          id?: string
          pub_year?: number | null
          publisher?: string | null
          title?: string
        }
        Relationships: []
      }
      cache: {
        Row: {
          created_at: string | null
          expires_at: string
          id: number
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: number
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: number
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      cache_data: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          key: string
          user_id: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          key: string
          user_id?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          key?: string
          user_id?: string | null
          value?: Json
        }
        Relationships: []
      }
      cron_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          result: string
          task_name: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          result: string
          task_name: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          result?: string
          task_name?: string
        }
        Relationships: []
      }
      etsy_auth: {
        Row: {
          access_token: string
          created_at: string | null
          etsy_user_id: string | null
          expires_at: string | null
          id: string
          refresh_token: string | null
          shop_id: string
          shop_info_etag: string | null
          shop_name: string | null
          token_type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          etsy_user_id?: string | null
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          shop_id: string
          shop_info_etag?: string | null
          shop_name?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          etsy_user_id?: string | null
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          shop_id?: string
          shop_info_etag?: string | null
          shop_name?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      etsy_auth_sessions: {
        Row: {
          code_verifier: string | null
          created_at: string | null
          id: string
          state: string | null
          user_id: string | null
        }
        Insert: {
          code_verifier?: string | null
          created_at?: string | null
          id?: string
          state?: string | null
          user_id?: string | null
        }
        Update: {
          code_verifier?: string | null
          created_at?: string | null
          id?: string
          state?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      etsy_cache: {
        Row: {
          created_at: string | null
          data: Json
          data_type: string
          id: number
          shop_id: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data: Json
          data_type: string
          id?: never
          shop_id?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json
          data_type?: string
          id?: never
          shop_id?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      etsy_images: {
        Row: {
          cached_at: string | null
          id: number
          image_url: string
          last_updated: string | null
          listing_id: number
          local_path: string
          original_url: string
          status: string | null
        }
        Insert: {
          cached_at?: string | null
          id?: number
          image_url: string
          last_updated?: string | null
          listing_id: number
          local_path: string
          original_url: string
          status?: string | null
        }
        Update: {
          cached_at?: string | null
          id?: number
          image_url?: string
          last_updated?: string | null
          listing_id?: number
          local_path?: string
          original_url?: string
          status?: string | null
        }
        Relationships: []
      }
      etsy_jobs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          job_type: string
          listing_id: number | null
          metadata: Json | null
          shop_id: number
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type: string
          listing_id?: number | null
          metadata?: Json | null
          shop_id: number
          status: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type?: string
          listing_id?: number | null
          metadata?: Json | null
          shop_id?: number
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      etsy_listings_data: {
        Row: {
          created_at: string | null
          data: Json | null
          id: number
          last_updated: string | null
          shop_id: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: number
          last_updated?: string | null
          shop_id: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: number
          last_updated?: string | null
          shop_id?: number
          user_id?: string | null
        }
        Relationships: []
      }
      etsy_payments_data: {
        Row: {
          created_at: string | null
          data: Json | null
          id: number
          last_updated: string | null
          shop_id: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: number
          last_updated?: string | null
          shop_id: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: number
          last_updated?: string | null
          shop_id?: number
          user_id?: string | null
        }
        Relationships: []
      }
      etsy_queue: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          image_files: Json
          listing_data: Json
          max_retries: number | null
          retry_count: number | null
          scheduled_for: string
          shop_id: number
          status: string | null
          user_id: string
          video_file: Json | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          image_files: Json
          listing_data: Json
          max_retries?: number | null
          retry_count?: number | null
          scheduled_for: string
          shop_id: number
          status?: string | null
          user_id: string
          video_file?: Json | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          image_files?: Json
          listing_data?: Json
          max_retries?: number | null
          retry_count?: number | null
          scheduled_for?: string
          shop_id?: number
          status?: string | null
          user_id?: string
          video_file?: Json | null
        }
        Relationships: []
      }
      etsy_receipts_data: {
        Row: {
          created_at: string | null
          data: Json | null
          id: number
          last_updated: string | null
          shop_id: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: number
          last_updated?: string | null
          shop_id: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: number
          last_updated?: string | null
          shop_id?: number
          user_id?: string | null
        }
        Relationships: []
      }
      etsy_shipping_profiles: {
        Row: {
          created_at: string | null
          etag: string | null
          id: string
          max_processing_time: number | null
          min_processing_time: number | null
          processing_time_unit: string | null
          shipping_profile_id: number
          shop_id: number
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          etag?: string | null
          id?: string
          max_processing_time?: number | null
          min_processing_time?: number | null
          processing_time_unit?: string | null
          shipping_profile_id: number
          shop_id: number
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          etag?: string | null
          id?: string
          max_processing_time?: number | null
          min_processing_time?: number | null
          processing_time_unit?: string | null
          shipping_profile_id?: number
          shop_id?: number
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      etsy_stats_data: {
        Row: {
          created_at: string | null
          data: Json | null
          id: number
          last_updated: string | null
          shop_id: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: number
          last_updated?: string | null
          shop_id: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: number
          last_updated?: string | null
          shop_id?: number
          user_id?: string | null
        }
        Relationships: []
      }
      etsy_store_data: {
        Row: {
          created_at: string | null
          data: Json | null
          id: number
          last_updated: string | null
          shop_id: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: number
          last_updated?: string | null
          shop_id: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: number
          last_updated?: string | null
          shop_id?: number
          user_id?: string | null
        }
        Relationships: []
      }
      etsy_stores: {
        Row: {
          access_token: string | null
          announcement: string | null
          avatar_url: string | null
          created_at: string | null
          currency_code: string | null
          id: number
          image_url_760x100: string | null
          is_active: boolean | null
          is_demo_data: boolean | null
          is_vacation: boolean | null
          last_synced_at: string | null
          listing_active_count: number | null
          num_favorers: number | null
          refresh_token: string | null
          review_average: number | null
          review_count: number | null
          shop_id: string
          shop_name: string | null
          title: string | null
          token_expires_at: string | null
          updated_at: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          announcement?: string | null
          avatar_url?: string | null
          created_at?: string | null
          currency_code?: string | null
          id?: never
          image_url_760x100?: string | null
          is_active?: boolean | null
          is_demo_data?: boolean | null
          is_vacation?: boolean | null
          last_synced_at?: string | null
          listing_active_count?: number | null
          num_favorers?: number | null
          refresh_token?: string | null
          review_average?: number | null
          review_count?: number | null
          shop_id: string
          shop_name?: string | null
          title?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          announcement?: string | null
          avatar_url?: string | null
          created_at?: string | null
          currency_code?: string | null
          id?: never
          image_url_760x100?: string | null
          is_active?: boolean | null
          is_demo_data?: boolean | null
          is_vacation?: boolean | null
          last_synced_at?: string | null
          listing_active_count?: number | null
          num_favorers?: number | null
          refresh_token?: string | null
          review_average?: number | null
          review_count?: number | null
          shop_id?: string
          shop_name?: string | null
          title?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      etsy_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string
          id: string
          refresh_token: string
          token_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at: string
          id?: string
          refresh_token: string
          token_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string
          token_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      etsy_uploads: {
        Row: {
          created_at: string | null
          has_variations: boolean | null
          id: string
          image_count: number | null
          listing_id: number | null
          shop_id: number | null
          state: string | null
          tags: string[] | null
          tags_tokens: number | null
          title: string | null
          title_tokens: number | null
          total_tokens: number | null
          upload_duration: number | null
          user_id: string
          variation_count: number | null
          video_count: number | null
        }
        Insert: {
          created_at?: string | null
          has_variations?: boolean | null
          id?: string
          image_count?: number | null
          listing_id?: number | null
          shop_id?: number | null
          state?: string | null
          tags?: string[] | null
          tags_tokens?: number | null
          title?: string | null
          title_tokens?: number | null
          total_tokens?: number | null
          upload_duration?: number | null
          user_id: string
          variation_count?: number | null
          video_count?: number | null
        }
        Update: {
          created_at?: string | null
          has_variations?: boolean | null
          id?: string
          image_count?: number | null
          listing_id?: number | null
          shop_id?: number | null
          state?: string | null
          tags?: string[] | null
          tags_tokens?: number | null
          title?: string | null
          title_tokens?: number | null
          total_tokens?: number | null
          upload_duration?: number | null
          user_id?: string
          variation_count?: number | null
          video_count?: number | null
        }
        Relationships: []
      }
      kitapgpt: {
        Row: {}
        Insert: {}
        Update: {}
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: number
          is_read: boolean | null
          message: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: never
          is_read?: boolean | null
          message?: string | null
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: never
          is_read?: boolean | null
          message?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: number
          order_id: number | null
          price: number | null
          product_id: number | null
          quantity: number | null
        }
        Insert: {
          created_at?: string | null
          id?: never
          order_id?: number | null
          price?: number | null
          product_id?: number | null
          quantity?: number | null
        }
        Update: {
          created_at?: string | null
          id?: never
          order_id?: number | null
          price?: number | null
          product_id?: number | null
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          id: number
          is_demo_data: boolean | null
          order_number: string | null
          status: string | null
          store_id: number | null
          total: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: never
          is_demo_data?: boolean | null
          order_number?: string | null
          status?: string | null
          store_id?: number | null
          total?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: never
          is_demo_data?: boolean | null
          order_number?: string | null
          status?: string | null
          store_id?: number | null
          total?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "etsy_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      pinned_media: {
        Row: {
          created_at: string
          file_name: string
          id: string
          public_url: string
          storage_path: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          public_url: string
          storage_path: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          public_url?: string
          storage_path?: string
          user_id?: string | null
        }
        Relationships: []
      }
      product_upload_queue: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          etsy_listing_id: number | null
          id: string
          image_paths: string[]
          listing_data: Json
          progress: number | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          etsy_listing_id?: number | null
          id?: string
          image_paths: string[]
          listing_data: Json
          progress?: number | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          etsy_listing_id?: number | null
          id?: string
          image_paths?: string[]
          listing_data?: Json
          progress?: number | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      product_variations: {
        Row: {
          created_at: string | null
          id: number
          name: string | null
          price: number | null
          product_id: number | null
          stock: number | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          id?: never
          name?: string | null
          price?: number | null
          product_id?: number | null
          stock?: number | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          id?: never
          name?: string | null
          price?: number | null
          product_id?: number | null
          stock?: number | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string | null
          description: string | null
          etsy_listing_id: number | null
          id: number
          image_url: string | null
          images: Json | null
          is_demo_data: boolean | null
          price: number | null
          scheduled_for_etsy: boolean | null
          store_id: number | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          etsy_listing_id?: number | null
          id?: never
          image_url?: string | null
          images?: Json | null
          is_demo_data?: boolean | null
          price?: number | null
          scheduled_for_etsy?: boolean | null
          store_id?: number | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          etsy_listing_id?: number | null
          id?: never
          image_url?: string | null
          images?: Json | null
          is_demo_data?: boolean | null
          price?: number | null
          scheduled_for_etsy?: boolean | null
          store_id?: number | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "etsy_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products_queue: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          etsy_listing_id: number | null
          id: string
          images_data: Json | null
          max_retries: number | null
          processed_at: string | null
          product_data: Json
          retry_count: number | null
          scheduled_for: string | null
          shop_id: number
          status: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          etsy_listing_id?: number | null
          id?: string
          images_data?: Json | null
          max_retries?: number | null
          processed_at?: string | null
          product_data: Json
          retry_count?: number | null
          scheduled_for?: string | null
          shop_id: number
          status?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          etsy_listing_id?: number | null
          id?: string
          images_data?: Json | null
          max_retries?: number | null
          processed_at?: string | null
          product_data?: Json
          retry_count?: number | null
          scheduled_for?: string | null
          shop_id?: number
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          etsy_shop_id: string | null
          etsy_shop_name: string | null
          full_name: string | null
          id: string
          last_synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          etsy_shop_id?: string | null
          etsy_shop_name?: string | null
          full_name?: string | null
          id: string
          last_synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          etsy_shop_id?: string | null
          etsy_shop_name?: string | null
          full_name?: string | null
          id?: string
          last_synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      queue_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          data: Json | null
          error: string | null
          id: string
          progress: number
          retry_count: number
          started_at: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          data?: Json | null
          error?: string | null
          id: string
          progress?: number
          retry_count?: number
          started_at?: string | null
          status: string
          type: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          data?: Json | null
          error?: string | null
          id?: string
          progress?: number
          retry_count?: number
          started_at?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string | null
          id: number
          limit_count: number
          reset_at: string
          updated_at: string | null
          used_count: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          limit_count?: number
          reset_at: string
          updated_at?: string | null
          used_count?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          limit_count?: number
          reset_at?: string
          updated_at?: string | null
          used_count?: number
          user_id?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          connected_at: string | null
          created_at: string | null
          id: string
          name: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          connected_at?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          connected_at?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clean_expired_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      clean_old_api_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_auth_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_etsy_auth_table: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_etsy_listings_data_table: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_etsy_payments_data_table: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_etsy_receipts_data_table: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_etsy_stats_data_table: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_etsy_store_data_table: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      exec_sql: {
        Args: { sql: string; params: string[] }
        Returns: undefined
      }
      execute_sql: {
        Args: { sql_query: string }
        Returns: undefined
      }
      get_etsy_stores: {
        Args: { p_user_id: string }
        Returns: {
          shop_id: number
          shop_name: string
          title: string
          user_id: number
          data: Json
        }[]
      }
      handle_disconnect_etsy_store: {
        Args: { store_id_to_delete: string; app_user_id_to_verify: string }
        Returns: undefined
      }
      reset_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      upsert_etsy_store_direct: {
        Args: {
          p_user_id: string
          p_shop_id: number
          p_shop_name: string
          p_title?: string
          p_currency_code?: string
          p_listing_active_count?: number
          p_num_favorers?: number
          p_review_count?: number
          p_review_average?: number
          p_url?: string
          p_image_url_760x100?: string
          p_is_active?: boolean
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
