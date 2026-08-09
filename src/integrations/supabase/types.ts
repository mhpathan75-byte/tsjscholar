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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          audience: string
          author_id: string
          body: string
          created_at: string
          id: string
          image_url: string | null
          image_urls: string[] | null
          links: string[] | null
          pinned: boolean | null
          priority: string | null
          scheduled_for: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          author_id: string
          body: string
          created_at?: string
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          links?: string[] | null
          pinned?: boolean | null
          priority?: string | null
          scheduled_for?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          links?: string[] | null
          pinned?: boolean | null
          priority?: string | null
          scheduled_for?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ashra_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ashra_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ashra_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ashra_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_responses: {
        Row: {
          answer: Json
          attempt_id: string
          id: string
          is_correct: boolean | null
          marks_awarded: number | null
          question_id: string
          saved_at: string
          state: string
          time_seconds: number
        }
        Insert: {
          answer?: Json
          attempt_id: string
          id?: string
          is_correct?: boolean | null
          marks_awarded?: number | null
          question_id: string
          saved_at?: string
          state?: string
          time_seconds?: number
        }
        Update: {
          answer?: Json
          attempt_id?: string
          id?: string
          is_correct?: boolean | null
          marks_awarded?: number | null
          question_id?: string
          saved_at?: string
          state?: string
          time_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "attempt_responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          event_date: string
          event_type: string
          id: string
          related_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          event_date: string
          event_type?: string
          id?: string
          related_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          event_date?: string
          event_type?: string
          id?: string
          related_id?: string | null
          title?: string
        }
        Relationships: []
      }
      doubts: {
        Row: {
          answer: string | null
          answer_files: Json
          answered_at: string | null
          answered_by: string | null
          created_at: string
          id: string
          image_urls: string[]
          question: string
          specific_teacher_id: string | null
          student_id: string
          subject: string
          visibility: string
        }
        Insert: {
          answer?: string | null
          answer_files?: Json
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          id?: string
          image_urls?: string[]
          question: string
          specific_teacher_id?: string | null
          student_id: string
          subject: string
          visibility?: string
        }
        Update: {
          answer?: string | null
          answer_files?: Json
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          id?: string
          image_urls?: string[]
          question?: string
          specific_teacher_id?: string | null
          student_id?: string
          subject?: string
          visibility?: string
        }
        Relationships: []
      }
      fee_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string | null
          paid_on: string
          recorded_by: string | null
          remarks: string | null
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string | null
          paid_on?: string
          recorded_by?: string | null
          remarks?: string | null
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string | null
          paid_on?: string
          recorded_by?: string | null
          remarks?: string | null
          student_id?: string
        }
        Relationships: []
      }
      fees: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          remarks: string | null
          student_id: string
          total_amount: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          remarks?: string | null
          student_id: string
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          remarks?: string | null
          student_id?: string
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      gallery_albums: {
        Row: {
          cover_url: string | null
          created_at: string
          created_by: string
          description: string | null
          event_date: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          event_date?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          event_date?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          album_id: string
          caption: string | null
          created_at: string
          id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          album_id: string
          caption?: string | null
          created_at?: string
          id?: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          album_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_images_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "gallery_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      material_favorites: {
        Row: {
          created_at: string
          material_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          material_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          material_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_favorites_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      material_views: {
        Row: {
          id: string
          material_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          material_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          material_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_views_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          academic_year: string | null
          category: string | null
          chapter: string | null
          created_at: string
          description: string | null
          download_count: number | null
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          pinned: boolean | null
          size_bytes: number | null
          stream: string | null
          subject: string | null
          tags: string[] | null
          title: string
          topic: string | null
          uploader_id: string
          visibility: string | null
        }
        Insert: {
          academic_year?: string | null
          category?: string | null
          chapter?: string | null
          created_at?: string
          description?: string | null
          download_count?: number | null
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          pinned?: boolean | null
          size_bytes?: number | null
          stream?: string | null
          subject?: string | null
          tags?: string[] | null
          title: string
          topic?: string | null
          uploader_id: string
          visibility?: string | null
        }
        Update: {
          academic_year?: string | null
          category?: string | null
          chapter?: string | null
          created_at?: string
          description?: string | null
          download_count?: number | null
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          pinned?: boolean | null
          size_bytes?: number | null
          stream?: string | null
          subject?: string | null
          tags?: string[] | null
          title?: string
          topic?: string | null
          uploader_id?: string
          visibility?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          category: string
          created_at: string
          icon: string | null
          id: string
          link: string | null
          message: string | null
          read_at: string | null
          sender_id: string | null
          sender_name: string | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          icon?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read_at?: string | null
          sender_id?: string | null
          sender_name?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          icon?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read_at?: string | null
          sender_id?: string | null
          sender_name?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          class_level: number | null
          created_at: string
          exam_track: Database["public"]["Enums"]["exam_track"] | null
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          subject: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          class_level?: number | null
          created_at?: string
          exam_track?: Database["public"]["Enums"]["exam_track"] | null
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          subject?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          class_level?: number | null
          created_at?: string
          exam_track?: Database["public"]["Enums"]["exam_track"] | null
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          subject?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      question_reports: {
        Row: {
          attempt_id: string
          created_at: string
          details: string
          id: string
          question_id: string
          reason: string
          status: string
          student_id: string
        }
        Insert: {
          attempt_id: string
          created_at?: string
          details?: string
          id?: string
          question_id: string
          reason: string
          status?: string
          student_id: string
        }
        Update: {
          attempt_id?: string
          created_at?: string
          details?: string
          id?: string
          question_id?: string
          reason?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_reports_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_reports_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          chapter: string
          correct_answer: Json
          created_at: string
          created_by: string
          diagrams: Json
          difficulty: string
          id: string
          marks: number
          metadata: Json
          negative_marks: number
          options: Json
          passage: string | null
          position: number
          question_type: string
          solution: string
          source_kind: string
          source_ref: string | null
          stem: string
          subject: string
          version_id: string
        }
        Insert: {
          chapter: string
          correct_answer?: Json
          created_at?: string
          created_by: string
          diagrams?: Json
          difficulty: string
          id?: string
          marks?: number
          metadata?: Json
          negative_marks?: number
          options?: Json
          passage?: string | null
          position: number
          question_type: string
          solution?: string
          source_kind?: string
          source_ref?: string | null
          stem: string
          subject: string
          version_id: string
        }
        Update: {
          chapter?: string
          correct_answer?: Json
          created_at?: string
          created_by?: string
          diagrams?: Json
          difficulty?: string
          id?: string
          marks?: number
          metadata?: Json
          negative_marks?: number
          options?: Json
          passage?: string | null
          position?: number
          question_type?: string
          solution?: string
          source_kind?: string
          source_ref?: string | null
          stem?: string
          subject?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "test_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          correct_count: number
          created_at: string
          id: string
          incorrect_count: number
          last_synced_at: string | null
          max_score: number | null
          option_orders: Json
          percentage: number | null
          question_order: string[]
          rank: number | null
          score: number | null
          started_at: string | null
          status: string
          student_id: string
          submit_reason: string | null
          submitted_at: string | null
          test_id: string
          unattempted_count: number
          version_id: string
          violation_count: number
        }
        Insert: {
          correct_count?: number
          created_at?: string
          id?: string
          incorrect_count?: number
          last_synced_at?: string | null
          max_score?: number | null
          option_orders?: Json
          percentage?: number | null
          question_order?: string[]
          rank?: number | null
          score?: number | null
          started_at?: string | null
          status?: string
          student_id: string
          submit_reason?: string | null
          submitted_at?: string | null
          test_id: string
          unattempted_count?: number
          version_id: string
          violation_count?: number
        }
        Update: {
          correct_count?: number
          created_at?: string
          id?: string
          incorrect_count?: number
          last_synced_at?: string | null
          max_score?: number | null
          option_orders?: Json
          percentage?: number | null
          question_order?: string[]
          rank?: number | null
          score?: number | null
          started_at?: string | null
          status?: string
          student_id?: string
          submit_reason?: string | null
          submitted_at?: string | null
          test_id?: string
          unattempted_count?: number
          version_id?: string
          violation_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "test_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_versions: {
        Row: {
          change_reason: string
          created_at: string
          created_by: string
          id: string
          locked_at: string | null
          test_id: string
          version_number: number
        }
        Insert: {
          change_reason?: string
          created_at?: string
          created_by: string
          id?: string
          locked_at?: string | null
          test_id: string
          version_number: number
        }
        Update: {
          change_reason?: string
          created_at?: string
          created_by?: string
          id?: string
          locked_at?: string | null
          test_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "test_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_versions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_violations: {
        Row: {
          attempt_id: string
          id: string
          metadata: Json
          occurred_at: string
          question_id: string | null
          reason: string
          student_id: string
          violation_type: string
        }
        Insert: {
          attempt_id: string
          id?: string
          metadata?: Json
          occurred_at?: string
          question_id?: string | null
          reason: string
          student_id: string
          violation_type: string
        }
        Update: {
          attempt_id?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          question_id?: string | null
          reason?: string
          student_id?: string
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_violations_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_violations_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_violations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          active_version_id: string | null
          chapters: Json
          class_level: number
          created_at: string
          created_by: string
          difficulty: Json
          duration_minutes: number
          ends_at: string | null
          exam_type: string
          id: string
          instructions: string
          language: string
          negative_marks: number
          partial_marking: boolean
          positive_marks: number
          question_types: string[]
          scheduled_at: string | null
          source_strategy: string
          status: string
          stream: string
          subjects: string[]
          title: string
          total_marks: number
          total_questions: number
          updated_at: string
        }
        Insert: {
          active_version_id?: string | null
          chapters?: Json
          class_level: number
          created_at?: string
          created_by: string
          difficulty?: Json
          duration_minutes: number
          ends_at?: string | null
          exam_type: string
          id?: string
          instructions?: string
          language?: string
          negative_marks?: number
          partial_marking?: boolean
          positive_marks?: number
          question_types?: string[]
          scheduled_at?: string | null
          source_strategy?: string
          status?: string
          stream: string
          subjects?: string[]
          title: string
          total_marks: number
          total_questions: number
          updated_at?: string
        }
        Update: {
          active_version_id?: string | null
          chapters?: Json
          class_level?: number
          created_at?: string
          created_by?: string
          difficulty?: Json
          duration_minutes?: number
          ends_at?: string | null
          exam_type?: string
          id?: string
          instructions?: string
          language?: string
          negative_marks?: number
          partial_marking?: boolean
          positive_marks?: number
          question_types?: string[]
          scheduled_at?: string | null
          source_strategy?: string
          status?: string
          stream?: string
          subjects?: string[]
          title?: string
          total_marks?: number
          total_questions?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_active_version_fkey"
            columns: ["active_version_id"]
            isOneToOne: false
            referencedRelation: "test_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "principal" | "teacher" | "student"
      exam_track: "JEE" | "NEET"
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
      app_role: ["principal", "teacher", "student"],
      exam_track: ["JEE", "NEET"],
    },
  },
} as const
