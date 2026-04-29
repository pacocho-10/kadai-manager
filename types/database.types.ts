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
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          subject: string | null
          description: string | null
          deadline: string
          completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          subject?: string | null
          description?: string | null
          deadline: string
          completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          subject?: string | null
          description?: string | null
          deadline?: string
          completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}