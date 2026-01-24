export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      conversations: {
        Row: {
          created_at: string
          id: string
          model: string | null
          org_id: string
          title: string
          user: string
        }
        Insert: {
          created_at?: string
          id?: string
          model?: string | null
          org_id: string
          title?: string
          user: string
        }
        Update: {
          created_at?: string
          id?: string
          model?: string | null
          org_id?: string
          title?: string
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_model_fkey"
            columns: ["model"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      group_map: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          org_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          org_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_map_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_map2_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          org_id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          org_id?: string
          role?: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          org_id?: string
          role?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          invitee: string
          inviter: string
          message: string | null
          org_id: string
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          invitee: string
          inviter: string
          message?: string | null
          org_id: string
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          invitee?: string
          inviter?: string
          message?: string | null
          org_id?: string
        }
        Relationships: []
      }
      key_map: {
        Row: {
          api_key: string
          id: string
          last_used: string | null
          requests: number | null
          user: string
        }
        Insert: {
          api_key?: string
          id?: string
          last_used?: string | null
          requests?: number | null
          user: string
        }
        Update: {
          api_key?: string
          id?: string
          last_used?: string | null
          requests?: number | null
          user?: string
        }
        Relationships: []
      }
      message_feedback: {
        Row: {
          comment: string | null
          conversation_id: string
          created_at: string
          id: string
          message_id: string
          model_id: string
          positive: boolean | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          message_id: string
          model_id: string
          positive?: boolean | null
          user_id: string
        }
        Update: {
          comment?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          message_id?: string
          model_id?: string
          positive?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_feedback_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_feedback_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          ai_sdk_id: string | null
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          parts: Json | null
          role: string | null
        }
        Insert: {
          ai_sdk_id?: string | null
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          parts?: Json | null
          role?: string | null
        }
        Update: {
          ai_sdk_id?: string | null
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          parts?: Json | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      model_config_presets: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          event_mappings: Json
          field_metadata: Json | null
          id: string
          is_system: boolean
          name: string
          org_id: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_mappings: Json
          field_metadata?: Json | null
          id?: string
          is_system?: boolean
          name: string
          org_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_mappings?: Json
          field_metadata?: Json | null
          id?: string
          is_system?: boolean
          name?: string
          org_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_config_presets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      model_keys: {
        Row: {
          created_at: string
          id: number
          key: string
          model_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          key: string
          model_id: string
        }
        Update: {
          created_at?: string
          id?: number
          key?: string
          model_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_keys_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_map: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          model_id: string
          org_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          model_id: string
          org_id?: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          model_id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_map_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_map2_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_map2_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_prompts: {
        Row: {
          id: string
          model_id: string
          prompt: string
        }
        Insert: {
          id?: string
          model_id: string
          prompt: string
        }
        Update: {
          id?: string
          model_id?: string
          prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_prompts_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          body_config: Json | null
          created_at: string
          description: string | null
          endpoint: string
          endpoint_type: string
          headers: Json | null
          id: string
          message_format_config: Json
          method: string
          model_id: string | null
          nice_name: string | null
          org_id: string
          response_path: string | null
          schema: string | null
          stream_config: Json | null
          suggestion_prompts: string[] | null
          template_id: string | null
          template_mode: string | null
          template_modified_fields: Json | null
        }
        Insert: {
          body_config?: Json | null
          created_at?: string
          description?: string | null
          endpoint?: string
          endpoint_type?: string
          headers?: Json | null
          id?: string
          message_format_config?: Json
          method?: string
          model_id?: string | null
          nice_name?: string | null
          org_id: string
          response_path?: string | null
          schema?: string | null
          stream_config?: Json | null
          suggestion_prompts?: string[] | null
          template_id?: string | null
          template_mode?: string | null
          template_modified_fields?: Json | null
        }
        Update: {
          body_config?: Json | null
          created_at?: string
          description?: string | null
          endpoint?: string
          endpoint_type?: string
          headers?: Json | null
          id?: string
          message_format_config?: Json
          method?: string
          model_id?: string | null
          nice_name?: string | null
          org_id?: string
          response_path?: string | null
          schema?: string | null
          stream_config?: Json | null
          suggestion_prompts?: string[] | null
          template_id?: string | null
          template_mode?: string | null
          template_modified_fields?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "models_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "model_config_presets"
            referencedColumns: ["id"]
          },
        ]
      }
      org_map: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_map_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string | null
          owner: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          owner?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          owner?: string | null
          status?: string | null
        }
        Relationships: []
      }
      product_tiers: {
        Row: {
          id: string
          tier_name: string | null
        }
        Insert: {
          id: string
          tier_name?: string | null
        }
        Update: {
          id?: string
          tier_name?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          signup_complete: boolean | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          signup_complete?: boolean | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          signup_complete?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      temp_org_requests: {
        Row: {
          approved: boolean
          created_at: string
          id: number
          org_name: string
          request_desc: string
          requester_id: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          id?: number
          org_name: string
          request_desc: string
          requester_id: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          id?: number
          org_name?: string
          request_desc?: string
          requester_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_id: { Args: never; Returns: string }
      get_user_email: { Args: { user_id: string }; Returns: string }
      test_jwt_access: { Args: never; Returns: Json }
      user_can_manage_group: {
        Args: { check_group_id: string; check_user_id: string }
        Returns: boolean
      }
      user_can_manage_model: {
        Args: { check_model_id: string; check_user_id: string }
        Returns: boolean
      }
      user_has_invite_to_group: {
        Args: { check_group_id: string; user_email: string }
        Returns: boolean
      }
      user_has_invite_to_org: {
        Args: { check_org_id: string; user_email: string }
        Returns: boolean
      }
      user_has_model_access: {
        Args: { check_model_id: string; check_user_id: string }
        Returns: boolean
      }
      user_is_org_member: {
        Args: { check_org_id: string; check_user_id: string }
        Returns: boolean
      }
      user_is_org_owner: {
        Args: { check_org_id: string; check_user_id: string }
        Returns: boolean
      }
      user_owns_conversation: {
        Args: { check_conversation_id: string; check_user_id: string }
        Returns: boolean
      }
      user_owns_org_with_member: {
        Args: { member_id: string; owner_id: string }
        Returns: boolean
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

