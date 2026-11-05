import "dotenv/config";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  storageBucket: process.env.SUPABASE_STORAGE_BUCKET?.trim() || "property-images",
  metaVerifyToken: required("META_VERIFY_TOKEN"),
  metaAppSecret: required("META_APP_SECRET"),
  whatsappAccessToken: required("WHATSAPP_ACCESS_TOKEN"),
  whatsappPhoneNumberId: required("WHATSAPP_PHONE_NUMBER_ID"),
  graphApiVersion: process.env.META_GRAPH_API_VERSION?.trim() || "v22.0"
};
