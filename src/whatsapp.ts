import type { WhatsAppClient } from "./types.js";

interface WhatsAppApiResponse {
  messages?: Array<{ id?: string }>;
  error?: { message?: string };
}

export class MetaWhatsAppClient implements WhatsAppClient {
  private readonly endpoint: string;

  constructor(
    private readonly accessToken: string,
    phoneNumberId: string,
    graphApiVersion: string,
    private readonly fetcher: typeof fetch = fetch
  ) {
    this.endpoint = `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`;
  }

  async sendText(to: string, body: string): Promise<string> {
    return this.send(to, { type: "text", text: { body, preview_url: false } });
  }

  async sendImage(to: string, url: string, caption: string): Promise<string> {
    return this.send(to, { type: "image", image: { link: url, caption } });
  }

  private async send(to: string, content: Record<string, unknown>): Promise<string> {
    const response = await this.fetcher(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        ...content
      })
    });

    const result = (await response.json()) as WhatsAppApiResponse;
    if (!response.ok) {
      throw new Error(
        `WhatsApp API request failed (${response.status}): ${result.error?.message ?? "unknown error"}`
      );
    }

    const messageId = result.messages?.[0]?.id;
    if (!messageId) {
      throw new Error("WhatsApp API response did not include a message ID");
    }
    return messageId;
  }
}
