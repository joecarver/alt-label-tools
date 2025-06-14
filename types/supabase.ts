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
      artists: {
        Row: {
          address: string | null
          apple_music_url: string | null
          artist_name: string | null
          bandcamp_url: string | null
          created_at: string
          email: string | null
          gov_name: string | null
          id: number
          spotify_url: string | null
        }
        Insert: {
          address?: string | null
          apple_music_url?: string | null
          artist_name?: string | null
          bandcamp_url?: string | null
          created_at?: string
          email?: string | null
          gov_name?: string | null
          id?: number
          spotify_url?: string | null
        }
        Update: {
          address?: string | null
          apple_music_url?: string | null
          artist_name?: string | null
          bandcamp_url?: string | null
          created_at?: string
          email?: string | null
          gov_name?: string | null
          id?: number
          spotify_url?: string | null
        }
        Relationships: []
      }
      client_users: {
        Row: {
          client_id: string | null
          created_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          folder_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          folder_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          folder_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      designer: {
        Row: {
          created_at: string
          email: string | null
          id: number
          name: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: number
          name?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: number
          name?: string | null
        }
        Relationships: []
      }
      mastering_engineer: {
        Row: {
          created_at: string
          email: string | null
          id: number
          name: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: number
          name?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: number
          name?: string | null
        }
        Relationships: []
      }
      release_artists: {
        Row: {
          artist_id: number
          created_at: string
          release_id: string
        }
        Insert: {
          artist_id?: number
          created_at?: string
          release_id: string
        }
        Update: {
          artist_id?: number
          created_at?: string
          release_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_artists_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      releases: {
        Row: {
          campaign_length_weeks: number
          catalog_number: string
          client_id: string | null
          created_at: string
          designer: number | null
          folder_id: string | null
          id: string
          license_allow_alcohol: boolean | null
          license_allow_fastfashion: boolean | null
          license_allow_fastfood: boolean | null
          license_allow_pharmaceuticals: boolean | null
          license_allow_politics: boolean | null
          mastering_engineer: number | null
          name: string
          release_date: string | null
          services_required_dj_promo: boolean | null
          services_required_marketing_driver: boolean | null
          services_required_mastering: boolean | null
          services_required_mixing: boolean | null
          services_required_playlist_pitching: boolean | null
          services_required_press: boolean | null
          services_required_press_release: boolean | null
          services_required_sync: boolean | null
          updated_at: string
        }
        Insert: {
          campaign_length_weeks?: number
          catalog_number: string
          client_id?: string | null
          created_at?: string
          designer?: number | null
          folder_id?: string | null
          id?: string
          license_allow_alcohol?: boolean | null
          license_allow_fastfashion?: boolean | null
          license_allow_fastfood?: boolean | null
          license_allow_pharmaceuticals?: boolean | null
          license_allow_politics?: boolean | null
          mastering_engineer?: number | null
          name: string
          release_date?: string | null
          services_required_dj_promo?: boolean | null
          services_required_marketing_driver?: boolean | null
          services_required_mastering?: boolean | null
          services_required_mixing?: boolean | null
          services_required_playlist_pitching?: boolean | null
          services_required_press?: boolean | null
          services_required_press_release?: boolean | null
          services_required_sync?: boolean | null
          updated_at?: string
        }
        Update: {
          campaign_length_weeks?: number
          catalog_number?: string
          client_id?: string | null
          created_at?: string
          designer?: number | null
          folder_id?: string | null
          id?: string
          license_allow_alcohol?: boolean | null
          license_allow_fastfashion?: boolean | null
          license_allow_fastfood?: boolean | null
          license_allow_pharmaceuticals?: boolean | null
          license_allow_politics?: boolean | null
          mastering_engineer?: number | null
          name?: string
          release_date?: string | null
          services_required_dj_promo?: boolean | null
          services_required_marketing_driver?: boolean | null
          services_required_mastering?: boolean | null
          services_required_mixing?: boolean | null
          services_required_playlist_pitching?: boolean | null
          services_required_press?: boolean | null
          services_required_press_release?: boolean | null
          services_required_sync?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "releases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "releases_designer_fkey"
            columns: ["designer"]
            isOneToOne: false
            referencedRelation: "designer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "releases_mastering_engineer_fkey"
            columns: ["mastering_engineer"]
            isOneToOne: false
            referencedRelation: "mastering_engineer"
            referencedColumns: ["id"]
          },
        ]
      }
      task_statuses: {
        Row: {
          color: string
          completion_status: string
          created_at: string
          due_date_status: string
          file_info: Json | null
          id: string
          task_id: string | null
          updated_at: string
        }
        Insert: {
          color: string
          completion_status: string
          created_at?: string
          due_date_status: string
          file_info?: Json | null
          id?: string
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string
          completion_status?: string
          created_at?: string
          due_date_status?: string
          file_info?: Json | null
          id?: string
          task_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_statuses_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          end_date: string | null
          id: string
          is_detectable: boolean | null
          name: string
          release_id: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_detectable?: boolean | null
          name: string
          release_id?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_detectable?: boolean | null
          name?: string
          release_id?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      alert_on_sync_failure: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      check_sync_health: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          last_sync: string
          record_count: number
          is_healthy: boolean
          time_since_last_sync: unknown
        }[]
      }
      send_sync_failure_email: {
        Args: {
          function_name: string
          error_message: string
          execution_time_ms: number
        }
        Returns: undefined
      }
      update_sync_health: {
        Args: Record<PropertyKey, never>
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
