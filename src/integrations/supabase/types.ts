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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      goals: {
        Row: {
          archive_status: Database["public"]["Enums"]["archive_status_enum"]
          completed_at: string | null
          completed_tasks: number
          created_at: string
          description: string | null
          id: string
          modality: string
          target_date: string | null
          title: string
          total_tasks: number
          updated_at: string
          user_id: string
          weekly_hours: number | null
        }
        Insert: {
          archive_status?: Database["public"]["Enums"]["archive_status_enum"]
          completed_at?: string | null
          completed_tasks?: number
          created_at?: string
          description?: string | null
          id?: string
          modality: string
          target_date?: string | null
          title: string
          total_tasks?: number
          updated_at?: string
          user_id: string
          weekly_hours?: number | null
        }
        Update: {
          archive_status?: Database["public"]["Enums"]["archive_status_enum"]
          completed_at?: string | null
          completed_tasks?: number
          created_at?: string
          description?: string | null
          id?: string
          modality?: string
          target_date?: string | null
          title?: string
          total_tasks?: number
          updated_at?: string
          user_id?: string
          weekly_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          completed_tasks: number
          created_at: string
          goal_id: string
          id: string
          order_index: number | null
          status: string
          title: string
          total_tasks: number
          updated_at: string
        }
        Insert: {
          completed_tasks?: number
          created_at?: string
          goal_id: string
          id?: string
          order_index?: number | null
          status?: string
          title: string
          total_tasks?: number
          updated_at?: string
        }
        Update: {
          completed_tasks?: number
          created_at?: string
          goal_id?: string
          id?: string
          order_index?: number | null
          status?: string
          title?: string
          total_tasks?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals_with_computed_status"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          current_entitlement: string
          display_name: string | null
          id: string
          revenuecat_id: string | null
          signed_up_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_entitlement?: string
          display_name?: string | null
          id: string
          revenuecat_id?: string | null
          signed_up_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_entitlement?: string
          display_name?: string | null
          id?: string
          revenuecat_id?: string | null
          signed_up_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          description: string | null
          duration_hours: number | null
          end_date: string | null
          goal_id: string
          id: string
          is_anchored: boolean
          milestone_id: string
          priority: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          end_date?: string | null
          goal_id: string
          id?: string
          is_anchored?: boolean
          milestone_id: string
          priority?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          end_date?: string | null
          goal_id?: string
          id?: string
          is_anchored?: boolean
          milestone_id?: string
          priority?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals_with_computed_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones_with_computed_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_messages: {
        Row: {
          acknowledged_at: string | null
          body: string
          created_at: string
          id: string
          is_acknowledged: boolean
          message_type: string
          title: string
          updated_at: string
          user_id: string
          user_snooze_until: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          body: string
          created_at?: string
          id?: string
          is_acknowledged?: boolean
          message_type: string
          title: string
          updated_at?: string
          user_id: string
          user_snooze_until?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          body?: string
          created_at?: string
          id?: string
          is_acknowledged?: boolean
          message_type?: string
          title?: string
          updated_at?: string
          user_id?: string
          user_snooze_until?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      goals_with_computed_status: {
        Row: {
          archive_status:
            | Database["public"]["Enums"]["archive_status_enum"]
            | null
          completed_at: string | null
          completed_tasks: number | null
          created_at: string | null
          description: string | null
          id: string | null
          modality: string | null
          status: string | null
          target_date: string | null
          title: string | null
          total_tasks: number | null
          updated_at: string | null
          user_id: string | null
          weekly_hours: number | null
        }
        Insert: {
          archive_status?:
            | Database["public"]["Enums"]["archive_status_enum"]
            | null
          completed_at?: string | null
          completed_tasks?: number | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          modality?: string | null
          status?: never
          target_date?: string | null
          title?: string | null
          total_tasks?: number | null
          updated_at?: string | null
          user_id?: string | null
          weekly_hours?: number | null
        }
        Update: {
          archive_status?:
            | Database["public"]["Enums"]["archive_status_enum"]
            | null
          completed_at?: string | null
          completed_tasks?: number | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          modality?: string | null
          status?: never
          target_date?: string | null
          title?: string | null
          total_tasks?: number | null
          updated_at?: string | null
          user_id?: string | null
          weekly_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones_with_computed_status: {
        Row: {
          completed_tasks: number | null
          created_at: string | null
          goal_id: string | null
          id: string | null
          order_index: number | null
          status: string | null
          title: string | null
          total_tasks: number | null
          updated_at: string | null
        }
        Insert: {
          completed_tasks?: number | null
          created_at?: string | null
          goal_id?: string | null
          id?: string | null
          order_index?: number | null
          status?: never
          title?: string | null
          total_tasks?: number | null
          updated_at?: string | null
        }
        Update: {
          completed_tasks?: number | null
          created_at?: string | null
          goal_id?: string | null
          id?: string | null
          order_index?: number | null
          status?: never
          title?: string | null
          total_tasks?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals_with_computed_status"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      acknowledge_message: {
        Args: { p_message_id: string }
        Returns: undefined
      }
      archive_excess_goals: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      archive_excess_goals_for_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      archive_goal: {
        Args: { p_goal_id: string }
        Returns: undefined
      }
      can_create_new_goal: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      complete_all_goal_tasks: {
        Args: { p_goal_id: string }
        Returns: Json
      }
      complete_task: {
        Args: { p_task_id: string }
        Returns: undefined
      }
      create_manual_goal: {
        Args: { p_modality: string; p_target_date?: string; p_title: string }
        Returns: string
      }
      create_milestone: {
        Args: { p_goal_id: string; p_order_index?: number; p_title: string }
        Returns: string
      }
      create_task: {
        Args: {
          p_description?: string
          p_duration_hours?: number
          p_end_date?: string
          p_is_anchored?: boolean
          p_milestone_id: string
          p_priority?: string
          p_start_date?: string
          p_title: string
        }
        Returns: string
      }
      delete_milestone_and_tasks: {
        Args: { p_milestone_id: string }
        Returns: number
      }
      delete_my_account: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      delete_task: {
        Args: { p_task_id: string }
        Returns: undefined
      }
      detect_and_queue_deadline_warnings: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      detect_and_queue_momentum_boosters: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      detect_and_queue_slumps: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      execute_plan_update: {
        Args: { p_task_id_to_delete?: string; p_tasks_to_update?: Json }
        Returns: undefined
      }
      get_all_overdue_tasks: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_cron_job_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          active: boolean
          jobname: string
          last_run: string
          schedule: string
        }[]
      }
      get_goal_stats: {
        Args: { goal_uuid: string }
        Returns: Json
      }
      get_next_pending_message: {
        Args: Record<PropertyKey, never>
        Returns: {
          acknowledged_at: string | null
          body: string
          created_at: string
          id: string
          is_acknowledged: boolean
          message_type: string
          title: string
          updated_at: string
          user_id: string
          user_snooze_until: string | null
        }[]
      }
      get_today_page_payload: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_today_tasks_summary: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_unacknowledged_messages: {
        Args: Record<PropertyKey, never>
        Returns: {
          acknowledged_at: string | null
          body: string
          created_at: string
          id: string
          is_acknowledged: boolean
          message_type: string
          title: string
          updated_at: string
          user_id: string
          user_snooze_until: string | null
        }[]
      }
      get_user_data: {
        Args: { user_uuid?: string }
        Returns: Json
      }
      get_user_goal_summary: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      goal_belongs_to_current_user: {
        Args: { p_goal_id: string }
        Returns: boolean
      }
      milestone_belongs_to_current_user: {
        Args: { p_milestone_id: string }
        Returns: boolean
      }
      permanently_delete_goal: {
        Args: { p_goal_id: string }
        Returns: undefined
      }
      priority_order: {
        Args: { p_priority: string }
        Returns: number
      }
      save_goal_plan: {
        Args: {
          p_milestones: Json
          p_modality: string
          p_target_date: string
          p_tasks: Json
          p_title: string
        }
        Returns: string
      }
      task_belongs_to_current_user: {
        Args: { p_task_id: string }
        Returns: boolean
      }
      toggle_task_status: {
        Args: { p_task_id: string }
        Returns: undefined
      }
      unarchive_system_goals_for_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      uncomplete_task: {
        Args: { p_task_id: string }
        Returns: undefined
      }
      update_milestone_title: {
        Args: { p_milestone_id: string; p_title: string }
        Returns: undefined
      }
      update_task_details: {
        Args: {
          p_description?: string
          p_duration_hours?: number
          p_end_date?: string
          p_is_anchored?: boolean
          p_priority?: string
          p_start_date?: string
          p_task_id: string
          p_title: string
        }
        Returns: undefined
      }
    }
    Enums: {
      archive_status_enum: "active" | "user_archived" | "system_archived"
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
      archive_status_enum: ["active", "user_archived", "system_archived"],
    },
  },
} as const
