import { createHmac, timingSafeEqual } from "node:crypto";
import express, { type Request, type Response } from "express";
import type { RentalBot } from "./bot.js";
import type { WhatsAppWebhookPayload } from "./types.js";

export function isValidMetaSignature(
  rawBody: Buffer,
  signature: string | undefined,
  appSecret: string
): boolean {
  if (!signature || !/^sha256=[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature);
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export function createWebhookApp(bot: RentalBot, verifyToken: string, appSecret: string) {
  const app = express();

  app.get("/webhook", (request: Request, response: Response) => {
    const mode = request.query["hub.mode"];
    const token = request.query["hub.verify_token"];
    const challenge = request.query["hub.challenge"];

    if (mode === "subscribe" && token === verifyToken && typeof challenge === "string") {
      response.status(200).type("text/plain").send(challenge);
      return;
    }
    response.sendStatus(403);
  });

  app.post(
    "/webhook",
    express.raw({ type: "application/json", limit: "1mb" }),
    async (request: Request, response: Response) => {
      if (!Buffer.isBuffer(request.body)) {
        response.sendStatus(400);
        return;
      }
      const rawBody = request.body as Buffer;
      if (!isValidMetaSignature(rawBody, request.header("x-hub-signature-256"), appSecret)) {
        response.sendStatus(401);
        return;
      }

      let payload: WhatsAppWebhookPayload;
      try {
        payload = JSON.parse(rawBody.toString("utf8")) as WhatsAppWebhookPayload;
      } catch {
        response.sendStatus(400);
        return;
      }

      try {
        const messages =
          payload.entry?.flatMap(
            (entry) => entry.changes?.flatMap((change) => change.value?.messages ?? []) ?? []
          ) ?? [];
        for (const message of messages) {
          await bot.handle(message);
        }
        response.sendStatus(200);
      } catch (error) {
        console.error("WhatsApp webhook processing failed", error);
        response.sendStatus(500);
      }
    }
  );

  return app;
}
