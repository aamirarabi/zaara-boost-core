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

// Keyword mapping for common variations
const KEYWORD_MAPPING: Record<string, string> = {
  "headphones": "headset",
  "headphone": "headset",
  "earphones": "headset",
  "earphone": "headset",
  "earbuds": "headset",
};

// Helper function to improve search query
function improveSearchQuery(userQuery: string): string {
  const queryLower = userQuery.toLowerCase().trim();
  
  // Check keyword mapping first
  for (const [key, value] of Object.entries(KEYWORD_MAPPING)) {
    if (queryLower.includes(key)) {
      console.log(`🔄 Keyword mapping: "${userQuery}" → "${value}"`);
      return value;
    }
  }
  
  return userQuery;
}

// Send WhatsApp image
async function sendWhatsAppImage(phone_number: string, imageUrl: string, caption: string) {
  const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    console.error("WhatsApp credentials not configured");
    return;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone_number,
          type: "image",
          image: {
            link: imageUrl,
            caption: caption
          }
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to send WhatsApp image:", error);
    } else {
      console.log("✅ WhatsApp image sent successfully");
    }
  } catch (error) {
    console.error("Error sending WhatsApp image:", error);
  }
}

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

    // Check if message is a number (product selection)
    const messageNum = parseInt(message.trim());
    if (!isNaN(messageNum) && messageNum > 0) {
      console.log(`🔢 Number detected: ${messageNum}`);
      
      // Get conversation context to retrieve last product list
      const { data: context } = await supabase
        .from("conversation_context")
        .select("last_product_list")
        .eq("phone_number", phone_number)
        .single();
      
      const productList = context?.last_product_list || [];
      
      if (productList.length > 0 && messageNum <= productList.length) {
        const selectedProduct = productList[messageNum - 1];
        console.log(`✅ Product #${messageNum} selected:`, selectedProduct.title);
        
        // Get full product details
        const { data: product } = await supabase
          .from("shopify_products")
          .select("*")
          .eq("product_id", selectedProduct.product_id)
          .single();
        
        if (product) {
          // Build detailed response
          let detailsText = `📦 ${product.title}\n\n`;
          detailsText += `💰 Price: PKR ${product.price?.toLocaleString()}\n\n`;
          
          if (product.description) {
            detailsText += `${product.description.substring(0, 300)}...\n\n`;
          }
          
          // Parse variants for colors/sizes
          const variants = JSON.parse(product.variants || "[]");
          if (variants.length > 0) {
            const colors = [...new Set(variants.filter((v: any) => v.option1).map((v: any) => v.option1))];
            if (colors.length > 0) {
              detailsText += `🎨 Colors: ${colors.join(", ")}\n\n`;
            }
          }
          
          const stockStatus = product.inventory && product.inventory > 0 ? "✅ In Stock" : "❌ Out of Stock";
          detailsText += `${stockStatus}\n\n`;
          detailsText += `Need more info? Just ask! 😊`;
          
          // Send product image if available
          const images = JSON.parse(product.images || "[]");
          if (images.length > 0) {
            await sendWhatsAppImage(phone_number, images[0], product.title);
          }
          
          // Send details text
          await supabase.functions.invoke("send-whatsapp-message", {
            body: { phone_number, message: detailsText },
          });
          
          return new Response(JSON.stringify({ success: true, response: detailsText }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Get last 10 messages for context
    const { data: history } = await supabase
      .from("chat_history")
      .select("*")
      .eq("phone_number", phone_number)
      .order("created_at", { ascending: false })
      .limit(10);

    // Get settings (custom prompt)
    const { data: settings } = await supabase.from("system_settings").select("*");
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
      { role: "user", content: message }, // Add current user message
    ];

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Lovable AI Gateway with tools
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools: TOOLS,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("❌ AI API error:", aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: "AI API error", details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await aiResponse.json();
    console.log("AI Response:", JSON.stringify(aiResult, null, 2));
    
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
          // Clean search term
          const originalQuery = args.query.trim();

          console.log(`🔍 Original query: "${originalQuery}"`);

          // Apply keyword mapping
          const improvedQuery = improveSearchQuery(originalQuery);
          const searchTerm = improvedQuery.toLowerCase();

          console.log(`🔍 Searching for: "${searchTerm}"`);

          // Search products in database - case-insensitive search across title, description, and tags
          const { data: products, error: searchError } = await supabase
            .from("shopify_products")
            .select("*")
            .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`)
            .gt("inventory", 0) // Only in-stock products
            .order("price", { ascending: true }) // Sort by price: cheapest first
            .limit(10);

          if (searchError) {
            console.error("❌ Product search error:", searchError);
            responseText += `\n\nI'm having trouble searching products right now. Please try again! 😊`;
          } else if (products && products.length > 0) {
            console.log(`✅ Found ${products.length} products`);

            // Store product list in conversation context for number selection
            await supabase
              .from("conversation_context")
              .upsert({
                phone_number,
                last_product_list: products.map(p => ({ product_id: p.product_id, title: p.title })),
                updated_at: new Date().toISOString()
              });

            // Show ALL products found (no limit on display)
            responseText += `\n\nI found these products for you:\n\n`;

            products.forEach((product, index) => {
              responseText += `${index + 1}. ${product.title}\n`;
              responseText += `   💰 PKR ${product.price?.toLocaleString()}\n`;
              responseText += `   ✅ In Stock\n\n`;
            });

            responseText += `Reply with the number to see details! 😊`;
          } else {
            console.log(`⚠️ No products found for: "${searchTerm}"`);
            responseText += `\n\nI couldn't find exact matches for "${args.query}".\n\n`;
            responseText += `Let me show you our popular categories:\n`;
            responseText += `🎮 Gaming Chairs\n`;
            responseText += `🎧 Headsets & Headphones\n`;
            responseText += `🖥️ Gaming Monitors\n`;
            responseText += `⌨️ Keyboards & Mice\n`;
            responseText += `🖱️ Gaming Accessories\n\n`;
            responseText += `Which category would you like to explore?`;
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
          const { data: faqs, error: faqError } = await supabase
            .rpc("search_faqs", { search_term: args.query, result_limit: 3 });
          
          console.log("FAQ Search Results:", faqs);
          
          if (faqs && faqs.length > 0) {
            // Include question and answer for context
            responseText += `\n\n${faqs[0].question}\n\n${faqs[0].answer}`;
          } else {
            responseText += "\n\nI couldn't find specific information about that. Please contact our support team at +92 303 8981133 for detailed assistance.";
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