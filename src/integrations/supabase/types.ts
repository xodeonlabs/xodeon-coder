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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_activity_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: string | null
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: string | null
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: string | null
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      ads: {
        Row: {
          created_at: string
          description: string
          emoji: string
          gradient: string
          id: string
          is_active: boolean
          organization_id: string | null
          pages: string[]
          sort_order: number
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string
          emoji?: string
          gradient?: string
          id?: string
          is_active?: boolean
          organization_id?: string | null
          pages?: string[]
          sort_order?: number
          title: string
          url?: string
        }
        Update: {
          created_at?: string
          description?: string
          emoji?: string
          gradient?: string
          id?: string
          is_active?: boolean
          organization_id?: string | null
          pages?: string[]
          sort_order?: number
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          app_id: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      alliance_chat_messages: {
        Row: {
          alliance_id: string
          content: string
          created_at: string
          id: string
          organization_id: string
          user_id: string
        }
        Insert: {
          alliance_id: string
          content: string
          created_at?: string
          id?: string
          organization_id: string
          user_id: string
        }
        Update: {
          alliance_id?: string
          content?: string
          created_at?: string
          id?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alliance_chat_messages_alliance_id_fkey"
            columns: ["alliance_id"]
            isOneToOne: false
            referencedRelation: "alliances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alliance_chat_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      alliance_coins: {
        Row: {
          alliance_id: string
          balance: number
          id: string
          updated_at: string
        }
        Insert: {
          alliance_id: string
          balance?: number
          id?: string
          updated_at?: string
        }
        Update: {
          alliance_id?: string
          balance?: number
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alliance_coins_alliance_id_fkey"
            columns: ["alliance_id"]
            isOneToOne: true
            referencedRelation: "alliances"
            referencedColumns: ["id"]
          },
        ]
      }
      alliance_members: {
        Row: {
          alliance_id: string
          id: string
          joined_at: string
          organization_id: string
        }
        Insert: {
          alliance_id: string
          id?: string
          joined_at?: string
          organization_id: string
        }
        Update: {
          alliance_id?: string
          id?: string
          joined_at?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alliance_members_alliance_id_fkey"
            columns: ["alliance_id"]
            isOneToOne: false
            referencedRelation: "alliances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alliance_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      alliances: {
        Row: {
          chat_retention_hours: number
          created_at: string
          created_by: string
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          chat_retention_hours?: number
          created_at?: string
          created_by: string
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          chat_retention_hours?: number
          created_at?: string
          created_by?: string
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      app_versions: {
        Row: {
          app_id: string
          created_at: string
          created_by: string
          id: string
          label: string
          ngc_code: string
        }
        Insert: {
          app_id: string
          created_at?: string
          created_by: string
          id?: string
          label?: string
          ngc_code: string
        }
        Update: {
          app_id?: string
          created_at?: string
          created_by?: string
          id?: string
          label?: string
          ngc_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_versions_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_views: {
        Row: {
          app_id: string
          id: string
          referrer: string | null
          user_agent: string | null
          viewed_at: string
          visitor_ip: string | null
        }
        Insert: {
          app_id: string
          id?: string
          referrer?: string | null
          user_agent?: string | null
          viewed_at?: string
          visitor_ip?: string | null
        }
        Update: {
          app_id?: string
          id?: string
          referrer?: string | null
          user_agent?: string | null
          viewed_at?: string
          visitor_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_views_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      apps: {
        Row: {
          banner_url: string | null
          chat_retention_hours: number
          created_at: string
          icon: string | null
          id: string
          is_public: boolean
          is_remixable: boolean
          name: string
          ngc_code: string
          organization_id: string | null
          owner_id: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          chat_retention_hours?: number
          created_at?: string
          icon?: string | null
          id?: string
          is_public?: boolean
          is_remixable?: boolean
          name?: string
          ngc_code?: string
          organization_id?: string | null
          owner_id: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          chat_retention_hours?: number
          created_at?: string
          icon?: string | null
          id?: string
          is_public?: boolean
          is_remixable?: boolean
          name?: string
          ngc_code?: string
          organization_id?: string | null
          owner_id?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          label: string
          sort_order: number
          value: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          label: string
          sort_order?: number
          value: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          label?: string
          sort_order?: number
          value?: string
        }
        Relationships: []
      }
      chat_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_group_messages: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_group_read_status: {
        Row: {
          group_id: string
          id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_group_read_status_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_groups: {
        Row: {
          chat_retention_hours: number
          created_at: string
          created_by: string
          icon: string | null
          id: string
          name: string
          organization_id: string | null
          type: Database["public"]["Enums"]["chat_group_type"]
          updated_at: string
        }
        Insert: {
          chat_retention_hours?: number
          created_at?: string
          created_by: string
          icon?: string | null
          id?: string
          name: string
          organization_id?: string | null
          type?: Database["public"]["Enums"]["chat_group_type"]
          updated_at?: string
        }
        Update: {
          chat_retention_hours?: number
          created_at?: string
          created_by?: string
          icon?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          type?: Database["public"]["Enums"]["chat_group_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          app_id: string
          content: string
          created_at: string
          id: string
          user_email: string
          user_id: string
        }
        Insert: {
          app_id: string
          content: string
          created_at?: string
          id?: string
          user_email: string
          user_id: string
        }
        Update: {
          app_id?: string
          content?: string
          created_at?: string
          id?: string
          user_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborator_contracts: {
        Row: {
          app_id: string
          collaborator_id: string
          counter_percentage: number | null
          created_at: string
          id: string
          percentage: number
          proposed_by: string
          status: string
          updated_at: string
        }
        Insert: {
          app_id: string
          collaborator_id: string
          counter_percentage?: number | null
          created_at?: string
          id?: string
          percentage?: number
          proposed_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          app_id?: string
          collaborator_id?: string
          counter_percentage?: number | null
          created_at?: string
          id?: string
          percentage?: number
          proposed_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborator_contracts_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      org_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          organization_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          organization_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_chat_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_chat_read_status: {
        Row: {
          id: string
          last_read_at: string
          organization_id: string
          user_id: string
        }
        Insert: {
          id?: string
          last_read_at?: string
          organization_id: string
          user_id: string
        }
        Update: {
          id?: string
          last_read_at?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_chat_read_status_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_coin_transactions: {
        Row: {
          amount: number
          coin_name: string
          created_at: string
          id: string
          note: string | null
          organization_id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          coin_name?: string
          created_at?: string
          id?: string
          note?: string | null
          organization_id: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          coin_name?: string
          created_at?: string
          id?: string
          note?: string | null
          organization_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_coin_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_coins: {
        Row: {
          balance: number
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          id?: string
          name?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_coins_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_join_requests: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_join_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          auto_pay: boolean
          bio: string
          chat_retention_hours: number
          created_at: string
          icon: string | null
          id: string
          join_code: string
          level: number
          level_paid_until: string | null
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          auto_pay?: boolean
          bio?: string
          chat_retention_hours?: number
          created_at?: string
          icon?: string | null
          id?: string
          join_code?: string
          level?: number
          level_paid_until?: string | null
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          auto_pay?: boolean
          bio?: string
          chat_retention_hours?: number
          created_at?: string
          icon?: string | null
          id?: string
          join_code?: string
          level?: number
          level_paid_until?: string | null
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      pinned_apps: {
        Row: {
          app_id: string
          created_at: string
          id: string
          sort_order: number
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          id?: string
          sort_order?: number
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_apps_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          friend_chat_retention_hours: number
          id: string
          is_dnd: boolean
          last_seen_at: string | null
          public_email: string | null
          show_email: boolean | null
          social_links: Json | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          friend_chat_retention_hours?: number
          id: string
          is_dnd?: boolean
          last_seen_at?: string | null
          public_email?: string | null
          show_email?: boolean | null
          social_links?: Json | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          friend_chat_retention_hours?: number
          id?: string
          is_dnd?: boolean
          last_seen_at?: string | null
          public_email?: string | null
          show_email?: boolean | null
          social_links?: Json | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      project_collaborators: {
        Row: {
          app_id: string
          created_at: string
          id: string
          invited_by: string
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          id?: string
          invited_by: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          id?: string
          invited_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_collaborators_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          author_id: string
          category: string
          created_at: string
          description: string
          downloads: number
          id: string
          is_published: boolean
          name: string
          ngc_code: string
          updated_at: string
          visibility: string
        }
        Insert: {
          author_id: string
          category?: string
          created_at?: string
          description?: string
          downloads?: number
          id?: string
          is_published?: boolean
          name: string
          ngc_code?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          author_id?: string
          category?: string
          created_at?: string
          description?: string
          downloads?: number
          id?: string
          is_published?: boolean
          name?: string
          ngc_code?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      user_coins: {
        Row: {
          balance: number
          id: string
          last_daily_bonus: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          last_daily_bonus?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          last_daily_bonus?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_friends: {
        Args: { _user1: string; _user2: string }
        Returns: boolean
      }
      has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["org_role"]
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_alliance_admin: { Args: { _alliance_id: string }; Returns: boolean }
      is_alliance_member: { Args: { _alliance_id: string }; Returns: boolean }
      is_app_collaborator: { Args: { _app_id: string }; Returns: boolean }
      is_app_org_member: { Args: { _app_id: string }; Returns: boolean }
      is_app_owner: { Args: { _app_id: string }; Returns: boolean }
      is_group_creator: { Args: { _group_id: string }; Returns: boolean }
      is_group_member: { Args: { _group_id: string }; Returns: boolean }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      is_org_owner: { Args: { _org_id: string }; Returns: boolean }
      is_own_app: { Args: { _app_id: string }; Returns: boolean }
      join_organization_by_code: { Args: { _code: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "owner"
      chat_group_type: "friend_group" | "private" | "org_channel"
      org_role: "owner" | "admin" | "member"
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
      app_role: ["admin", "moderator", "user", "owner"],
      chat_group_type: ["friend_group", "private", "org_channel"],
      org_role: ["owner", "admin", "member"],
    },
  },
} as const
