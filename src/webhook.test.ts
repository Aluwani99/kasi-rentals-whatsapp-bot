import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createWebhookApp, isValidMetaSignature } from "./webhook.js";
import type { RentalBot } from "./bot.js";

const appSecret = "test-app-secret";

function signedBody(body: string): string {
  return `sha256=${createHmac("sha256", appSecret).update(body).digest("hex")}`;
}

describe("Meta webhook security", () => {
  it("accepts only a valid SHA-256 signature", () => {
    const body = Buffer.from('{"entry":[]}');
    expect(isValidMetaSignature(body, signedBody(body.toString()), appSecret)).toBe(true);
    expect(isValidMetaSignature(body, "sha256=invalid", appSecret)).toBe(false);
    expect(isValidMetaSignature(body, undefined, appSecret)).toBe(false);
  });

  it("verifies Meta's GET challenge and rejects an incorrect token", async () => {
    const bot = { handle: vi.fn() } as unknown as RentalBot;
    const server = createWebhookApp(bot, "verify-secret", appSecret).listen(0);
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Test server did not bind a port");
      const baseUrl = `http://127.0.0.1:${address.port}/webhook`;
      const verified = await fetch(
        `${baseUrl}?hub.mode=subscribe&hub.verify_token=verify-secret&hub.challenge=12345`
      );
      expect(verified.status).toBe(200);
      expect(await verified.text()).toBe("12345");

      const rejected = await fetch(
        `${baseUrl}?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345`
      );
      expect(rejected.status).toBe(403);
    } finally {
      server.close();
    }
  });

  it("rejects unsigned POST requests before processing them", async () => {
    const bot = { handle: vi.fn() } as unknown as RentalBot;
    const server = createWebhookApp(bot, "verify-secret", appSecret).listen(0);
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Test server did not bind a port");
      const response = await fetch(`http://127.0.0.1:${address.port}/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry: [] })
      });
      expect(response.status).toBe(401);
      expect(bot.handle).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });
});
