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
          sent_by: string | null
          sentiment: string | null
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
          sent_by?: string | null
          sentiment?: string | null
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
          sent_by?: string | null
          sentiment?: string | null
          status?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: []
      }
      conversation_context: {
        Row: {
          awaiting_response: string | null
          context_data: Json | null
          last_intent: string | null
          last_product_viewed: string | null
          phone_number: string
          updated_at: string | null
        }
        Insert: {
          awaiting_response?: string | null
          context_data?: Json | null
          last_intent?: string | null
          last_product_viewed?: string | null
          phone_number: string
          updated_at?: string | null
        }
        Update: {
          awaiting_response?: string | null
          context_data?: Json | null
          last_intent?: string | null
          last_product_viewed?: string | null
          phone_number?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string | null
          customer_name: string | null
          customer_type: string | null
          email: string | null
          last_interaction_at: string | null
          last_order_date: string | null
          last_products_viewed: string[] | null
          order_count: number | null
          phone_number: string
          preferences: Json | null
          shopify_customer_id: string | null
          tags: string[] | null
          total_spend: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_name?: string | null
          customer_type?: string | null
          email?: string | null
          last_interaction_at?: string | null
          last_order_date?: string | null
          last_products_viewed?: string[] | null
          order_count?: number | null
          phone_number: string
          preferences?: Json | null
          shopify_customer_id?: string | null
          tags?: string[] | null
          total_spend?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_name?: string | null
          customer_type?: string | null
          email?: string | null
          last_interaction_at?: string | null
          last_order_date?: string | null
          last_products_viewed?: string[] | null
          order_count?: number | null
          phone_number?: string
          preferences?: Json | null
          shopify_customer_id?: string | null
          tags?: string[] | null
          total_spend?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      faq_vectors: {
        Row: {
          answer: string
          category: string | null
          created_at: string | null
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
          usage_count: number | null
          video_urls: string[] | null
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string | null
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
          usage_count?: number | null
          video_urls?: string[] | null
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string | null
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
          usage_count?: number | null
          video_urls?: string[] | null
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
      shopify_orders: {
        Row: {
          billing_address: Json | null
          courier_name: string | null
          created_at: string | null
          currency: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          financial_status: string | null
          fulfillment_status: string | null
          line_items: Json | null
          note: string | null
          order_id: string
          order_number: string | null
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
          billing_address?: Json | null
          courier_name?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          financial_status?: string | null
          fulfillment_status?: string | null
          line_items?: Json | null
          note?: string | null
          order_id: string
          order_number?: string | null
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
          billing_address?: Json | null
          courier_name?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          financial_status?: string | null
          fulfillment_status?: string | null
          line_items?: Json | null
          note?: string | null
          order_id?: string
          order_number?: string | null
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
        Relationships: []
      }
      shopify_products: {
        Row: {
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
