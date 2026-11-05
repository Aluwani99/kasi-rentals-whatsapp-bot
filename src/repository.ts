import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";
import type { Conversation, Listing, RentalRepository } from "./types.js";

type ListingRow = Pick<
  Database["public"]["Tables"]["properties"]["Row"],
  | "id"
  | "title"
  | "property_type"
  | "description"
  | "location"
  | "monthly_rent"
  | "bedrooms"
  | "available_rooms"
>;
type PropertyImageRow = Pick<
  Database["public"]["Tables"]["property_images"]["Row"],
  "property_id" | "storage_path" | "caption" | "sort_order"
>;

export class SupabaseRentalRepository implements RentalRepository {
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly storageBucket: string
  ) {}

  static create(url: string, serviceRoleKey: string, storageBucket: string): SupabaseRentalRepository {
    const client = createClient<Database>(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    return new SupabaseRentalRepository(client, storageBucket);
  }

  async getOrCreateConversation(phoneNumber: string): Promise<Conversation> {
    const { data: existing, error: existingError } = await this.client
      .from("conversations")
      .select("id, phone_number, selected_location, state")
      .eq("phone_number", phoneNumber)
      .maybeSingle();

    if (existingError) throw new Error(`Could not load conversation: ${existingError.message}`);
    if (existing) return existing;

    const { data, error } = await this.client
      .from("conversations")
      .insert({
        phone_number: phoneNumber,
        selected_location: null,
        state: { stage: "awaiting_location" },
        last_message_at: new Date().toISOString()
      })
      .select("id, phone_number, selected_location, state")
      .single();

    if (error?.code === "23505") {
      const { data: concurrent, error: retryError } = await this.client
        .from("conversations")
        .select("id, phone_number, selected_location, state")
        .eq("phone_number", phoneNumber)
        .single();
      if (retryError) throw new Error(`Could not load conversation: ${retryError.message}`);
      return concurrent;
    }
    if (error) throw new Error(`Could not load conversation: ${error.message}`);
    return data;
  }

  async setConversationLocation(conversationId: string, location: string | null): Promise<void> {
    const { error } = await this.client
      .from("conversations")
      .update({
        selected_location: location,
        state: { stage: location ? "browsing" : "awaiting_location" },
        last_message_at: new Date().toISOString()
      })
      .eq("id", conversationId);

    if (error) throw new Error(`Could not update conversation: ${error.message}`);
  }

  async saveInboundMessage(
    conversationId: string,
    body: string,
    providerMessageId: string,
    mediaUrl: string | null = null
  ): Promise<boolean> {
    const { error } = await this.client.from("messages").insert({
      conversation_id: conversationId,
      direction: "inbound",
      body,
      provider_message_id: providerMessageId,
      media_url: mediaUrl
    });

    if (error?.code === "23505") return false;
    if (error) throw new Error(`Could not save inbound message: ${error.message}`);
    return true;
  }

  async searchActiveListings(location: string): Promise<Listing[]> {
    const escapedLocation = location.replace(/[\\%_]/g, "\\$&");
    const { data: properties, error: propertyError } = await this.client
      .from("properties")
      .select(
        "id, title, property_type, description, location, monthly_rent, bedrooms, available_rooms"
      )
      .eq("status", "active")
      .gt("available_rooms", 0)
      .ilike("location", `%${escapedLocation}%`)
      .order("created_at", { ascending: false })
      .limit(5);

    if (propertyError) throw new Error(`Could not search rentals: ${propertyError.message}`);
    if (properties.length === 0) return [];

    const propertyIds = properties.map((property) => property.id);
    const { data: images, error: imageError } = await this.client
      .from("property_images")
      .select("property_id, storage_path, caption, sort_order")
      .in("property_id", propertyIds)
      .order("sort_order", { ascending: true });

    if (imageError) throw new Error(`Could not load rental photos: ${imageError.message}`);

    const imagesByProperty = new Map<string, PropertyImageRow[]>();
    for (const image of images) {
      const propertyImages = imagesByProperty.get(image.property_id) ?? [];
      propertyImages.push(image);
      imagesByProperty.set(image.property_id, propertyImages);
    }

    return Promise.all(
      properties.map(async (property: ListingRow): Promise<Listing> => {
        const propertyImages = imagesByProperty.get(property.id) ?? [];
        const signedImages = await Promise.all(
          propertyImages.map(async (image) => {
            const { data, error } = await this.client.storage
              .from(this.storageBucket)
              .createSignedUrl(image.storage_path, 60 * 60);
            if (error) throw new Error(`Could not create photo link: ${error.message}`);
            return { ...image, signed_url: data.signedUrl };
          })
        );

        return { ...property, images: signedImages };
      })
    );
  }

  async saveOutboundMessage(
    conversationId: string,
    body: string,
    providerMessageId: string,
    mediaUrl: string | null = null
  ): Promise<void> {
    const { error } = await this.client.from("messages").insert({
      conversation_id: conversationId,
      direction: "outbound",
      body,
      provider_message_id: providerMessageId,
      media_url: mediaUrl
    });

    if (error) throw new Error(`Could not save outbound message: ${error.message}`);
  }
}
