// Hand-rolled Supabase schema types — replace with `supabase gen types
// typescript --project-id <id>` output once you have the CLI hooked up.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type IntakeRow = {
  id: string;
  created_at: string;
  updated_at: string;
  kind: "j1f1" | "asylum";
  reference: string;
  client_user_id: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  locale: string;
  answers: Json;
  schedule_mode: "appointment" | "callback" | null;
  appointment_at: string | null;
  appointment_channel: "office" | "video" | null;
  callback_window: string | null;
  callback_note: string | null;
  payment_method: "card" | "zelle" | "cash" | null;
  payment_status: "pending" | "paid" | "awaiting" | "failed" | "refunded";
  amount_cents: number | null;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  paid_at: string | null;
  attorney_notes: string | null;
};

export type IntakeInsert = Partial<Omit<IntakeRow, "id" | "created_at" | "updated_at">> & {
  kind: "j1f1" | "asylum";
  reference: string;
};

export type IntakeUpdate = Partial<IntakeRow>;

export type IntakeDocumentRow = {
  id: string;
  created_at: string;
  intake_id: string;
  doc_id: string;
  storage_path: string;
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
};

export type IntakeDocumentInsert = Omit<IntakeDocumentRow, "id" | "created_at">;

export type IntakeMessageRow = {
  id: string;
  created_at: string;
  intake_id: string;
  direction: "in" | "out";
  subject: string | null;
  body: string;
  read_at: string | null;
};

export type IntakeMessageInsert = Omit<IntakeMessageRow, "id" | "created_at">;

export type Database = {
  public: {
    Tables: {
      intakes: { Row: IntakeRow; Insert: IntakeInsert; Update: IntakeUpdate; Relationships: [] };
      intake_documents: { Row: IntakeDocumentRow; Insert: IntakeDocumentInsert; Update: Partial<IntakeDocumentRow>; Relationships: [] };
      intake_messages: { Row: IntakeMessageRow; Insert: IntakeMessageInsert; Update: Partial<IntakeMessageRow>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
