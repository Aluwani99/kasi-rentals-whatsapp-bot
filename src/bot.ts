import type {
  Listing,
  RentalRepository,
  WhatsAppClient,
  WhatsAppTextMessage
} from "./types.js";

const LOCATION_PROMPT =
  "Hi! Welcome to Kasi Rentals. To find available rooms or houses, please send the location you want to search (for example, Tembisa or Soweto).";
const RESET_WORDS = new Set(["hi", "hello", "hey", "start", "menu"]);
const MAX_CAPTION_LENGTH = 1024;

export function formatListing(listing: Listing): string {
  const description = listing.description.trim();
  const details = [
    listing.title,
    `${listing.property_type} in ${listing.location}`,
    `Rent: R${listing.monthly_rent.toLocaleString("en-ZA")} per month`,
    `${listing.available_rooms} room${listing.available_rooms === 1 ? "" : "s"} available of ${listing.bedrooms} total`,
    description
  ].filter(Boolean);
  return details.join("\n").slice(0, MAX_CAPTION_LENGTH);
}

export class RentalBot {
  constructor(
    private readonly repository: RentalRepository,
    private readonly whatsapp: WhatsAppClient
  ) {}

  async handle(message: WhatsAppTextMessage): Promise<void> {
    const conversation = await this.repository.getOrCreateConversation(message.from);
    const text = message.text?.body?.trim() ?? "";
    const isImage = message.type === "image";
    const storedBody =
      text || (isImage ? message.image?.caption?.trim() || "[image]" : `[${message.type} message]`);
    const saved = await this.repository.saveInboundMessage(
      conversation.id,
      storedBody,
      message.id
    );
    if (!saved) return;

    const normalized = text.toLocaleLowerCase("en");
    if (!text || RESET_WORDS.has(normalized) || normalized === "change location") {
      await this.repository.setConversationLocation(conversation.id, null);
      await this.sendText(message.from, conversation.id, LOCATION_PROMPT);
      return;
    }

    const location = text.slice(0, 100);
    await this.repository.setConversationLocation(conversation.id, location);
    const listings = await this.repository.searchActiveListings(location);
    if (listings.length === 0) {
      await this.sendText(
        message.from,
        conversation.id,
        `I couldn't find active rentals in ${location}. Send another location to search, or say "hi" to start again.`
      );
      return;
    }

    await this.sendText(
      message.from,
      conversation.id,
      `Here are ${listings.length} available rental${listings.length === 1 ? "" : "s"} in ${location}:`
    );

    for (const listing of listings) {
      const details = formatListing(listing);
      const image = listing.images.find((candidate) => candidate.signed_url);
      if (image?.signed_url) {
        const providerMessageId = await this.whatsapp.sendImage(
          message.from,
          image.signed_url,
          [details, image.caption.trim()].filter(Boolean).join("\n").slice(0, MAX_CAPTION_LENGTH)
        );
        await this.repository.saveOutboundMessage(
          conversation.id,
          details,
          providerMessageId,
          image.signed_url
        );
      } else {
        await this.sendText(message.from, conversation.id, details);
      }

      for (const additionalImage of listing.images.slice(1)) {
        if (!additionalImage.signed_url) continue;
        const providerMessageId = await this.whatsapp.sendImage(
          message.from,
          additionalImage.signed_url,
          additionalImage.caption.trim().slice(0, MAX_CAPTION_LENGTH)
        );
        await this.repository.saveOutboundMessage(
          conversation.id,
          additionalImage.caption,
          providerMessageId,
          additionalImage.signed_url
        );
      }
    }
  }

  private async sendText(to: string, conversationId: string, body: string): Promise<void> {
    const providerMessageId = await this.whatsapp.sendText(to, body);
    await this.repository.saveOutboundMessage(conversationId, body, providerMessageId);
  }
}
