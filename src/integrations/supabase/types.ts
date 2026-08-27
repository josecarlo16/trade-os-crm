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
    PostgrestVersion: "14.17"
  }
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
      admin_costs: {
        Row: {
          amount: number
          cost_type: Database["public"]["Enums"]["admin_cost_type"]
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_required: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          cost_type?: Database["public"]["Enums"]["admin_cost_type"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          name: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          cost_type?: Database["public"]["Enums"]["admin_cost_type"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_costs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notification_preferences: {
        Row: {
          created_at: string
          general_enabled: boolean
          id: string
          job_enabled: boolean
          lead_enabled: boolean
          pipeline_enabled: boolean
          sound_enabled: boolean
          system_enabled: boolean
          team_enabled: boolean
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          general_enabled?: boolean
          id?: string
          job_enabled?: boolean
          lead_enabled?: boolean
          pipeline_enabled?: boolean
          sound_enabled?: boolean
          system_enabled?: boolean
          team_enabled?: boolean
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          general_enabled?: boolean
          id?: string
          job_enabled?: boolean
          lead_enabled?: boolean
          pipeline_enabled?: boolean
          sound_enabled?: boolean
          system_enabled?: boolean
          team_enabled?: boolean
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notifications: {
        Row: {
          category: string
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_dismissed: boolean
          is_read: boolean
          link_url: string | null
          message: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          tenant_id: string
          title: string
          user_id: string | null
        }
        Insert: {
          category?: string
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          link_url?: string | null
          message?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          tenant_id: string
          title: string
          user_id?: string | null
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          link_url?: string | null
          message?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          tenant_id?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          due_date: string | null
          id: string
          job_id: string | null
          pipeline_entry_id: string | null
          priority: string
          source: string | null
          source_event: string | null
          status: string
          submission_id: string | null
          submission_type: string | null
          tags: string[] | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          job_id?: string | null
          pipeline_entry_id?: string | null
          priority?: string
          source?: string | null
          source_event?: string | null
          status?: string
          submission_id?: string | null
          submission_type?: string | null
          tags?: string[] | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          job_id?: string | null
          pipeline_entry_id?: string | null
          priority?: string
          source?: string | null
          source_event?: string | null
          status?: string
          submission_id?: string | null
          submission_type?: string | null
          tags?: string[] | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_tasks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "crm_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_tasks_pipeline_entry_id_fkey"
            columns: ["pipeline_entry_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_config: {
        Row: {
          api_key_secret_name: string | null
          config_key: string
          created_at: string | null
          id: string
          is_active: boolean | null
          max_tokens: number | null
          model: string
          provider: string
          system_prompt: string | null
          temperature: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          api_key_secret_name?: string | null
          config_key: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          model?: string
          provider?: string
          system_prompt?: string | null
          temperature?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          api_key_secret_name?: string | null
          config_key?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          model?: string
          provider?: string
          system_prompt?: string | null
          temperature?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_request_logs: {
        Row: {
          action: string | null
          config_key: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          input_tokens: number | null
          metadata: Json | null
          model: string
          output_tokens: number | null
          provider: string
          status: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action?: string | null
          config_key?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model: string
          output_tokens?: number | null
          provider: string
          status?: string | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          action?: string | null
          config_key?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model?: string
          output_tokens?: number | null
          provider?: string
          status?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_request_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          created_at: string
          description: string | null
          id: string
          level: string
          related_job_id: string | null
          requested_by: string | null
          resolved_at: string | null
          resolved_by: string | null
          rule_id: string | null
          source_id: string
          source_type: string
          status: string
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          level: string
          related_job_id?: string | null
          requested_by?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
          source_id: string
          source_type: string
          status?: string
          tenant_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          level?: string
          related_job_id?: string | null
          requested_by?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
          source_id?: string
          source_type?: string
          status?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_related_job_id_fkey"
            columns: ["related_job_id"]
            isOneToOne: false
            referencedRelation: "crm_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "approval_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_rules: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          level: string
          min_amount: number | null
          source_type: string
          stage_name: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          level?: string
          min_amount?: number | null
          source_type: string
          stage_name?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          level?: string
          min_amount?: number | null
          source_type?: string
          stage_name?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      assistant_logs: {
        Row: {
          assistant_response: string | null
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          tenant_id: string
          tools_used: Json | null
          user_id: string | null
          user_message: string
        }
        Insert: {
          assistant_response?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          tenant_id: string
          tools_used?: Json | null
          user_id?: string | null
          user_message: string
        }
        Update: {
          assistant_response?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          tenant_id?: string
          tools_used?: Json | null
          user_id?: string | null
          user_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_role_permissions: {
        Row: {
          can_access_assistant: boolean
          can_use_calendar_tools: boolean
          can_use_voice_input: boolean
          can_use_write_tools: boolean
          can_view_briefing: boolean
          can_view_financials: boolean
          created_at: string
          id: string
          max_messages_per_hour: number
          role_name: string
          updated_at: string
        }
        Insert: {
          can_access_assistant?: boolean
          can_use_calendar_tools?: boolean
          can_use_voice_input?: boolean
          can_use_write_tools?: boolean
          can_view_briefing?: boolean
          can_view_financials?: boolean
          created_at?: string
          id?: string
          max_messages_per_hour?: number
          role_name: string
          updated_at?: string
        }
        Update: {
          can_access_assistant?: boolean
          can_use_calendar_tools?: boolean
          can_use_voice_input?: boolean
          can_use_write_tools?: boolean
          can_view_briefing?: boolean
          can_view_financials?: boolean
          created_at?: string
          id?: string
          max_messages_per_hour?: number
          role_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      author_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          actions_executed: Json | null
          automation_id: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          status: string | null
          tenant_id: string
          trigger_event: Json
        }
        Insert: {
          actions_executed?: Json | null
          automation_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          status?: string | null
          tenant_id: string
          trigger_event: Json
        }
        Update: {
          actions_executed?: Json | null
          automation_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          status?: string | null
          tenant_id?: string
          trigger_event?: Json
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          actions: Json | null
          conditions: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          run_count: number | null
          tenant_id: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          run_count?: number | null
          tenant_id: string
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          run_count?: number | null
          tenant_id?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categories: {
        Row: {
          created_at: string
          cta_body: string | null
          cta_button_href: string | null
          cta_button_label: string | null
          cta_heading: string | null
          display_order: number | null
          faqs: Json | null
          hero_eyebrow: string | null
          hero_heading: string
          hero_image: string | null
          hero_subheading: string | null
          id: string
          intro_html: string
          name: string
          related_post_categories: string[] | null
          related_service_links: Json | null
          slug: string
          status: string
          updated_at: string
          what_we_cover: Json | null
        }
        Insert: {
          created_at?: string
          cta_body?: string | null
          cta_button_href?: string | null
          cta_button_label?: string | null
          cta_heading?: string | null
          display_order?: number | null
          faqs?: Json | null
          hero_eyebrow?: string | null
          hero_heading: string
          hero_image?: string | null
          hero_subheading?: string | null
          id?: string
          intro_html: string
          name: string
          related_post_categories?: string[] | null
          related_service_links?: Json | null
          slug: string
          status?: string
          updated_at?: string
          what_we_cover?: Json | null
        }
        Update: {
          created_at?: string
          cta_body?: string | null
          cta_button_href?: string | null
          cta_button_label?: string | null
          cta_heading?: string | null
          display_order?: number | null
          faqs?: Json | null
          hero_eyebrow?: string | null
          hero_heading?: string
          hero_image?: string | null
          hero_subheading?: string | null
          id?: string
          intro_html?: string
          name?: string
          related_post_categories?: string[] | null
          related_service_links?: Json | null
          slug?: string
          status?: string
          updated_at?: string
          what_we_cover?: Json | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_bio: string | null
          author_id: string | null
          author_name: string | null
          author_profile_id: string | null
          canonical_url: string | null
          category: string[] | null
          content: string | null
          created_at: string | null
          excerpt: string | null
          featured_image: string | null
          featured_image_alt: string | null
          focus_keyword: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          noindex: boolean
          og_description: string | null
          og_image: string | null
          og_title: string | null
          published_at: string | null
          slug: string
          status: string
          tags: string[] | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author_bio?: string | null
          author_id?: string | null
          author_name?: string | null
          author_profile_id?: string | null
          canonical_url?: string | null
          category?: string[] | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          featured_image_alt?: string | null
          focus_keyword?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          noindex?: boolean
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          published_at?: string | null
          slug: string
          status?: string
          tags?: string[] | null
          tenant_id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author_bio?: string | null
          author_id?: string | null
          author_name?: string | null
          author_profile_id?: string | null
          canonical_url?: string | null
          category?: string[] | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          featured_image_alt?: string | null
          focus_keyword?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          noindex?: boolean
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          published_at?: string | null
          slug?: string
          status?: string
          tags?: string[] | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "author_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_tags: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      button_clicks: {
        Row: {
          button_location: string
          button_name: string
          clicked_at: string
          destination_url: string | null
          id: string
          referrer: string | null
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          button_location: string
          button_name: string
          clicked_at?: string
          destination_url?: string | null
          id?: string
          referrer?: string | null
          tenant_id?: string
          user_agent?: string | null
        }
        Update: {
          button_location?: string
          button_name?: string
          clicked_at?: string
          destination_url?: string | null
          id?: string
          referrer?: string | null
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "button_clicks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      calculator_configs: {
        Row: {
          calculator_type: string
          config: Json | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          calculator_type?: string
          config?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          calculator_type?: string
          config?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calculator_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      calculator_options: {
        Row: {
          calculator_id: string
          created_at: string
          help_text: string | null
          id: string
          is_required: boolean | null
          label: string
          option_name: string
          option_type: string
          options: Json | null
          sort_order: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          calculator_id: string
          created_at?: string
          help_text?: string | null
          id?: string
          is_required?: boolean | null
          label: string
          option_name: string
          option_type?: string
          options?: Json | null
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          calculator_id?: string
          created_at?: string
          help_text?: string | null
          id?: string
          is_required?: boolean | null
          label?: string
          option_name?: string
          option_type?: string
          options?: Json | null
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calculator_options_calculator_id_fkey"
            columns: ["calculator_id"]
            isOneToOne: false
            referencedRelation: "calculator_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calculator_options_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_landing_pages: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          platform: string | null
          slug: string
          tenant_id: string
          updated_at: string
          url: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          platform?: string | null
          slug: string
          tenant_id?: string
          updated_at?: string
          url: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          platform?: string | null
          slug?: string
          tenant_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_landing_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          attribution_captured_at: string | null
          created_at: string
          email: string
          fbclid: string | null
          first_name: string
          gclid: string | null
          id: string
          landing_page: string | null
          last_name: string
          message: string
          phone: string
          referrer: string | null
          service_type: string | null
          status: string
          tenant_id: string
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          attribution_captured_at?: string | null
          created_at?: string
          email: string
          fbclid?: string | null
          first_name: string
          gclid?: string | null
          id?: string
          landing_page?: string | null
          last_name: string
          message: string
          phone: string
          referrer?: string | null
          service_type?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          attribution_captured_at?: string | null
          created_at?: string
          email?: string
          fbclid?: string | null
          first_name?: string
          gclid?: string | null
          id?: string
          landing_page?: string | null
          last_name?: string
          message?: string
          phone?: string
          referrer?: string | null
          service_type?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      content_cross_links: {
        Row: {
          created_at: string
          from_id: string
          from_type: string
          id: string
          link_reason: string
          relevance_score: number
          to_id: string
          to_type: string
        }
        Insert: {
          created_at?: string
          from_id: string
          from_type: string
          id?: string
          link_reason: string
          relevance_score?: number
          to_id: string
          to_type: string
        }
        Update: {
          created_at?: string
          from_id?: string
          from_type?: string
          id?: string
          link_reason?: string
          relevance_score?: number
          to_id?: string
          to_type?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          added_at: string
          conversation_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          conversation_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          conversation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_reads: {
        Row: {
          conversation_id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_reads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          job_id: string | null
          kind: string
          name: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id?: string | null
          kind: string
          name?: string | null
          tenant_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string | null
          kind?: string
          name?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "crm_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_campaign_tags: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_campaign_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_companies: {
        Row: {
          billing_address: string | null
          billing_city: string | null
          billing_state: string | null
          billing_zip: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          lead_source: string | null
          name: string
          notes: string | null
          phone: string | null
          tags: string[] | null
          tenant_id: string
          updated_at: string
          website: string | null
          workedge_customer_id: string | null
        }
        Insert: {
          billing_address?: string | null
          billing_city?: string | null
          billing_state?: string | null
          billing_zip?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          lead_source?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          tenant_id: string
          updated_at?: string
          website?: string | null
          workedge_customer_id?: string | null
        }
        Update: {
          billing_address?: string | null
          billing_city?: string | null
          billing_state?: string | null
          billing_zip?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          lead_source?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string
          website?: string | null
          workedge_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_companies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contract_candidate_dismissals: {
        Row: {
          customer_id: string
          dismissed_at: string
          dismissed_by: string | null
          id: string
          location_id: string | null
          reason: string | null
          tenant_id: string
        }
        Insert: {
          customer_id: string
          dismissed_at?: string
          dismissed_by?: string | null
          id?: string
          location_id?: string | null
          reason?: string | null
          tenant_id: string
        }
        Update: {
          customer_id?: string
          dismissed_at?: string
          dismissed_by?: string | null
          id?: string
          location_id?: string | null
          reason?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contract_candidate_dismissals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contract_candidate_dismissals_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "crm_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contract_candidate_dismissals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contract_filters: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          interval_days: number
          last_changed: string | null
          merv_rating: string | null
          next_due: string | null
          notes: string | null
          quantity: number
          size: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          interval_days?: number
          last_changed?: string | null
          merv_rating?: string | null
          next_due?: string | null
          notes?: string | null
          quantity?: number
          size: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          interval_days?: number
          last_changed?: string | null
          merv_rating?: string | null
          next_due?: string | null
          notes?: string | null
          quantity?: number
          size?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contract_filters_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "crm_maintenance_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contract_filters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contract_tiers: {
        Row: {
          additional_unit_price: number | null
          base_price: number | null
          created_at: string | null
          filter_interval_days: number | null
          id: string
          inclusions_text: string | null
          is_active: boolean | null
          name: string
          per_visit_price: number | null
          segment: string
          sort_order: number | null
          tenant_id: string
          updated_at: string | null
          visits_per_year: number | null
        }
        Insert: {
          additional_unit_price?: number | null
          base_price?: number | null
          created_at?: string | null
          filter_interval_days?: number | null
          id?: string
          inclusions_text?: string | null
          is_active?: boolean | null
          name: string
          per_visit_price?: number | null
          segment: string
          sort_order?: number | null
          tenant_id: string
          updated_at?: string | null
          visits_per_year?: number | null
        }
        Update: {
          additional_unit_price?: number | null
          base_price?: number | null
          created_at?: string | null
          filter_interval_days?: number | null
          id?: string
          inclusions_text?: string | null
          is_active?: boolean | null
          name?: string
          per_visit_price?: number | null
          segment?: string
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string | null
          visits_per_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_contract_tiers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contract_visits: {
        Row: {
          contract_id: string
          created_at: string
          created_by: string | null
          filters_changed: boolean
          id: string
          job_id: string | null
          notes: string | null
          technician_id: string | null
          tenant_id: string
          updated_at: string
          visit_date: string
          visit_type: Database["public"]["Enums"]["maintenance_visit_type"]
          workedge_media_url: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          created_by?: string | null
          filters_changed?: boolean
          id?: string
          job_id?: string | null
          notes?: string | null
          technician_id?: string | null
          tenant_id: string
          updated_at?: string
          visit_date?: string
          visit_type?: Database["public"]["Enums"]["maintenance_visit_type"]
          workedge_media_url?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          created_by?: string | null
          filters_changed?: boolean
          id?: string
          job_id?: string | null
          notes?: string | null
          technician_id?: string | null
          tenant_id?: string
          updated_at?: string
          visit_date?: string
          visit_type?: Database["public"]["Enums"]["maintenance_visit_type"]
          workedge_media_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_contract_visits_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "crm_maintenance_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contract_visits_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "crm_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contract_visits_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "crm_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contract_visits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_customer_contacts: {
        Row: {
          contact_type: string
          created_at: string
          customer_id: string
          deleted_at: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string | null
          notes: string | null
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          contact_type?: string
          created_at?: string
          customer_id: string
          deleted_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          contact_type?: string
          created_at?: string
          customer_id?: string
          deleted_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_customer_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_customer_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          tenant_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          tenant_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_customer_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_customer_relationships: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          notes: string | null
          related_customer_id: string
          relationship_type: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          notes?: string | null
          related_customer_id: string
          relationship_type?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          notes?: string | null
          related_customer_id?: string
          relationship_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_customer_relationships_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_customer_relationships_related_customer_id_fkey"
            columns: ["related_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_customer_relationships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_customers: {
        Row: {
          alternate_phone: string | null
          assigned_to: string | null
          billing_address: string | null
          billing_address_line2: string | null
          billing_city: string | null
          billing_state: string | null
          billing_zip: string | null
          company_id: string | null
          company_name: string | null
          created_at: string
          customer_status: string
          customer_type: string
          deleted_at: string | null
          email: string | null
          first_name: string | null
          ghl_contact_id: string | null
          id: string
          last_name: string | null
          lead_source: string | null
          notes: string | null
          phone: string | null
          preferred_contact_method: string | null
          sms_opt_in: boolean | null
          sms_opt_in_date: string | null
          tags: string[] | null
          tenant_id: string
          updated_at: string
          workedge_customer_id: string | null
        }
        Insert: {
          alternate_phone?: string | null
          assigned_to?: string | null
          billing_address?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_state?: string | null
          billing_zip?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          customer_status?: string
          customer_type?: string
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
          ghl_contact_id?: string | null
          id?: string
          last_name?: string | null
          lead_source?: string | null
          notes?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          sms_opt_in?: boolean | null
          sms_opt_in_date?: string | null
          tags?: string[] | null
          tenant_id: string
          updated_at?: string
          workedge_customer_id?: string | null
        }
        Update: {
          alternate_phone?: string | null
          assigned_to?: string | null
          billing_address?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_state?: string | null
          billing_zip?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          customer_status?: string
          customer_type?: string
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
          ghl_contact_id?: string | null
          id?: string
          last_name?: string | null
          lead_source?: string | null
          notes?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          sms_opt_in?: boolean | null
          sms_opt_in_date?: string | null
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string
          workedge_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_email_log: {
        Row: {
          body_html: string | null
          body_text: string | null
          cc_emails: string | null
          created_at: string
          customer_id: string | null
          direction: string
          from_email: string
          gmail_message_id: string | null
          gmail_thread_id: string | null
          id: string
          is_read: boolean
          received_at: string | null
          resend_message_id: string | null
          sent_at: string | null
          status: string
          subject: string | null
          template_id: string | null
          tenant_id: string
          to_email: string
          updated_at: string
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          cc_emails?: string | null
          created_at?: string
          customer_id?: string | null
          direction: string
          from_email: string
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          is_read?: boolean
          received_at?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          tenant_id: string
          to_email: string
          updated_at?: string
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          cc_emails?: string | null
          created_at?: string
          customer_id?: string | null
          direction?: string
          from_email?: string
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          is_read?: boolean
          received_at?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          tenant_id?: string
          to_email?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_email_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_email_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "crm_email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_email_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_email_templates: {
        Row: {
          body_html: string
          cc_emails: string | null
          created_at: string
          delay_hours: number | null
          id: string
          is_active: boolean
          name: string
          subject: string
          tenant_id: string
          trigger_event: string | null
          updated_at: string
        }
        Insert: {
          body_html?: string
          cc_emails?: string | null
          created_at?: string
          delay_hours?: number | null
          id?: string
          is_active?: boolean
          name: string
          subject: string
          tenant_id: string
          trigger_event?: string | null
          updated_at?: string
        }
        Update: {
          body_html?: string
          cc_emails?: string | null
          created_at?: string
          delay_hours?: number | null
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          tenant_id?: string
          trigger_event?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_email_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_interactions: {
        Row: {
          content: string | null
          created_at: string
          customer_id: string
          direction: string | null
          id: string
          interaction_at: string
          interaction_type: string
          logged_by: string | null
          outcome: string | null
          subject: string | null
          tenant_id: string
          twilio_message_sid: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          customer_id: string
          direction?: string | null
          id?: string
          interaction_at?: string
          interaction_type: string
          logged_by?: string | null
          outcome?: string | null
          subject?: string | null
          tenant_id: string
          twilio_message_sid?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          customer_id?: string
          direction?: string | null
          id?: string
          interaction_at?: string
          interaction_type?: string
          logged_by?: string | null
          outcome?: string | null
          subject?: string | null
          tenant_id?: string
          twilio_message_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_interactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_job_appointment_calendars: {
        Row: {
          appointment_id: string
          created_at: string
          google_calendar_db_id: string
          google_calendar_event_id: string | null
          id: string
          tenant_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          google_calendar_db_id: string
          google_calendar_event_id?: string | null
          id?: string
          tenant_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          google_calendar_db_id?: string
          google_calendar_event_id?: string | null
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_job_appointment_calendars_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "crm_job_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_job_appointment_calendars_google_calendar_db_id_fkey"
            columns: ["google_calendar_db_id"]
            isOneToOne: false
            referencedRelation: "google_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_job_appointment_calendars_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_job_appointments: {
        Row: {
          assigned_team_id: string | null
          attendee_member_ids: string[] | null
          created_at: string | null
          end_datetime: string
          google_calendar_event_id: string | null
          google_calendar_id: string | null
          id: string
          job_id: string
          notes: string | null
          start_datetime: string
          tenant_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_team_id?: string | null
          attendee_member_ids?: string[] | null
          created_at?: string | null
          end_datetime: string
          google_calendar_event_id?: string | null
          google_calendar_id?: string | null
          id?: string
          job_id: string
          notes?: string | null
          start_datetime: string
          tenant_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_team_id?: string | null
          attendee_member_ids?: string[] | null
          created_at?: string | null
          end_datetime?: string
          google_calendar_event_id?: string | null
          google_calendar_id?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          start_datetime?: string
          tenant_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_job_appointments_assigned_team_id_fkey"
            columns: ["assigned_team_id"]
            isOneToOne: false
            referencedRelation: "crm_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_job_appointments_google_calendar_id_fkey"
            columns: ["google_calendar_id"]
            isOneToOne: false
            referencedRelation: "google_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_job_appointments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "crm_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_job_appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_job_assignments: {
        Row: {
          actual_hours: number | null
          assignment_type: string | null
          created_at: string
          id: string
          job_id: string
          member_id: string | null
          notes: string | null
          role: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          team_id: string | null
          tenant_id: string
        }
        Insert: {
          actual_hours?: number | null
          assignment_type?: string | null
          created_at?: string
          id?: string
          job_id: string
          member_id?: string | null
          notes?: string | null
          role?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          team_id?: string | null
          tenant_id: string
        }
        Update: {
          actual_hours?: number | null
          assignment_type?: string | null
          created_at?: string
          id?: string
          job_id?: string
          member_id?: string | null
          notes?: string | null
          role?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          team_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_job_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "crm_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_job_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "crm_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_job_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "crm_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_job_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_job_list_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_manually_edited: boolean
          job_list_id: string
          manually_added: boolean
          name: string
          quantity: number
          sort_order: number
          source_line_item_id: string | null
          tenant_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_manually_edited?: boolean
          job_list_id: string
          manually_added?: boolean
          name: string
          quantity?: number
          sort_order?: number
          source_line_item_id?: string | null
          tenant_id: string
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_manually_edited?: boolean
          job_list_id?: string
          manually_added?: boolean
          name?: string
          quantity?: number
          sort_order?: number
          source_line_item_id?: string | null
          tenant_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_job_list_items_job_list_id_fkey"
            columns: ["job_list_id"]
            isOneToOne: false
            referencedRelation: "crm_job_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_job_list_items_source_line_item_id_fkey"
            columns: ["source_line_item_id"]
            isOneToOne: false
            referencedRelation: "estimate_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_job_list_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_job_lists: {
        Row: {
          created_at: string
          created_by: string | null
          estimate_id: string
          estimate_synced_at: string | null
          id: string
          notes: string | null
          status: string
          supplier_name: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          estimate_id: string
          estimate_synced_at?: string | null
          id?: string
          notes?: string | null
          status?: string
          supplier_name?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          estimate_id?: string
          estimate_synced_at?: string | null
          id?: string
          notes?: string | null
          status?: string
          supplier_name?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_job_lists_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: true
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_job_lists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_job_stage_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_stage_id: string | null
          id: string
          job_id: string
          notes: string | null
          tenant_id: string
          to_stage_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_stage_id?: string | null
          id?: string
          job_id: string
          notes?: string | null
          tenant_id: string
          to_stage_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_stage_id?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          tenant_id?: string
          to_stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_job_stage_history_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_job_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_job_stage_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "crm_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_job_stage_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_job_stage_history_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_job_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_job_stages: {
        Row: {
          auto_notify_customer: boolean | null
          color: string | null
          created_at: string
          id: string
          is_active: boolean | null
          job_type_id: string
          name: string
          sort_order: number
          stage_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auto_notify_customer?: boolean | null
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          job_type_id: string
          name: string
          sort_order?: number
          stage_type?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auto_notify_customer?: boolean | null
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          job_type_id?: string
          name?: string
          sort_order?: number
          stage_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_job_stages_job_type_id_fkey"
            columns: ["job_type_id"]
            isOneToOne: false
            referencedRelation: "crm_job_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_job_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_job_types: {
        Row: {
          category: string
          color: string | null
          created_at: string
          default_duration_hours: number | null
          default_priority: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          requires_permit: boolean | null
          slug: string
          sort_order: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category?: string
          color?: string | null
          created_at?: string
          default_duration_hours?: number | null
          default_priority?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          requires_permit?: boolean | null
          slug: string
          sort_order?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string
          default_duration_hours?: number | null
          default_priority?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          requires_permit?: boolean | null
          slug?: string
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_job_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_jobs: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          created_at: string
          created_by: string | null
          current_stage_id: string | null
          customer_id: string
          customer_notes: string | null
          deleted_at: string | null
          final_amount: number | null
          google_calendar_event_id: string | null
          google_calendar_id: string | null
          id: string
          internal_notes: string | null
          job_number: string
          job_type_id: string
          location_id: string | null
          payment_status: string | null
          priority: string | null
          quoted_amount: number | null
          scheduled_date: string | null
          scheduled_end: string | null
          scheduled_end_date: string | null
          scheduled_start: string | null
          source_estimate_id: string | null
          source_pipeline_id: string | null
          tenant_id: string
          title: string
          updated_at: string
          workedge_last_sync: string | null
          workedge_project_id: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          created_by?: string | null
          current_stage_id?: string | null
          customer_id: string
          customer_notes?: string | null
          deleted_at?: string | null
          final_amount?: number | null
          google_calendar_event_id?: string | null
          google_calendar_id?: string | null
          id?: string
          internal_notes?: string | null
          job_number: string
          job_type_id: string
          location_id?: string | null
          payment_status?: string | null
          priority?: string | null
          quoted_amount?: number | null
          scheduled_date?: string | null
          scheduled_end?: string | null
          scheduled_end_date?: string | null
          scheduled_start?: string | null
          source_estimate_id?: string | null
          source_pipeline_id?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          workedge_last_sync?: string | null
          workedge_project_id?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          created_by?: string | null
          current_stage_id?: string | null
          customer_id?: string
          customer_notes?: string | null
          deleted_at?: string | null
          final_amount?: number | null
          google_calendar_event_id?: string | null
          google_calendar_id?: string | null
          id?: string
          internal_notes?: string | null
          job_number?: string
          job_type_id?: string
          location_id?: string | null
          payment_status?: string | null
          priority?: string | null
          quoted_amount?: number | null
          scheduled_date?: string | null
          scheduled_end?: string | null
          scheduled_end_date?: string | null
          scheduled_start?: string | null
          source_estimate_id?: string | null
          source_pipeline_id?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          workedge_last_sync?: string | null
          workedge_project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_jobs_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_job_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_jobs_google_calendar_id_fkey"
            columns: ["google_calendar_id"]
            isOneToOne: false
            referencedRelation: "google_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_jobs_job_type_id_fkey"
            columns: ["job_type_id"]
            isOneToOne: false
            referencedRelation: "crm_job_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_jobs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "crm_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_location_customers: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          is_primary_contact: boolean
          location_id: string
          relationship_type: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          is_primary_contact?: boolean
          location_id: string
          relationship_type?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          is_primary_contact?: boolean
          location_id?: string
          relationship_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_location_customers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_location_customers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "crm_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_location_customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_location_equipment: {
        Row: {
          brand: string | null
          btu_capacity: number | null
          condition_rating: number | null
          created_at: string
          customer_id: string
          deleted_at: string | null
          equipment_type: string
          estimated_age: number | null
          hspf_rating: number | null
          id: string
          install_date: string | null
          is_active: boolean
          last_service_date: string | null
          location_description: string | null
          location_id: string | null
          manufacture_date: string | null
          model_number: string | null
          next_service_due: string | null
          notes: string | null
          refrigerant_type: string | null
          replacement_notes: string | null
          replacement_priority: string | null
          replacement_recommended: boolean
          seer_rating: number | null
          serial_number: string | null
          tenant_id: string
          tonnage: number | null
          updated_at: string
          warranty_expiration: string | null
          zone_served: string | null
        }
        Insert: {
          brand?: string | null
          btu_capacity?: number | null
          condition_rating?: number | null
          created_at?: string
          customer_id: string
          deleted_at?: string | null
          equipment_type?: string
          estimated_age?: number | null
          hspf_rating?: number | null
          id?: string
          install_date?: string | null
          is_active?: boolean
          last_service_date?: string | null
          location_description?: string | null
          location_id?: string | null
          manufacture_date?: string | null
          model_number?: string | null
          next_service_due?: string | null
          notes?: string | null
          refrigerant_type?: string | null
          replacement_notes?: string | null
          replacement_priority?: string | null
          replacement_recommended?: boolean
          seer_rating?: number | null
          serial_number?: string | null
          tenant_id: string
          tonnage?: number | null
          updated_at?: string
          warranty_expiration?: string | null
          zone_served?: string | null
        }
        Update: {
          brand?: string | null
          btu_capacity?: number | null
          condition_rating?: number | null
          created_at?: string
          customer_id?: string
          deleted_at?: string | null
          equipment_type?: string
          estimated_age?: number | null
          hspf_rating?: number | null
          id?: string
          install_date?: string | null
          is_active?: boolean
          last_service_date?: string | null
          location_description?: string | null
          location_id?: string | null
          manufacture_date?: string | null
          model_number?: string | null
          next_service_due?: string | null
          notes?: string | null
          refrigerant_type?: string | null
          replacement_notes?: string | null
          replacement_priority?: string | null
          replacement_recommended?: boolean
          seer_rating?: number | null
          serial_number?: string | null
          tenant_id?: string
          tonnage?: number | null
          updated_at?: string
          warranty_expiration?: string | null
          zone_served?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_location_equipment_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_location_equipment_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "crm_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_location_equipment_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_locations: {
        Row: {
          access_notes: string | null
          address_line1: string
          address_line2: string | null
          bathrooms: number | null
          bedrooms: number | null
          building_type: string | null
          city: string
          county: string | null
          created_at: string
          customer_id: string
          deleted_at: string | null
          gate_code: string | null
          google_place_id: string | null
          id: string
          is_primary: boolean | null
          latitude: number | null
          location_name: string | null
          location_type: string | null
          longitude: number | null
          lot_size_sqft: number | null
          property_class: string | null
          property_data_auto_populated: boolean | null
          property_data_source: string | null
          property_data_verified_at: string | null
          square_footage: number | null
          state: string
          stories: number | null
          tenant_id: string
          updated_at: string
          workedge_property_id: string | null
          year_built: number | null
          zip_code: string
        }
        Insert: {
          access_notes?: string | null
          address_line1: string
          address_line2?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          building_type?: string | null
          city: string
          county?: string | null
          created_at?: string
          customer_id: string
          deleted_at?: string | null
          gate_code?: string | null
          google_place_id?: string | null
          id?: string
          is_primary?: boolean | null
          latitude?: number | null
          location_name?: string | null
          location_type?: string | null
          longitude?: number | null
          lot_size_sqft?: number | null
          property_class?: string | null
          property_data_auto_populated?: boolean | null
          property_data_source?: string | null
          property_data_verified_at?: string | null
          square_footage?: number | null
          state: string
          stories?: number | null
          tenant_id: string
          updated_at?: string
          workedge_property_id?: string | null
          year_built?: number | null
          zip_code: string
        }
        Update: {
          access_notes?: string | null
          address_line1?: string
          address_line2?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          building_type?: string | null
          city?: string
          county?: string | null
          created_at?: string
          customer_id?: string
          deleted_at?: string | null
          gate_code?: string | null
          google_place_id?: string | null
          id?: string
          is_primary?: boolean | null
          latitude?: number | null
          location_name?: string | null
          location_type?: string | null
          longitude?: number | null
          lot_size_sqft?: number | null
          property_class?: string | null
          property_data_auto_populated?: boolean | null
          property_data_source?: string | null
          property_data_verified_at?: string | null
          square_footage?: number | null
          state?: string
          stories?: number | null
          tenant_id?: string
          updated_at?: string
          workedge_property_id?: string | null
          year_built?: number | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_locations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_maintenance_contracts: {
        Row: {
          auto_renew: boolean
          billing_model: Database["public"]["Enums"]["maintenance_billing_model"]
          contract_number: string
          contract_price: number | null
          created_at: string
          created_by: string | null
          customer_id: string
          end_date: string | null
          filter_change_interval_days: number
          id: string
          inclusions_text: string | null
          last_filter_change: string | null
          last_visit_date: string | null
          location_id: string | null
          next_filter_due: string | null
          next_visit_due: string | null
          notes: string | null
          per_visit_price: number | null
          renewal_term_months: number
          segment: Database["public"]["Enums"]["maintenance_segment"]
          start_date: string
          status: Database["public"]["Enums"]["maintenance_status"]
          tenant_id: string
          tier: string | null
          tier_id: string | null
          tier_name_snapshot: string | null
          unit_count: number | null
          updated_at: string
          visits_per_year: number
          workedge_property_id: string | null
        }
        Insert: {
          auto_renew?: boolean
          billing_model?: Database["public"]["Enums"]["maintenance_billing_model"]
          contract_number: string
          contract_price?: number | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          end_date?: string | null
          filter_change_interval_days?: number
          id?: string
          inclusions_text?: string | null
          last_filter_change?: string | null
          last_visit_date?: string | null
          location_id?: string | null
          next_filter_due?: string | null
          next_visit_due?: string | null
          notes?: string | null
          per_visit_price?: number | null
          renewal_term_months?: number
          segment?: Database["public"]["Enums"]["maintenance_segment"]
          start_date?: string
          status?: Database["public"]["Enums"]["maintenance_status"]
          tenant_id: string
          tier?: string | null
          tier_id?: string | null
          tier_name_snapshot?: string | null
          unit_count?: number | null
          updated_at?: string
          visits_per_year?: number
          workedge_property_id?: string | null
        }
        Update: {
          auto_renew?: boolean
          billing_model?: Database["public"]["Enums"]["maintenance_billing_model"]
          contract_number?: string
          contract_price?: number | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          end_date?: string | null
          filter_change_interval_days?: number
          id?: string
          inclusions_text?: string | null
          last_filter_change?: string | null
          last_visit_date?: string | null
          location_id?: string | null
          next_filter_due?: string | null
          next_visit_due?: string | null
          notes?: string | null
          per_visit_price?: number | null
          renewal_term_months?: number
          segment?: Database["public"]["Enums"]["maintenance_segment"]
          start_date?: string
          status?: Database["public"]["Enums"]["maintenance_status"]
          tenant_id?: string
          tier?: string | null
          tier_id?: string | null
          tier_name_snapshot?: string | null
          unit_count?: number | null
          updated_at?: string
          visits_per_year?: number
          workedge_property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_maintenance_contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_maintenance_contracts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "crm_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_maintenance_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_maintenance_contracts_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "crm_contract_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipeline_entries: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_id: string
          estimated_value: number | null
          expected_close_date: string | null
          id: string
          lost_date: string | null
          lost_reason: string | null
          notes: string | null
          probability: number | null
          stage_id: string
          tenant_id: string
          title: string | null
          updated_at: string
          won_date: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_id: string
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          lost_date?: string | null
          lost_reason?: string | null
          notes?: string | null
          probability?: number | null
          stage_id: string
          tenant_id: string
          title?: string | null
          updated_at?: string
          won_date?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          lost_date?: string | null
          lost_reason?: string | null
          notes?: string | null
          probability?: number | null
          stage_id?: string
          tenant_id?: string
          title?: string | null
          updated_at?: string
          won_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipeline_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_pipeline_entries_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_pipeline_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipeline_stages: {
        Row: {
          color: string
          created_at: string
          display_name: string
          id: string
          is_active: boolean | null
          is_lost_stage: boolean | null
          is_won_stage: boolean | null
          name: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean | null
          is_lost_stage?: boolean | null
          is_won_stage?: boolean | null
          name: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean | null
          is_lost_stage?: boolean | null
          is_won_stage?: boolean | null
          name?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipeline_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_social_connections: {
        Row: {
          account_id: string | null
          created_at: string
          display_name: string | null
          id: string
          is_connected: boolean
          last_check_detail: string | null
          last_checked_at: string | null
          live_enabled: boolean
          meta: Json
          platform: string
          scopes: string[]
          tenant_id: string
          token_expires_at: string | null
          token_status: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_connected?: boolean
          last_check_detail?: string | null
          last_checked_at?: string | null
          live_enabled?: boolean
          meta?: Json
          platform: string
          scopes?: string[]
          tenant_id: string
          token_expires_at?: string | null
          token_status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_connected?: boolean
          last_check_detail?: string | null
          last_checked_at?: string | null
          live_enabled?: boolean
          meta?: Json
          platform?: string
          scopes?: string[]
          tenant_id?: string
          token_expires_at?: string | null
          token_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_social_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_social_ideas: {
        Row: {
          ai_model: string | null
          angle: string | null
          created_at: string
          format: string | null
          hook: string
          id: string
          pillar: string | null
          source_context: string | null
          status: string
          suggested_platforms: string[] | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ai_model?: string | null
          angle?: string | null
          created_at?: string
          format?: string | null
          hook: string
          id?: string
          pillar?: string | null
          source_context?: string | null
          status?: string
          suggested_platforms?: string[] | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ai_model?: string | null
          angle?: string | null
          created_at?: string
          format?: string | null
          hook?: string
          id?: string
          pillar?: string | null
          source_context?: string | null
          status?: string
          suggested_platforms?: string[] | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_social_ideas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_social_post_targets: {
        Row: {
          created_at: string
          error_message: string | null
          external_id: string | null
          id: string
          platform: string
          platform_copy: string | null
          post_id: string
          posted_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          platform: string
          platform_copy?: string | null
          post_id: string
          posted_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          platform?: string
          platform_copy?: string | null
          post_id?: string
          posted_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_social_post_targets_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "crm_social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_social_post_targets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_social_posts: {
        Row: {
          ai_model: string | null
          ai_provider: string | null
          body: string
          created_at: string
          created_by: string | null
          id: string
          media_urls: string[] | null
          pillar: string | null
          scheduled_for: string | null
          source_idea_id: string | null
          status: string
          tenant_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          ai_model?: string | null
          ai_provider?: string | null
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          media_urls?: string[] | null
          pillar?: string | null
          scheduled_for?: string | null
          source_idea_id?: string | null
          status?: string
          tenant_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          ai_model?: string | null
          ai_provider?: string | null
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          media_urls?: string[] | null
          pillar?: string | null
          scheduled_for?: string | null
          source_idea_id?: string | null
          status?: string
          tenant_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_social_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_social_strategy: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          tenant_id: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          tenant_id: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          tenant_id?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_social_strategy_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_submission_links: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          submission_id: string
          submission_type: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          submission_id: string
          submission_type: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          submission_id?: string
          submission_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_submission_links_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_submission_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_supplier_contacts: {
        Row: {
          contact_name: string
          created_at: string
          email: string
          id: string
          is_active: boolean
          phone: string | null
          sort_order: number
          supplier_id: string
          tenant_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          contact_name: string
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          phone?: string | null
          sort_order?: number
          supplier_id: string
          tenant_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          sort_order?: number
          supplier_id?: string
          tenant_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_supplier_contacts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "crm_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_supplier_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_suppliers: {
        Row: {
          account_number: string | null
          address: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          notes: string | null
          phone: string | null
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          address?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          address?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_team_assignments: {
        Row: {
          created_at: string
          id: string
          is_lead: boolean | null
          member_id: string
          role_in_team: string | null
          team_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_lead?: boolean | null
          member_id: string
          role_in_team?: string | null
          team_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_lead?: boolean | null
          member_id?: string
          role_in_team?: string | null
          team_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_team_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "crm_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_team_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "crm_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_team_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_team_member_rate_history: {
        Row: {
          created_at: string
          created_by: string | null
          effective_date: string
          hourly_rate: number
          id: string
          notes: string | null
          overtime_rate: number | null
          team_member_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_date: string
          hourly_rate: number
          id?: string
          notes?: string | null
          overtime_rate?: number | null
          team_member_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          hourly_rate?: number
          id?: string
          notes?: string | null
          overtime_rate?: number | null
          team_member_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_team_member_rate_history_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "crm_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_team_member_rate_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_team_members: {
        Row: {
          certifications: string[] | null
          created_at: string
          default_availability: Json | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          google_calendar_id: string | null
          hire_date: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          last_name: string | null
          license_expiry: string | null
          license_number: string | null
          member_type: string | null
          notes: string | null
          overtime_rate: number | null
          phone: string | null
          role: string | null
          specialties: string[] | null
          tenant_id: string
          updated_at: string
          user_id: string | null
          workedge_user_id: string | null
        }
        Insert: {
          certifications?: string[] | null
          created_at?: string
          default_availability?: Json | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          google_calendar_id?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          license_expiry?: string | null
          license_number?: string | null
          member_type?: string | null
          notes?: string | null
          overtime_rate?: number | null
          phone?: string | null
          role?: string | null
          specialties?: string[] | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
          workedge_user_id?: string | null
        }
        Update: {
          certifications?: string[] | null
          created_at?: string
          default_availability?: Json | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          google_calendar_id?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          license_expiry?: string | null
          license_number?: string | null
          member_type?: string | null
          notes?: string | null
          overtime_rate?: number | null
          phone?: string | null
          role?: string | null
          specialties?: string[] | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
          workedge_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_team_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_teams: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          google_calendar_id: string | null
          id: string
          is_active: boolean | null
          max_concurrent_jobs: number | null
          name: string
          team_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          google_calendar_id?: string | null
          id?: string
          is_active?: boolean | null
          max_concurrent_jobs?: number | null
          name: string
          team_type?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          google_calendar_id?: string | null
          id?: string
          is_active?: boolean | null
          max_concurrent_jobs?: number | null
          name?: string
          team_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_teams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documentation_search_log: {
        Row: {
          brand: string | null
          cache_hit: boolean | null
          created_at: string | null
          documents_found: number | null
          id: string
          model_number: string | null
          search_duration_ms: number | null
        }
        Insert: {
          brand?: string | null
          cache_hit?: boolean | null
          created_at?: string | null
          documents_found?: number | null
          id?: string
          model_number?: string | null
          search_duration_ms?: number | null
        }
        Update: {
          brand?: string | null
          cache_hit?: boolean | null
          created_at?: string | null
          documents_found?: number | null
          id?: string
          model_number?: string | null
          search_duration_ms?: number | null
        }
        Relationships: []
      }
      ducted_addons: {
        Row: {
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean
          is_popular: boolean
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ducted_efficiency_tiers: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          features: Json | null
          id: string
          is_active: boolean
          name: string
          seer_max: number
          seer_min: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          features?: Json | null
          id?: string
          is_active?: boolean
          name: string
          seer_max: number
          seer_min: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          features?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          seer_max?: number
          seer_min?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ducted_equipment: {
        Row: {
          air_handler_model: string | null
          brand: string
          condenser_model: string | null
          created_at: string
          display_order: number
          eer2_rating: number | null
          efficiency_tier_id: string | null
          equipment_cost: number
          evap_coil_model: string | null
          features: Json | null
          furnace_model: string | null
          heat_kit_model: string | null
          heat_pump_model: string | null
          hspf2_rating: number | null
          id: string
          installation_labor: number
          is_active: boolean
          is_best_value: boolean
          is_energy_star: boolean
          refrigerant: string | null
          seer2_rating: number | null
          system_name: string | null
          system_type: string
          thermostat_name: string | null
          tonnage: number
          updated_at: string
          warranty_years: number
        }
        Insert: {
          air_handler_model?: string | null
          brand: string
          condenser_model?: string | null
          created_at?: string
          display_order?: number
          eer2_rating?: number | null
          efficiency_tier_id?: string | null
          equipment_cost?: number
          evap_coil_model?: string | null
          features?: Json | null
          furnace_model?: string | null
          heat_kit_model?: string | null
          heat_pump_model?: string | null
          hspf2_rating?: number | null
          id?: string
          installation_labor?: number
          is_active?: boolean
          is_best_value?: boolean
          is_energy_star?: boolean
          refrigerant?: string | null
          seer2_rating?: number | null
          system_name?: string | null
          system_type: string
          thermostat_name?: string | null
          tonnage: number
          updated_at?: string
          warranty_years?: number
        }
        Update: {
          air_handler_model?: string | null
          brand?: string
          condenser_model?: string | null
          created_at?: string
          display_order?: number
          eer2_rating?: number | null
          efficiency_tier_id?: string | null
          equipment_cost?: number
          evap_coil_model?: string | null
          features?: Json | null
          furnace_model?: string | null
          heat_kit_model?: string | null
          heat_pump_model?: string | null
          hspf2_rating?: number | null
          id?: string
          installation_labor?: number
          is_active?: boolean
          is_best_value?: boolean
          is_energy_star?: boolean
          refrigerant?: string | null
          seer2_rating?: number | null
          system_name?: string | null
          system_type?: string
          thermostat_name?: string | null
          tonnage?: number
          updated_at?: string
          warranty_years?: number
        }
        Relationships: [
          {
            foreignKeyName: "ducted_equipment_efficiency_tier_id_fkey"
            columns: ["efficiency_tier_id"]
            isOneToOne: false
            referencedRelation: "ducted_efficiency_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      ducted_estimate_submissions: {
        Row: {
          addons_cost: number | null
          best_time_to_call: string | null
          coverage: string
          created_at: string
          customer_address: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          efficiency_tier_id: string | null
          equipment_cost: number | null
          equipment_id: string | null
          final_total: number | null
          ghl_contact_id: string | null
          ghl_sync_status: string | null
          heating_type: string
          home_layout: string
          home_type: string
          hot_cold_spots: string | null
          id: string
          installation_cost: number | null
          notes: string | null
          recommended_tonnage: number | null
          selected_addons: Json | null
          square_footage: string
          status: string
          summer_temp: string | null
          system_count: number
          tax_amount: number | null
          tenant_id: string
          updated_at: string
          wants_backup_quote: boolean | null
          winter_temp: string | null
        }
        Insert: {
          addons_cost?: number | null
          best_time_to_call?: string | null
          coverage: string
          created_at?: string
          customer_address?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          efficiency_tier_id?: string | null
          equipment_cost?: number | null
          equipment_id?: string | null
          final_total?: number | null
          ghl_contact_id?: string | null
          ghl_sync_status?: string | null
          heating_type: string
          home_layout: string
          home_type: string
          hot_cold_spots?: string | null
          id?: string
          installation_cost?: number | null
          notes?: string | null
          recommended_tonnage?: number | null
          selected_addons?: Json | null
          square_footage: string
          status?: string
          summer_temp?: string | null
          system_count?: number
          tax_amount?: number | null
          tenant_id?: string
          updated_at?: string
          wants_backup_quote?: boolean | null
          winter_temp?: string | null
        }
        Update: {
          addons_cost?: number | null
          best_time_to_call?: string | null
          coverage?: string
          created_at?: string
          customer_address?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          efficiency_tier_id?: string | null
          equipment_cost?: number | null
          equipment_id?: string | null
          final_total?: number | null
          ghl_contact_id?: string | null
          ghl_sync_status?: string | null
          heating_type?: string
          home_layout?: string
          home_type?: string
          hot_cold_spots?: string | null
          id?: string
          installation_cost?: number | null
          notes?: string | null
          recommended_tonnage?: number | null
          selected_addons?: Json | null
          square_footage?: string
          status?: string
          summer_temp?: string | null
          system_count?: number
          tax_amount?: number | null
          tenant_id?: string
          updated_at?: string
          wants_backup_quote?: boolean | null
          winter_temp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ducted_estimate_submissions_efficiency_tier_id_fkey"
            columns: ["efficiency_tier_id"]
            isOneToOne: false
            referencedRelation: "ducted_efficiency_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ducted_estimate_submissions_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "ducted_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ducted_estimate_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ducted_pricing_modifiers: {
        Row: {
          amount: number | null
          calculation_base: string | null
          conditions: Json | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          modifier_type: string
          name: string
          percentage: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount?: number | null
          calculation_base?: string | null
          conditions?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          modifier_type: string
          name: string
          percentage?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount?: number | null
          calculation_base?: string | null
          conditions?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          modifier_type?: string
          name?: string
          percentage?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ducted_tonnage_sizing_rules: {
        Row: {
          created_at: string
          home_type: string
          id: string
          is_active: boolean
          layout: string
          notes: string | null
          recommended_tonnage: number
          sort_order: number
          sq_ft_max: number
          sq_ft_min: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          home_type: string
          id?: string
          is_active?: boolean
          layout: string
          notes?: string | null
          recommended_tonnage: number
          sort_order?: number
          sq_ft_max: number
          sq_ft_min: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          home_type?: string
          id?: string
          is_active?: boolean
          layout?: string
          notes?: string | null
          recommended_tonnage?: number
          sort_order?: number
          sq_ft_max?: number
          sq_ft_min?: number
          updated_at?: string
        }
        Relationships: []
      }
      ductless_addons: {
        Row: {
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean
          is_popular: boolean
          name: string
          price: number
          price_type: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name: string
          price?: number
          price_type?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name?: string
          price?: number
          price_type?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ductless_addons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ductless_estimate_submissions: {
        Row: {
          created_at: string
          customer_address: string | null
          customer_city: string | null
          customer_county: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_state: string | null
          customer_zip: string | null
          final_total: number
          ghl_contact_id: string | null
          ghl_sync_status: string | null
          google_place_id: string | null
          id: string
          notes: string | null
          rebates: number
          selected_addons: Json | null
          selected_rooms: Json | null
          status: string
          subtotal: number
          system_tier_id: string | null
          tax_amount: number
          tenant_id: string
          unit_type_id: string | null
          updated_at: string
          zone_count: number
        }
        Insert: {
          created_at?: string
          customer_address?: string | null
          customer_city?: string | null
          customer_county?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_state?: string | null
          customer_zip?: string | null
          final_total?: number
          ghl_contact_id?: string | null
          ghl_sync_status?: string | null
          google_place_id?: string | null
          id?: string
          notes?: string | null
          rebates?: number
          selected_addons?: Json | null
          selected_rooms?: Json | null
          status?: string
          subtotal?: number
          system_tier_id?: string | null
          tax_amount?: number
          tenant_id?: string
          unit_type_id?: string | null
          updated_at?: string
          zone_count?: number
        }
        Update: {
          created_at?: string
          customer_address?: string | null
          customer_city?: string | null
          customer_county?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_state?: string | null
          customer_zip?: string | null
          final_total?: number
          ghl_contact_id?: string | null
          ghl_sync_status?: string | null
          google_place_id?: string | null
          id?: string
          notes?: string | null
          rebates?: number
          selected_addons?: Json | null
          selected_rooms?: Json | null
          status?: string
          subtotal?: number
          system_tier_id?: string | null
          tax_amount?: number
          tenant_id?: string
          unit_type_id?: string | null
          updated_at?: string
          zone_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "ductless_estimate_submissions_system_tier_id_fkey"
            columns: ["system_tier_id"]
            isOneToOne: false
            referencedRelation: "ductless_system_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ductless_estimate_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ductless_estimate_submissions_unit_type_id_fkey"
            columns: ["unit_type_id"]
            isOneToOne: false
            referencedRelation: "ductless_unit_types"
            referencedColumns: ["id"]
          },
        ]
      }
      ductless_system_tiers: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          features: Json | null
          id: string
          is_active: boolean
          is_featured: boolean
          name: string
          price_multiplier: number
          seer_rating: number | null
          sort_order: number
          tenant_id: string
          tier_level: string
          updated_at: string
          warranty_years: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          features?: Json | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name: string
          price_multiplier?: number
          seer_rating?: number | null
          sort_order?: number
          tenant_id?: string
          tier_level: string
          updated_at?: string
          warranty_years?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          features?: Json | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name?: string
          price_multiplier?: number
          seer_rating?: number | null
          sort_order?: number
          tenant_id?: string
          tier_level?: string
          updated_at?: string
          warranty_years?: number
        }
        Relationships: [
          {
            foreignKeyName: "ductless_system_tiers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ductless_unit_size_pricing: {
        Row: {
          created_at: string
          id: string
          is_available: boolean
          price: number
          size_btu: number
          size_tons: number
          sort_order: number
          tenant_id: string
          unit_type_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean
          price?: number
          size_btu: number
          size_tons: number
          sort_order?: number
          tenant_id?: string
          unit_type_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean
          price?: number
          size_btu?: number
          size_tons?: number
          sort_order?: number
          tenant_id?: string
          unit_type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ductless_unit_size_pricing_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ductless_unit_size_pricing_unit_type_id_fkey"
            columns: ["unit_type_id"]
            isOneToOne: false
            referencedRelation: "ductless_unit_types"
            referencedColumns: ["id"]
          },
        ]
      }
      ductless_unit_types: {
        Row: {
          base_price: number
          benefits: Json | null
          created_at: string
          description: string | null
          display_name: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          benefits?: Json | null
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          benefits?: Json | null
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ductless_unit_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_signatures: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          signature_html: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          signature_html?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          signature_html?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_signatures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_documentation: {
        Row: {
          brand: string
          created_at: string | null
          document_title: string | null
          document_type: string
          document_url: string
          file_type: string | null
          id: string
          last_verified: string | null
          model_number: string | null
          model_pattern: string
          search_query_used: string | null
          source_domain: string | null
          source_url: string | null
          verified_working: boolean | null
        }
        Insert: {
          brand: string
          created_at?: string | null
          document_title?: string | null
          document_type: string
          document_url: string
          file_type?: string | null
          id?: string
          last_verified?: string | null
          model_number?: string | null
          model_pattern: string
          search_query_used?: string | null
          source_domain?: string | null
          source_url?: string | null
          verified_working?: boolean | null
        }
        Update: {
          brand?: string
          created_at?: string | null
          document_title?: string | null
          document_type?: string
          document_url?: string
          file_type?: string | null
          id?: string
          last_verified?: string | null
          model_number?: string | null
          model_pattern?: string
          search_query_used?: string | null
          source_domain?: string | null
          source_url?: string | null
          verified_working?: boolean | null
        }
        Relationships: []
      }
      equipment_documents: {
        Row: {
          display_name: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_default: boolean
          mime_type: string | null
          notes: string | null
          owner_id: string
          owner_type: string
          sort_order: number
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          display_name?: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_default?: boolean
          mime_type?: string | null
          notes?: string | null
          owner_id: string
          owner_type: string
          sort_order?: number
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          display_name?: string | null
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_default?: boolean
          mime_type?: string | null
          notes?: string | null
          owner_id?: string
          owner_type?: string
          sort_order?: number
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      equipment_page_conflicts: {
        Row: {
          created_at: string
          equipment_page_id: string
          existing_confidence: number | null
          existing_value: string | null
          field_name: string
          id: string
          incoming_confidence: number | null
          incoming_value: string | null
          resolution: string
          resolved_at: string | null
          resolved_by: string | null
          source: string
        }
        Insert: {
          created_at?: string
          equipment_page_id: string
          existing_confidence?: number | null
          existing_value?: string | null
          field_name: string
          id?: string
          incoming_confidence?: number | null
          incoming_value?: string | null
          resolution: string
          resolved_at?: string | null
          resolved_by?: string | null
          source: string
        }
        Update: {
          created_at?: string
          equipment_page_id?: string
          existing_confidence?: number | null
          existing_value?: string | null
          field_name?: string
          id?: string
          incoming_confidence?: number | null
          incoming_value?: string | null
          resolution?: string
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_page_conflicts_equipment_page_id_fkey"
            columns: ["equipment_page_id"]
            isOneToOne: false
            referencedRelation: "equipment_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_pages: {
        Row: {
          auto_generated: boolean | null
          brand: string
          cities_installed: Json
          created_at: string | null
          custom_content: string | null
          description: string | null
          discontinuation_date: string | null
          documentation_count: number | null
          equipment_type: string | null
          faqs: Json
          hspf_rating: number | null
          id: string
          ideal_for: Json
          install_count: number
          intro_year: number | null
          is_discontinued: boolean
          key_features: Json
          last_installed_at: string | null
          manufacturer_spec_url: string | null
          market_segment: string
          model_number: string
          model_pattern: string | null
          published: boolean | null
          published_at: string | null
          refrigerant: string | null
          seer2_rating: number | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          specs: Json
          stages: string | null
          successor_equipment_page_id: string | null
          tier: string | null
          times_searched: number | null
          tonnage: number | null
          type_descriptor: string | null
          updated_at: string | null
        }
        Insert: {
          auto_generated?: boolean | null
          brand: string
          cities_installed?: Json
          created_at?: string | null
          custom_content?: string | null
          description?: string | null
          discontinuation_date?: string | null
          documentation_count?: number | null
          equipment_type?: string | null
          faqs?: Json
          hspf_rating?: number | null
          id?: string
          ideal_for?: Json
          install_count?: number
          intro_year?: number | null
          is_discontinued?: boolean
          key_features?: Json
          last_installed_at?: string | null
          manufacturer_spec_url?: string | null
          market_segment?: string
          model_number: string
          model_pattern?: string | null
          published?: boolean | null
          published_at?: string | null
          refrigerant?: string | null
          seer2_rating?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          specs: Json
          stages?: string | null
          successor_equipment_page_id?: string | null
          tier?: string | null
          times_searched?: number | null
          tonnage?: number | null
          type_descriptor?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_generated?: boolean | null
          brand?: string
          cities_installed?: Json
          created_at?: string | null
          custom_content?: string | null
          description?: string | null
          discontinuation_date?: string | null
          documentation_count?: number | null
          equipment_type?: string | null
          faqs?: Json
          hspf_rating?: number | null
          id?: string
          ideal_for?: Json
          install_count?: number
          intro_year?: number | null
          is_discontinued?: boolean
          key_features?: Json
          last_installed_at?: string | null
          manufacturer_spec_url?: string | null
          market_segment?: string
          model_number?: string
          model_pattern?: string | null
          published?: boolean | null
          published_at?: string | null
          refrigerant?: string | null
          seer2_rating?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          specs?: Json
          stages?: string | null
          successor_equipment_page_id?: string | null
          tier?: string | null
          times_searched?: number | null
          tonnage?: number | null
          type_descriptor?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_pages_successor_equipment_page_id_fkey"
            columns: ["successor_equipment_page_id"]
            isOneToOne: false
            referencedRelation: "equipment_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_scans: {
        Row: {
          brand: string | null
          breaker_size: string | null
          city: string | null
          compressor_info: string | null
          created_at: string | null
          customer_address: string | null
          customer_name: string | null
          customer_phone: string | null
          email: string | null
          equipment_type: string | null
          factory_charge: string | null
          fan_motor_info: string | null
          ghl_contact_id: string | null
          ghl_sync_status: string
          id: string
          is_dfw: boolean | null
          manufactured_year: number | null
          marketing_opt_in: boolean | null
          model_number: string
          raw_ai_response: Json | null
          refrigerant: string | null
          seer_rating: number | null
          serial_number: string | null
          state: string | null
          status: string
          tenant_id: string
          tonnage: string | null
          voltage_info: string | null
          zip_code: string
        }
        Insert: {
          brand?: string | null
          breaker_size?: string | null
          city?: string | null
          compressor_info?: string | null
          created_at?: string | null
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          email?: string | null
          equipment_type?: string | null
          factory_charge?: string | null
          fan_motor_info?: string | null
          ghl_contact_id?: string | null
          ghl_sync_status?: string
          id?: string
          is_dfw?: boolean | null
          manufactured_year?: number | null
          marketing_opt_in?: boolean | null
          model_number: string
          raw_ai_response?: Json | null
          refrigerant?: string | null
          seer_rating?: number | null
          serial_number?: string | null
          state?: string | null
          status?: string
          tenant_id?: string
          tonnage?: string | null
          voltage_info?: string | null
          zip_code: string
        }
        Update: {
          brand?: string | null
          breaker_size?: string | null
          city?: string | null
          compressor_info?: string | null
          created_at?: string | null
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          email?: string | null
          equipment_type?: string | null
          factory_charge?: string | null
          fan_motor_info?: string | null
          ghl_contact_id?: string | null
          ghl_sync_status?: string
          id?: string
          is_dfw?: boolean | null
          manufactured_year?: number | null
          marketing_opt_in?: boolean | null
          model_number?: string
          raw_ai_response?: Json | null
          refrigerant?: string | null
          seer_rating?: number | null
          serial_number?: string | null
          state?: string | null
          status?: string
          tenant_id?: string
          tonnage?: string | null
          voltage_info?: string | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_scans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_systems: {
        Row: {
          ahri_number: string | null
          air_handler_cfm: number | null
          air_handler_model: string | null
          air_handler_price: number | null
          capacity_btuh: number | null
          condenser_heat_pump_model: string | null
          condenser_price: number | null
          created_at: string
          eer2: number | null
          evap_coil_model: string | null
          evap_coil_price: number | null
          furnace_afue: number | null
          furnace_air_handler_model: string | null
          furnace_air_handler_price: number | null
          furnace_air_handler_size: string | null
          furnace_btu_input: number | null
          furnace_model: string | null
          furnace_price: number | null
          heat_kit: string | null
          heat_kit_price: number | null
          heating_source: string | null
          hspf2: number | null
          id: string
          needs_migration_review: boolean | null
          notes: string | null
          refrigerant: string | null
          seer2: number | null
          system_name: string
          system_price: number | null
          system_type: string
          thermostat_model: string | null
          thermostat_price: number | null
          tonnage: number | null
          updated_at: string
        }
        Insert: {
          ahri_number?: string | null
          air_handler_cfm?: number | null
          air_handler_model?: string | null
          air_handler_price?: number | null
          capacity_btuh?: number | null
          condenser_heat_pump_model?: string | null
          condenser_price?: number | null
          created_at?: string
          eer2?: number | null
          evap_coil_model?: string | null
          evap_coil_price?: number | null
          furnace_afue?: number | null
          furnace_air_handler_model?: string | null
          furnace_air_handler_price?: number | null
          furnace_air_handler_size?: string | null
          furnace_btu_input?: number | null
          furnace_model?: string | null
          furnace_price?: number | null
          heat_kit?: string | null
          heat_kit_price?: number | null
          heating_source?: string | null
          hspf2?: number | null
          id?: string
          needs_migration_review?: boolean | null
          notes?: string | null
          refrigerant?: string | null
          seer2?: number | null
          system_name: string
          system_price?: number | null
          system_type: string
          thermostat_model?: string | null
          thermostat_price?: number | null
          tonnage?: number | null
          updated_at?: string
        }
        Update: {
          ahri_number?: string | null
          air_handler_cfm?: number | null
          air_handler_model?: string | null
          air_handler_price?: number | null
          capacity_btuh?: number | null
          condenser_heat_pump_model?: string | null
          condenser_price?: number | null
          created_at?: string
          eer2?: number | null
          evap_coil_model?: string | null
          evap_coil_price?: number | null
          furnace_afue?: number | null
          furnace_air_handler_model?: string | null
          furnace_air_handler_price?: number | null
          furnace_air_handler_size?: string | null
          furnace_btu_input?: number | null
          furnace_model?: string | null
          furnace_price?: number | null
          heat_kit?: string | null
          heat_kit_price?: number | null
          heating_source?: string | null
          hspf2?: number | null
          id?: string
          needs_migration_review?: boolean | null
          notes?: string | null
          refrigerant?: string | null
          seer2?: number | null
          system_name?: string
          system_price?: number | null
          system_type?: string
          thermostat_model?: string | null
          thermostat_price?: number | null
          tonnage?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      estimate_line_items: {
        Row: {
          admin_cost_id: string | null
          created_at: string
          description: string | null
          equipment_system_id: string | null
          estimate_id: string
          id: string
          item_type: Database["public"]["Enums"]["line_item_type"]
          labor_rate_id: string | null
          line_total: number
          material_id: string | null
          name: string
          quantity: number
          section: Database["public"]["Enums"]["estimate_section"] | null
          sort_order: number
          tenant_id: string
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          admin_cost_id?: string | null
          created_at?: string
          description?: string | null
          equipment_system_id?: string | null
          estimate_id: string
          id?: string
          item_type: Database["public"]["Enums"]["line_item_type"]
          labor_rate_id?: string | null
          line_total?: number
          material_id?: string | null
          name: string
          quantity?: number
          section?: Database["public"]["Enums"]["estimate_section"] | null
          sort_order?: number
          tenant_id: string
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          admin_cost_id?: string | null
          created_at?: string
          description?: string | null
          equipment_system_id?: string | null
          estimate_id?: string
          id?: string
          item_type?: Database["public"]["Enums"]["line_item_type"]
          labor_rate_id?: string | null
          line_total?: number
          material_id?: string | null
          name?: string
          quantity?: number
          section?: Database["public"]["Enums"]["estimate_section"] | null
          sort_order?: number
          tenant_id?: string
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_line_items_admin_cost_id_fkey"
            columns: ["admin_cost_id"]
            isOneToOne: false
            referencedRelation: "admin_costs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_line_items_equipment_system_id_fkey"
            columns: ["equipment_system_id"]
            isOneToOne: false
            referencedRelation: "equipment_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_line_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_line_items_labor_rate_id_fkey"
            columns: ["labor_rate_id"]
            isOneToOne: false
            referencedRelation: "labor_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_line_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_line_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_template_items: {
        Row: {
          admin_cost_id: string | null
          created_at: string
          description: string | null
          equipment_system_id: string | null
          id: string
          item_type: Database["public"]["Enums"]["line_item_type"]
          labor_rate_id: string | null
          material_id: string | null
          name: string
          quantity: number
          section: Database["public"]["Enums"]["estimate_section"] | null
          sort_order: number
          template_id: string
          tenant_id: string
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          admin_cost_id?: string | null
          created_at?: string
          description?: string | null
          equipment_system_id?: string | null
          id?: string
          item_type?: Database["public"]["Enums"]["line_item_type"]
          labor_rate_id?: string | null
          material_id?: string | null
          name: string
          quantity?: number
          section?: Database["public"]["Enums"]["estimate_section"] | null
          sort_order?: number
          template_id: string
          tenant_id: string
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          admin_cost_id?: string | null
          created_at?: string
          description?: string | null
          equipment_system_id?: string | null
          id?: string
          item_type?: Database["public"]["Enums"]["line_item_type"]
          labor_rate_id?: string | null
          material_id?: string | null
          name?: string
          quantity?: number
          section?: Database["public"]["Enums"]["estimate_section"] | null
          sort_order?: number
          template_id?: string
          tenant_id?: string
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_template_items_admin_cost_id_fkey"
            columns: ["admin_cost_id"]
            isOneToOne: false
            referencedRelation: "admin_costs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_template_items_equipment_system_id_fkey"
            columns: ["equipment_system_id"]
            isOneToOne: false
            referencedRelation: "equipment_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_template_items_labor_rate_id_fkey"
            columns: ["labor_rate_id"]
            isOneToOne: false
            referencedRelation: "labor_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_template_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "estimate_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_template_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_templates: {
        Row: {
          created_at: string
          description: string | null
          heating_type: Database["public"]["Enums"]["heating_type"]
          id: string
          is_active: boolean
          job_type: Database["public"]["Enums"]["job_type"]
          name: string
          profit_margin: number
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          heating_type?: Database["public"]["Enums"]["heating_type"]
          id?: string
          is_active?: boolean
          job_type?: Database["public"]["Enums"]["job_type"]
          name: string
          profit_margin?: number
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          heating_type?: Database["public"]["Enums"]["heating_type"]
          id?: string
          is_active?: boolean
          job_type?: Database["public"]["Enums"]["job_type"]
          name?: string
          profit_margin?: number
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_versions: {
        Row: {
          change_summary: string | null
          created_at: string
          created_by: string | null
          estimate_id: string
          id: string
          snapshot_data: Json
          tenant_id: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          estimate_id: string
          id?: string
          snapshot_data: Json
          tenant_id: string
          version_number?: number
        }
        Update: {
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          estimate_id?: string
          id?: string
          snapshot_data?: Json
          tenant_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimate_versions_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          created_at: string
          created_by: string | null
          customer_address: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          estimate_number: string
          grand_total: number
          heating_type: Database["public"]["Enums"]["heating_type"]
          id: string
          job_notes: string | null
          job_type: Database["public"]["Enums"]["job_type"]
          location_id: string | null
          profit_margin: number
          status: Database["public"]["Enums"]["estimate_status"]
          subtotal_charge: number
          subtotal_cost: number
          tags: string[] | null
          tax_amount: number
          tax_rate: number
          tenant_id: string
          title: string | null
          updated_at: string
          valid_until: string | null
          workedge_project_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          estimate_number: string
          grand_total?: number
          heating_type?: Database["public"]["Enums"]["heating_type"]
          id?: string
          job_notes?: string | null
          job_type?: Database["public"]["Enums"]["job_type"]
          location_id?: string | null
          profit_margin?: number
          status?: Database["public"]["Enums"]["estimate_status"]
          subtotal_charge?: number
          subtotal_cost?: number
          tags?: string[] | null
          tax_amount?: number
          tax_rate?: number
          tenant_id: string
          title?: string | null
          updated_at?: string
          valid_until?: string | null
          workedge_project_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          estimate_number?: string
          grand_total?: number
          heating_type?: Database["public"]["Enums"]["heating_type"]
          id?: string
          job_notes?: string | null
          job_type?: Database["public"]["Enums"]["job_type"]
          location_id?: string | null
          profit_margin?: number
          status?: Database["public"]["Enums"]["estimate_status"]
          subtotal_charge?: number
          subtotal_cost?: number
          tags?: string[] | null
          tax_amount?: number
          tax_rate?: number
          tenant_id?: string
          title?: string | null
          updated_at?: string
          valid_until?: string | null
          workedge_project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "crm_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      file_attachments: {
        Row: {
          created_at: string
          description: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          tenant_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financing_options: {
        Row: {
          applies_to: string[] | null
          contractor_fee: number
          created_at: string
          dealer_net_cost: string | null
          id: string
          interest_rate: number
          is_active: boolean
          months_to_payoff: number | null
          notes: string | null
          payment_factor: number
          plan_name: string
          promotional_offer: string
          sort_order: number
          tenant_id: string
          tran_code: string | null
          updated_at: string
        }
        Insert: {
          applies_to?: string[] | null
          contractor_fee?: number
          created_at?: string
          dealer_net_cost?: string | null
          id?: string
          interest_rate?: number
          is_active?: boolean
          months_to_payoff?: number | null
          notes?: string | null
          payment_factor?: number
          plan_name: string
          promotional_offer: string
          sort_order?: number
          tenant_id: string
          tran_code?: string | null
          updated_at?: string
        }
        Update: {
          applies_to?: string[] | null
          contractor_fee?: number
          created_at?: string
          dealer_net_cost?: string | null
          id?: string
          interest_rate?: number
          is_active?: boolean
          months_to_payoff?: number | null
          notes?: string | null
          payment_factor?: number
          plan_name?: string
          promotional_offer?: string
          sort_order?: number
          tenant_id?: string
          tran_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financing_options_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      form_source_tags: {
        Row: {
          created_at: string
          id: string
          source_type: string
          tag_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_type: string
          tag_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source_type?: string
          tag_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_source_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "ghl_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_source_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ga4_page_metrics: {
        Row: {
          avg_engagement_seconds: number | null
          bounce_rate: number | null
          conversions: number
          date_range: string
          id: string
          last_synced_at: string
          page_path: string
          sessions: number
          users: number
        }
        Insert: {
          avg_engagement_seconds?: number | null
          bounce_rate?: number | null
          conversions?: number
          date_range: string
          id?: string
          last_synced_at?: string
          page_path: string
          sessions?: number
          users?: number
        }
        Update: {
          avg_engagement_seconds?: number | null
          bounce_rate?: number | null
          conversions?: number
          date_range?: string
          id?: string
          last_synced_at?: string
          page_path?: string
          sessions?: number
          users?: number
        }
        Relationships: []
      }
      ga4_traffic_sources: {
        Row: {
          date_range: string
          id: string
          last_synced_at: string
          sessions: number
          source: string
        }
        Insert: {
          date_range: string
          id?: string
          last_synced_at?: string
          sessions?: number
          source: string
        }
        Update: {
          date_range?: string
          id?: string
          last_synced_at?: string
          sessions?: number
          source?: string
        }
        Relationships: []
      }
      gallery_image_tags: {
        Row: {
          created_at: string | null
          id: string
          image_id: string
          tag_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_id: string
          tag_id: string
          tenant_id?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_id?: string
          tag_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_image_tags_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "gallery_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_image_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "gallery_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_image_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_images: {
        Row: {
          alt_text: string | null
          approved_for_website: boolean | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string
          is_active: boolean | null
          is_featured: boolean | null
          is_legacy: boolean | null
          media_type: string | null
          photo_date: string | null
          sort_order: number | null
          source: string | null
          source_id: string | null
          tenant_id: string
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          alt_text?: string | null
          approved_for_website?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_legacy?: boolean | null
          media_type?: string | null
          photo_date?: string | null
          sort_order?: number | null
          source?: string | null
          source_id?: string | null
          tenant_id?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          alt_text?: string | null
          approved_for_website?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_legacy?: boolean | null
          media_type?: string | null
          photo_date?: string | null
          sort_order?: number | null
          source?: string | null
          source_id?: string | null
          tenant_id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_images_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_tags: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          tag_type: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          tag_type?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          tag_type?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ghl_tags: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          tag_value: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          tag_value: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tag_value?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ghl_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendars: {
        Row: {
          calendar_id: string
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          last_synced_at: string | null
          linked_job_type_id: string | null
          linked_member_id: string | null
          linked_team_id: string | null
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          calendar_id: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_synced_at?: string | null
          linked_job_type_id?: string | null
          linked_member_id?: string | null
          linked_team_id?: string | null
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          calendar_id?: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_synced_at?: string | null
          linked_job_type_id?: string | null
          linked_member_id?: string | null
          linked_team_id?: string | null
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendars_linked_job_type_id_fkey"
            columns: ["linked_job_type_id"]
            isOneToOne: false
            referencedRelation: "crm_job_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_calendars_linked_member_id_fkey"
            columns: ["linked_member_id"]
            isOneToOne: false
            referencedRelation: "crm_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_calendars_linked_team_id_fkey"
            columns: ["linked_team_id"]
            isOneToOne: false
            referencedRelation: "crm_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_calendars_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gsc_page_metrics: {
        Row: {
          clicks: number
          created_at: string
          ctr: number
          date_range: string
          id: string
          impressions: number
          last_synced_at: string
          page_path: string
          position: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          ctr?: number
          date_range?: string
          id?: string
          impressions?: number
          last_synced_at?: string
          page_path: string
          position?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          clicks?: number
          created_at?: string
          ctr?: number
          date_range?: string
          id?: string
          impressions?: number
          last_synced_at?: string
          page_path?: string
          position?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gsc_page_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gsc_page_query_metrics: {
        Row: {
          clicks: number
          created_at: string
          ctr: number
          date_range: string
          id: string
          impressions: number
          last_synced_at: string
          page: string
          position: number
          query: string
          updated_at: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          ctr?: number
          date_range?: string
          id?: string
          impressions?: number
          last_synced_at?: string
          page: string
          position?: number
          query: string
          updated_at?: string
        }
        Update: {
          clicks?: number
          created_at?: string
          ctr?: number
          date_range?: string
          id?: string
          impressions?: number
          last_synced_at?: string
          page?: string
          position?: number
          query?: string
          updated_at?: string
        }
        Relationships: []
      }
      gsc_query_metrics: {
        Row: {
          clicks: number
          created_at: string
          ctr: number
          date_range: string
          id: string
          impressions: number
          last_synced_at: string
          position: number
          query: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          ctr?: number
          date_range?: string
          id?: string
          impressions?: number
          last_synced_at?: string
          position?: number
          query: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          clicks?: number
          created_at?: string
          ctr?: number
          date_range?: string
          id?: string
          impressions?: number
          last_synced_at?: string
          position?: number
          query?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gsc_query_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gsc_site_metrics: {
        Row: {
          clicks: number
          created_at: string
          ctr: number
          date: string
          id: string
          impressions: number
          position: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          ctr?: number
          date: string
          id?: string
          impressions?: number
          position?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          clicks?: number
          created_at?: string
          ctr?: number
          date?: string
          id?: string
          impressions?: number
          position?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gsc_site_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      individual_equipment_pricing: {
        Row: {
          brand: string
          created_at: string
          id: string
          is_active: boolean
          model_number: string
          notes: string | null
          price: number
          size: string | null
          sort_order: number
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          brand: string
          created_at?: string
          id?: string
          is_active?: boolean
          model_number: string
          notes?: string | null
          price?: number
          size?: string | null
          sort_order?: number
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          brand?: string
          created_at?: string
          id?: string
          is_active?: boolean
          model_number?: string
          notes?: string | null
          price?: number
          size?: string | null
          sort_order?: number
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "individual_equipment_pricing_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_configs: {
        Row: {
          config: Json
          created_at: string
          id: string
          integration_name: string
          is_active: boolean | null
          last_sync_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          integration_name: string
          is_active?: boolean | null
          last_sync_at?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          integration_name?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          availability: string | null
          certifications: string | null
          cover_letter: string | null
          created_at: string
          email: string
          experience: string
          first_name: string
          how_did_you_hear: string | null
          id: string
          last_name: string
          phone: string
          position: string | null
          resume_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          availability?: string | null
          certifications?: string | null
          cover_letter?: string | null
          created_at?: string
          email: string
          experience: string
          first_name: string
          how_did_you_hear?: string | null
          id?: string
          last_name: string
          phone: string
          position?: string | null
          resume_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          availability?: string | null
          certifications?: string | null
          cover_letter?: string | null
          created_at?: string
          email?: string
          experience?: string
          first_name?: string
          how_did_you_hear?: string | null
          id?: string
          last_name?: string
          phone?: string
          position?: string | null
          resume_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      job_equipment_installs: {
        Row: {
          created_at: string
          equipment_page_id: string
          id: string
          install_date: string | null
          install_notes: string | null
          job_id: string
          quantity: number
          serial_numbers: string[] | null
          source: string
          source_confidence: number | null
          tenant_id: string
          warranty_expiry: string | null
        }
        Insert: {
          created_at?: string
          equipment_page_id: string
          id?: string
          install_date?: string | null
          install_notes?: string | null
          job_id: string
          quantity?: number
          serial_numbers?: string[] | null
          source: string
          source_confidence?: number | null
          tenant_id: string
          warranty_expiry?: string | null
        }
        Update: {
          created_at?: string
          equipment_page_id?: string
          id?: string
          install_date?: string | null
          install_notes?: string | null
          job_id?: string
          quantity?: number
          serial_numbers?: string[] | null
          source?: string
          source_confidence?: number | null
          tenant_id?: string
          warranty_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_equipment_installs_equipment_page_id_fkey"
            columns: ["equipment_page_id"]
            isOneToOne: false
            referencedRelation: "equipment_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_equipment_installs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "crm_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_equipment_installs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_articles: {
        Row: {
          category_id: string | null
          content_en: string | null
          content_es: string | null
          created_at: string
          created_by: string | null
          id: string
          model_number: string | null
          tag_type: string | null
          tags: string[]
          tenant_id: string
          title_en: string
          title_es: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category_id?: string | null
          content_en?: string | null
          content_es?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          model_number?: string | null
          tag_type?: string | null
          tags?: string[]
          tenant_id: string
          title_en: string
          title_es?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category_id?: string | null
          content_en?: string | null
          content_es?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          model_number?: string | null
          tag_type?: string | null
          tags?: string[]
          tenant_id?: string
          title_en?: string
          title_es?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "kb_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_articles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_media: {
        Row: {
          article_id: string
          caption_en: string | null
          caption_es: string | null
          created_at: string
          id: string
          media_type: string
          sort_order: number
          tenant_id: string
          url: string
        }
        Insert: {
          article_id: string
          caption_en?: string | null
          caption_es?: string | null
          created_at?: string
          id?: string
          media_type: string
          sort_order?: number
          tenant_id: string
          url: string
        }
        Update: {
          article_id?: string
          caption_en?: string | null
          caption_es?: string | null
          created_at?: string
          id?: string
          media_type?: string
          sort_order?: number
          tenant_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_media_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "kb_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_media_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          slug: string
          tags: string[] | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          slug: string
          tags?: string[] | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          slug?: string
          tags?: string[] | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_rates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          rate: number
          rate_type: Database["public"]["Enums"]["labor_rate_type"]
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          rate?: number
          rate_type?: Database["public"]["Enums"]["labor_rate_type"]
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          rate?: number
          rate_type?: Database["public"]["Enums"]["labor_rate_type"]
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "labor_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_form_tags: {
        Row: {
          created_at: string
          form_id: string
          id: string
          tag_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          form_id: string
          id?: string
          tag_id: string
          tenant_id?: string
        }
        Update: {
          created_at?: string
          form_id?: string
          id?: string
          tag_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_form_tags_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "landing_page_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_form_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "ghl_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_form_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_forms: {
        Row: {
          archived_at: string | null
          created_at: string
          description: string | null
          fields_config: Json
          form_type: string
          id: string
          is_active: boolean
          name: string
          redirect_url: string | null
          slug: string
          success_message: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          fields_config?: Json
          form_type?: string
          id?: string
          is_active?: boolean
          name: string
          redirect_url?: string | null
          slug: string
          success_message?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          fields_config?: Json
          form_type?: string
          id?: string
          is_active?: boolean
          name?: string
          redirect_url?: string | null
          slug?: string
          success_message?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_forms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_submissions: {
        Row: {
          attribution_captured_at: string | null
          created_at: string
          custom_fields: Json | null
          email: string
          fbclid: string | null
          first_name: string
          form_id: string | null
          gclid: string | null
          ghl_contact_id: string | null
          ghl_sync_status: string
          id: string
          landing_page: string | null
          last_name: string
          message: string | null
          phone: string | null
          referrer: string | null
          service_type: string | null
          status: string
          tenant_id: string
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          attribution_captured_at?: string | null
          created_at?: string
          custom_fields?: Json | null
          email: string
          fbclid?: string | null
          first_name: string
          form_id?: string | null
          gclid?: string | null
          ghl_contact_id?: string | null
          ghl_sync_status?: string
          id?: string
          landing_page?: string | null
          last_name: string
          message?: string | null
          phone?: string | null
          referrer?: string | null
          service_type?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          attribution_captured_at?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string
          fbclid?: string | null
          first_name?: string
          form_id?: string | null
          gclid?: string | null
          ghl_contact_id?: string | null
          ghl_sync_status?: string
          id?: string
          landing_page?: string | null
          last_name?: string
          message?: string | null
          phone?: string | null
          referrer?: string | null
          service_type?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "landing_page_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          category: string | null
          color: string | null
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          tenant_id: string
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          tenant_id: string
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_sources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      material_request_items: {
        Row: {
          created_at: string
          custom_item: string | null
          from_takeoff: boolean
          id: string
          material_id: string | null
          notes: string | null
          quantity: number
          request_id: string
          sort_order: number
          tenant_id: string
          unit: string | null
        }
        Insert: {
          created_at?: string
          custom_item?: string | null
          from_takeoff?: boolean
          id?: string
          material_id?: string | null
          notes?: string | null
          quantity?: number
          request_id: string
          sort_order?: number
          tenant_id: string
          unit?: string | null
        }
        Update: {
          created_at?: string
          custom_item?: string | null
          from_takeoff?: boolean
          id?: string
          material_id?: string | null
          notes?: string | null
          quantity?: number
          request_id?: string
          sort_order?: number
          tenant_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_request_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "material_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_request_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      material_requests: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string | null
          fulfilled_at: string | null
          id: string
          job_id: string | null
          list_name: string | null
          notes: string | null
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_estimate_id: string | null
          status: Database["public"]["Enums"]["material_request_status"]
          submitted_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          company_id?: string
          created_at?: string
          customer_id?: string | null
          fulfilled_at?: string | null
          id?: string
          job_id?: string | null
          list_name?: string | null
          notes?: string | null
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_estimate_id?: string | null
          status?: Database["public"]["Enums"]["material_request_status"]
          submitted_at?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string | null
          fulfilled_at?: string | null
          id?: string
          job_id?: string | null
          list_name?: string | null
          notes?: string | null
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_estimate_id?: string | null
          status?: Database["public"]["Enums"]["material_request_status"]
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "crm_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      material_suppliers: {
        Row: {
          created_at: string
          id: string
          material_id: string
          preference_rank: number | null
          supplier_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          preference_rank?: number | null
          supplier_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          preference_rank?: number | null
          supplier_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_suppliers_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "crm_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      materials_catalog: {
        Row: {
          category: Database["public"]["Enums"]["material_category"]
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          name_es: string | null
          part_number: string | null
          request_category: string | null
          show_in_estimates: boolean
          show_in_takeoff: boolean
          sort_order: number | null
          supplier: string | null
          tenant_id: string
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["material_category"]
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          name_es?: string | null
          part_number?: string | null
          request_category?: string | null
          show_in_estimates?: boolean
          show_in_takeoff?: boolean
          sort_order?: number | null
          supplier?: string | null
          tenant_id: string
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["material_category"]
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          name_es?: string | null
          part_number?: string | null
          request_category?: string | null
          show_in_estimates?: boolean
          show_in_takeoff?: boolean
          sort_order?: number | null
          supplier?: string | null
          tenant_id?: string
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_catalog_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_mentions: {
        Row: {
          id: string
          mentioned_user_id: string
          message_id: string
        }
        Insert: {
          id?: string
          mentioned_user_id: string
          message_id: string
        }
        Update: {
          id?: string
          mentioned_user_id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_translations: {
        Row: {
          created_at: string
          id: string
          language: string
          message_id: string
          translated_body: string
        }
        Insert: {
          created_at?: string
          id?: string
          language: string
          message_id: string
          translated_body: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string
          message_id?: string
          translated_body?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_translations_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          tenant_id: string
          thread_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          tenant_id?: string
          thread_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          tenant_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      page_seo: {
        Row: {
          avg_position: number | null
          canonical_url: string | null
          cluster: string | null
          created_at: string | null
          gsc_clicks: number | null
          gsc_impressions: number | null
          id: string
          index_status: string | null
          internal_links: number | null
          last_content_update: string | null
          meta_description: string | null
          meta_title: string | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          page_name: string
          page_path: string
          page_type: string | null
          robots: string | null
          schema_applied: boolean | null
          structured_data: Json | null
          target_keyword: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          avg_position?: number | null
          canonical_url?: string | null
          cluster?: string | null
          created_at?: string | null
          gsc_clicks?: number | null
          gsc_impressions?: number | null
          id?: string
          index_status?: string | null
          internal_links?: number | null
          last_content_update?: string | null
          meta_description?: string | null
          meta_title?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          page_name: string
          page_path: string
          page_type?: string | null
          robots?: string | null
          schema_applied?: boolean | null
          structured_data?: Json | null
          target_keyword?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          avg_position?: number | null
          canonical_url?: string | null
          cluster?: string | null
          created_at?: string | null
          gsc_clicks?: number | null
          gsc_impressions?: number | null
          id?: string
          index_status?: string | null
          internal_links?: number | null
          last_content_update?: string | null
          meta_description?: string | null
          meta_title?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          page_name?: string
          page_path?: string
          page_type?: string | null
          robots?: string | null
          schema_applied?: boolean | null
          structured_data?: Json | null
          target_keyword?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_seo_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      page_seo_gsc_snapshots: {
        Row: {
          avg_position: number | null
          clicks: number
          created_at: string
          id: string
          impressions: number
          page_id: string
          tenant_id: string
          week_starting: string
        }
        Insert: {
          avg_position?: number | null
          clicks?: number
          created_at?: string
          id?: string
          impressions?: number
          page_id: string
          tenant_id?: string
          week_starting: string
        }
        Update: {
          avg_position?: number | null
          clicks?: number
          created_at?: string
          id?: string
          impressions?: number
          page_id?: string
          tenant_id?: string
          week_starting?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_seo_gsc_snapshots_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "page_seo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_seo_gsc_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      price_books: {
        Row: {
          category: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          tenant_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          tenant_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          tenant_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_books_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          enabled: boolean
          id: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          id?: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          id?: string
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_bach_analyses: {
        Row: {
          action: string
          answer_markdown: string
          created_at: string
          created_by: string | null
          id: string
          model: string
          question: string | null
          total_analyzed: number | null
        }
        Insert: {
          action: string
          answer_markdown: string
          created_at?: string
          created_by?: string | null
          id?: string
          model: string
          question?: string | null
          total_analyzed?: number | null
        }
        Update: {
          action?: string
          answer_markdown?: string
          created_at?: string
          created_by?: string | null
          id?: string
          model?: string
          question?: string | null
          total_analyzed?: number | null
        }
        Relationships: []
      }
      seo_linking_opportunities: {
        Row: {
          analysis_id: string | null
          anchor_text: string | null
          applied_at: string | null
          applied_by: string | null
          apply_error: string | null
          apply_method: string | null
          cluster: string | null
          created_at: string
          id: string
          notes: string | null
          priority: string
          reason: string | null
          source_url: string
          status: string
          target_url: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          analysis_id?: string | null
          anchor_text?: string | null
          applied_at?: string | null
          applied_by?: string | null
          apply_error?: string | null
          apply_method?: string | null
          cluster?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          priority?: string
          reason?: string | null
          source_url: string
          status?: string
          target_url: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          analysis_id?: string | null
          anchor_text?: string | null
          applied_at?: string | null
          applied_by?: string | null
          apply_error?: string | null
          apply_method?: string | null
          cluster?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          priority?: string
          reason?: string | null
          source_url?: string
          status?: string
          target_url?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_linking_opportunities_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "seo_bach_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_linking_opportunities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_location_pages: {
        Row: {
          add_to_service_areas_hub: boolean | null
          audience: string | null
          case_study_url: string | null
          city: string
          city_tag: string | null
          cluster: string | null
          content: string | null
          created_at: string | null
          gallery_heading: string | null
          geography_tag: string | null
          h1_title: string | null
          housing_stock: string | null
          id: string
          local_landmark: string | null
          meta_description: string | null
          meta_title: string | null
          neighborhood: string
          page_seo_id: string | null
          page_type: string
          primary_service: string | null
          property_tags: string[] | null
          published: boolean | null
          recommended_system: string | null
          schema_description: string | null
          schema_enabled: boolean | null
          schema_json: Json | null
          search_intent: string | null
          service_tags: string[] | null
          state: string
          template: string | null
          tenant_id: string
          updated_at: string | null
          url_slug: string
          utility_note: string | null
          zip_code: string | null
          zip_tag: string | null
        }
        Insert: {
          add_to_service_areas_hub?: boolean | null
          audience?: string | null
          case_study_url?: string | null
          city?: string
          city_tag?: string | null
          cluster?: string | null
          content?: string | null
          created_at?: string | null
          gallery_heading?: string | null
          geography_tag?: string | null
          h1_title?: string | null
          housing_stock?: string | null
          id?: string
          local_landmark?: string | null
          meta_description?: string | null
          meta_title?: string | null
          neighborhood: string
          page_seo_id?: string | null
          page_type?: string
          primary_service?: string | null
          property_tags?: string[] | null
          published?: boolean | null
          recommended_system?: string | null
          schema_description?: string | null
          schema_enabled?: boolean | null
          schema_json?: Json | null
          search_intent?: string | null
          service_tags?: string[] | null
          state?: string
          template?: string | null
          tenant_id?: string
          updated_at?: string | null
          url_slug: string
          utility_note?: string | null
          zip_code?: string | null
          zip_tag?: string | null
        }
        Update: {
          add_to_service_areas_hub?: boolean | null
          audience?: string | null
          case_study_url?: string | null
          city?: string
          city_tag?: string | null
          cluster?: string | null
          content?: string | null
          created_at?: string | null
          gallery_heading?: string | null
          geography_tag?: string | null
          h1_title?: string | null
          housing_stock?: string | null
          id?: string
          local_landmark?: string | null
          meta_description?: string | null
          meta_title?: string | null
          neighborhood?: string
          page_seo_id?: string | null
          page_type?: string
          primary_service?: string | null
          property_tags?: string[] | null
          published?: boolean | null
          recommended_system?: string | null
          schema_description?: string | null
          schema_enabled?: boolean | null
          schema_json?: Json | null
          search_intent?: string | null
          service_tags?: string[] | null
          state?: string
          template?: string | null
          tenant_id?: string
          updated_at?: string | null
          url_slug?: string
          utility_note?: string | null
          zip_code?: string | null
          zip_tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_location_pages_page_seo_id_fkey"
            columns: ["page_seo_id"]
            isOneToOne: false
            referencedRelation: "page_seo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_location_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_report_actions: {
        Row: {
          action_text: string
          completed_at: string | null
          created_at: string
          id: string
          page_path: string | null
          report_id: string
          status: string
        }
        Insert: {
          action_text: string
          completed_at?: string | null
          created_at?: string
          id?: string
          page_path?: string | null
          report_id: string
          status?: string
        }
        Update: {
          action_text?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          page_path?: string | null
          report_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_report_actions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "seo_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_report_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          report_id: string
          role: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          report_id: string
          role: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          report_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_report_messages_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "seo_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_reports: {
        Row: {
          created_at: string
          created_by: string | null
          full_response: string
          id: string
          model_used: string | null
          original_prompt: string
          pages_analyzed: number | null
          pages_flagged: number | null
          related_clusters: string[]
          related_page_paths: string[]
          report_type: string | null
          summary: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          full_response: string
          id?: string
          model_used?: string | null
          original_prompt: string
          pages_analyzed?: number | null
          pages_flagged?: number | null
          related_clusters?: string[]
          related_page_paths?: string[]
          report_type?: string | null
          summary: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          full_response?: string
          id?: string
          model_used?: string | null
          original_prompt?: string
          pages_analyzed?: number | null
          pages_flagged?: number | null
          related_clusters?: string[]
          related_page_paths?: string[]
          report_type?: string | null
          summary?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_area_pages: {
        Row: {
          area_name: string
          area_type: string
          created_at: string
          description: string | null
          headline: string | null
          id: string
          install_count: number
          last_install_at: string | null
          local_info: Json
          popular_equipment: Json
          published: boolean
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          service_highlights: Json
          slug: string
          state: string
          updated_at: string
        }
        Insert: {
          area_name: string
          area_type: string
          created_at?: string
          description?: string | null
          headline?: string | null
          id?: string
          install_count?: number
          last_install_at?: string | null
          local_info?: Json
          popular_equipment?: Json
          published?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          service_highlights?: Json
          slug: string
          state?: string
          updated_at?: string
        }
        Update: {
          area_name?: string
          area_type?: string
          created_at?: string
          description?: string | null
          headline?: string | null
          id?: string
          install_count?: number
          last_install_at?: string | null
          local_info?: Json
          popular_equipment?: Json
          published?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          service_highlights?: Json
          slug?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      sitemap_snapshots: {
        Row: {
          created_at: string
          id: string
          url_count: number
          xml_content: string
        }
        Insert: {
          created_at?: string
          id?: string
          url_count?: number
          xml_content: string
        }
        Update: {
          created_at?: string
          id?: string
          url_count?: number
          xml_content?: string
        }
        Relationships: []
      }
      social_link_clicks: {
        Row: {
          clicked_at: string
          id: string
          platform: string
          referrer: string | null
          social_link_id: string | null
          source: string
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          clicked_at?: string
          id?: string
          platform: string
          referrer?: string | null
          social_link_id?: string | null
          source?: string
          tenant_id?: string
          user_agent?: string | null
        }
        Update: {
          clicked_at?: string
          id?: string
          platform?: string
          referrer?: string | null
          social_link_id?: string | null
          source?: string
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_link_clicks_social_link_id_fkey"
            columns: ["social_link_id"]
            isOneToOne: false
            referencedRelation: "social_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_link_clicks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      social_links: {
        Row: {
          created_at: string
          display_name: string
          icon_name: string | null
          id: string
          is_active: boolean
          platform: string
          tenant_id: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          icon_name?: string | null
          id?: string
          is_active?: boolean
          platform: string
          tenant_id?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          icon_name?: string | null
          id?: string
          is_active?: boolean
          platform?: string
          tenant_id?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      threads: {
        Row: {
          conversation_id: string
          created_at: string
          created_by: string | null
          id: string
          title: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "threads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          approved_by: string | null
          break_minutes: number | null
          clock_in: string | null
          clock_out: string | null
          created_at: string
          entry_date: string
          entry_type: string
          hourly_rate: number | null
          id: string
          job_id: string | null
          manual_end: string | null
          manual_start: string | null
          notes: string | null
          overtime_hours: number | null
          overtime_rate: number | null
          status: string
          team_member_id: string
          tenant_id: string
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          break_minutes?: number | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          entry_date?: string
          entry_type?: string
          hourly_rate?: number | null
          id?: string
          job_id?: string | null
          manual_end?: string | null
          manual_start?: string | null
          notes?: string | null
          overtime_hours?: number | null
          overtime_rate?: number | null
          status?: string
          team_member_id: string
          tenant_id: string
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          break_minutes?: number | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          entry_date?: string
          entry_type?: string
          hourly_rate?: number | null
          id?: string
          job_id?: string | null
          manual_end?: string | null
          manual_start?: string | null
          notes?: string | null
          overtime_hours?: number | null
          overtime_rate?: number | null
          status?: string
          team_member_id?: string
          tenant_id?: string
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "crm_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "crm_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_settings: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          setting_key: string
          setting_value: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          setting_key: string
          setting_value?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          setting_key?: string
          setting_value?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      trash_bin: {
        Row: {
          data: Json
          deleted_at: string | null
          deleted_by: string | null
          expires_at: string | null
          id: string
          original_id: string
          original_table: string
          tenant_id: string
        }
        Insert: {
          data: Json
          deleted_at?: string | null
          deleted_by?: string | null
          expires_at?: string | null
          id?: string
          original_id: string
          original_table: string
          tenant_id: string
        }
        Update: {
          data?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          expires_at?: string | null
          id?: string
          original_id?: string
          original_table?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trash_bin_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workedge_daily_sync_log: {
        Row: {
          attachments_synced: number | null
          duration_ms: number | null
          errors: Json | null
          id: string
          jobs_created: number | null
          jobs_updated: number | null
          status: string | null
          sync_at: string | null
          tenant_id: string
        }
        Insert: {
          attachments_synced?: number | null
          duration_ms?: number | null
          errors?: Json | null
          id?: string
          jobs_created?: number | null
          jobs_updated?: number | null
          status?: string | null
          sync_at?: string | null
          tenant_id: string
        }
        Update: {
          attachments_synced?: number | null
          duration_ms?: number | null
          errors?: Json | null
          id?: string
          jobs_created?: number | null
          jobs_updated?: number | null
          status?: string | null
          sync_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workedge_daily_sync_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workedge_project_media: {
        Row: {
          captured_at: string | null
          captured_by: string | null
          classification_confidence: number | null
          classification_metadata: Json | null
          classified_at: string | null
          content_type: string | null
          description: string | null
          equipment_page_id: string | null
          extracted_brand: string | null
          extracted_mfg_date: string | null
          extracted_model: string | null
          extracted_refrigerant: string | null
          extracted_serial: string | null
          extracted_tonnage: number | null
          extraction_confidence: number | null
          id: string
          job_id: string
          media_type: string
          media_url: string | null
          review_status: string
          synced_at: string
          tenant_id: string
          thumbnail_url: string | null
          title: string | null
          transcription: string | null
          workedge_project_id: string
        }
        Insert: {
          captured_at?: string | null
          captured_by?: string | null
          classification_confidence?: number | null
          classification_metadata?: Json | null
          classified_at?: string | null
          content_type?: string | null
          description?: string | null
          equipment_page_id?: string | null
          extracted_brand?: string | null
          extracted_mfg_date?: string | null
          extracted_model?: string | null
          extracted_refrigerant?: string | null
          extracted_serial?: string | null
          extracted_tonnage?: number | null
          extraction_confidence?: number | null
          id?: string
          job_id: string
          media_type: string
          media_url?: string | null
          review_status?: string
          synced_at?: string
          tenant_id: string
          thumbnail_url?: string | null
          title?: string | null
          transcription?: string | null
          workedge_project_id: string
        }
        Update: {
          captured_at?: string | null
          captured_by?: string | null
          classification_confidence?: number | null
          classification_metadata?: Json | null
          classified_at?: string | null
          content_type?: string | null
          description?: string | null
          equipment_page_id?: string | null
          extracted_brand?: string | null
          extracted_mfg_date?: string | null
          extracted_model?: string | null
          extracted_refrigerant?: string | null
          extracted_serial?: string | null
          extracted_tonnage?: number | null
          extraction_confidence?: number | null
          id?: string
          job_id?: string
          media_type?: string
          media_url?: string | null
          review_status?: string
          synced_at?: string
          tenant_id?: string
          thumbnail_url?: string | null
          title?: string | null
          transcription?: string | null
          workedge_project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workedge_project_media_equipment_page_id_fkey"
            columns: ["equipment_page_id"]
            isOneToOne: false
            referencedRelation: "equipment_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workedge_project_media_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "crm_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workedge_project_media_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workedge_sync_log: {
        Row: {
          entity_type: string
          error_message: string | null
          id: string
          local_id: string
          request_payload: Json | null
          response_payload: Json | null
          sync_direction: string
          sync_status: string
          synced_at: string
          tenant_id: string
          workedge_id: string | null
        }
        Insert: {
          entity_type: string
          error_message?: string | null
          id?: string
          local_id: string
          request_payload?: Json | null
          response_payload?: Json | null
          sync_direction: string
          sync_status?: string
          synced_at?: string
          tenant_id: string
          workedge_id?: string | null
        }
        Update: {
          entity_type?: string
          error_message?: string | null
          id?: string
          local_id?: string
          request_payload?: Json | null
          response_payload?: Json | null
          sync_direction?: string
          sync_status?: string
          synced_at?: string
          tenant_id?: string
          workedge_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workedge_sync_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      conversation_unread_counts: {
        Row: {
          conversation_id: string | null
          unread_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "threads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_scans_public: {
        Row: {
          brand: string | null
          breaker_size: string | null
          city: string | null
          compressor_info: string | null
          created_at: string | null
          equipment_type: string | null
          factory_charge: string | null
          fan_motor_info: string | null
          id: string | null
          is_dfw: boolean | null
          manufactured_year: number | null
          model_number: string | null
          refrigerant: string | null
          seer_rating: number | null
          state: string | null
          tonnage: string | null
          voltage_info: string | null
          zip_code: string | null
        }
        Insert: {
          brand?: string | null
          breaker_size?: string | null
          city?: string | null
          compressor_info?: string | null
          created_at?: string | null
          equipment_type?: string | null
          factory_charge?: string | null
          fan_motor_info?: string | null
          id?: string | null
          is_dfw?: boolean | null
          manufactured_year?: number | null
          model_number?: string | null
          refrigerant?: string | null
          seer_rating?: number | null
          state?: string | null
          tonnage?: string | null
          voltage_info?: string | null
          zip_code?: string | null
        }
        Update: {
          brand?: string | null
          breaker_size?: string | null
          city?: string | null
          compressor_info?: string | null
          created_at?: string | null
          equipment_type?: string | null
          factory_charge?: string | null
          fan_motor_info?: string | null
          id?: string | null
          is_dfw?: boolean | null
          manufactured_year?: number | null
          model_number?: string | null
          refrigerant?: string | null
          seer_rating?: number | null
          state?: string | null
          tonnage?: string | null
          voltage_info?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      lead_attribution: {
        Row: {
          attribution_captured_at: string | null
          channel: string | null
          created_at: string | null
          email: string | null
          fbclid: string | null
          first_name: string | null
          gclid: string | null
          id: string | null
          landing_page: string | null
          last_name: string | null
          message: string | null
          phone: string | null
          referrer: string | null
          service_type: string | null
          status: string | null
          updated_at: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          attribution_captured_at?: string | null
          channel?: never
          created_at?: string | null
          email?: string | null
          fbclid?: string | null
          first_name?: string | null
          gclid?: string | null
          id?: string | null
          landing_page?: string | null
          last_name?: string | null
          message?: string | null
          phone?: string | null
          referrer?: string | null
          service_type?: string | null
          status?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          attribution_captured_at?: string | null
          channel?: never
          created_at?: string | null
          email?: string | null
          fbclid?: string | null
          first_name?: string | null
          gclid?: string | null
          id?: string | null
          landing_page?: string | null
          last_name?: string | null
          message?: string | null
          phone?: string | null
          referrer?: string | null
          service_type?: string | null
          status?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      lead_search_queries: {
        Row: {
          clicks: number | null
          ctr: number | null
          date_range: string | null
          impressions: number | null
          landing_page: string | null
          lead_id: string | null
          page: string | null
          position: number | null
          query: string | null
          rank: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_contract_number: { Args: never; Returns: string }
      generate_estimate_number: { Args: never; Returns: string }
      generate_job_number: { Args: never; Returns: string }
      get_current_tenant_id: { Args: never; Returns: string }
      get_effective_rate: {
        Args: { _on_date: string; _team_member_id: string }
        Returns: {
          hourly_rate: number
          overtime_rate: number
        }[]
      }
      get_new_submission_counts: { Args: never; Returns: Json }
      get_public_tracking_settings: {
        Args: never
        Returns: {
          is_enabled: boolean
          setting_key: string
          setting_value: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_roles_with_email: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_assigned_to_job: {
        Args: { _job_id: string; _user_id: string }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      admin_cost_type: "fixed" | "percentage" | "per_job"
      app_role:
        | "admin"
        | "manager"
        | "super_admin"
        | "technician"
        | "lead_tech"
        | "installer"
        | "helper"
      estimate_section:
        | "equipment_controls"
        | "miscellaneous_inside"
        | "ducting"
        | "labor"
        | "admin_costs"
        | "miscellaneous_outside"
      estimate_status: "draft" | "sent" | "accepted" | "declined" | "expired"
      heating_type: "gas" | "electric" | "heat_pump" | "dual_fuel"
      job_type:
        | "residential_new"
        | "residential_replacement"
        | "commercial_new"
        | "commercial_replacement"
        | "maintenance"
        | "repair"
      labor_rate_type: "hourly" | "daily" | "flat"
      line_item_type:
        | "equipment"
        | "material"
        | "labor"
        | "admin_cost"
        | "custom"
      maintenance_billing_model:
        | "paid_yearly"
        | "paid_monthly"
        | "pay_per_visit"
      maintenance_segment: "residential" | "commercial"
      maintenance_status:
        | "active"
        | "pending"
        | "paused"
        | "expired"
        | "cancelled"
      maintenance_visit_type:
        | "spring_tune_up"
        | "fall_tune_up"
        | "quarterly"
        | "filter_only"
        | "other"
      material_category:
        | "refrigerant"
        | "copper"
        | "electrical"
        | "ductwork"
        | "controls"
        | "supports"
        | "misc"
      material_request_status:
        | "draft"
        | "submitted"
        | "reviewed"
        | "fulfilled"
        | "cancelled"
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
    Enums: {
      admin_cost_type: ["fixed", "percentage", "per_job"],
      app_role: [
        "admin",
        "manager",
        "super_admin",
        "technician",
        "lead_tech",
        "installer",
        "helper",
      ],
      estimate_section: [
        "equipment_controls",
        "miscellaneous_inside",
        "ducting",
        "labor",
        "admin_costs",
        "miscellaneous_outside",
      ],
      estimate_status: ["draft", "sent", "accepted", "declined", "expired"],
      heating_type: ["gas", "electric", "heat_pump", "dual_fuel"],
      job_type: [
        "residential_new",
        "residential_replacement",
        "commercial_new",
        "commercial_replacement",
        "maintenance",
        "repair",
      ],
      labor_rate_type: ["hourly", "daily", "flat"],
      line_item_type: [
        "equipment",
        "material",
        "labor",
        "admin_cost",
        "custom",
      ],
      maintenance_billing_model: [
        "paid_yearly",
        "paid_monthly",
        "pay_per_visit",
      ],
      maintenance_segment: ["residential", "commercial"],
      maintenance_status: [
        "active",
        "pending",
        "paused",
        "expired",
        "cancelled",
      ],
      maintenance_visit_type: [
        "spring_tune_up",
        "fall_tune_up",
        "quarterly",
        "filter_only",
        "other",
      ],
      material_category: [
        "refrigerant",
        "copper",
        "electrical",
        "ductwork",
        "controls",
        "supports",
        "misc",
      ],
      material_request_status: [
        "draft",
        "submitted",
        "reviewed",
        "fulfilled",
        "cancelled",
      ],
    },
  },
} as const
