export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      schools_ncaa_verified: {
        Row: {
          id: number
          name: string
          athletic_website: string | null
          conference: string | null
          athletic_division: string | null
          state: string | null
          city: string | null
          mascot: string | null
          primary_color: string | null
          secondary_color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          athletic_website?: string | null
          conference?: string | null
          athletic_division?: string | null
          state?: string | null
          city?: string | null
          mascot?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          athletic_website?: string | null
          conference?: string | null
          athletic_division?: string | null
          state?: string | null
          city?: string | null
          mascot?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          created_at?: string
          updated_at?: string
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
          sport: string
          email: string | null
          phone: string | null
          bio: string | null
          scraping_method: string
          confidence_score: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          ncaa_school_id?: number | null
          school_id?: number | null
          name: string
          title?: string | null
          sport?: string
          email?: string | null
          phone?: string | null
          bio?: string | null
          scraping_method?: string
          confidence_score?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          ncaa_school_id?: number | null
          school_id?: number | null
          name?: string
          title?: string | null
          sport?: string
          email?: string | null
          phone?: string | null
          bio?: string | null
          scraping_method?: string
          confidence_score?: number
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
      scraping_runs: {
        Row: {
          id: number
          method: string
          schools_processed: number
          coaches_extracted: number
          success_rate: number | null
          average_scraping_time: number | null
          errors: Json | null
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: number
          method: string
          schools_processed?: number
          coaches_extracted?: number
          success_rate?: number | null
          average_scraping_time?: number | null
          errors?: Json | null
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: number
          method?: string
          schools_processed?: number
          coaches_extracted?: number
          success_rate?: number | null
          average_scraping_time?: number | null
          errors?: Json | null
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
          permissions: Json
          rate_limit_per_hour: number
          created_at: string
          last_used_at: string | null
          is_active: boolean
        }
        Insert: {
          id?: number
          key_name: string
          key_hash: string
          permissions?: Json
          rate_limit_per_hour?: number
          created_at?: string
          last_used_at?: string | null
          is_active?: boolean
        }
        Update: {
          id?: number
          key_name?: string
          key_hash?: string
          permissions?: Json
          rate_limit_per_hour?: number
          created_at?: string
          last_used_at?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}