export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<
        { id: string; role: "agent" | "owner"; display_name: string },
        { id: string; role: "agent" | "owner"; display_name: string }
      >;
      properties: Table<
        {
          id: string;
          created_by: string;
          title: string;
          property_type: string;
          description: string;
          location: string;
          monthly_rent: number;
          bedrooms: number;
          available_rooms: number;
          status: "draft" | "active" | "rented";
          created_at: string;
        },
        {
          id?: string;
          created_by: string;
          title: string;
          property_type: string;
          description: string;
          location: string;
          monthly_rent: number;
          bedrooms: number;
          available_rooms: number;
          status?: "draft" | "active" | "rented";
          created_at?: string;
        }
      >;
      property_images: Table<
        {
          id: string;
          property_id: string;
          storage_path: string;
          caption: string;
          sort_order: number;
        },
        {
          id?: string;
          property_id: string;
          storage_path: string;
          caption: string;
          sort_order: number;
        }
      >;
      conversations: Table<
        {
          id: string;
          phone_number: string;
          selected_location: string | null;
          state: Json;
          last_message_at: string;
        },
        {
          id?: string;
          phone_number: string;
          selected_location?: string | null;
          state?: Json;
          last_message_at?: string;
        }
      >;
      messages: Table<
        {
          id: string;
          conversation_id: string;
          direction: "inbound" | "outbound";
          body: string;
          provider_message_id: string | null;
          media_url: string | null;
          created_at: string;
        },
        {
          id?: string;
          conversation_id: string;
          direction: "inbound" | "outbound";
          body: string;
          provider_message_id?: string | null;
          media_url?: string | null;
          created_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
