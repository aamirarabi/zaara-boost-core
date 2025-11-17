export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agent_performance: {
        Row: {
          agent_name: string
          created_at: string | null
          customer_rating: number | null
          first_contact_resolution: boolean | null
          id: string
          message_id: string | null
          response_time_seconds: number | null
        }
        Insert: {
          agent_name: string
          created_at?: string | null
          customer_rating?: number | null
          first_contact_resolution?: boolean | null
          id?: string
          message_id?: string | null
          response_time_seconds?: number | null
        }
        Update: {
          agent_name?: string
          created_at?: string | null
          customer_rating?: number | null
          first_contact_resolution?: boolean | null
          id?: string
          message_id?: string | null
          response_time_seconds?: number | null
        }
        Relationships: []
      }
      api_usage_logs: {
        Row: {
          api_name: string
          api_type: string | null
          conversation_id: string | null
          cost_pkr: number | null
          created_at: string | null
          id: string
          timestamp: string
          tokens_used: number | null
        }
        Insert: {
          api_name: string
          api_type?: string | null
          conversation_id?: string | null
          cost_pkr?: number | null
          created_at?: string | null
          id?: string
          timestamp: string
          tokens_used?: number | null
        }
        Update: {
          api_name?: string
          api_type?: string | null
          conversation_id?: string | null
          cost_pkr?: number | null
          created_at?: string | null
          id?: string
          timestamp?: string
          tokens_used?: number | null
        }
        Relationships: []
      }
      chat_history: {
        Row: {
          content: string | null
          conversation_id: string | null
          created_at: string | null
          direction: string | null
          id: string
          media_url: string | null
          message_type: string | null
          phone_number: string
          response_time_seconds: number | null
          sender: string | null
          sent_by: string | null
          sentiment: string | null
          sentiment_score: number | null
          status: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          direction?: string | null
          id?: string
          media_url?: string | null
          message_type?: string | null
          phone_number: string
          response_time_seconds?: number | null
          sender?: string | null
          sent_by?: string | null
          sentiment?: string | null
          sentiment_score?: number | null
          status?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          direction?: string | null
          id?: string
          media_url?: string | null
          message_type?: string | null
          phone_number?: string
          response_time_seconds?: number | null
          sender?: string | null
          sent_by?: string | null
          sentiment?: string | null
          sentiment_score?: number | null
          status?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: []
      }
      conversation_analytics: {
        Row: {
          created_at: string | null
          human_takeover: boolean | null
          id: string
          message_count: number | null
          phone_number: string
          query_type: string | null
          response_time_ms: number | null
          satisfaction_rating: number | null
        }
        Insert: {
          created_at?: string | null
          human_takeover?: boolean | null
          id?: string
          message_count?: number | null
          phone_number: string
          query_type?: string | null
          response_time_ms?: number | null
          satisfaction_rating?: number | null
        }
        Update: {
          created_at?: string | null
          human_takeover?: boolean | null
          id?: string
          message_count?: number | null
          phone_number?: string
          query_type?: string | null
          response_time_ms?: number | null
          satisfaction_rating?: number | null
        }
        Relationships: []
      }
      conversation_context: {
        Row: {
          ai_enabled: boolean | null
          assigned_agent: string | null
          avg_response_time: unknown
          awaiting_response: string | null
          chat_status: string | null
          context_data: Json | null
          created_at: string | null
          customer_name: string | null
          escalated: boolean | null
          human_replied_at: string | null
          is_priority: boolean | null
          last_intent: string | null
          last_message_at: string | null
          last_product_list: Json | null
          last_product_viewed: string | null
          last_response_time: string | null
          phone_number: string
          resolved: boolean | null
          status: string | null
          tags: string[] | null
          taken_over_at: string | null
          taken_over_by: string | null
          thread_id: string | null
          updated_at: string | null
        }
        Insert: {
          ai_enabled?: boolean | null
          assigned_agent?: string | null
          avg_response_time?: unknown
          awaiting_response?: string | null
          chat_status?: string | null
          context_data?: Json | null
          created_at?: string | null
          customer_name?: string | null
          escalated?: boolean | null
          human_replied_at?: string | null
          is_priority?: boolean | null
          last_intent?: string | null
          last_message_at?: string | null
          last_product_list?: Json | null
          last_product_viewed?: string | null
          last_response_time?: string | null
          phone_number: string
          resolved?: boolean | null
          status?: string | null
          tags?: string[] | null
          taken_over_at?: string | null
          taken_over_by?: string | null
          thread_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_enabled?: boolean | null
          assigned_agent?: string | null
          avg_response_time?: unknown
          awaiting_response?: string | null
          chat_status?: string | null
          context_data?: Json | null
          created_at?: string | null
          customer_name?: string | null
          escalated?: boolean | null
          human_replied_at?: string | null
          is_priority?: boolean | null
          last_intent?: string | null
          last_message_at?: string | null
          last_product_list?: Json | null
          last_product_viewed?: string | null
          last_response_time?: string | null
          phone_number?: string
          resolved?: boolean | null
          status?: string | null
          tags?: string[] | null
          taken_over_at?: string | null
          taken_over_by?: string | null
          thread_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      courier_performance: {
        Row: {
          actual_delivery_date: string | null
          courier_name: string
          created_at: string | null
          customer_city: string | null
          delay_days: number | null
          delivery_status: string | null
          expected_delivery_date: string | null
          id: string
          order_id: string
          shipped_date: string | null
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          courier_name: string
          created_at?: string | null
          customer_city?: string | null
          delay_days?: number | null
          delivery_status?: string | null
          expected_delivery_date?: string | null
          id?: string
          order_id: string
          shipped_date?: string | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          courier_name?: string
          created_at?: string | null
          customer_city?: string | null
          delay_days?: number | null
          delivery_status?: string | null
          expected_delivery_date?: string | null
          id?: string
          order_id?: string
          shipped_date?: string | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      courier_settings: {
        Row: {
          api_endpoint: string | null
          api_key: string | null
          api_password: string | null
          courier_name: string
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          karachi_delivery_days: number | null
          outside_karachi_delivery_days: number | null
          sla_days_karachi: number | null
          sla_days_other: number | null
          updated_at: string | null
        }
        Insert: {
          api_endpoint?: string | null
          api_key?: string | null
          api_password?: string | null
          courier_name: string
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          karachi_delivery_days?: number | null
          outside_karachi_delivery_days?: number | null
          sla_days_karachi?: number | null
          sla_days_other?: number | null
          updated_at?: string | null
        }
        Update: {
          api_endpoint?: string | null
          api_key?: string | null
          api_password?: string | null
          courier_name?: string
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          karachi_delivery_days?: number | null
          outside_karachi_delivery_days?: number | null
          sla_days_karachi?: number | null
          sla_days_other?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_notes: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          note: string
          phone_number: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          note: string
          phone_number: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          note?: string
          phone_number?: string
        }
        Relationships: []
      }
      customer_tags: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          phone_number: string
          tag: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          phone_number: string
          tag: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          phone_number?: string
          tag?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string | null
          customer_name: string | null
          customer_type: string | null
          email: string | null
          first_name: string | null
          last_interaction_at: string | null
          last_name: string | null
          last_order_date: string | null
          last_products_viewed: string[] | null
          order_count: number | null
          phone_number: string
          preferences: Json | null
          shopify_customer_id: string | null
          tags: string[] | null
          total_orders: number | null
          total_spend: number | null
          updated_at: string | null
          vip: boolean | null
          vip_since: string | null
        }
        Insert: {
          created_at?: string | null
          customer_name?: string | null
          customer_type?: string | null
          email?: string | null
          first_name?: string | null
          last_interaction_at?: string | null
          last_name?: string | null
          last_order_date?: string | null
          last_products_viewed?: string[] | null
          order_count?: number | null
          phone_number: string
          preferences?: Json | null
          shopify_customer_id?: string | null
          tags?: string[] | null
          total_orders?: number | null
          total_spend?: number | null
          updated_at?: string | null
          vip?: boolean | null
          vip_since?: string | null
        }
        Update: {
          created_at?: string | null
          customer_name?: string | null
          customer_type?: string | null
          email?: string | null
          first_name?: string | null
          last_interaction_at?: string | null
          last_name?: string | null
          last_order_date?: string | null
          last_products_viewed?: string[] | null
          order_count?: number | null
          phone_number?: string
          preferences?: Json | null
          shopify_customer_id?: string | null
          tags?: string[] | null
          total_orders?: number | null
          total_spend?: number | null
          updated_at?: string | null
          vip?: boolean | null
          vip_since?: string | null
        }
        Relationships: []
      }
      dashboard_preferences: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string | null
          visible_sections: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
          visible_sections?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
          visible_sections?: Json | null
        }
        Relationships: []
      }
      faq_gaps: {
        Row: {
          category: string | null
          created_at: string | null
          customer_phones: string[] | null
          first_asked: string
          frequency: number | null
          id: string
          last_asked: string
          question: string
          status: string | null
          suggested_answer: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          customer_phones?: string[] | null
          first_asked: string
          frequency?: number | null
          id?: string
          last_asked: string
          question: string
          status?: string | null
          suggested_answer?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          customer_phones?: string[] | null
          first_asked?: string
          frequency?: number | null
          id?: string
          last_asked?: string
          question?: string
          status?: string | null
          suggested_answer?: string | null
        }
        Relationships: []
      }
      faq_vectors: {
        Row: {
          answer: string
          category: string | null
          created_at: string | null
          created_by: string | null
          edited_at: string | null
          helpful_count: number | null
          id: string
          image_urls: string[] | null
          is_active: boolean | null
          keywords: string[] | null
          last_used_at: string | null
          not_helpful_count: number | null
          question: string
          related_products: string[] | null
          updated_at: string | null
          updated_by: string | null
          usage_count: number | null
          video_urls: string[] | null
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          edited_at?: string | null
          helpful_count?: number | null
          id: string
          image_urls?: string[] | null
          is_active?: boolean | null
          keywords?: string[] | null
          last_used_at?: string | null
          not_helpful_count?: number | null
          question: string
          related_products?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
          usage_count?: number | null
          video_urls?: string[] | null
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          edited_at?: string | null
          helpful_count?: number | null
          id?: string
          image_urls?: string[] | null
          is_active?: boolean | null
          keywords?: string[] | null
          last_used_at?: string | null
          not_helpful_count?: number | null
          question?: string
          related_products?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
          usage_count?: number | null
          video_urls?: string[] | null
        }
        Relationships: []
      }
      judgeme_settings: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          private_token: string
          public_token: string
          shop_domain: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          private_token: string
          public_token: string
          shop_domain: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          private_token?: string
          public_token?: string
          shop_domain?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      message_analytics: {
        Row: {
          avg_response_time_seconds: number | null
          date: string
          escalated_count: number | null
          human_handled: number | null
          inbound_count: number | null
          outbound_count: number | null
          zaara_handled: number | null
        }
        Insert: {
          avg_response_time_seconds?: number | null
          date: string
          escalated_count?: number | null
          human_handled?: number | null
          inbound_count?: number | null
          outbound_count?: number | null
          zaara_handled?: number | null
        }
        Update: {
          avg_response_time_seconds?: number | null
          date?: string
          escalated_count?: number | null
          human_handled?: number | null
          inbound_count?: number | null
          outbound_count?: number | null
          zaara_handled?: number | null
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          body: string | null
          created_at_judgeme: string | null
          id: string
          judgeme_id: string
          pictures: Json | null
          product_handle: string
          rating: number
          reviewer_email: string | null
          reviewer_location: string | null
          reviewer_name: string
          shopify_product_id: string
          synced_at: string | null
          title: string | null
          updated_at_judgeme: string | null
          verified_buyer: boolean | null
        }
        Insert: {
          body?: string | null
          created_at_judgeme?: string | null
          id?: string
          judgeme_id: string
          pictures?: Json | null
          product_handle: string
          rating: number
          reviewer_email?: string | null
          reviewer_location?: string | null
          reviewer_name?: string
          shopify_product_id: string
          synced_at?: string | null
          title?: string | null
          updated_at_judgeme?: string | null
          verified_buyer?: boolean | null
        }
        Update: {
          body?: string | null
          created_at_judgeme?: string | null
          id?: string
          judgeme_id?: string
          pictures?: Json | null
          product_handle?: string
          rating?: number
          reviewer_email?: string | null
          reviewer_location?: string | null
          reviewer_name?: string
          shopify_product_id?: string
          synced_at?: string | null
          title?: string | null
          updated_at_judgeme?: string | null
          verified_buyer?: boolean | null
        }
        Relationships: []
      }
      product_waitlist: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          notified: boolean | null
          product_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notified?: boolean | null
          product_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notified?: boolean | null
          product_id?: string | null
        }
        Relationships: []
      }
      quick_replies: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          label: string
          sort_order: number | null
          text: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          sort_order?: number | null
          text: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
          text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      quick_templates: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          id: string
          message: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          message: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          message?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      shopify_orders: {
        Row: {
          actual_delivered_at: string | null
          actual_delivery_date: string | null
          billing_address: Json | null
          courier_api_status: string | null
          courier_estimated_delivery: string | null
          courier_last_updated: string | null
          courier_name: string | null
          created_at: string | null
          currency: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivered_at: string | null
          delivered_to_name: string | null
          delivered_to_relation: string | null
          delivery_city: string | null
          delivery_notes: string | null
          delivery_proof_url: string | null
          delivery_status: string | null
          dispatched_at: string | null
          estimated_delivery_date: string | null
          financial_status: string | null
          fulfilled_at: string | null
          fulfillment_status: string | null
          line_items: Json | null
          note: string | null
          order_id: string
          order_number: string | null
          order_source: string | null
          scheduled_delivery_date: string | null
          shipping_address: Json | null
          shopify_id: string | null
          subtotal: number | null
          synced_at: string | null
          tags: string[] | null
          total_price: number | null
          total_tax: number | null
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string | null
        }
        Insert: {
          actual_delivered_at?: string | null
          actual_delivery_date?: string | null
          billing_address?: Json | null
          courier_api_status?: string | null
          courier_estimated_delivery?: string | null
          courier_last_updated?: string | null
          courier_name?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          delivered_to_name?: string | null
          delivered_to_relation?: string | null
          delivery_city?: string | null
          delivery_notes?: string | null
          delivery_proof_url?: string | null
          delivery_status?: string | null
          dispatched_at?: string | null
          estimated_delivery_date?: string | null
          financial_status?: string | null
          fulfilled_at?: string | null
          fulfillment_status?: string | null
          line_items?: Json | null
          note?: string | null
          order_id: string
          order_number?: string | null
          order_source?: string | null
          scheduled_delivery_date?: string | null
          shipping_address?: Json | null
          shopify_id?: string | null
          subtotal?: number | null
          synced_at?: string | null
          tags?: string[] | null
          total_price?: number | null
          total_tax?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_delivered_at?: string | null
          actual_delivery_date?: string | null
          billing_address?: Json | null
          courier_api_status?: string | null
          courier_estimated_delivery?: string | null
          courier_last_updated?: string | null
          courier_name?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          delivered_to_name?: string | null
          delivered_to_relation?: string | null
          delivery_city?: string | null
          delivery_notes?: string | null
          delivery_proof_url?: string | null
          delivery_status?: string | null
          dispatched_at?: string | null
          estimated_delivery_date?: string | null
          financial_status?: string | null
          fulfilled_at?: string | null
          fulfillment_status?: string | null
          line_items?: Json | null
          note?: string | null
          order_id?: string
          order_number?: string | null
          order_source?: string | null
          scheduled_delivery_date?: string | null
          shipping_address?: Json | null
          shopify_id?: string | null
          subtotal?: number | null
          synced_at?: string | null
          tags?: string[] | null
          total_price?: number | null
          total_tax?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopify_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["phone_number"]
          },
        ]
      }
      shopify_products: {
        Row: {
          all_images: Json | null
          compare_at_price: number | null
          created_at: string | null
          description: string | null
          handle: string | null
          images: Json | null
          inventory: number | null
          metafields: Json | null
          options: Json | null
          price: number | null
          product_id: string
          product_type: string | null
          published_at: string | null
          review_count: number | null
          review_rating: number | null
          shopify_id: string | null
          status: string | null
          synced_at: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          variants: Json | null
          vendor: string | null
        }
        Insert: {
          all_images?: Json | null
          compare_at_price?: number | null
          created_at?: string | null
          description?: string | null
          handle?: string | null
          images?: Json | null
          inventory?: number | null
          metafields?: Json | null
          options?: Json | null
          price?: number | null
          product_id: string
          product_type?: string | null
          published_at?: string | null
          review_count?: number | null
          review_rating?: number | null
          shopify_id?: string | null
          status?: string | null
          synced_at?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          variants?: Json | null
          vendor?: string | null
        }
        Update: {
          all_images?: Json | null
          compare_at_price?: number | null
          created_at?: string | null
          description?: string | null
          handle?: string | null
          images?: Json | null
          inventory?: number | null
          metafields?: Json | null
          options?: Json | null
          price?: number | null
          product_id?: string
          product_type?: string | null
          published_at?: string | null
          review_count?: number | null
          review_rating?: number | null
          shopify_id?: string | null
          status?: string | null
          synced_at?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          variants?: Json | null
          vendor?: string | null
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          created_at: string | null
          id: number
          log_type: string
          message: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          log_type: string
          message: string
        }
        Update: {
          created_at?: string | null
          id?: number
          log_type?: string
          message?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          is_encrypted: boolean | null
          setting_key: string
          setting_value: string | null
          updated_at: string | null
        }
        Insert: {
          description?: string | null
          is_encrypted?: boolean | null
          setting_key: string
          setting_value?: string | null
          updated_at?: string | null
        }
        Update: {
          description?: string | null
          is_encrypted?: boolean | null
          setting_key?: string
          setting_value?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      warranty_claims: {
        Row: {
          assigned_to: string | null
          claim_id: string
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          image_urls: string[] | null
          issue_description: string | null
          issue_type: string | null
          order_number: string | null
          product_name: string | null
          resolution_notes: string | null
          status: string | null
          updated_at: string | null
          video_urls: string[] | null
        }
        Insert: {
          assigned_to?: string | null
          claim_id?: string
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          image_urls?: string[] | null
          issue_description?: string | null
          issue_type?: string | null
          order_number?: string | null
          product_name?: string | null
          resolution_notes?: string | null
          status?: string | null
          updated_at?: string | null
          video_urls?: string[] | null
        }
        Update: {
          assigned_to?: string | null
          claim_id?: string
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          image_urls?: string[] | null
          issue_description?: string | null
          issue_type?: string | null
          order_number?: string | null
          product_name?: string | null
          resolution_notes?: string | null
          status?: string | null
          updated_at?: string | null
          video_urls?: string[] | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_message_count: {
        Args: { date_param: string; direction: string; handler: string }
        Returns: undefined
      }
      search_faqs: {
        Args: { result_limit?: number; search_term: string }
        Returns: {
          answer: string
          category: string
          id: string
          image_urls: string[]
          question: string
          related_products: string[]
          relevance_score: number
          video_urls: string[]
        }[]
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
