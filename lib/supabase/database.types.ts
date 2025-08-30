export type Database = {
  public: {
    Tables: {
      schools_ncaa_verified: {
        Row: {
          id: number
          name: string
          normalized_name: string
          ncaa_id: string
          athletic_division: string
          conference: string
          subdivision_level: string | null
          school_type: string
          school_level: string
          city: string | null
          state: string
          full_location: string | null
          latitude: number | null
          longitude: number | null
          academic_website: string | null
          athletic_website: string | null
          colors: Record<string, string> | null
          logo_url: string | null
          mascot: string | null
          data_sources: string[] | null
          verification_status: string
          data_quality_score: number | null
          created_at: string
          updated_at: string
          last_scraped_at: string | null
        }
        Insert: {
          name: string
          normalized_name: string
          ncaa_id: string
          athletic_division: string
          conference: string
          subdivision_level?: string | null
          school_type?: string
          school_level?: string
          city?: string | null
          state: string
          full_location?: string | null
          latitude?: number | null
          longitude?: number | null
          academic_website?: string | null
          athletic_website?: string | null
          colors?: Record<string, string> | null
          logo_url?: string | null
          mascot?: string | null
          data_sources?: string[] | null
          verification_status?: string
          data_quality_score?: number | null
          created_at?: string
          updated_at?: string
          last_scraped_at?: string | null
        }
        Update: {
          name?: string
          normalized_name?: string
          ncaa_id?: string
          athletic_division?: string
          conference?: string
          subdivision_level?: string | null
          school_type?: string
          school_level?: string
          city?: string | null
          state?: string
          full_location?: string | null
          latitude?: number | null
          longitude?: number | null
          academic_website?: string | null
          athletic_website?: string | null
          colors?: Record<string, string> | null
          logo_url?: string | null
          mascot?: string | null
          data_sources?: string[] | null
          verification_status?: string
          data_quality_score?: number | null
          created_at?: string
          updated_at?: string
          last_scraped_at?: string | null
        }
        Relationships: []
      }
      athletic_staff: {
        Row: {
          id: number
          ncaa_school_id: number | null
          school_id: number | null
          name: string
          title: string | null
          sport: string | null
          sport_category: string | null
          email: string | null
          phone: string | null
          bio: string | null
          scraping_method: string | null
          confidence_score: number | null
          contact_priority: number | null
          recruiting_coordinator: boolean | null
          firecrawl_confidence: number | null
          scraping_source: string | null
          last_verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          ncaa_school_id?: number | null
          school_id?: number | null
          name: string
          title?: string | null
          sport?: string | null
          sport_category?: string | null
          email?: string | null
          phone?: string | null
          bio?: string | null
          scraping_method?: string | null
          confidence_score?: number | null
          contact_priority?: number | null
          recruiting_coordinator?: boolean | null
          firecrawl_confidence?: number | null
          scraping_source?: string | null
          last_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          ncaa_school_id?: number | null
          school_id?: number | null
          name?: string
          title?: string | null
          sport?: string | null
          sport_category?: string | null
          email?: string | null
          phone?: string | null
          bio?: string | null
          scraping_method?: string | null
          confidence_score?: number | null
          contact_priority?: number | null
          recruiting_coordinator?: boolean | null
          firecrawl_confidence?: number | null
          scraping_source?: string | null
          last_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athletic_staff_ncaa_school_id_fkey"
            columns: ["ncaa_school_id"]
            isOneToOne: false
            referencedRelation: "schools_ncaa_verified"
            referencedColumns: ["id"]
          }
        ]
      }
      school_visual_identity: {
        Row: {
          id: number
          school_id: number
          primary_color: string | null
          secondary_color: string | null
          primary_hex: string | null
          secondary_hex: string | null
          additional_colors: unknown | null
          logo_url: string | null
          logo_svg: string | null
          mascot_name: string | null
          mascot_image_url: string | null
          color_source: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          school_id: number
          primary_color?: string | null
          secondary_color?: string | null
          primary_hex?: string | null
          secondary_hex?: string | null
          additional_colors?: unknown | null
          logo_url?: string | null
          logo_svg?: string | null
          mascot_name?: string | null
          mascot_image_url?: string | null
          color_source?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          school_id?: number
          primary_color?: string | null
          secondary_color?: string | null
          primary_hex?: string | null
          secondary_hex?: string | null
          additional_colors?: unknown | null
          logo_url?: string | null
          logo_svg?: string | null
          mascot_name?: string | null
          mascot_image_url?: string | null
          color_source?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_visual_identity_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools_ncaa_verified"
            referencedColumns: ["id"]
          }
        ]
      }
      firecrawl_scraping_log: {
        Row: {
          id: number
          school_id: number
          target_url: string
          scraping_method: string
          success: boolean
          staff_found_count: number | null
          coaches_identified_count: number | null
          error_message: string | null
          retry_count: number | null
          processing_time_ms: number | null
          firecrawl_confidence: number | null
          attempted_at: string
          completed_at: string | null
        }
        Insert: {
          school_id: number
          target_url: string
          scraping_method: string
          success: boolean
          staff_found_count?: number | null
          coaches_identified_count?: number | null
          error_message?: string | null
          retry_count?: number | null
          processing_time_ms?: number | null
          firecrawl_confidence?: number | null
          attempted_at?: string
          completed_at?: string | null
        }
        Update: {
          school_id?: number
          target_url?: string
          scraping_method?: string
          success?: boolean
          staff_found_count?: number | null
          coaches_identified_count?: number | null
          error_message?: string | null
          retry_count?: number | null
          processing_time_ms?: number | null
          firecrawl_confidence?: number | null
          attempted_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firecrawl_scraping_log_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_ncaa_verified"
            referencedColumns: ["id"]
          }
        ]
      }
      scraping_runs: {
        Row: {
          id: number
          method: string
          schools_processed: number | null
          coaches_extracted: number | null
          success_rate: number | null
          average_scraping_time: number | null
          errors: unknown | null
          started_at: string
          completed_at: string | null
        }
        Insert: {
          method: string
          schools_processed?: number | null
          coaches_extracted?: number | null
          success_rate?: number | null
          average_scraping_time?: number | null
          errors?: unknown | null
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          method?: string
          schools_processed?: number | null
          coaches_extracted?: number | null
          success_rate?: number | null
          average_scraping_time?: number | null
          errors?: unknown | null
          started_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          id: number
          key_name: string
          key_hash: string
          permissions: unknown | null
          rate_limit_per_hour: number | null
          created_at: string
          last_used_at: string | null
          is_active: boolean | null
        }
        Insert: {
          key_name: string
          key_hash: string
          permissions?: unknown | null
          rate_limit_per_hour?: number | null
          created_at?: string
          last_used_at?: string | null
          is_active?: boolean | null
        }
        Update: {
          key_name?: string
          key_hash?: string
          permissions?: unknown | null
          rate_limit_per_hour?: number | null
          created_at?: string
          last_used_at?: string | null
          is_active?: boolean | null
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