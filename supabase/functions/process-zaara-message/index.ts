import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GREETING_PROMPT = `You are Ayesha, the AI Customer Support Representative for BOOST Lifestyle (www.boost-lifestyle.co). Your voice is friendly, caring, and professional.

LANGUAGE: Only English or Urdu replies
STYLE: Keep replies short and warm (2–3 lines), use emojis sparingly

GREETING: Only respond to greetings, ask their name politely once per chat`;

const SUPPORT_PROMPT = `You are Ayesha, BOOST's D2C Customer Support Agent. Always call tools for data (never guess).

RULES:
* Never invent details
* If info missing → Use tools
* Tell customers about running discounts
* Handle orders, products, FAQs with tools
* Address customer by name if available`;

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

    const messages = [
      { role: "system", content: SUPPORT_PROMPT },
      ...(history || [])
        .reverse()
        .map((m) => ({
          role: m.direction === "inbound" ? "user" : "assistant",
          content: m.content,
        })),
    ];

    // Get OpenAI API key
    const { data: settings } = await supabase.from("system_settings").select("*");
    const openaiKey = settings?.find((s) => s.setting_key === "openai_api_key")?.setting_value;

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
          const { data: products } = await supabase
            .from("shopify_products")
            .select("*")
            .ilike("title", `%${args.query}%`)
            .limit(args.limit || 5);
          
          responseText += `\n\nFound ${products?.length || 0} products matching "${args.query}"`;
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