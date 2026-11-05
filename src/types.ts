export interface WhatsAppTextMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body?: string };
  image?: { id: string; caption?: string };
}

export interface WhatsAppWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: WhatsAppTextMessage[];
      };
    }>;
  }>;
}

export interface PropertyImage {
  storage_path: string;
  caption: string;
  sort_order: number;
  signed_url?: string;
}

export interface Listing {
  id: string;
  title: string;
  property_type: string;
  description: string;
  location: string;
  monthly_rent: number;
  bedrooms: number;
  available_rooms: number;
  images: PropertyImage[];
}

export interface Conversation {
  id: string;
  phone_number: string;
  selected_location: string | null;
  state: unknown;
}

export interface RentalRepository {
  getOrCreateConversation(phoneNumber: string): Promise<Conversation>;
  setConversationLocation(conversationId: string, location: string | null): Promise<void>;
  saveInboundMessage(
    conversationId: string,
    body: string,
    providerMessageId: string,
    mediaUrl?: string | null
  ): Promise<boolean>;
  searchActiveListings(location: string): Promise<Listing[]>;
  saveOutboundMessage(
    conversationId: string,
    body: string,
    providerMessageId: string,
    mediaUrl?: string | null
  ): Promise<void>;
}

export interface WhatsAppClient {
  sendText(to: string, body: string): Promise<string>;
  sendImage(to: string, url: string, caption: string): Promise<string>;
}
