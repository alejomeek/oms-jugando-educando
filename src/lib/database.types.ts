/**
 * Tipos generados para Supabase Database
 *
 * Para regenerar estos tipos, ejecuta:
 * npx supabase gen types typescript --project-id <project-id> > src/lib/database.types.ts
 */

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
      orders: {
        Row: {
          id: string
          order_id: string
          channel: string
          pack_id: string | null
          shipping_id: string | null
          status: string
          order_date: string
          closed_date: string | null
          created_at: string
          updated_at: string
          total_amount: number
          paid_amount: number | null
          currency: string
          customer: Json
          shipping_address: Json | null
          items: Json
          payment_info: Json | null
          tags: string[] | null
          notes: string | null
          halcon_serial: number | null
        }
        Insert: {
          id?: string
          order_id: string
          channel: string
          pack_id?: string | null
          shipping_id?: string | null
          status?: string
          order_date: string
          closed_date?: string | null
          created_at?: string
          updated_at?: string
          total_amount: number
          paid_amount?: number | null
          currency?: string
          customer: Json
          shipping_address?: Json | null
          items: Json
          payment_info?: Json | null
          tags?: string[] | null
          notes?: string | null
          halcon_serial?: number | null
        }
        Update: {
          id?: string
          order_id?: string
          channel?: string
          pack_id?: string | null
          shipping_id?: string | null
          status?: string
          order_date?: string
          closed_date?: string | null
          created_at?: string
          updated_at?: string
          total_amount?: number
          paid_amount?: number | null
          currency?: string
          customer?: Json
          shipping_address?: Json | null
          items?: Json
          payment_info?: Json | null
          tags?: string[] | null
          notes?: string | null
          halcon_serial?: number | null
        }
      }
      order_status_history: {
        Row: {
          id: string
          order_id: string
          old_status: string | null
          new_status: string
          changed_by: string | null
          changed_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          order_id: string
          old_status?: string | null
          new_status: string
          changed_by?: string | null
          changed_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          old_status?: string | null
          new_status?: string
          changed_by?: string | null
          changed_at?: string
          notes?: string | null
        }
      }
    }
  }
}
