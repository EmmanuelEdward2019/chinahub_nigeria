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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          display_order: number | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          admin_feedback: string | null
          admin_notes: string | null
          admin_pricing_currency: string | null
          category_id: string | null
          created_at: string
          description: string
          id: string
          item_name: string
          order_stage_id: string | null
          payment_status: string | null
          processing_fee: number | null
          processing_fee_dollar: number | null
          processing_fee_naira: number | null
          quantity: number
          quote_confirmed_at: string | null
          quote_payment_processed: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          sample_file_url: string | null
          sample_files: Json | null
          status: string
          supplier_quote: string | null
          unit_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_feedback?: string | null
          admin_notes?: string | null
          admin_pricing_currency?: string | null
          category_id?: string | null
          created_at?: string
          description: string
          id?: string
          item_name: string
          order_stage_id?: string | null
          payment_status?: string | null
          processing_fee?: number | null
          processing_fee_dollar?: number | null
          processing_fee_naira?: number | null
          quantity: number
          quote_confirmed_at?: string | null
          quote_payment_processed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_file_url?: string | null
          sample_files?: Json | null
          status?: string
          supplier_quote?: string | null
          unit_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_feedback?: string | null
          admin_notes?: string | null
          admin_pricing_currency?: string | null
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          item_name?: string
          order_stage_id?: string | null
          payment_status?: string | null
          processing_fee?: number | null
          processing_fee_dollar?: number | null
          processing_fee_naira?: number | null
          quantity?: number
          quote_confirmed_at?: string | null
          quote_payment_processed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_file_url?: string | null
          sample_files?: Json | null
          status?: string
          supplier_quote?: string | null
          unit_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_order_stage_id_fkey"
            columns: ["order_stage_id"]
            isOneToOne: false
            referencedRelation: "order_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_settings: {
        Row: {
          created_at: string
          default_fee_dollar: number
          default_fee_naira: number
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          default_fee_dollar?: number
          default_fee_naira?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          default_fee_dollar?: number
          default_fee_naira?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      notification_replies: {
        Row: {
          created_at: string
          id: string
          is_admin_reply: boolean | null
          message: string
          notification_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin_reply?: boolean | null
          message: string
          notification_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_admin_reply?: boolean | null
          message?: string
          notification_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_replies_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          inquiry_id: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inquiry_id?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inquiry_id?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      order_stages: {
        Row: {
          admin_id: string | null
          admin_notes: string | null
          confirmed_quantity: number | null
          created_at: string
          id: string
          inquiry_id: string
          payment_reference: string | null
          payment_status: string | null
          product_images: Json | null
          quoted_amount: number | null
          quoted_currency: string | null
          stage: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          admin_notes?: string | null
          confirmed_quantity?: number | null
          created_at?: string
          id?: string
          inquiry_id: string
          payment_reference?: string | null
          payment_status?: string | null
          product_images?: Json | null
          quoted_amount?: number | null
          quoted_currency?: string | null
          stage?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          admin_notes?: string | null
          confirmed_quantity?: number | null
          created_at?: string
          id?: string
          inquiry_id?: string
          payment_reference?: string | null
          payment_status?: string | null
          product_images?: Json | null
          quoted_amount?: number | null
          quoted_currency?: string | null
          stage?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          inquiry_id: string | null
          payment_method: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          inquiry_id?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          inquiry_id?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_plans: {
        Row: {
          created_at: string
          dollar_price: number
          id: string
          is_default: boolean | null
          naira_price: number
          name: string
          size_range: string | null
          weight_range: string | null
        }
        Insert: {
          created_at?: string
          dollar_price?: number
          id?: string
          is_default?: boolean | null
          naira_price?: number
          name: string
          size_range?: string | null
          weight_range?: string | null
        }
        Update: {
          created_at?: string
          dollar_price?: number
          id?: string
          is_default?: boolean | null
          naira_price?: number
          name?: string
          size_range?: string | null
          weight_range?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          inquiry_id: string | null
          payment_method: string | null
          reference: string | null
          status: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          id?: string
          inquiry_id?: string | null
          payment_method?: string | null
          reference?: string | null
          status?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          inquiry_id?: string | null
          payment_method?: string | null
          reference?: string | null
          status?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          created_at: string
          dollar_balance: number
          id: string
          naira_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dollar_balance?: number
          id?: string
          naira_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dollar_balance?: number
          id?: string
          naira_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deduct_inquiry_fee: {
        Args: {
          p_amount: number
          p_currency: string
          p_inquiry_id: string
          p_user_id: string
        }
        Returns: Json
      }
      deduct_wallet_balance: {
        Args: { amount: number; currency: string; user_id: string }
        Returns: undefined
      }
      fix_all_wallet_balances: { Args: never; Returns: Json }
      fix_stuck_pending_transactions: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_wallet_topup: {
        Args: {
          p_amount: number
          p_currency: string
          p_reference: string
          p_user_id: string
        }
        Returns: Json
      }
      setup_admin_user: { Args: { admin_email: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
