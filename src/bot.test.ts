import { describe, expect, it, vi } from "vitest";
import { formatListing, RentalBot } from "./bot.js";
import type { Conversation, Listing, RentalRepository, WhatsAppClient } from "./types.js";

const listing: Listing = {
  id: "property-1",
  title: "Sunny room",
  property_type: "Room",
  description: "Near transport",
  location: "Tembisa",
  monthly_rent: 2500,
  bedrooms: 4,
  available_rooms: 2,
  images: [
    {
      storage_path: "property-1/front.jpg",
      caption: "Front view",
      sort_order: 0,
      signed_url: "https://example.test/front.jpg"
    }
  ]
};

function setup() {
  const conversation: Conversation = {
    id: "conversation-1",
    phone_number: "27820000000",
    selected_location: null,
    state: {}
  };
  const repository: RentalRepository = {
    getOrCreateConversation: vi.fn(async () => conversation),
    setConversationLocation: vi.fn(async () => undefined),
    saveInboundMessage: vi.fn(async () => true),
    searchActiveListings: vi.fn(async () => [listing]),
    saveOutboundMessage: vi.fn(async () => undefined)
  };
  const whatsapp: WhatsAppClient = {
    sendText: vi.fn(async () => "wamid.text"),
    sendImage: vi.fn(async () => "wamid.image")
  };
  return { bot: new RentalBot(repository, whatsapp), repository, whatsapp };
}

describe("RentalBot", () => {
  it("greets and asks for a location before searching", async () => {
    const { bot, repository, whatsapp } = setup();
    await bot.handle({
      from: "27820000000",
      id: "wamid.inbound",
      timestamp: "0",
      type: "text",
      text: { body: "Hi" }
    });

    expect(repository.searchActiveListings).not.toHaveBeenCalled();
    expect(repository.setConversationLocation).toHaveBeenCalledWith("conversation-1", null);
    expect(whatsapp.sendText).toHaveBeenCalledWith(
      "27820000000",
      expect.stringContaining("please send the location")
    );
  });

  it("searches the supplied location and replies with rental details and a photo", async () => {
    const { bot, repository, whatsapp } = setup();
    await bot.handle({
      from: "27820000000",
      id: "wamid.inbound",
      timestamp: "0",
      type: "text",
      text: { body: "Tembisa" }
    });

    expect(repository.searchActiveListings).toHaveBeenCalledWith("Tembisa");
    expect(whatsapp.sendImage).toHaveBeenCalledWith(
      "27820000000",
      "https://example.test/front.jpg",
      expect.stringMatching(/R2[\s\u00a0]500 per month/)
    );
    expect(repository.saveOutboundMessage).toHaveBeenCalledWith(
      "conversation-1",
      expect.stringContaining("2 rooms available of 4 total"),
      "wamid.image",
      "https://example.test/front.jpg"
    );
  });

  it("formats core listing details", () => {
    expect(formatListing(listing)).toContain("Near transport");
    expect(formatListing(listing)).toContain("Room in Tembisa");
    expect(formatListing(listing)).toContain(
      "https://aluwani99.github.io/kasi-rentals-dashboard/?property=property-1"
    );
  });

  it("does not reply again to a duplicate inbound message", async () => {
    const { bot, repository, whatsapp } = setup();
    vi.mocked(repository.saveInboundMessage).mockResolvedValue(false);

    await bot.handle({
      from: "27820000000",
      id: "wamid.duplicate",
      timestamp: "0",
      type: "text",
      text: { body: "Tembisa" }
    });

    expect(repository.searchActiveListings).not.toHaveBeenCalled();
    expect(whatsapp.sendText).not.toHaveBeenCalled();
    expect(whatsapp.sendImage).not.toHaveBeenCalled();
  });

  it("explains when there are no rentals in the chosen location", async () => {
    const { bot, repository, whatsapp } = setup();
    vi.mocked(repository.searchActiveListings).mockResolvedValue([]);

    await bot.handle({
      from: "27820000000",
      id: "wamid.missing-location",
      timestamp: "0",
      type: "text",
      text: { body: "Soweto" }
    });

    expect(whatsapp.sendText).toHaveBeenLastCalledWith(
      "27820000000",
      expect.stringContaining("couldn't find active rentals in Soweto")
    );
    expect(whatsapp.sendImage).not.toHaveBeenCalled();
  });
});
