/**
 * Supabase Database Types
 *
 * Auto-generated from Supabase CLI. Do not edit manually.
 * Run: npx supabase gen types typescript --project-id <project-id> --schema public
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      conversations: {
        Row: {
          created_at: string;
          id: string;
          model: string | null;
          org_id: string;
          title: string;
          user: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          model?: string | null;
          org_id: string;
          title?: string;
          user: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          model?: string | null;
          org_id?: string;
          title?: string;
          user?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conversations_model_fkey';
            columns: ['model'];
            isOneToOne: false;
            referencedRelation: 'models';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversations_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversations_user_fkey';
            columns: ['user'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      group_map: {
        Row: {
          created_at: string | null;
          group_id: string;
          id: string;
          org_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          group_id: string;
          id?: string;
          org_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          group_id?: string;
          id?: string;
          org_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'group_map_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_map_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_map2_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
        ];
      };
      groups: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          org_id: string;
          role: string;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          org_id?: string;
          role?: string;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          org_id?: string;
          role?: string;
        };
        Relationships: [];
      };
      invites: {
        Row: {
          created_at: string;
          group_id: string | null;
          id: string;
          invitee: string;
          inviter: string;
          message: string | null;
          org_id: string;
        };
        Insert: {
          created_at?: string;
          group_id?: string | null;
          id?: string;
          invitee: string;
          inviter: string;
          message?: string | null;
          org_id: string;
        };
        Update: {
          created_at?: string;
          group_id?: string | null;
          id?: string;
          invitee?: string;
          inviter?: string;
          message?: string | null;
          org_id?: string;
        };
        Relationships: [];
      };
      key_map: {
        Row: {
          api_key: string;
          id: string;
          last_used: string | null;
          requests: number | null;
          user: string;
        };
        Insert: {
          api_key?: string;
          id?: string;
          last_used?: string | null;
          requests?: number | null;
          user: string;
        };
        Update: {
          api_key?: string;
          id?: string;
          last_used?: string | null;
          requests?: number | null;
          user?: string;
        };
        Relationships: [];
      };
      message_feedback: {
        Row: {
          comment: string | null;
          conversation_id: string;
          created_at: string;
          id: string;
          message_id: string;
          model_id: string;
          positive: boolean | null;
          user_id: string;
        };
        Insert: {
          comment?: string | null;
          conversation_id: string;
          created_at?: string;
          id?: string;
          message_id: string;
          model_id: string;
          positive?: boolean | null;
          user_id: string;
        };
        Update: {
          comment?: string | null;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          message_id?: string;
          model_id?: string;
          positive?: boolean | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'message_feedback_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'message_feedback_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'message_feedback_model_id_fkey';
            columns: ['model_id'];
            isOneToOne: false;
            referencedRelation: 'models';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'message_feedback_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          ai_sdk_id: string | null;
          content: string | null;
          conversation_id: string;
          created_at: string;
          id: string;
          metadata: Json | null;
          parts: Json | null;
          role: string | null;
        };
        Insert: {
          ai_sdk_id?: string | null;
          content?: string | null;
          conversation_id: string;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          parts?: Json | null;
          role?: string | null;
        };
        Update: {
          ai_sdk_id?: string | null;
          content?: string | null;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          parts?: Json | null;
          role?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
        ];
      };
      model_keys: {
        Row: {
          created_at: string;
          id: number;
          key: string;
          model_id: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          key: string;
          model_id: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          key?: string;
          model_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'model_keys_model_id_fkey';
            columns: ['model_id'];
            isOneToOne: false;
            referencedRelation: 'models';
            referencedColumns: ['id'];
          },
        ];
      };
      model_map: {
        Row: {
          created_at: string | null;
          group_id: string;
          id: string;
          model_id: string;
          org_id: string;
        };
        Insert: {
          created_at?: string | null;
          group_id: string;
          id?: string;
          model_id: string;
          org_id?: string;
        };
        Update: {
          created_at?: string | null;
          group_id?: string;
          id?: string;
          model_id?: string;
          org_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'model_map_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'model_map2_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'model_map2_model_id_fkey';
            columns: ['model_id'];
            isOneToOne: false;
            referencedRelation: 'models';
            referencedColumns: ['id'];
          },
        ];
      };
      model_prompts: {
        Row: {
          id: string;
          model_id: string;
          prompt: string;
        };
        Insert: {
          id?: string;
          model_id: string;
          prompt: string;
        };
        Update: {
          id?: string;
          model_id?: string;
          prompt?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'model_prompts_model_id_fkey';
            columns: ['model_id'];
            isOneToOne: false;
            referencedRelation: 'models';
            referencedColumns: ['id'];
          },
        ];
      };
      models: {
        Row: {
          body_config: Json | null;
          created_at: string;
          description: string | null;
          endpoint: string;
          endpoint_type: string;
          headers: Json | null;
          id: string;
          message_format_config: Json;
          method: string;
          model_id: string | null;
          nice_name: string | null;
          org_id: string;
          response_path: string | null;
          schema: string | null;
          stream_config: Json | null;
          suggestion_prompts: string[] | null;
          template_id: string | null;
          template_mode: string | null;
          template_modified_fields: Json | null;
        };
        Insert: {
          body_config?: Json | null;
          created_at?: string;
          description?: string | null;
          endpoint?: string;
          endpoint_type?: string;
          headers?: Json | null;
          id?: string;
          message_format_config?: Json;
          method?: string;
          model_id?: string | null;
          nice_name?: string | null;
          org_id: string;
          response_path?: string | null;
          schema?: string | null;
          stream_config?: Json | null;
          suggestion_prompts?: string[] | null;
          template_id?: string | null;
          template_mode?: string | null;
          template_modified_fields?: Json | null;
        };
        Update: {
          body_config?: Json | null;
          created_at?: string;
          description?: string | null;
          endpoint?: string;
          endpoint_type?: string;
          headers?: Json | null;
          id?: string;
          message_format_config?: Json;
          method?: string;
          model_id?: string | null;
          nice_name?: string | null;
          org_id?: string;
          response_path?: string | null;
          schema?: string | null;
          stream_config?: Json | null;
          suggestion_prompts?: string[] | null;
          template_id?: string | null;
          template_mode?: string | null;
          template_modified_fields?: Json | null;
        };
        Relationships: [];
      };
      org_map: {
        Row: {
          created_at: string;
          id: string;
          org_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          org_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          org_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'org_map_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'org_map_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          id: string;
          name: string | null;
          owner: string | null;
          status: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name?: string | null;
          owner?: string | null;
          status?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string | null;
          owner?: string | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'organizations_owner_fkey';
            columns: ['owner'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      product_tiers: {
        Row: {
          id: string;
          tier_name: string | null;
        };
        Insert: {
          id: string;
          tier_name?: string | null;
        };
        Update: {
          id?: string;
          tier_name?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          email: string;
          full_name: string | null;
          id: string;
          signup_complete: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          email: string;
          full_name?: string | null;
          id: string;
          signup_complete?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string;
          full_name?: string | null;
          id?: string;
          signup_complete?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      temp_org_requests: {
        Row: {
          approved: boolean;
          created_at: string;
          id: number;
          org_name: string;
          request_desc: string;
          requester_id: string;
        };
        Insert: {
          approved?: boolean;
          created_at?: string;
          id?: number;
          org_name: string;
          request_desc: string;
          requester_id: string;
        };
        Update: {
          approved?: boolean;
          created_at?: string;
          id?: number;
          org_name?: string;
          request_desc?: string;
          requester_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_current_user_id: { Args: never; Returns: string };
      get_user_email: { Args: { user_id: string }; Returns: string };
      test_jwt_access: { Args: never; Returns: Json };
      user_can_manage_group: {
        Args: { check_group_id: string; check_user_id: string };
        Returns: boolean;
      };
      user_can_manage_model: {
        Args: { check_model_id: string; check_user_id: string };
        Returns: boolean;
      };
      user_has_invite_to_group: {
        Args: { check_group_id: string; user_email: string };
        Returns: boolean;
      };
      user_has_invite_to_org: {
        Args: { check_org_id: string; user_email: string };
        Returns: boolean;
      };
      user_has_model_access: {
        Args: { check_model_id: string; check_user_id: string };
        Returns: boolean;
      };
      user_is_org_member: {
        Args: { check_org_id: string; check_user_id: string };
        Returns: boolean;
      };
      user_is_org_owner: {
        Args: { check_org_id: string; check_user_id: string };
        Returns: boolean;
      };
      user_owns_conversation: {
        Args: { check_conversation_id: string; check_user_id: string };
        Returns: boolean;
      };
      user_owns_org_with_member: {
        Args: { member_id: string; owner_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;

// Helper type exports for convenience
export type Message = Database['public']['Tables']['messages']['Row'];
export type MessageInsert = Database['public']['Tables']['messages']['Insert'];
export type MessageUpdate = Database['public']['Tables']['messages']['Update'];
export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type ConversationInsert = Database['public']['Tables']['conversations']['Insert'];
export type ConversationUpdate = Database['public']['Tables']['conversations']['Update'];
export type Model = Database['public']['Tables']['models']['Row'];
export type ModelInsert = Database['public']['Tables']['models']['Insert'];
export type ModelUpdate = Database['public']['Tables']['models']['Update'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type Group = Database['public']['Tables']['groups']['Row'];
export type GroupInsert = Database['public']['Tables']['groups']['Insert'];
export type GroupUpdate = Database['public']['Tables']['groups']['Update'];
export type GroupMap = Database['public']['Tables']['group_map']['Row'];
export type GroupMapInsert = Database['public']['Tables']['group_map']['Insert'];
export type ModelMap = Database['public']['Tables']['model_map']['Row'];
export type ModelMapInsert = Database['public']['Tables']['model_map']['Insert'];
export type Invite = Database['public']['Tables']['invites']['Row'];
export type InviteInsert = Database['public']['Tables']['invites']['Insert'];
export type InviteUpdate = Database['public']['Tables']['invites']['Update'];
export type Org = Database['public']['Tables']['organizations']['Row'];
export type Organization = Database['public']['Tables']['organizations']['Row'];
export type OrgMap = Database['public']['Tables']['org_map']['Row'];
export type OrgMapInsert = Database['public']['Tables']['org_map']['Insert'];
export type ModelKey = Database['public']['Tables']['model_keys']['Row'];
export type ModelPrompt = Database['public']['Tables']['model_prompts']['Row'];
export type TempOrgRequest = Database['public']['Tables']['temp_org_requests']['Row'];
export type TempOrgRequestInsert = Database['public']['Tables']['temp_org_requests']['Insert'];
export type MessageFeedback = Database['public']['Tables']['message_feedback']['Row'];
export type MessageFeedbackInsert = Database['public']['Tables']['message_feedback']['Insert'];
export type ProductTier = Database['public']['Tables']['product_tiers']['Row'];
export type KeyMap = Database['public']['Tables']['key_map']['Row'];
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert'];
export type OrganizationUpdate = Database['public']['Tables']['organizations']['Update'];
