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
      game_history: {
        Row: {
          bet_amount: number
          client_seed: string | null
          created_at: string
          game: Database["public"]["Enums"]["game_type"]
          id: string
          metadata: Json | null
          multiplier: number
          nonce: number | null
          payout: number
          server_seed_hash: string | null
          user_id: string
          won: boolean
        }
        Insert: {
          bet_amount: number
          client_seed?: string | null
          created_at?: string
          game: Database["public"]["Enums"]["game_type"]
          id?: string
          metadata?: Json | null
          multiplier?: number
          nonce?: number | null
          payout?: number
          server_seed_hash?: string | null
          user_id: string
          won?: boolean
        }
        Update: {
          bet_amount?: number
          client_seed?: string | null
          created_at?: string
          game?: Database["public"]["Enums"]["game_type"]
          id?: string
          metadata?: Json | null
          multiplier?: number
          nonce?: number | null
          payout?: number
          server_seed_hash?: string | null
          user_id?: string
          won?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          first_name: string
          gender: string | null
          id: string
          is_banned: boolean
          language: Database["public"]["Enums"]["lang_preference"]
          last_name: string
          national_id: string | null
          phone: string | null
          referred_by: string | null
          theme: Database["public"]["Enums"]["theme_preference"]
          trx_deposit_address: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          first_name?: string
          gender?: string | null
          id?: string
          is_banned?: boolean
          language?: Database["public"]["Enums"]["lang_preference"]
          last_name?: string
          national_id?: string | null
          phone?: string | null
          referred_by?: string | null
          theme?: Database["public"]["Enums"]["theme_preference"]
          trx_deposit_address: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          first_name?: string
          gender?: string | null
          id?: string
          is_banned?: boolean
          language?: Database["public"]["Enums"]["lang_preference"]
          last_name?: string
          national_id?: string | null
          phone?: string | null
          referred_by?: string | null
          theme?: Database["public"]["Enums"]["theme_preference"]
          trx_deposit_address?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      support_chats: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          crypto: Database["public"]["Enums"]["crypto_currency"]
          destination_address: string | null
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          tx_hash: string | null
          txid: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          crypto?: Database["public"]["Enums"]["crypto_currency"]
          destination_address?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          tx_hash?: string | null
          txid?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          crypto?: Database["public"]["Enums"]["crypto_currency"]
          destination_address?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          tx_hash?: string | null
          txid?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      live_bets_feed: {
        Row: {
          bet_amount: number | null
          created_at: string | null
          game: Database["public"]["Enums"]["game_type"] | null
          id: string | null
          multiplier: number | null
          payout: number | null
          won: boolean | null
        }
        Insert: {
          bet_amount?: number | null
          created_at?: string | null
          game?: Database["public"]["Enums"]["game_type"] | null
          id?: string | null
          multiplier?: number | null
          payout?: number | null
          won?: boolean | null
        }
        Update: {
          bet_amount?: number | null
          created_at?: string | null
          game?: Database["public"]["Enums"]["game_type"] | null
          id?: string | null
          multiplier?: number | null
          payout?: number | null
          won?: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_user_stats: {
        Args: { _user_id: string }
        Returns: {
          biggest_win: number
          total_deposits: number
          total_wagered: number
          total_withdrawals: number
          total_won: number
        }[]
      }
      email_for_username: { Args: { _username: string }; Returns: string }
      get_live_bets_feed: {
        Args: never
        Returns: {
          bet_amount: number
          created_at: string
          game: Database["public"]["Enums"]["game_type"]
          id: string
          multiplier: number
          payout: number
          won: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      promote_user_to_admin: { Args: { _email: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
      crypto_currency: "TRX" | "USDT" | "BTC" | "ETH" | "BNB"
      game_type:
        | "cakplain"
        | "minescak"
        | "blackcak"
        | "plincocak"
        | "limbocak"
        | "rokketcak"
        | "ballooncak"
      lang_preference: "tr" | "en"
      theme_preference: "lacivert" | "siyah" | "mavi" | "su_yesili"
      transaction_status: "pending" | "completed" | "failed" | "cancelled"
      transaction_type: "deposit" | "withdrawal" | "bet" | "win"
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
      app_role: ["admin", "user"],
      crypto_currency: ["TRX", "USDT", "BTC", "ETH", "BNB"],
      game_type: [
        "cakplain",
        "minescak",
        "blackcak",
        "plincocak",
        "limbocak",
        "rokketcak",
        "ballooncak",
      ],
      lang_preference: ["tr", "en"],
      theme_preference: ["lacivert", "siyah", "mavi", "su_yesili"],
      transaction_status: ["pending", "completed", "failed", "cancelled"],
      transaction_type: ["deposit", "withdrawal", "bet", "win"],
    },
  },
} as const
