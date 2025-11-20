import { z } from "zod";

// Phone number validation (Pakistani format)
export const phoneNumberSchema = z.string().regex(/^92[0-9]{10}$/, {
  message: "Phone number must be in format 92XXXXXXXXXX",
});

// Message validation
export const messageSchema = z.object({
  phone_number: phoneNumberSchema,
  message: z.string().min(1, "Message cannot be empty").max(1000, "Message too long"),
});

// WhatsApp message validation
export const whatsappMessageSchema = z.object({
  phone_number: phoneNumberSchema,
  message: z.string().min(1).max(4096),
});

// Settings validation
export const apiKeySchema = z.string().min(10, "API key too short").max(500, "API key too long");

export const urlSchema = z.string().url("Invalid URL format");

export const systemSettingsSchema = z.object({
  whatsapp_phone_id: z.string().min(1),
  whatsapp_access_token: apiKeySchema,
  openai_api_key: apiKeySchema.optional(),
  shopify_store_url: urlSchema.optional(),
  shopify_access_token: apiKeySchema.optional(),
});

// FAQ validation
export const faqSchema = z.object({
  question: z.string().min(5, "Question too short").max(500, "Question too long"),
  answer: z.string().min(10, "Answer too short").max(5000, "Answer too long"),
  category: z.string().min(1).max(100),
  keywords: z.array(z.string()).optional(),
  related_products: z.array(z.string()).optional(),
});

// Order sync validation
export const orderDataSchema = z.object({
  order_id: z.string().min(1),
  customer_phone: z.string().optional(),
  customer_email: z.string().email().optional(),
  total_price: z.number().min(0).optional(),
});

// Customer validation
export const customerSchema = z.object({
  phone_number: phoneNumberSchema,
  customer_name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
});
