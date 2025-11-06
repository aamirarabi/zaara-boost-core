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

## FAQ & HELP QUERIES
• FAQs are automatically available through your File Search capability
• Use your knowledge base to answer questions about policies, warranty, shipping, videos
• If you don't find information in your files, guide customers to contact support

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
];

// Keyword mapping for common variations
const KEYWORD_MAPPING: Record<string, string> = {
  // Headsets/Headphones
  "headphones": "headset",
  "headphone": "headset",
  "earphones": "headset",
  "earphone": "headset",
  "earbuds": "headset",
  
  // Gaming Chairs
  "chair": "gaming chair",
  "chairs": "gaming chair",
  "gaming chairs": "gaming chair",
  "gaming chair": "gaming chair",
  
  // Gaming Mouse
  "mouse": "gaming mouse",
  "mice": "gaming mouse",
  "gaming mouse": "gaming mouse",
  
  // Gaming Keyboard
  "keyboard": "gaming keyboard",
  "keyboards": "gaming keyboard",
  "gaming keyboard": "gaming keyboard",
  
  // Gaming Monitor
  "monitor": "gaming monitor",
  "monitors": "gaming monitor",
  "gaming monitor": "gaming monitor",
  "screen": "gaming monitor",
  "display": "gaming monitor",
};

// Helper function to clean HTML for WhatsApp
function cleanHtmlForWhatsApp(html: string): string {
  if (!html) return "";
  
  let clean = html;
  
  // Convert <br> tags to newlines
  clean = clean.replace(/<br\s*\/?>/gi, "\n");
  
  // Convert <strong> to *bold*
  clean = clean.replace(/<strong>(.*?)<\/strong>/gi, "*$1*");
  
  // Convert <li> to bullet points
  clean = clean.replace(/<li>(.*?)<\/li>/gi, "• $1\n");
  
  // Remove all other HTML tags
  clean = clean.replace(/<[^>]+>/g, "");
  
  // Clean up extra whitespace
  clean = clean.replace(/\n\s*\n\s*\n/g, "\n\n"); // Max 2 newlines
  clean = clean.trim();
  
  return clean;
}

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

// Helper function to get customer name from conversation context
async function getCustomerName(supabase: any, phone_number: string): Promise<string | null> {
  const { data } = await supabase
    .from("conversation_context")
    .select("customer_name")
    .eq("phone_number", phone_number)
    .single();
  
  return data?.customer_name || null;
}

// Send WhatsApp image
async function sendWhatsAppImage(phone_number: string, imageUrl: string, caption: string) {
  const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    console.error("❌ WhatsApp credentials not configured");
    throw new Error("WhatsApp credentials missing");
  }

  if (!imageUrl || !imageUrl.startsWith("http")) {
    console.error("❌ Invalid image URL:", imageUrl);
    throw new Error(`Invalid image URL: ${imageUrl}`);
  }

  console.log(`📸 Sending image to ${phone_number}: ${imageUrl}`);

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
      console.error("❌ WhatsApp API error:", response.status, error);
      throw new Error(`WhatsApp API error: ${response.status}`);
    }
    
    const result = await response.json();
    console.log("✅ WhatsApp image sent:", result);
    return true;
  } catch (error) {
    console.error("❌ Error sending image:", error);
    throw error;
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
          // Parse variants for price range and colors
          const variants = JSON.parse(product.variants || "[]");
          
          // Get price range
          let priceText = "";
          if (variants.length > 1) {
            const prices = variants.map((v: any) => parseFloat(v.price)).filter((p: number) => !isNaN(p));
            if (prices.length > 0) {
              const minPrice = Math.min(...prices);
              const maxPrice = Math.max(...prices);
              if (minPrice === maxPrice) {
                priceText = `PKR ${minPrice.toLocaleString()}`;
              } else {
                priceText = `PKR ${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}`;
              }
            }
          } else {
            priceText = `PKR ${product.price?.toLocaleString()}`;
          }
          
          // Get colors
          const colors = [...new Set(variants.filter((v: any) => v.option1).map((v: any) => v.option1))];
          
          // Clean description
          const cleanDescription = cleanHtmlForWhatsApp(product.description || "");
          const features = cleanDescription.split("\n").filter((line: string) => line.trim().startsWith("•")).slice(0, 5);
          
          // Build structured response
          let detailsText = `*${product.title}*\n\n`;
          detailsText += `💰 Price: ${priceText}\n`;
          if (colors.length > 0) {
            detailsText += `🎨 Available Colors: ${colors.join(", ")}\n`;
          }
          detailsText += `✅ Availability: In stock\n\n`;
          
          if (features.length > 0) {
            detailsText += `✨ Key Features:\n${features.join("\n")}\n\n`;
          }
          
          detailsText += `Would you like to order this? 😊`;
          
          // Send product image FIRST
          const images = JSON.parse(product.images || "[]");
          if (images.length > 0) {
            await sendWhatsAppImage(phone_number, images[0], product.title);
          }
          
          // Send details text AFTER image
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

    // Get settings
    const { data: settings } = await supabase.from("system_settings").select("*");
    
    // Get OpenAI API key from settings
    const openaiApiKey = settings?.find((s) => s.setting_key === "openai_api_key")?.setting_value;

    if (!openaiApiKey) {
      console.error("OpenAI API key not configured in settings");
      return new Response(
        JSON.stringify({ 
          error: "AI not configured",
          message: "Please add OpenAI API key in Settings" 
        }), 
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const ASSISTANT_ID = "asst_R7YwCRjq1BYHqGehfR9RtDFo";
    console.log("🤖 Using OpenAI Assistants API with Assistant:", ASSISTANT_ID);

    // Step 1: Create a thread
    const threadResponse = await fetch("https://api.openai.com/v1/threads", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    if (!threadResponse.ok) {
      const error = await threadResponse.text();
      console.error("❌ Thread creation failed:", error);
      return new Response(JSON.stringify({ error: "Failed to create thread" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const thread = await threadResponse.json();
    const threadId = thread.id;
    console.log("✅ Thread created:", threadId);

    // Step 2: Run the assistant with our custom tools
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID,
        tools: TOOLS,
        tool_choice: "auto"
      })
    });

    if (!runResponse.ok) {
      const error = await runResponse.text();
      console.error("❌ Run creation failed:", error);
      return new Response(JSON.stringify({ error: "Failed to run assistant" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const run = await runResponse.json();
    let runId = run.id;
    console.log("✅ Run started:", runId);

    // Step 3: Poll for completion
    let runStatus = run.status;
    let attempts = 0;
    const maxAttempts = 30;

    while (runStatus === "queued" || runStatus === "in_progress") {
      if (attempts >= maxAttempts) {
        console.error("❌ Run timeout");
        return new Response(JSON.stringify({ error: "Assistant timeout" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      const statusResponse = await fetch(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        {
          headers: {
            "Authorization": `Bearer ${openaiApiKey}`,
            "OpenAI-Beta": "assistants=v2"
          }
        }
      );

      const statusData = await statusResponse.json();
      runStatus = statusData.status;
      console.log(`🔄 Run status: ${runStatus} (attempt ${attempts})`);

      if (runStatus === "requires_action") {
        console.log("🛠️ Tools required by assistant");
        
        const toolCalls = statusData.required_action?.submit_tool_outputs?.tool_calls || [];
        const toolOutputs = [];

        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          
          console.log(`🔧 Executing tool: ${functionName}`, args);

          let output = "";

          if (functionName === "search_shop_catalog") {
            const originalQuery = args.query.trim();
            const improvedQuery = improveSearchQuery(originalQuery);
            const searchTerm = improvedQuery.toLowerCase();
            
            console.log(`🔍 Searching for: "${searchTerm}"`);
            
            const { data: products, error: searchError } = await supabase
              .from("shopify_products")
              .select("*")
              .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`)
              .gt("inventory", 0)
              .order("price", { ascending: true })
              .limit(10);
            
            if (searchError || !products || products.length === 0) {
              output = JSON.stringify({ 
                found: false, 
                message: `No products found for "${originalQuery}"` 
              });
            } else {
              console.log(`✅ Found ${products.length} products`);
              
              await supabase
                .from("conversation_context")
                .upsert({
                  phone_number: phone_number,
                  last_product_list: products.map(p => ({ 
                    product_id: p.product_id, 
                    title: p.title 
                  })),
                }, { onConflict: "phone_number" });
              
              output = JSON.stringify({
                found: true,
                count: products.length,
                products: products.map((p, i) => ({
                  number: i + 1,
                  title: p.title,
                  price: p.price,
                  in_stock: true
                }))
              });
            }
          }
          else if (functionName === "get_product_details") {
            const { data: product } = await supabase
              .from("shopify_products")
              .select("*")
              .eq("product_id", args.product_id)
              .single();
            
            if (product) {
              output = JSON.stringify({
                found: true,
                title: product.title,
                price: product.price,
                description: cleanHtmlForWhatsApp(product.description || "")
              });
            } else {
              output = JSON.stringify({
                found: false,
                message: "Product not found"
              });
            }
          }
          else if (functionName === "track_customer_order") {
            const { data: orders } = await supabase
              .from("shopify_orders")
              .select("*")
              .eq("customer_phone", args.phone_number)
              .order("created_at", { ascending: false })
              .limit(1);
            
            if (orders && orders.length > 0) {
              const order = orders[0];
              output = JSON.stringify({
                found: true,
                order_number: order.order_number,
                status: order.fulfillment_status,
                courier: order.courier_name || "TBA"
              });
            } else {
              output = JSON.stringify({
                found: false,
                message: "No orders found for this phone number"
              });
            }
          }

          toolOutputs.push({
            tool_call_id: toolCall.id,
            output: output
          });
        }

        const submitResponse = await fetch(
          `https://api.openai.com/v1/threads/${threadId}/runs/${runId}/submit_tool_outputs`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openaiApiKey}`,
              "Content-Type": "application/json",
              "OpenAI-Beta": "assistants=v2"
            },
            body: JSON.stringify({ tool_outputs: toolOutputs })
          }
        );

        if (!submitResponse.ok) {
          console.error("❌ Tool output submission failed");
          break;
        }

        console.log("✅ Tool outputs submitted");
        runStatus = "in_progress";
      }
    }

    if (runStatus === "completed") {
      console.log("✅ Run completed successfully");
      
      const messagesResponse = await fetch(
        `https://api.openai.com/v1/threads/${threadId}/messages`,
        {
          headers: {
            "Authorization": `Bearer ${openaiApiKey}`,
            "OpenAI-Beta": "assistants=v2"
          }
        }
      );

      const messagesData = await messagesResponse.json();
      const assistantMessages = messagesData.data.filter(
        (msg: any) => msg.role === "assistant"
      );

      if (assistantMessages.length > 0) {
        const lastMessage = assistantMessages[0];
        const textContent = lastMessage.content.find((c: any) => c.type === "text");
        
        if (textContent) {
          const responseText = textContent.text.value;
          console.log("📝 Assistant response:", responseText);

          const { data: sendData, error: sendError } = await supabase.functions.invoke(
            "send-whatsapp-message", 
            {
              body: { phone_number, message: responseText },
            }
          );

          if (sendError) {
            console.error("❌ Failed to send WhatsApp message:", sendError);
            return new Response(
              JSON.stringify({ error: "Failed to send message" }), 
              {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }

          console.log("✅ WhatsApp message sent successfully");

          return new Response(
            JSON.stringify({ success: true, response: responseText }), 
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }
    } else {
      console.error("❌ Run failed with status:", runStatus);
      return new Response(
        JSON.stringify({ error: `Assistant run failed: ${runStatus}` }), 
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "No response from assistant" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Process Zaara error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});