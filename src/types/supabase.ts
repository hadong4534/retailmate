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
      account_links: {
        Row: {
          created_at: string
          kakao_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          kakao_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          kakao_id?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_images: {
        Row: {
          cost_usd: number | null
          created_at: string
          error_message: string | null
          final_prompt: string | null
          height: number | null
          id: string
          image_path: string | null
          kind: string
          model: string
          page_no: number | null
          set_id: string | null
          status: string
          store_id: string
          thumbnail_path: string | null
          user_id: string
          user_prompt: string
          width: number | null
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string
          error_message?: string | null
          final_prompt?: string | null
          height?: number | null
          id?: string
          image_path?: string | null
          kind: string
          model: string
          page_no?: number | null
          set_id?: string | null
          status?: string
          store_id: string
          thumbnail_path?: string | null
          user_id: string
          user_prompt: string
          width?: number | null
        }
        Update: {
          cost_usd?: number | null
          created_at?: string
          error_message?: string | null
          final_prompt?: string | null
          height?: number | null
          id?: string
          image_path?: string | null
          kind?: string
          model?: string
          page_no?: number | null
          set_id?: string | null
          status?: string
          store_id?: string
          thumbnail_path?: string | null
          user_id?: string
          user_prompt?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_images_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_images_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ai_images_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights: {
        Row: {
          content: string
          generated_at: string
          id: string
          insight_type: string
          metadata: Json | null
          period: string
          store_id: string
        }
        Insert: {
          content: string
          generated_at?: string
          id?: string
          insight_type: string
          metadata?: Json | null
          period: string
          store_id: string
        }
        Update: {
          content?: string
          generated_at?: string
          id?: string
          insight_type?: string
          metadata?: Json | null
          period?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_insights_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_summary"
            referencedColumns: ["store_id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          created_at: string
          id: string
          input_tokens: number
          metadata: Json | null
          model: string
          output_tokens: number
          provider: string
          request_id: string | null
          store_id: string | null
          task: string
          total_cost_usd: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_tokens?: number
          metadata?: Json | null
          model: string
          output_tokens?: number
          provider?: string
          request_id?: string | null
          store_id?: string | null
          task: string
          total_cost_usd?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          input_tokens?: number
          metadata?: Json | null
          model?: string
          output_tokens?: number
          provider?: string
          request_id?: string | null
          store_id?: string | null
          task?: string
          total_cost_usd?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "ai_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendances: {
        Row: {
          check_in_at: string
          check_out_at: string | null
          created_at: string
          distance_in_m: number | null
          distance_out_m: number | null
          id: string
          is_valid: boolean | null
          lat_in: number | null
          lat_out: number | null
          lng_in: number | null
          lng_out: number | null
          memo: string | null
          store_id: string
          user_id: string
          work_minutes: number | null
        }
        Insert: {
          check_in_at: string
          check_out_at?: string | null
          created_at?: string
          distance_in_m?: number | null
          distance_out_m?: number | null
          id?: string
          is_valid?: boolean | null
          lat_in?: number | null
          lat_out?: number | null
          lng_in?: number | null
          lng_out?: number | null
          memo?: string | null
          store_id: string
          user_id: string
          work_minutes?: number | null
        }
        Update: {
          check_in_at?: string
          check_out_at?: string | null
          created_at?: string
          distance_in_m?: number | null
          distance_out_m?: number | null
          id?: string
          is_valid?: boolean | null
          lat_in?: number | null
          lat_out?: number | null
          lng_in?: number | null
          lng_out?: number | null
          memo?: string | null
          store_id?: string
          user_id?: string
          work_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendances_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "attendances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          created_at: string
          id: string
          metadata: Json | null
          store_id: string | null
          summary: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          store_id?: string | null
          summary?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          store_id?: string | null
          summary?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_summary"
            referencedColumns: ["store_id"]
          },
        ]
      }
      consent_logs: {
        Row: {
          agreed: boolean
          agreed_at: string
          consent_type: Database["public"]["Enums"]["consent_type"]
          id: string
          ip: string | null
          user_agent: string | null
          user_id: string
          version: string | null
        }
        Insert: {
          agreed: boolean
          agreed_at?: string
          consent_type: Database["public"]["Enums"]["consent_type"]
          id?: string
          ip?: string | null
          user_agent?: string | null
          user_id: string
          version?: string | null
        }
        Update: {
          agreed?: boolean
          agreed_at?: string
          consent_type?: Database["public"]["Enums"]["consent_type"]
          id?: string
          ip?: string | null
          user_agent?: string | null
          user_id?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_revisions: {
        Row: {
          change_summary: string
          changed_fields: Json | null
          contract_id: string
          id: string
          revised_at: string
          revised_by: string | null
        }
        Insert: {
          change_summary: string
          changed_fields?: Json | null
          contract_id: string
          id?: string
          revised_at?: string
          revised_by?: string | null
        }
        Update: {
          change_summary?: string
          changed_fields?: Json | null
          contract_id?: string
          id?: string
          revised_at?: string
          revised_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_revisions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "labor_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_revisions_revised_by_fkey"
            columns: ["revised_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          body: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          store_id: string | null
          template_kind: string
          updated_at: string
        }
        Insert: {
          body: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          store_id?: string | null
          template_kind?: string
          updated_at?: string
        }
        Update: {
          body?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          store_id?: string | null
          template_kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_templates_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_templates_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_summary"
            referencedColumns: ["store_id"]
          },
        ]
      }
      expense_templates: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          id: string
          memo: string | null
          name: string
          payment_method: string | null
          store_id: string
          vendor: string | null
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          created_by?: string | null
          id?: string
          memo?: string | null
          name: string
          payment_method?: string | null
          store_id: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          memo?: string | null
          name?: string
          payment_method?: string | null
          store_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_templates_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_templates_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_summary"
            referencedColumns: ["store_id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          created_by: string | null
          expense_date: string
          id: string
          item_name: string | null
          memo: string | null
          payment_method: string | null
          receipt_url: string | null
          store_id: string
          vendor: string | null
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          expense_date: string
          id?: string
          item_name?: string | null
          memo?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          store_id: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          expense_date?: string
          id?: string
          item_name?: string | null
          memo?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          store_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_summary"
            referencedColumns: ["store_id"]
          },
        ]
      }
      labor_contracts: {
        Row: {
          additional_terms: string | null
          annual_leave_policy: string | null
          break_minutes: number
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string
          employee_id: string | null
          employee_signature_image: string | null
          employee_signed_at: string | null
          employee_signed_ip: string | null
          employee_signed_user_agent: string | null
          id: string
          invite_name: string | null
          invite_phone: string | null
          job_description: string
          nda_info_scope: string | null
          nda_retention_years: number | null
          owner_signature_image: string | null
          owner_signed_at: string | null
          owner_signed_ip: string | null
          owner_signed_user_agent: string | null
          pay_day: number
          pay_method: string | null
          payroll_mode: string | null
          pdf_url: string | null
          sign_token: string | null
          sign_token_expires_at: string | null
          social_insurance: Json
          status: Database["public"]["Enums"]["contract_status"]
          store_id: string
          updated_at: string
          wage_amount: number
          wage_type: Database["public"]["Enums"]["wage_type"]
          weekly_holiday_allowance: boolean
          work_days: Json
          work_end_date: string | null
          work_end_time: string
          work_schedule: Json | null
          work_start_date: string
          work_start_time: string
          workplace_address: string
        }
        Insert: {
          additional_terms?: string | null
          annual_leave_policy?: string | null
          break_minutes?: number
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          employee_id?: string | null
          employee_signature_image?: string | null
          employee_signed_at?: string | null
          employee_signed_ip?: string | null
          employee_signed_user_agent?: string | null
          id?: string
          invite_name?: string | null
          invite_phone?: string | null
          job_description: string
          nda_info_scope?: string | null
          nda_retention_years?: number | null
          owner_signature_image?: string | null
          owner_signed_at?: string | null
          owner_signed_ip?: string | null
          owner_signed_user_agent?: string | null
          pay_day?: number
          pay_method?: string | null
          payroll_mode?: string | null
          pdf_url?: string | null
          sign_token?: string | null
          sign_token_expires_at?: string | null
          social_insurance?: Json
          status?: Database["public"]["Enums"]["contract_status"]
          store_id: string
          updated_at?: string
          wage_amount: number
          wage_type: Database["public"]["Enums"]["wage_type"]
          weekly_holiday_allowance?: boolean
          work_days?: Json
          work_end_date?: string | null
          work_end_time: string
          work_schedule?: Json | null
          work_start_date: string
          work_start_time: string
          workplace_address: string
        }
        Update: {
          additional_terms?: string | null
          annual_leave_policy?: string | null
          break_minutes?: number
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          employee_id?: string | null
          employee_signature_image?: string | null
          employee_signed_at?: string | null
          employee_signed_ip?: string | null
          employee_signed_user_agent?: string | null
          id?: string
          invite_name?: string | null
          invite_phone?: string | null
          job_description?: string
          nda_info_scope?: string | null
          nda_retention_years?: number | null
          owner_signature_image?: string | null
          owner_signed_at?: string | null
          owner_signed_ip?: string | null
          owner_signed_user_agent?: string | null
          pay_day?: number
          pay_method?: string | null
          payroll_mode?: string | null
          pdf_url?: string | null
          sign_token?: string | null
          sign_token_expires_at?: string | null
          social_insurance?: Json
          status?: Database["public"]["Enums"]["contract_status"]
          store_id?: string
          updated_at?: string
          wage_amount?: number
          wage_type?: Database["public"]["Enums"]["wage_type"]
          weekly_holiday_allowance?: boolean
          work_days?: Json
          work_end_date?: string | null
          work_end_time?: string
          work_schedule?: Json | null
          work_start_date?: string
          work_start_time?: string
          workplace_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "labor_contracts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_contracts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_contracts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_summary"
            referencedColumns: ["store_id"]
          },
        ]
      }
      notice_reads: {
        Row: {
          id: string
          notice_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notice_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notice_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notice_reads_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "notices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notice_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          author_id: string
          body: string
          created_at: string
          expires_at: string | null
          id: string
          is_pinned: boolean
          published_at: string
          store_id: string
          target: Database["public"]["Enums"]["notice_target"]
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean
          published_at?: string
          store_id: string
          target?: Database["public"]["Enums"]["notice_target"]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean
          published_at?: string
          store_id?: string
          target?: Database["public"]["Enums"]["notice_target"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_summary"
            referencedColumns: ["store_id"]
          },
        ]
      }
      overtime_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          minutes: number
          reason: string | null
          status: string
          store_id: string
          user_id: string
          work_date: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          minutes: number
          reason?: string | null
          status?: string
          store_id: string
          user_id: string
          work_date: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          minutes?: number
          reason?: string | null
          status?: string
          store_id?: string
          user_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "overtime_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_summary"
            referencedColumns: ["store_id"]
          },
        ]
      }
      payrolls: {
        Row: {
          base_pay: number
          created_at: string
          deduction: number
          holiday_pay: number
          id: string
          night_pay: number
          overtime_pay: number
          paid_at: string | null
          store_id: string
          total: number
          user_id: string
          weekly_bonus: number
          work_minutes: number
          year_month: string
        }
        Insert: {
          base_pay?: number
          created_at?: string
          deduction?: number
          holiday_pay?: number
          id?: string
          night_pay?: number
          overtime_pay?: number
          paid_at?: string | null
          store_id: string
          total?: number
          user_id: string
          weekly_bonus?: number
          work_minutes?: number
          year_month: string
        }
        Update: {
          base_pay?: number
          created_at?: string
          deduction?: number
          holiday_pay?: number
          id?: string
          night_pay?: number
          overtime_pay?: number
          paid_at?: string | null
          store_id?: string
          total?: number
          user_id?: string
          weekly_bonus?: number
          work_minutes?: number
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "payrolls_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrolls_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "payrolls_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_verifications: {
        Row: {
          attempts: number
          client_ip: unknown
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: number
          phone: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          client_ip?: unknown
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: number
          phone: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          client_ip?: unknown
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: number
          phone?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          cost_price: number | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          sale_price: number
          store_id: string
        }
        Insert: {
          category?: string | null
          cost_price?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          sale_price: number
          store_id: string
        }
        Update: {
          category?: string | null
          cost_price?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          sale_price?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_summary"
            referencedColumns: ["store_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          phone_verified: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          phone?: string | null
          phone_verified?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          phone_verified?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          id: string
          product_id: string | null
          product_name_snapshot: string | null
          qty: number
          sale_id: string
          subtotal: number | null
          unit_price: number
        }
        Insert: {
          id?: string
          product_id?: string | null
          product_name_snapshot?: string | null
          qty: number
          sale_id: string
          subtotal?: number | null
          unit_price: number
        }
        Update: {
          id?: string
          product_id?: string | null
          product_name_snapshot?: string | null
          qty?: number
          sale_id?: string
          subtotal?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount: number
          channel: Database["public"]["Enums"]["sale_channel"]
          created_at: string
          created_by: string | null
          id: string
          memo: string | null
          sale_date: string
          store_id: string
        }
        Insert: {
          amount: number
          channel?: Database["public"]["Enums"]["sale_channel"]
          created_at?: string
          created_by?: string | null
          id?: string
          memo?: string | null
          sale_date: string
          store_id: string
        }
        Update: {
          amount?: number
          channel?: Database["public"]["Enums"]["sale_channel"]
          created_at?: string
          created_by?: string | null
          id?: string
          memo?: string | null
          sale_date?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_summary"
            referencedColumns: ["store_id"]
          },
        ]
      }
      store_members: {
        Row: {
          created_at: string
          daily_wage: number | null
          gps_consent_at: string | null
          hire_date: string | null
          hourly_wage: number | null
          id: string
          is_active: boolean
          monthly_wage: number | null
          payroll_mode: string
          privacy_consent_at: string | null
          resign_date: string | null
          role: Database["public"]["Enums"]["user_role"]
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_wage?: number | null
          gps_consent_at?: string | null
          hire_date?: string | null
          hourly_wage?: number | null
          id?: string
          is_active?: boolean
          monthly_wage?: number | null
          payroll_mode?: string
          privacy_consent_at?: string | null
          resign_date?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_wage?: number | null
          gps_consent_at?: string | null
          hire_date?: string | null
          hourly_wage?: number | null
          id?: string
          is_active?: boolean
          monthly_wage?: number | null
          payroll_mode?: string
          privacy_consent_at?: string | null
          resign_date?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string
          brand_color: string | null
          brand_description: string | null
          brand_slogan: string | null
          business_name: string | null
          business_no: string | null
          close_time: string | null
          created_at: string
          detail_address: string | null
          id: string
          industry: string | null
          lat: number | null
          lng: number | null
          logo_path: string | null
          monthly_target: number | null
          name: string
          open_time: string | null
          owner_id: string
          pay_day_default: number | null
          postcode: string | null
          radius_m: number
          tax_filing_mode: string | null
          updated_at: string
          vat_type: string | null
          wage_calc_mode: string | null
          weekly_holiday_default: boolean | null
        }
        Insert: {
          address: string
          brand_color?: string | null
          brand_description?: string | null
          brand_slogan?: string | null
          business_name?: string | null
          business_no?: string | null
          close_time?: string | null
          created_at?: string
          detail_address?: string | null
          id?: string
          industry?: string | null
          lat?: number | null
          lng?: number | null
          logo_path?: string | null
          monthly_target?: number | null
          name: string
          open_time?: string | null
          owner_id: string
          pay_day_default?: number | null
          postcode?: string | null
          radius_m?: number
          tax_filing_mode?: string | null
          updated_at?: string
          vat_type?: string | null
          wage_calc_mode?: string | null
          weekly_holiday_default?: boolean | null
        }
        Update: {
          address?: string
          brand_color?: string | null
          brand_description?: string | null
          brand_slogan?: string | null
          business_name?: string | null
          business_no?: string | null
          close_time?: string | null
          created_at?: string
          detail_address?: string | null
          id?: string
          industry?: string | null
          lat?: number | null
          lng?: number | null
          logo_path?: string | null
          monthly_target?: number | null
          name?: string
          open_time?: string | null
          owner_id?: string
          pay_day_default?: number | null
          postcode?: string | null
          radius_m?: number
          tax_filing_mode?: string | null
          updated_at?: string
          vat_type?: string | null
          wage_calc_mode?: string | null
          weekly_holiday_default?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_prefs: {
        Row: {
          attendance_alert: boolean
          briefing_alert: boolean
          expense_alert: boolean
          important_alert: boolean
          notice_alert: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          attendance_alert?: boolean
          briefing_alert?: boolean
          expense_alert?: boolean
          important_alert?: boolean
          notice_alert?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          attendance_alert?: boolean
          briefing_alert?: boolean
          expense_alert?: boolean
          important_alert?: boolean
          notice_alert?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          end_time: string
          id: string
          notes: string | null
          schedule_date: string
          shift_label: string | null
          start_time: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_time: string
          id?: string
          notes?: string | null
          schedule_date: string
          shift_label?: string | null
          start_time: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          schedule_date?: string
          shift_label?: string | null
          start_time?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedules_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedules_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "work_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_currently_working: {
        Row: {
          attendance_id: string | null
          check_in_at: string | null
          employee_name: string | null
          store_id: string | null
          user_id: string | null
          work_minutes_so_far: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendances_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "v_daily_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "attendances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_daily_summary: {
        Row: {
          profit: number | null
          store_id: string | null
          summary_date: string | null
          total_expenses: number | null
          total_sales: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_view_member_profile: { Args: { target: string }; Returns: boolean }
      delete_my_account: { Args: never; Returns: undefined }
      is_store_admin: { Args: { p_store_id: string }; Returns: boolean }
      is_store_member: { Args: { p_store_id: string }; Returns: boolean }
      is_store_owner: { Args: { p_store_id: string }; Returns: boolean }
      normalize_phone: { Args: { p_phone: string }; Returns: string }
    }
    Enums: {
      consent_type: "terms" | "privacy" | "gps_location" | "marketing"
      contract_status: "draft" | "sent" | "signed" | "terminated" | "cancelled"
      contract_type: "fulltime" | "parttime" | "daily" | "nda"
      expense_category:
        | "material"
        | "labor"
        | "rent"
        | "utility"
        | "communication"
        | "marketing"
        | "tax"
        | "etc"
      notice_target: "all" | "employees"
      sale_channel:
        | "cash"
        | "card"
        | "delivery"
        | "other"
        | "cash_receipt"
        | "transfer"
      user_role: "owner" | "employee" | "manager"
      wage_type: "hourly" | "monthly" | "daily"
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
      consent_type: ["terms", "privacy", "gps_location", "marketing"],
      contract_status: ["draft", "sent", "signed", "terminated", "cancelled"],
      contract_type: ["fulltime", "parttime", "daily", "nda"],
      expense_category: [
        "material",
        "labor",
        "rent",
        "utility",
        "communication",
        "marketing",
        "tax",
        "etc",
      ],
      notice_target: ["all", "employees"],
      sale_channel: [
        "cash",
        "card",
        "delivery",
        "other",
        "cash_receipt",
        "transfer",
      ],
      user_role: ["owner", "employee", "manager"],
      wage_type: ["hourly", "monthly", "daily"],
    },
  },
} as const
