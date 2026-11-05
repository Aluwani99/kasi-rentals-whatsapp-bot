import { config } from "./config.js";
import { RentalBot } from "./bot.js";
import { SupabaseRentalRepository } from "./repository.js";
import { MetaWhatsAppClient } from "./whatsapp.js";
import { createWebhookApp } from "./webhook.js";

const repository = SupabaseRentalRepository.create(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  config.storageBucket
);
const whatsapp = new MetaWhatsAppClient(
  config.whatsappAccessToken,
  config.whatsappPhoneNumberId,
  config.graphApiVersion
);
const app = createWebhookApp(
  new RentalBot(repository, whatsapp),
  config.metaVerifyToken,
  config.metaAppSecret
);

app.listen(config.port, () => {
  console.log(`Kasi Rentals WhatsApp webhook listening on port ${config.port}`);
});
