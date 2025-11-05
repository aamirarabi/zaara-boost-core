import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_SYSTEM_PROMPT = `## ROLE & PERSONALITY
You are Zaara, the AI Customer Support Representative for BOOST Lifestyle (www.boost-lifestyle.co).
Your voice is friendly, caring, and professional.
Your purpose is to help customers quickly with product info, order tracking, or support.

## LANGUAGE & STYLE
- Only English or Urdu is allowed to reply, even if the question is in another language
- Keep replies short and warm (2-3 lines)
- Use emojis sparingly when they add warmth (🌸 😊 🌟 🚀)
- Sound human-like: kind, clear, confident
- No overly robotic phrases

## GREETING & NAME COLLECTION
• Only respond to greetings, do not greet first
• If the user greets with Salam:
  "Wa Alaikum Salam! 🌸 My name is Zaara, I'm your BOOST support AI assistant (AI can make mistakes 😊). May I know your good name please?"
• If the user greets with Hi/Hello:
  "Hello! 👋 I'm Zaara AI Agent from Boost Lifestyle (AI can make mistakes 😊). May I kindly know your good name please?"
• Ask their name only once per chat
• After name is known, address them politely as Sir/Madam and never ask again
• If they return later in the same chat:
  "Welcome back, [Name] Sir/Madam! How can I assist you today? 🌸"

## CAPABILITIES (share only once per chat, after greeting and name)
"I can help you with:
🛍️ Product details and prices
📦 Order tracking and courier status
🔄 Returns and exchanges
💳 Payments and checkout support
📑 Policies and warranties

Quick notes 🌟:
💰 Pricing: All prices on our website are already discounted - no additional coupon codes available
🚚 Deliveries: Karachi 2 working days, outside Karachi 4-5 working days (counted after dispatch from our warehouse, not from order date)
📝 Images: I work with text messages and can't view images you send, but I'm happy to send you product images and videos!
👥 Human Support: Our team is available Mon-Sat, 11 AM - 7 PM at https://wa.me/923038981133. Need them? Just ask me to connect you! Outside these hours, I'm here for you instantly 🌟

Please tell me what you would like help with! 😊"

## BEHAVIOR RULES
• Understand the user's intent and ask one short clarifying question only if needed
• Do not overpromise or use the word "guarantee"
• Keep responses easy to read on WhatsApp
• Respect context and do not repeat introductions in ongoing conversation
• You cannot read images
• Please do not ask customer name multiple times, just ask when it feels natural

## PRODUCT SEARCH
• When user asks about products, use the search_shop_catalog tool
• Search results will be formatted for you
• Return actual products from database with prices and details
• If no results, suggest similar categories or ask for clarification

## CLOSING
When the customer thanks you or ends the chat politely:
"It was a pleasure assisting you 🌸
Follow us for updates and new arrivals!
👉 https://www.instagram.com/boost_lifestyle?utm_source=Zaara_Ai_Agent&utm_medium=whatsapp"

## B2B / WHOLESALE / BULK ORDER PROTOCOL
If customer asks about wholesale, bulk orders, dealer partnership, business orders, corporate orders, MOQ, B2B terms, volume discounts, or becoming a dealer:

IMMEDIATELY respond with:
"For all wholesale, bulk, and B2B inquiries, please contact our specialized B2B team who will provide you with the best pricing and terms:
📞 Mr. Aman Suleman (Senior B2B BDM): https://wa.me/923017558588
📞 Mr. Irfan Razzak (Senior B2B BDM): https://wa.me/923222213491
They handle all business partnerships, wholesale pricing, and bulk orders directly. They'll be happy to assist you!"

DO NOT provide pricing for bulk orders.
DO NOT discuss MOQ details.
ALWAYS redirect immediately to Aman or Irfan.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_shop_catalog",
      description: "Search Shopify products by keyword or category",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          limit: { type: "integer", description: "Max results", default: 5 },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_product_details",
      description: "Get complete product details",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "Shopify product ID" },
        },
        required: ["product_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "track_customer_order",
      description: "Track order status",
      parameters: {
        type: "object",
        properties: {
          phone_number: { type: "string", description: "Customer phone" },
        },
        required: ["phone_number"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_faqs",
      description: "Search FAQ database",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search term" },
        },
        required: ["query"],
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number, message } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get last 10 messages for context
    const { data: history } = await supabase
      .from("chat_history")
      .select("*")
      .eq("phone_number", phone_number)
      .order("created_at", { ascending: false })
      .limit(10);

    // Get settings (API key and custom prompt)
    const { data: settings } = await supabase.from("system_settings").select("*");
    const openaiKey = settings?.find((s) => s.setting_key === "openai_api_key")?.setting_value;
    const customPrompt = settings?.find((s) => s.setting_key === "zaara_system_prompt")?.setting_value;
    
    const systemPrompt = customPrompt || DEFAULT_SYSTEM_PROMPT;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || [])
        .reverse()
        .map((m) => ({
          role: m.direction === "inbound" ? "user" : "assistant",
          content: m.content,
        })),
    ];

    if (!openaiKey) {
      console.error("OpenAI API key not configured");
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call OpenAI with tools
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        tools: TOOLS,
        temperature: 0.7,
      }),
    });

    const aiResult = await openaiResponse.json();
    const choice = aiResult.choices?.[0];
    let responseText = choice?.message?.content || "I apologize, I'm unable to respond right now.";

    // Handle tool calls if present
    if (choice?.message?.tool_calls) {
      for (const toolCall of choice.message.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        console.log("Tool call:", functionName, args);

        // Execute tool functions
        if (functionName === "search_shop_catalog") {
          // Map common keywords
          let searchQuery = args.query.toLowerCase();
          if (searchQuery.includes("headphone")) {
            searchQuery = searchQuery.replace(/headphone[s]?/gi, "headset");
          }
          
          const { data: products } = await supabase
            .from("shopify_products")
            .select("*")
            .eq("status", "active")
            .or(`title.ilike.%${searchQuery}%,tags::text.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
            .limit(args.limit || 5);
          
          if (products && products.length > 0) {
            responseText += `\n\n🛍️ Found ${products.length} product(s):\n\n`;
            products.forEach((p, i) => {
              responseText += `${i + 1}. ${p.title}\n`;
              responseText += `   💵 PKR ${p.price?.toLocaleString()}\n`;
              responseText += `   📦 Stock: ${p.inventory > 0 ? 'Available' : 'Out of Stock'}\n\n`;
            });
          } else {
            responseText += `\n\nI couldn't find products matching "${args.query}". Could you describe what you're looking for? Or would you like to see our popular categories like gaming chairs, headsets, or keyboards?`;
          }
        } else if (functionName === "get_product_details") {
          const { data: product } = await supabase
            .from("shopify_products")
            .select("*")
            .eq("product_id", args.product_id)
            .single();
          
          if (product) {
            responseText += `\n\n📦 ${product.title}\n💵 PKR ${product.price?.toLocaleString()}`;
          }
        } else if (functionName === "track_customer_order") {
          const { data: orders } = await supabase
            .from("shopify_orders")
            .select("*")
            .eq("customer_phone", args.phone_number)
            .order("created_at", { ascending: false })
            .limit(1);
          
          if (orders && orders.length > 0) {
            const order = orders[0];
            responseText += `\n\n📦 Order #${order.order_number}\n✅ Status: ${order.fulfillment_status}\n🚚 Courier: ${order.courier_name || "TBA"}`;
          }
        } else if (functionName === "search_faqs") {
          const { data: faqs } = await supabase
            .rpc("search_faqs", { search_term: args.query, result_limit: 3 });
          
          if (faqs && faqs.length > 0) {
            responseText += `\n\n${faqs[0].answer}`;
          }
        }
      }
    }

    // Send response via WhatsApp
    console.log("📤 Sending WhatsApp message to:", phone_number);
    console.log("📝 Message content:", responseText);
    
    const { data: sendData, error: sendError } = await supabase.functions.invoke("send-whatsapp-message", {
      body: { phone_number, message: responseText },
    });

    if (sendError) {
      console.error("❌ Failed to send WhatsApp message:", sendError);
      return new Response(JSON.stringify({ error: "Failed to send message", details: sendError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ WhatsApp message sent successfully:", sendData);

    return new Response(JSON.stringify({ success: true, response: responseText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Process Zaara error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});