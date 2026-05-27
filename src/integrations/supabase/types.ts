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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          email: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          created_at: string
          description: string | null
          event_date: string
          id: string
          image_url: string | null
          start_time: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date: string
          id?: string
          image_url?: string | null
          start_time?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date?: string
          id?: string
          image_url?: string | null
          start_time?: string | null
          title?: string
        }
        Relationships: []
      }
      match_events: {
        Row: {
          created_at: string
          event_order: number
          event_type: string
          id: string
          match_id: string
          minute: number | null
          period: string | null
          player_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          event_order?: number
          event_type: string
          id?: string
          match_id: string
          minute?: number | null
          period?: string | null
          player_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          event_order?: number
          event_type?: string
          id?: string
          match_id?: string
          minute?: number | null
          period?: string | null
          player_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "v_player_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "match_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "v_top_clean_sheets"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "match_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "v_top_scorers"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "match_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "match_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_aggregate"
            referencedColumns: ["team_id"]
          },
        ]
      }
      matchdays: {
        Row: {
          created_at: string
          event_date: string
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          event_date: string
          id?: string
          sort_order: number
          title: string
        }
        Update: {
          created_at?: string
          event_date?: string
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          away_placeholder: string | null
          away_score: number
          away_team_id: string | null
          created_at: string
          current_phase: string | null
          first_half_ended_at: string | null
          first_half_started_at: string | null
          home_placeholder: string | null
          home_score: number
          home_team_id: string | null
          id: string
          matchday_id: string | null
          notes: string | null
          result_type: string | null
          scheduled_at: string
          second_half_ended_at: string | null
          second_half_started_at: string | null
          stage_id: string
          status: string
          venue: string | null
          winner_team_id: string | null
        }
        Insert: {
          away_placeholder?: string | null
          away_score?: number
          away_team_id?: string | null
          created_at?: string
          current_phase?: string | null
          first_half_ended_at?: string | null
          first_half_started_at?: string | null
          home_placeholder?: string | null
          home_score?: number
          home_team_id?: string | null
          id?: string
          matchday_id?: string | null
          notes?: string | null
          result_type?: string | null
          scheduled_at: string
          second_half_ended_at?: string | null
          second_half_started_at?: string | null
          stage_id: string
          status?: string
          venue?: string | null
          winner_team_id?: string | null
        }
        Update: {
          away_placeholder?: string | null
          away_score?: number
          away_team_id?: string | null
          created_at?: string
          current_phase?: string | null
          first_half_ended_at?: string | null
          first_half_started_at?: string | null
          home_placeholder?: string | null
          home_score?: number
          home_team_id?: string | null
          id?: string
          matchday_id?: string | null
          notes?: string | null
          result_type?: string | null
          scheduled_at?: string
          second_half_ended_at?: string | null
          second_half_started_at?: string | null
          stage_id?: string
          status?: string
          venue?: string | null
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "v_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "v_team_aggregate"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "v_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "v_team_aggregate"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_matchday_id_fkey"
            columns: ["matchday_id"]
            isOneToOne: false
            referencedRelation: "matchdays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "v_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "v_team_aggregate"
            referencedColumns: ["team_id"]
          },
        ]
      }
      players: {
        Row: {
          active: boolean
          created_at: string
          full_name: string
          id: string
          jersey_number: number | null
          role: string
          team_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          full_name: string
          id?: string
          jersey_number?: number | null
          role: string
          team_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string
          id?: string
          jersey_number?: number | null
          role?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_aggregate"
            referencedColumns: ["team_id"]
          },
        ]
      }
      stages: {
        Row: {
          code: string
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          id?: string
          label: string
          sort_order: number
        }
        Update: {
          code?: string
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string | null
          short_name: string | null
          color: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug?: string | null
          short_name?: string | null
          color?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string | null
          short_name?: string | null
          color?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_player_stats: {
        Row: {
          appearances: number | null
          clean_sheets: number | null
          full_name: string | null
          goals: number | null
          own_goals: number | null
          player_id: string | null
          red_cards: number | null
          role: string | null
          team_id: string | null
          team_name: string | null
          yellow_cards: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_aggregate"
            referencedColumns: ["team_id"]
          },
        ]
      }
      v_standings: {
        Row: {
          gd: number | null
          gf: number | null
          gs: number | null
          l: number | null
          l_so: number | null
          name: string | null
          played: number | null
          points: number | null
          team_id: string | null
          w: number | null
          w_so: number | null
        }
        Relationships: []
      }
      v_team_aggregate: {
        Row: {
          gd: number | null
          gf: number | null
          gs: number | null
          l: number | null
          l_so: number | null
          name: string | null
          played: number | null
          points: number | null
          team_id: string | null
          w: number | null
          w_so: number | null
        }
        Relationships: []
      }
      v_top_clean_sheets: {
        Row: {
          clean_sheets: number | null
          full_name: string | null
          player_id: string | null
          team_id: string | null
          team_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_aggregate"
            referencedColumns: ["team_id"]
          },
        ]
      }
      v_top_scorers: {
        Row: {
          full_name: string | null
          goals: number | null
          player_id: string | null
          team_id: string | null
          team_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_team_aggregate"
            referencedColumns: ["team_id"]
          },
        ]
      }
    }
    Functions: {
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      recalculate_all_matches: { Args: never; Returns: number }
      recalculate_match_score: {
        Args: { _match_id: string }
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
