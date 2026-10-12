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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_logs: {
        Row: {
          ai_output: Json | null
          cancelled_count: number | null
          confirmed_count: number | null
          created_at: string
          edited_ops_count: number | null
          edits: Json | null
          error: string | null
          final_ops: Json | null
          has_image: boolean
          id: string
          input_text: string | null
          input_type: string
          intent: string | null
          latency_ms: number | null
          model: string
          ok: boolean
          ops_count: number
          outcome: string
          prompt_version: string
          resolved_at: string | null
          user_id: string
        }
        Insert: {
          ai_output?: Json | null
          cancelled_count?: number | null
          confirmed_count?: number | null
          created_at?: string
          edited_ops_count?: number | null
          edits?: Json | null
          error?: string | null
          final_ops?: Json | null
          has_image?: boolean
          id?: string
          input_text?: string | null
          input_type: string
          intent?: string | null
          latency_ms?: number | null
          model: string
          ok: boolean
          ops_count?: number
          outcome?: string
          prompt_version: string
          resolved_at?: string | null
          user_id?: string
        }
        Update: {
          ai_output?: Json | null
          cancelled_count?: number | null
          confirmed_count?: number | null
          created_at?: string
          edited_ops_count?: number | null
          edits?: Json | null
          error?: string | null
          final_ops?: Json | null
          has_image?: boolean
          id?: string
          input_text?: string | null
          input_type?: string
          intent?: string | null
          latency_ms?: number | null
          model?: string
          ok?: boolean
          ops_count?: number
          outcome?: string
          prompt_version?: string
          resolved_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      eval_runs: {
        Row: {
          created_at: string
          id: string
          kind: string
          model: string
          prompt_version: string
          scores: Json
          summary: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          model: string
          prompt_version: string
          scores: Json
          summary: Json
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          model?: string
          prompt_version?: string
          scores?: Json
          summary?: Json
          user_id?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          category: string
          created_at: string
          expiry: string | null
          id: string
          location: string
          name: string
          quantity: number
          source: string
          unit: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          expiry?: string | null
          id?: string
          location?: string
          name: string
          quantity?: number
          source?: string
          unit?: string
          user_id?: string
        }
        Update: {
          category?: string
          created_at?: string
          expiry?: string | null
          id?: string
          location?: string
          name?: string
          quantity?: number
          source?: string
          unit?: string
          user_id?: string
        }
        Relationships: []
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
