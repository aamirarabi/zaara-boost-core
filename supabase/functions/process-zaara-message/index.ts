import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Format date as "DD MMM YYYY" for better display
function formatDate(dateString: string | null): string {
  if (!dateString) return "Not available";
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

const TOOLS = [
  {
    type: "file_search"
  },
  {
    type: "function",
    function: {
      name: "search_shop_catalog",
      description: "Search Shopify products by keyword or category. Returns ALL matching products (up to 20) to show complete catalog to customer.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          limit: { type: "integer", description: "Max results - use 20 to show all products", default: 20 },
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
      description: "Track order status by order number (e.g., #Booster17513, Booster17513, 17513) OR customer phone number. If customer says 'track my order' without order number, use their phone number from the conversation.",
      parameters: {
        type: "object",
        properties: {
          order_number: { 
            type: "string", 
            description: "Order number if customer mentions it (with or without # prefix, e.g., 'Booster17513' or '17513')" 
          },
          phone_number: { 
            type: "string", 
            description: "Customer phone number - use this when customer says 'track my order' without providing order number" 
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_customer_name",
      description: "Save customer's name to database when they provide it during conversation. This ensures we remember them for future interactions.",
      parameters: {
        type: "object",
        properties: {
          customer_name: { 
            type: "string", 
            description: "Full customer name as provided by them (e.g., 'Ahmed Khan', 'Fatima Ali')" 
          },
          phone_number: {
            type: "string",
            description: "Customer's phone number from the conversation"
          }
        },
        required: ["customer_name", "phone_number"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_product_image",
      description: "Send product image with complete details to customer in WhatsApp. Use this IMMEDIATELY after get_product_details when showing product information. This sends image + all product details in ONE message.",
      parameters: {
        type: "object",
        properties: {
          phone_number: {
            type: "string",
            description: "Customer's WhatsApp phone number"
          },
          product_id: {
            type: "string", 
            description: "Shopify product ID from get_product_details"
          },
          caption: {
            type: "string",
            description: "Complete formatted product details (name, price, colors, features, reviews, etc.)"
          }
        },
        required: ["phone_number", "product_id", "caption"]
      }
    }
  }
];

// Comprehensive keyword mapping for ALL Boost Lifestyle products
const KEYWORD_MAPPING: Record<string, string> = {
  // Audio - Headsets/Headphones
  "headphones": "headset",
  "headphone": "headset",
  "earphones": "headset", 
  "earphone": "headset",
  "headset": "headset",
  "headsets": "headset",
  "bluetooth headset": "Bluetooth Headset",
  "bluetooth headsets": "Bluetooth Headset",
  "wireless headset": "headset",
  "wireless headsets": "headset",
  "anc headset": "headset",
  
  // Product name keywords
  "beat": "headphone,headset,earphone,audio",
  "beats": "headphone,headset,earphone,audio",
  "reverb": "headphone,headset,earphone,audio",
  "pulse": "headphone,headset,earphone,audio,speaker",
  "wave": "headphone,headset,earphone,audio,speaker",
  "astro": "watch,smartwatch",
  "cosmic": "watch,smartwatch",
  "surge": "chair,gaming chair",
  "comfort": "chair,gaming chair",
  "impulse": "chair,gaming chair",
  "synergy": "chair,gaming chair",
  "nova": "chair,gaming chair",
  "apex": "chair,gaming chair",
  "throne": "chair,gaming chair",
  "supreme": "chair,gaming chair",
  
  // Audio - Earbuds
  "earbuds": "Earbuds",
  "earbud": "Earbuds",
  "wireless earbuds": "Earbuds",
  "true wireless": "Earbuds",
  
  // Audio - Speakers
  "speaker": "Speaker",
  "speakers": "Speaker",
  "bluetooth speaker": "Speaker",
  
  // Gaming Chairs
  "chair": "chair",
  "chairs": "chair",
  "gaming chair": "chair",
  "gaming chairs": "chair",
  "ergonomic chair": "chair",
  "ergonomic chairs": "chair",
  "office chair": "chair",
  
  // Gaming Tables
  "table": "gaming table",
  "tables": "gaming table",
  "gaming table": "gaming table",
  "gaming desk": "gaming table",
  "desk": "gaming table",
  
  // Gaming Mouse
  "mouse": "mouse",
  "mice": "mouse",
  "gaming mouse": "mouse",
  "office mouse": "mouse",
  
  // Monitors
  "monitor": "monitor",
  "monitors": "monitor",
  "gaming monitor": "monitor",
  "screen": "monitor",
  "display": "monitor",
  
  // Monitor Arms
  "monitor arm": "monitor arm",
  "monitor stand": "monitor arm",
  
  // PC Components
  "pc case": "pc case",
  "case": "pc case",
  "enclosure": "pc case",
  "cpu cooler": "CPU Cooler",
  "cooler": "CPU Cooler",
  "cooling": "CPU Cooler",
  "fan": "Case Fan",
  "fans": "Case Fan",
  "case fan": "Case Fan",
  "power supply": "power supply",
  "psu": "power supply",
  "core": "core",
  
  // Smart Watches
  "watch": "smart watches",
  "watches": "smart watches",
  "smart watch": "smart watches",
  "smartwatch": "smart watches",
  "smart watches": "smart watches",
  
  // Power Banks
  "power bank": "power bank",
  "power banks": "power bank",
  "portable charger": "power bank",
  
  // Computer Accessories
  "accessories": "computer accessories",
  "accessory": "computer accessories",
  "computer accessories": "computer accessories",
  "pc accessories": "computer accessories",
  
  // Combos
  "combo": "combo",
  "bundle": "combo",
  "package": "combo",
  "deal": "combo",
};

// Helper function to normalize phone numbers (remove +, spaces, dashes)
function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  return phone.replace(/[\s\-\+]/g, "").trim();
}

// Helper function to bold important information in text
function boldImportantInfo(text: string): string {
  if (!text) return "";
  
  // Bold numbers with units (70 hours, 1-year, 2 working days, etc.)
  text = text.replace(/(\d+[\-\s]?\w*\s*(hours?|days?|weeks?|months?|years?|warranty|kg|gb|tb|mah|w))/gi, "*$1*");
  
  // Bold prices (Rs. 34,999 or PKR 34,999)
  text = text.replace(/((?:Rs\.?|PKR)\s*[\d,]+)/gi, "*$1*");
  
  // Bold percentages
  text = text.replace(/(\d+%)/g, "*$1*");
  
  return text;
}

// Helper function to get category emoji
function getCategoryEmoji(query: string): string {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes("chair")) return "🪑";
  if (queryLower.includes("headphone") || queryLower.includes("headset")) return "🎧";
  if (queryLower.includes("earbud")) return "🎵";
  if (queryLower.includes("speaker")) return "🔊";
  if (queryLower.includes("watch")) return "⌚";
  if (queryLower.includes("power bank")) return "🔋";
  if (queryLower.includes("gaming") || queryLower.includes("game")) return "🎮";
  if (queryLower.includes("monitor") || queryLower.includes("screen")) return "🖥️";
  if (queryLower.includes("mouse")) return "🖱️";
  
  return "🚀";
}

// Get courier display name from settings (maps "Other" → "PostEx")
async function getCourierDisplayName(supabase: any, shopifyCourierName: string): Promise<string> {
  const { data: courierSettings } = await supabase
    .from("courier_settings")
    .select("display_name")
    .eq("courier_name", shopifyCourierName)
    .single();
  
  return courierSettings?.display_name || shopifyCourierName;
}

// Calculate scheduled ETA based on fulfillment date and city
function calculateScheduledETA(fulfillmentDate: string | null, city: string): {
  scheduledDate: string;
  daysFromFulfillment: number;
} {
  if (!fulfillmentDate) {
    return { scheduledDate: "Pending fulfillment", daysFromFulfillment: 0 };
  }
  
  const fulfillment = new Date(fulfillmentDate);
  const businessDays = city.toLowerCase() === 'karachi' ? 2 : 5;
  
  let current = new Date(fulfillment);
  let added = 0;
  
  while (added < businessDays) {
    current.setDate(current.getDate() + 1);
    // Skip Sundays
    if (current.getDay() !== 0) added++;
  }
  
  return {
    scheduledDate: current.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }),
    daysFromFulfillment: businessDays
  };
}

// Leopards Courier API Integration
async function getLeopardsTracking(supabase: any, trackingNumber: string): Promise<{
  estimatedDate: string | null;
  status: string;
} | null> {
  try {
    console.log("🐆 [LEOPARDS] Tracking:", trackingNumber);
    
    // Get API credentials from courier_settings
    const { data: settings, error } = await supabase
      .from("courier_settings")
      .select("api_key, api_password, api_endpoint")
      .eq("courier_name", "Leopards")
      .single();
    
    if (error || !settings) {
      console.error("❌ [LEOPARDS] Settings error:", error);
      return null;
    }
    
    if (!settings.api_key || !settings.api_password) {
      console.error("❌ [LEOPARDS] Missing credentials");
      return null;
    }
    
    // Leopards API uses POST with form-urlencoded parameters
    const formData = new URLSearchParams({
      'api_key': settings.api_key,
      'api_password': settings.api_password,
      'track_numbers': trackingNumber
    });
    
    console.log("📡 [LEOPARDS] Calling API...");
    
    const response = await fetch(settings.api_endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formData.toString()
    });
    
    console.log("📥 [LEOPARDS] Status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ [LEOPARDS] API error:", errorText);
      return null;
    }
    
    const data = await response.json();
    console.log("📦 [LEOPARDS] Response:", JSON.stringify(data));
    
    // Check API response status
    if (data.status !== 1 || data.error !== 0) {
      console.error("❌ [LEOPARDS] Error in response:", data);
      return null;
    }
    
    // Get packet data
    const packets = data.packet_list || [];
    if (packets.length === 0) {
      console.error("❌ [LEOPARDS] No packets");
      return null;
    }
    
    const packet = packets[0];
    const trackingDetails = packet['Tracking Detail'] || [];
    const latestDetail = trackingDetails[trackingDetails.length - 1];
    
    const result = {
      estimatedDate: latestDetail?.Activity_datetime || null,
      status: packet.booked_packet_status || "In Transit"
    };
    
    console.log("✅ [LEOPARDS] Success:", result);
    return result;
    
  } catch (error) {
    console.error("❌ [LEOPARDS] Exception:", error);
    return null;
  }
}

// PostEx Courier API Integration  
async function getPostExTracking(supabase: any, trackingNumber: string): Promise<{
  estimatedDate: string | null;
  status: string;
} | null> {
  try {
    // Get API key from courier_settings
    const { data: settings } = await supabase
      .from("courier_settings")
      .select("api_key, api_endpoint")
      .or("courier_name.eq.PostEx,courier_name.eq.Other")
      .limit(1)
      .single();
    
    if (!settings?.api_key) {
      console.error("❌ PostEx API key not configured");
      return null;
    }
    
    const response = await fetch(`${settings.api_endpoint}/${trackingNumber}`, {
      method: "GET",
      headers: {
        "token": settings.api_key,
        "Content-Type": "application/json"
      }
    });
    
    if (!response.ok) {
      console.error("❌ PostEx API error:", response.status);
      return null;
    }
    
    const data = await response.json();
    
    return {
      estimatedDate: data.dist?.estimated_delivery || null,
      status: data.dist?.status || "In Transit"
    };
  } catch (error) {
    console.error("❌ PostEx tracking error:", error);
    return null;
  }
}

  // FIX #2: Keyword expansion for better product matching
  function expandSearchKeywords(searchTerm: string): string {
    const term = searchTerm.toLowerCase().trim();
    
    const mappings: { [key: string]: string } = {
      'beat': 'beat wireless anc headset',
      'beat headphones': 'beat wireless anc headset',
      'beat headphone': 'beat wireless anc headset',
      'sync': 'sync wireless anc headset',
      'sync headphones': 'sync wireless anc headset',
      'sync headphone': 'sync wireless anc headset',
      'wave': 'wave wireless anc headset',
      'wave headphones': 'wave wireless anc headset',
      'wave headphone': 'wave wireless anc headset',
      'reverb': 'reverb wireless anc headset',
      'reverb headphones': 'reverb wireless anc headset',
      'pulse': 'pulse wireless anc headset',
      'pulse headphones': 'pulse wireless anc headset',
      'headphones': 'headset',
      'headphone': 'headset',
      'surge pro': 'surge pro',
      'impulse': 'impulse gaming chair',
      'synergy': 'synergy gaming chair',
      'throne': 'throne gaming chair',
      'apex': 'apex gaming chair',
      'chair': 'gaming chair',
      'chairs': 'gaming chair',
      'astro': 'astro smart watch',
      'smart watch': 'smart watch',
      'smartwatch': 'smart watch',
      'watch': 'smart watch',
      'watches': 'smart watch',
    };
    
    // Check for exact matches first
    if (mappings[term]) {
      console.log(`✅ Keyword mapping: "${term}" → "${mappings[term]}"`);
      return mappings[term];
    }
    
    // Check for partial matches
    for (const [key, value] of Object.entries(mappings)) {
      if (term.includes(key)) {
        console.log(`✅ Partial keyword mapping: "${term}" → "${value}"`);
        return value;
      }
    }
    
    return term;
  }

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

// Helper function to improve search query with comprehensive keyword mapping
function improveSearchQuery(userQuery: string): string {
  const queryLower = userQuery.toLowerCase().trim();
  const words = queryLower.split(/\s+/);
  
  // Product names that MUST be preserved
  const productNames = [
    'surge', 'apex', 'beat', 'reverb', 'pulse', 'wave',
    'astro', 'cosmic', 'comfort', 'impulse', 'synergy',
    'nova', 'throne', 'supreme', 'razer', 'boost'
  ];
  
  // Extract product names from query
  const foundProductNames = words.filter(word => 
    productNames.includes(word)
  );
  
  // Map only generic category words, keep product names
  const mappedWords = words.map(word => {
    // Keep product names as-is
    if (productNames.includes(word)) return word;
    
    // Map generic terms only
    if (word === 'headphones' || word === 'headphone' || word === 'earphones') return 'headset';
    if (word === 'chair' || word === 'chairs') return 'chair';
    if (word === 'watch' || word === 'watches') return 'smart watch';
    if (word === 'speaker' || word === 'speakers') return 'speaker';
    
    return word;
  });
  
  // Combine product names + mapped words (unique)
  const result = [...new Set([...foundProductNames, ...mappedWords])].join(' ');
  
  console.log(`🔄 Query: "${userQuery}" → "${result}"`);
  return result || userQuery;
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
async function sendWhatsAppImage(supabase: any, phone_number: string, imageUrl: string, caption: string) {
  console.log("🖼️ sendWhatsAppImage called with supabase type:", typeof supabase);
  console.log("🖼️ supabase.from exists?", typeof supabase.from);
  
  // Get WhatsApp credentials from database
  const { data: settings } = await supabase.from("system_settings").select("*");
  
  const WHATSAPP_TOKEN = settings?.find((s: any) => s.setting_key === "whatsapp_access_token")?.setting_value;
  const WHATSAPP_PHONE_ID = settings?.find((s: any) => s.setting_key === "whatsapp_phone_id")?.setting_value;
  
  console.log("🔑 WhatsApp Token found:", WHATSAPP_TOKEN ? "✅" : "❌");
  console.log("🔑 WhatsApp Phone ID found:", WHATSAPP_PHONE_ID ? "✅" : "❌");
  
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

// Format product details beautifully (like Ayesha's format)
async function formatProductDetails(product: any, phone_number: string, supabase: any): Promise<string> {
  const categoryEmoji = getCategoryEmoji(product.title);
  
  // Get customer name for personalization
  const { data: contextData } = await supabase
    .from("conversation_context")
    .select("customer_name")
    .eq("phone_number", phone_number)
    .maybeSingle();
  
  const customerName = contextData?.customer_name || "";
  
  let formatted = `${categoryEmoji} *${product.title}*\n\n`;
  
  // Price - single price only
  formatted += `💰 *Price:* Rs. ${product.price.toLocaleString()}\n`;
  
  // Colors
  if (product.colors && product.colors.length > 0) {
    formatted += `🎨 *Available Colors:* ${product.colors.join(', ')}\n`;
  }
  
  // Availability
  const inStock = product.inventory > 0;
  formatted += inStock ? `✅ *Availability:* In Stock\n\n` : `❌ *Availability:* Out of Stock\n\n`;
  
  // Key Features
  if (product.description) {
    formatted += `✨ *Key Features:*\n`;
    const features = cleanHtmlForWhatsApp(product.description)
      .split(/[•\n]/)
      .filter((f: string) => f.trim().length > 10)
      .slice(0, 5)
      .map((f: string) => `• ${f.trim()}`)
      .join('\n');
    formatted += `${features}\n\n`;
  }
  
  // Customer Reviews
  if (product.review_count > 0 && product.average_rating) {
    formatted += `⭐ *Customer Reviews:*\n`;
    formatted += `${product.average_rating}/5 stars (${product.review_count} reviews)\n`;
    
    if (product.reviews && product.reviews.length > 0) {
      // Filter to ONLY 5-star reviews
      const fiveStarReviews = product.reviews.filter((r: any) => r.rating === 5);
      
      if (fiveStarReviews.length > 0) {
        fiveStarReviews.slice(0, 3).forEach((review: any) => {
          const text = review.body || review.title || "";
          const name = review.reviewer_name || "Customer";
          const city = review.reviewer_location || "Pakistan";
          if (text) {
            formatted += `• ⭐⭐⭐⭐⭐ "${text.substring(0, 50)}..." - ${name}, ${city}\n`;
          }
        });
      } else {
        formatted += `• ⭐ Be the first to review!\n`;
      }
    }
    formatted += '\n';
  }
  
  // Product Videos
  if (product.all_videos && product.all_videos.length > 0) {
    formatted += `🎬 *Product Videos:*\n`;
    product.all_videos.forEach((video: string, i: number) => {
      const fixedUrl = video
        .replace(/https:([^\/])/g, 'https://$1')
        .replace(/http:([^\/])/g, 'http://$1');
      const label = i === 0 ? 'Assembly Guide' : `Video ${i + 1}`;
      formatted += `• ${label}: ${fixedUrl}\n`;
    });
    formatted += '\n';
  }
  
  // Order Link
  formatted += `🔗 *Order here:* ${product.product_url}\n\n`;
  
  // Call to Action
  if (inStock) {
    formatted += `${customerName ? customerName + ' Sir/Madam, would' : 'Would'} you like to order this? Reply "Yes" and I'll connect you with our sales team! 😊`;
  } else {
    formatted += `${customerName ? customerName + ' Sir/Madam,' : ''} This product is currently out of stock. Would you like notification when available? Reply "Yes"! 🔔`;
  }
  
  return formatted;
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

    // ==========================================
    // CHECK AI ENABLED (Human Takeover)
    // ==========================================
    const { data: aiCheck } = await supabase
      .from("conversation_context")
      .select("ai_enabled, taken_over_by")
      .eq("phone_number", phone_number)
      .single();

    if (aiCheck && aiCheck.ai_enabled === false) {
      console.log(`🚫 AI disabled for ${phone_number} - taken over by ${aiCheck.taken_over_by}`);
      
      // Store message in chat history but don't respond
      await supabase.from("chat_history").insert({
        phone_number: phone_number,
        content: message,
        direction: "inbound",
        sent_by: "customer",
        created_at: new Date().toISOString()
      });
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "AI disabled - human handling this conversation" 
        }), 
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ==========================================
    // SPEED OPTIMIZATION: Greeting Fast Path
    // ==========================================
    const greetingPattern = /^(salam|assalam|hi|hello|hey|good morning|good evening)$/i;
    if (greetingPattern.test(message.trim())) {
      console.log("⚡ Fast path: Greeting detected");
      
      const { data: customer } = await supabase
        .from("conversation_context")
        .select("customer_name")
        .eq("phone_number", phone_number)
        .single();
      
      let response;
      if (customer?.customer_name) {
        response = `Welcome back, ${customer.customer_name} Sir/Madam! How can I assist you today? 🌸`;
      } else {
        if (message.toLowerCase().includes('salam')) {
          response = "Wa Alaikum Salam! 🌸 My name is Zaara, I'm your BOOST support AI assistant (AI can make mistakes 😊). May I know your good name please?";
        } else {
          response = "Hello! 👋 I'm Zaara AI Agent from Boost Lifestyle (AI can make mistakes 😊). May I kindly know your good name please?";
        }
      }
      
      await supabase.functions.invoke("send-whatsapp-message", {
        body: { phone_number, message: response },
      });
      
      return new Response(
        JSON.stringify({ success: true, response, fast_path: "greeting" }), 
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if message is a number (product selection)
    const messageNum = parseInt(message.trim());
    if (!isNaN(messageNum) && messageNum > 0) {
      console.log(`🔢 Number detected: ${messageNum}`);
      
      // Get conversation context to retrieve last product list
      const { data: context } = await supabase
        .from("conversation_context")
        .select("last_product_list, customer_name")
        .eq("phone_number", phone_number)
        .single();
      
      const productList = context?.last_product_list || [];
      const customerName = context?.customer_name || "";
      
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
          // Fetch reviews
          const { data: reviews } = await supabase
            .from("product_reviews")
            .select("rating, title, body, reviewer_name")
            .eq("shopify_product_id", product.shopify_id)
            .order("rating", { ascending: false })
            .limit(5);
          
          const { count: reviewCount } = await supabase
            .from("product_reviews")
            .select("*", { count: "exact", head: true })
            .eq("shopify_product_id", product.shopify_id);
          
          const { data: allRatings } = await supabase
            .from("product_reviews")
            .select("rating")
            .eq("shopify_product_id", product.shopify_id);
          
          let average_rating = null;
          if (allRatings && allRatings.length > 0) {
            const totalRating = allRatings.reduce((sum, r) => sum + r.rating, 0);
            average_rating = (totalRating / allRatings.length).toFixed(1);
          }
          
          // Get FAQ videos
          const { data: productFaqs } = await supabase
            .from("faq_vectors")
            .select("video_urls")
            .eq("is_active", true)
            .ilike("question", `%${product.title}%`)
            .not("video_urls", "is", null);
          
          let faqVideos: string[] = [];
          if (productFaqs) {
            productFaqs.forEach((faq: any) => {
              if (faq.video_urls && Array.isArray(faq.video_urls)) {
                faqVideos = faqVideos.concat(faq.video_urls);
              }
            });
            faqVideos = [...new Set(faqVideos)];
          }
          
          // Get images
          const images = JSON.parse(product.images || "[]");
          
          // Get variants for colors
          const variants = JSON.parse(product.variants || "[]");
          const colors = [...new Set(variants.filter((v: any) => v.option1).map((v: any) => v.option1))];
          
          // Build product object
          const productObj = {
            title: product.title,
            price: product.price,
            description: product.description || "",
            image_url: images[0] || null,
            product_url: `https://www.boost-lifestyle.co/products/${product.handle}`,
            colors: colors,
            all_videos: product.metafields?.product_video ? [product.metafields.product_video, ...faqVideos] : faqVideos,
            average_rating: average_rating,
            review_count: reviewCount || 0,
            reviews: reviews || [],
            inventory: product.inventory
          };
          
          // Send image first
          if (productObj.image_url) {
            await sendWhatsAppImage(supabase, phone_number, productObj.image_url, product.title);
          }
          
          // Send beautifully formatted details
          const formattedDetails = await formatProductDetails(productObj, phone_number, supabase);
          
          await supabase.functions.invoke("send-whatsapp-message", {
            body: { phone_number, message: formattedDetails },
          });
          
          return new Response(JSON.stringify({ success: true, response: formattedDetails }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }
    
    // Check for waitlist confirmation
    const { data: waitlistCheck } = await supabase
      .from("conversation_context")
      .select("context_data, customer_name")
      .eq("phone_number", phone_number)
      .maybeSingle();
    
    const contextData = waitlistCheck?.context_data || {};
    const customerName = waitlistCheck?.customer_name || "";
    
    if (contextData.awaiting_waitlist && message.toLowerCase().match(/^(yes|yeah|sure|ok|okay)$/)) {
      // Add to waitlist
      await supabase
        .from("product_waitlist")
        .insert({
          customer_phone: phone_number,
          customer_name: customerName,
          product_id: contextData.waitlist_product_id,
          product_title: contextData.waitlist_product_title
        });
      
      // Clear context
      await supabase
        .from("conversation_context")
        .update({
          context_data: {}
        })
        .eq("phone_number", phone_number);
      
      const confirmMessage = `Perfect! ${customerName ? customerName + ' Sir/Madam, you' : 'You'}'re on the waitlist for ${contextData.waitlist_product_title}! 🔔✨\n\nWe'll notify you as soon as it's back in stock! 😊`;
      
      await supabase.functions.invoke("send-whatsapp-message", {
        body: { phone_number, message: confirmMessage },
      });
      
      return new Response(JSON.stringify({ success: true, response: confirmMessage }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    // Using new Production Assistant with updated API key
    const ASSISTANT_ID = "asst_XD1YQeyvtzWlBK1Fa0HNX9fZ";
    // Old Assistant (backup): asst_R7YwCRjq1BYHqGehfR9RtDFo
    console.log("🤖 Using OpenAI Assistants API with Assistant:", ASSISTANT_ID);

    // ==========================================
    // BUG FIX #3: Thread Persistence
    // Check if we have an existing thread for this customer
    // ==========================================
    const { data: threadData } = await supabase
      .from("conversation_context")
      .select("thread_id, customer_name")
      .eq("phone_number", phone_number)
      .maybeSingle();

    let threadId = threadData?.thread_id;
    const contextCustomerName = threadData?.customer_name || customerName;

    // Only create new thread if we don't have one
    if (!threadId) {
      console.log("🆕 Creating new thread for new customer...");
      
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
              content: `${contextCustomerName ? `CUSTOMER INFO: Customer name is "${contextCustomerName}". Always address them as "${contextCustomerName} Sir/Madam" in responses.` : 'NEW CUSTOMER: Customer name not yet known. Ask for their name and use save_customer_name tool.'}

Customer Phone: ${phone_number}

User query: ${message}`
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
      threadId = thread.id;
      console.log("✅ New thread created:", threadId);
      
      // Save thread_id for future messages
      await supabase
        .from("conversation_context")
        .upsert({
          phone_number: phone_number,
          thread_id: threadId,
          created_at: new Date().toISOString()
        }, { onConflict: "phone_number" });
        
    } else {
      console.log("♻️ Reusing existing thread:", threadId);
      
      // Add new message to existing thread
      const addMessageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2"
        },
        body: JSON.stringify({
          role: "user",
          content: message
        })
      });
      
      if (!addMessageResponse.ok) {
        console.error("❌ Failed to add message to thread");
        // Thread might be invalid, create new one by clearing thread_id
        await supabase
          .from("conversation_context")
          .update({ thread_id: null })
          .eq("phone_number", phone_number);
        
        // Return error to retry
        return new Response(
          JSON.stringify({ error: "Thread invalid, please retry" }), 
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      console.log("✅ Message added to existing thread");
    }

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
        // ✅ NO instructions parameter - uses OpenAI Dashboard instructions!
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
            const categoryEmoji = getCategoryEmoji(originalQuery);
            
            console.log(`🔍 Original search query: "${originalQuery}"`);
            console.log(`🎯 Improved query: "${improvedQuery}"`);
            
            // Extract key product name words (Surge, Apex, Beat, etc.)
            const productNameWords = [
              'surge', 'apex', 'beat', 'reverb', 'pulse', 'wave',
              'astro', 'cosmic', 'comfort', 'impulse', 'synergy',
              'nova', 'throne', 'supreme'
            ];
            
            // Detect product type from query
            const productTypes = {
              'chair': ['chair', 'chairs'],
              'headphone': ['headphone', 'headphones', 'headset', 'headsets'],
              'earbud': ['earbud', 'earbuds', 'earphone', 'earphones'],
              'mouse': ['mouse', 'mice'],
              'keyboard': ['keyboard', 'keyboards'],
              'mousepad': ['mousepad', 'mousepads', 'pad', 'pads'],
              'watch': ['watch', 'watches', 'smartwatch'],
              'powerbank': ['powerbank', 'powerbanks', 'power bank']
            };
            
            let detectedProductType = null;
            for (const [type, keywords] of Object.entries(productTypes)) {
              if (keywords.some(keyword => new RegExp('\\b' + keyword + '\\b', 'i').test(originalQuery))) {
                detectedProductType = type;
                console.log(`🏷️ Detected product type: "${type}"`);
                break;
              }
            }
            
            // Check if query contains a product name (using word boundaries)
            const containsProductName = productNameWords.some(name => 
              new RegExp('\\b' + name + '\\b', 'i').test(originalQuery)
            );
            
            // If query contains product name, use ONLY that product name for exact match
            let searchTerms = improvedQuery;
            if (containsProductName) {
              // Extract the product name from query (using word boundaries)
              const foundName = productNameWords.find(name => 
                new RegExp('\\b' + name + '\\b', 'i').test(originalQuery)
              );
              if (foundName) {
                // Use ONLY the product name for specific product queries
                searchTerms = foundName;
                console.log(`📝 Using product name for exact match: "${foundName}"`);
              }
            }
            
            console.log(`🔎 Final search term: "${searchTerms}"`);
            const searchTerm = searchTerms.toLowerCase();
            
            // IMPROVEMENT: Try exact match first for specific product requests
            // IMPROVED: Try EXACT product name match first with optional product type filtering
            let query = supabase
              .from("shopify_products")
              .select("*")
              .eq("status", "active")
              .ilike("title", `%${searchTerm}%`);
            
            // Filter by product type if detected
            if (detectedProductType) {
              query = query.ilike("product_type", `%${detectedProductType}%`);
              console.log(`🎯 Filtering by product type: "${detectedProductType}"`);
            }
            
            const { data: exactMatch } = await query.limit(20);
            
            // Find BEST match - check if search term is in product title
            let bestMatch = null;
            if (exactMatch && exactMatch.length > 0) {
              // Look for exact product name match
              for (const product of exactMatch) {
                const titleLower = product.title.toLowerCase();
                const searchLower = searchTerm.toLowerCase();
                
                // Check if all search words are in the title
                const searchWords = searchLower.split(/\s+/);
                const allWordsPresent = searchWords.every(word => 
                  word.length > 2 && titleLower.includes(word)
                );
                
                if (allWordsPresent) {
                  bestMatch = product;
                  console.log(`✅ Found exact match: ${product.title}`);
                  break;
                }
              }
            }
            
            // If specific product match found, return only that product
            if (bestMatch && containsProductName) {
              console.log(`✅ Returning single product: ${bestMatch.title}`);
              
              await supabase
                .from("conversation_context")
                .upsert({
                  phone_number: phone_number,
                  last_product_list: [{ 
                    product_id: bestMatch.product_id, 
                    title: bestMatch.title 
                  }],
                }, { onConflict: "phone_number" });
              
              const product = bestMatch;
              const variants = JSON.parse(product.variants || "[]");
              
              // Get colors (skip payment methods like prepaid/cod)
              const colors = [...new Set(variants
                .filter((v: any) => v.option1 && !['prepaid', 'cod', 'cash', 'payment'].includes(v.option1.toLowerCase()))
                .map((v: any) => v.option1)
              )];
              
              output = JSON.stringify({
                found: true,
                count: 1,
                exact_match: true,
                category_emoji: categoryEmoji,
                products: [{
                  number: 1,
                  product_id: product.product_id,
                  title: product.title,
                  price: product.price,
                  colors: colors.length > 0 ? colors : ['Standard'],
                  in_stock: product.inventory > 0,
                  inventory: product.inventory
                }]
              });
            } else {
            // FIX #1: Increase limit to 100 to show ALL products
            const limit = args.limit || 100;
            
            // Don't use expandedTerm - it might filter too much
            // Use original searchTerm for broader matching
            console.log(`🔎 Searching products with term: "${searchTerm}"`);
            
            // FIX #2: Only show ACTIVE products (status='active')
            const { data: products, error: searchError } = await supabase
              .from("shopify_products")
              .select("*")
              .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,tags.cs.{${searchTerm}},product_type.ilike.%${searchTerm}%`)
              .eq("status", "active")  // ✅ Only active products
              .order("price", { ascending: true })  // ✅ Price ascending
              .limit(limit);
              
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
                
                // Fetch reviews for each product
                for (const product of products) {
                  // Get total count of reviews
                  const { count: totalReviewCount } = await supabase
                    .from("product_reviews")
                    .select("*", { count: "exact", head: true })
                    .eq("shopify_product_id", product.shopify_id);

                  // Get all ratings for accurate average
                  const { data: allRatings } = await supabase
                    .from("product_reviews")
                    .select("rating")
                    .eq("shopify_product_id", product.shopify_id);

                  // Get top 5-star reviews only for display
                  const { data: topReviews } = await supabase
                    .from("product_reviews")
                    .select("rating, title, body, reviewer_name, reviewer_location, verified_buyer, pictures, created_at_judgeme")
                    .eq("shopify_product_id", product.shopify_id)
                    .eq("rating", 5)
                    .order("created_at_judgeme", { ascending: false })
                    .limit(5);

                  // Calculate average from ALL reviews
                  if (allRatings && allRatings.length > 0) {
                    const totalRating = allRatings.reduce((sum, r) => sum + r.rating, 0);
                    product.average_rating = (totalRating / allRatings.length).toFixed(1);
                    product.review_count = totalReviewCount || 0;
                    product.reviews = topReviews || [];
                  } else {
                    product.average_rating = null;
                    product.review_count = 0;
                    product.reviews = [];
                  }
                }
                
                // Parse variants to get price range and colors for each product
                const enrichedProducts = products.map((p, i) => {
                  const variants = JSON.parse(p.variants || "[]");
                  
                  // Get price range
                  let priceMin = p.price;
                  let priceMax = p.price;
                  if (variants.length > 1) {
                    const prices = variants.map((v: any) => parseFloat(v.price)).filter((price: number) => !isNaN(price));
                    if (prices.length > 0) {
                      priceMin = Math.min(...prices);
                      priceMax = Math.max(...prices);
                    }
                  }
                  
                  // Get colors
                  const colors = [...new Set(variants.filter((v: any) => v.option1).map((v: any) => v.option1))];
                  
                  return {
                    number: i + 1,
                    title: p.title,
                    price_min: priceMin,
                    price_max: priceMax,
                    colors: colors,
                    in_stock: true,
                    average_rating: p.average_rating,
                    review_count: p.review_count,
                    reviews: p.reviews
                  };
                });
                
                output = JSON.stringify({
                  found: true,
                  count: products.length,
                  exact_match: false,
                  category_emoji: categoryEmoji,
                  products: enrichedProducts
                });
              }
            }
          }
          else if (functionName === "get_product_details") {
            const { data: product } = await supabase
              .from("shopify_products")
              .select("*")
              .eq("product_id", args.product_id)
              .single();
            
            if (product) {
              console.log("📦 Fetching product details for:", product.title);
              
              // FIX #1: Fetch TOP 5-star reviews only for display
              const { data: reviews, error: reviewsError } = await supabase
                .from("product_reviews")
                .select("rating, title, body, reviewer_name, reviewer_location, verified_buyer, pictures, created_at_judgeme")
                .eq("shopify_product_id", product.shopify_id)
                .eq("rating", 5)  // ✅ ONLY 5-STAR REVIEWS
                .order("created_at_judgeme", { ascending: false })
                .limit(3);  // Show top 3 five-star reviews

              if (reviewsError) {
                console.error("❌ Reviews query error:", reviewsError);
              }

              // Get TOTAL count of ALL reviews for this product
              const { count: totalReviewCount, error: countError } = await supabase
                .from("product_reviews")
                .select("*", { count: "exact", head: true })
                .eq("shopify_product_id", product.shopify_id);

              if (countError) {
                console.error("❌ Review count error:", countError);
              }

              // Get ALL ratings to calculate accurate average
              const { data: allReviewsForAvg, error: avgError } = await supabase
                .from("product_reviews")
                .select("rating")
                .eq("shopify_product_id", product.shopify_id);

              let average_rating = null;
              let review_count = totalReviewCount || 0;

              if (allReviewsForAvg && allReviewsForAvg.length > 0) {
                const totalRating = allReviewsForAvg.reduce((sum, r) => sum + r.rating, 0);
                average_rating = (totalRating / allReviewsForAvg.length).toFixed(1);
                console.log(`✅ Product has ${review_count} total reviews with ${average_rating} avg rating. Showing top ${reviews?.length || 0} for display.`);
              } else {
                console.log(`✅ No reviews found for this product`);
              }
              
              // Fetch FAQ videos related to this product
              const productTitle = product.title.toLowerCase();
              // Handle tags - could be string, array, or null
              let productTags: string[] = [];
              if (typeof product.tags === 'string') {
                productTags = product.tags.toLowerCase().split(',').map((t: string) => t.trim());
              } else if (Array.isArray(product.tags)) {
                productTags = product.tags.map((t: string) => t.toLowerCase().trim());
              }

              console.log(`🔍 Searching for FAQ videos related to: ${product.title}`);

              const { data: productFaqs, error: faqVideoError } = await supabase
                .from("faq_vectors")
                .select("question, answer, video_urls, category")
                .eq("is_active", true)
                .or(`question.ilike.%${productTitle}%,answer.ilike.%${productTitle}%,category.ilike.%${product.product_type}%`)
                .not("video_urls", "is", null);

              let faqVideos: string[] = [];
              if (productFaqs && productFaqs.length > 0) {
                console.log(`✅ Found ${productFaqs.length} FAQs with videos for this product`);
                
                // Extract all video URLs from FAQs
                productFaqs.forEach((faq: any) => {
                  if (faq.video_urls && Array.isArray(faq.video_urls)) {
                    faqVideos = faqVideos.concat(faq.video_urls);
                  }
                });
                
                // Remove duplicates
                faqVideos = [...new Set(faqVideos)];
                console.log(`📹 Total unique FAQ videos found: ${faqVideos.length}`);
              } else {
                console.log(`ℹ️ No FAQ videos found for this product`);
              }
              
              // Extract video URLs from metafields - check ALL possible field names
              const metafields = product.metafields || {};
              let productVideoUrls: string[] = [];
              
              // Possible metafield names for videos
              const videoFieldNames = [
                'product_video',
                'Product Review Video',
                'Assembly or Unboxing Video',
                'product_demo_video',
                'custom.product_demo_video'
              ];
              
              console.log(`📹 Checking metafields for video URLs...`);
              
              // Check if metafields is an object (direct properties)
              if (metafields && typeof metafields === 'object' && !Array.isArray(metafields)) {
                for (const fieldName of videoFieldNames) {
                  if (metafields[fieldName]) {
                    productVideoUrls.push(metafields[fieldName]);
                    console.log(`📹 Found video in metafield "${fieldName}": ${metafields[fieldName]}`);
                  }
                }
              }
              
              // Check if metafields is an array
              if (Array.isArray(metafields) && metafields.length > 0) {
                for (const meta of metafields) {
                  // Check various field name patterns
                  if (meta.key && videoFieldNames.some(name => 
                    name.toLowerCase().includes(meta.key.toLowerCase()) || 
                    meta.key.toLowerCase().includes('video')
                  )) {
                    if (meta.value) {
                      productVideoUrls.push(meta.value);
                      console.log(`📹 Found video in array metafield "${meta.namespace}.${meta.key}": ${meta.value}`);
                    }
                  }
                }
              }
              
              // Remove duplicates
              productVideoUrls = [...new Set(productVideoUrls)];
              console.log(`📹 Total video URLs found: ${productVideoUrls.length}`);
              
              // Legacy support - keep videoUrl for backward compatibility
              const videoUrl = productVideoUrls.length > 0 ? productVideoUrls[0] : null;
              
              // Get images
              const images = JSON.parse(product.images || "[]");
              const firstImage = images.length > 0 ? images[0] : null;
              
              // Get variants for colors
              const variants = JSON.parse(product.variants || "[]");
              const colors = [...new Set(variants.filter((v: any) => v.option1).map((v: any) => v.option1))];
              
              // FIX #3: Calculate original and current prices
              const originalPrice = product.compare_at_price || product.price;
              const currentPrice = product.price;
              
              output = JSON.stringify({
                found: true,
                title: product.title,
                price: currentPrice,
                original_price: originalPrice,  // ✅ ADD
                current_price: currentPrice,     // ✅ ADD
                description: cleanHtmlForWhatsApp(product.description || ""),
                image_url: firstImage,
                product_handle: product.handle,
                product_url: `https://www.boost-lifestyle.co/products/${product.handle}`,
                colors: colors,
                product_type: product.product_type || "",
                vendor: product.vendor || "",
                video_url: videoUrl,
                faq_videos: faqVideos,
                all_videos: videoUrl ? [videoUrl, ...faqVideos] : faqVideos,
                average_rating: average_rating,
                review_count: review_count,
                // FIX #2: Map reviews to include city field explicitly
                reviews: (reviews || []).map(r => ({
                  rating: 5,
                  text: r.body || r.title || "",
                  reviewer: r.reviewer_name || "Anonymous",
                  city: r.reviewer_location || "Pakistan"  // ✅ ADD CITY
                })),
                inventory: product.inventory,
                tags: product.tags || ""
              });
              
              console.log("✅ Product details prepared with reviews");
            } else {
              output = JSON.stringify({
                found: false,
                message: "Product not found"
              });
            }
          }
          else if (functionName === "track_customer_order") {
            let orders = [];
            
            // If order_number is provided, search by order number
            if (args.order_number) {
              const orderNum = args.order_number.toString().replace(/[#\s]/g, '').replace('Booster', '');
              console.log(`🔍 Searching for order number: ${orderNum}`);
              
              const { data: ordersByNumber } = await supabase
                .from("shopify_orders")
                .select("*")
                .or(`order_number.ilike.%${orderNum}%,order_number.ilike.%Booster${orderNum}%,order_number.ilike.%#Booster${orderNum}%`)
                .limit(1);
              
              orders = ordersByNumber || [];
              console.log(`📦 Found ${orders?.length || 0} orders by order number`);
            }
            
            // If phone_number is provided and no order found yet, search by phone
            if ((!orders || orders.length === 0) && args.phone_number) {
              const normalizedPhone = normalizePhoneNumber(args.phone_number);
              console.log(`🔍 Searching for orders by phone: ${normalizedPhone}`);
              
              const { data: ordersByPhone } = await supabase
                .from("shopify_orders")
                .select("*")
                .or(`customer_phone.eq.${normalizedPhone},customer_phone.eq.+${normalizedPhone}`)
                .order("created_at", { ascending: false })
                .limit(1);
              
              orders = ordersByPhone || [];
              console.log(`📦 Found ${orders?.length || 0} orders by phone`);
            }
            
            // If still no orders found and we have the incoming phone_number, try that
            if ((!orders || orders.length === 0) && phone_number) {
              const normalizedPhone = normalizePhoneNumber(phone_number);
              console.log(`🔍 Searching for orders by conversation phone: ${normalizedPhone}`);
              
              const { data: ordersByPhone } = await supabase
                .from("shopify_orders")
                .select("*")
                .or(`customer_phone.eq.${normalizedPhone},customer_phone.eq.+${normalizedPhone}`)
                .order("created_at", { ascending: false })
                .limit(1);
              
              orders = ordersByPhone || [];
              console.log(`📦 Found ${orders?.length || 0} orders by conversation phone`);
            }
            
            if (orders && orders.length > 0) {
              const order = orders[0];
              const shippingAddr = order.shipping_address || {};
              const city = shippingAddr.city || "your city";
              const address1 = shippingAddr.address1 || "";
              const address2 = shippingAddr.address2 || "";
              const province = shippingAddr.province || "";
              
              // Build full address
              let fullAddress = [address1, address2].filter(Boolean).join(", ");
              if (!fullAddress) fullAddress = "No specific address";
              
              // Get display courier name (maps "Other" → "PostEx")
              const displayCourierName = await getCourierDisplayName(supabase, order.courier_name || "Unknown");
              
              // Calculate scheduled ETA based on fulfillment date
              const fulfillmentDate = order.fulfillment_date || order.updated_at;
              const scheduledETA = calculateScheduledETA(fulfillmentDate, city);
              
              // Fetch real-time courier tracking if available
              let courierTracking = null;
              if (order.tracking_number && order.courier_name) {
                const courierLower = order.courier_name.toLowerCase();
                
                console.log(`📦 Detected courier: "${order.courier_name}" (normalized: "${courierLower}")`);
                
                if (courierLower.includes("leopards")) {
                  console.log(`🐆 Fetching Leopards tracking for: ${order.tracking_number}`);
                  courierTracking = await getLeopardsTracking(supabase, order.tracking_number);
                } else if (courierLower.includes("postex") || courierLower.includes("other")) {
                  // Note: Shopify stores PostEx as "Other" sometimes
                  console.log(`📮 Fetching PostEx tracking for: ${order.tracking_number}`);
                  courierTracking = await getPostExTracking(supabase, order.tracking_number);
                } else if (courierLower.includes("tcs")) {
                  console.log(`📦 TCS courier detected - no real-time tracking available yet`);
                  // Don't fetch any tracking - just show scheduled ETA
                } else {
                  console.log(`ℹ️ Unknown courier type: "${order.courier_name}", no real-time tracking available`);
                  // Don't fetch any tracking - just show scheduled ETA
                }
                
                if (courierTracking) {
                  console.log(`✅ Courier tracking:`, courierTracking);
                }
              }
              
              // Compare ETAs for delivery status
              let deliveryStatus = "";
              if (courierTracking?.estimatedDate && scheduledETA.scheduledDate !== "Pending fulfillment") {
                const scheduledDate = new Date(scheduledETA.scheduledDate);
                const courierDate = new Date(courierTracking.estimatedDate);
                
                const timeDiff = courierDate.getTime() - scheduledDate.getTime();
                const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                
                if (Math.abs(daysDiff) <= 1) {
                  deliveryStatus = "✅ On Track!";
                } else if (daysDiff > 1) {
                  deliveryStatus = `⚠️ Delayed by ${daysDiff} day(s)`;
                } else {
                  deliveryStatus = `🎉 Early!`;
                }
              }
              
              // Helper: Format date with time
              const formatDateWithTime = (isoString: string | null): string => {
                if (!isoString) return "Not available";
                const date = new Date(isoString);
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const hours = date.getHours();
                const minutes = date.getMinutes();
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const displayHours = hours % 12 || 12;
                const displayMinutes = minutes.toString().padStart(2, '0');
                return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} at ${displayHours}:${displayMinutes} ${ampm}`;
              };

              // Helper: Calculate expected delivery based on city
              const calculateExpectedDelivery = (dispatchDate: string | null, city: string): { date: string, days: number, rawDate: Date | null } => {
                if (!dispatchDate) return { date: "Pending dispatch", days: 0, rawDate: null };
                
                const dispatch = new Date(dispatchDate);
                const isKarachi = city.toLowerCase().includes('karachi');
                const daysToAdd = isKarachi ? 2 : 5;
                
                const expected = new Date(dispatch);
                expected.setDate(expected.getDate() + daysToAdd);
                
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const formatted = `${expected.getDate()} ${months[expected.getMonth()]} ${expected.getFullYear()}`;
                
                return { date: formatted, days: daysToAdd, rawDate: expected };
              };

              // Helper: Compare delivery timing
              const compareDeliveryTiming = (expectedDate: Date | null, courierEta: string | null): string => {
                if (!courierEta || !expectedDate) return "";
                
                try {
                  const courier = new Date(courierEta);
                  
                  const diffTime = courier.getTime() - expectedDate.getTime();
                  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                  
                  if (diffDays === 0) return "✅ On Time!";
                  if (diffDays < 0) {
                    const earlyDays = Math.abs(diffDays);
                    return earlyDays === 1 ? "🎉 1 day early!" : `🎉 ${earlyDays} days early!`;
                  }
                  return diffDays === 1 ? "⚠️ 1 day late" : `⚠️ ${diffDays} days late`;
                } catch {
                  return "";
                }
              };

              // Calculate expected delivery
              const expectedDelivery = calculateExpectedDelivery(order.fulfillment_date, city);
              const deliveryTimingStatus = compareDeliveryTiming(expectedDelivery.rawDate, courierTracking?.estimatedDate || null);

              output = JSON.stringify({
                found: true,
                order_number: order.order_number,
                order_date: order.created_at,
                order_date_formatted: formatDate(order.created_at),
                order_date_with_time: formatDateWithTime(order.created_at),
                dispatch_date: order.fulfillment_date || null,
                dispatch_date_formatted: formatDate(order.fulfillment_date),
                dispatch_date_with_time: formatDateWithTime(order.fulfillment_date),
                expected_delivery_date: expectedDelivery.date,
                expected_delivery_days: expectedDelivery.days,
                customer_name: order.customer_name || "Customer",
                customer_email: order.customer_email || null,
                customer_phone: order.customer_phone || null,
                city: city,
                province: province,
                full_address: fullAddress,
                fulfillment_status: order.fulfillment_status || "Processing",
                fulfillment_date: order.fulfillment_date || null,
                courier_name: displayCourierName,
                tracking_number: order.tracking_number || null,
                tracking_url: order.tracking_url || null,
                courier_status: courierTracking?.status || null,
                courier_eta: courierTracking?.estimatedDate || null,
                courier_eta_with_time: formatDateWithTime(courierTracking?.estimatedDate || null),
                delivery_timing_status: deliveryTimingStatus,
                scheduled_eta: scheduledETA.scheduledDate,
                scheduled_days: scheduledETA.daysFromFulfillment,
                delivery_status: deliveryStatus,
                financial_status: order.financial_status,
                total_price: order.total_price,
                line_items: order.line_items,
                // Delivery confirmation fields
                actual_delivered_at: order.actual_delivered_at || null,
                actual_delivered_at_formatted: formatDate(order.actual_delivered_at),
                delivered_to_name: order.delivered_to_name || null,
                delivered_to_relation: order.delivered_to_relation || null,
                delivery_proof_url: order.delivery_proof_url || null,
                delivery_notes: order.delivery_notes || null
              });
            } else {
              output = JSON.stringify({
                found: false,
                message: args.order_number 
                  ? `No order found with number ${args.order_number}` 
                  : "No orders found for this phone number"
              });
            }
          }
          else if (functionName === "save_customer_name") {
            const customerNameToSave = args.customer_name;
            const phoneNumberToSave = args.phone_number;
            
            console.log(`💾 Saving customer name: ${customerNameToSave} for ${phoneNumberToSave}`);
            
            try {
              // Update customers table
              await supabase
                .from("customers")
                .update({
                  customer_name: customerNameToSave,
                  updated_at: new Date().toISOString()
                })
                .eq("phone_number", phoneNumberToSave);
              
              // Update conversation context
              await supabase
                .from("conversation_context")
                .upsert({
                  phone_number: phoneNumberToSave,
                  customer_name: customerNameToSave,
                  updated_at: new Date().toISOString()
                }, { onConflict: "phone_number" });
              
              console.log(`✅ Customer name saved successfully`);
              
              output = JSON.stringify({
                success: true,
                message: `Customer name "${customerNameToSave}" saved successfully`
              });
            } catch (error) {
              console.error("❌ Error saving customer name:", error);
              output = JSON.stringify({
                success: false,
                message: "Failed to save customer name"
              });
            }
          }
          else if (functionName === "send_product_image") {
            console.log("📸 send_product_image called:", args);
            
            try {
              // Fetch product to get image
              const { data: product } = await supabase
                .from("shopify_products")
                .select("images, title")
                .eq("product_id", args.product_id)
                .single();
              
              if (!product) {
                output = JSON.stringify({
                  success: false,
                  message: "Product not found"
                });
              } else {
                const images = JSON.parse(product.images || "[]");
                const imageUrl = images.length > 0 ? images[0] : null;
                
                if (imageUrl) {
                  console.log(`📸 Sending product image: ${imageUrl}`);
                  
                  // Send image with caption via WhatsApp
                  await sendWhatsAppImage(
                    supabase, 
                    args.phone_number, 
                    imageUrl, 
                    args.caption
                  );
                  
                  output = JSON.stringify({
                    success: true,
                    message: "Product image sent successfully"
                  });
                } else {
                  output = JSON.stringify({
                    success: false,
                    message: "No image available for this product"
                  });
                }
              }
            } catch (error) {
              console.error("❌ Error in send_product_image:", error);
              output = JSON.stringify({
                success: false,
                message: "Failed to send product image"
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

          // ==========================================
          // BUG FIX #1: Replace [Name] placeholder
          // ==========================================
          const { data: customerData } = await supabase
            .from("conversation_context")
            .select("customer_name")
            .eq("phone_number", phone_number)
            .single();

          const customerName = customerData?.customer_name || "";

          // Replace [Name] placeholder with actual customer name
          let finalMessage = responseText;
          if (customerName) {
            // Replace all instances of [Name] with actual name
            finalMessage = finalMessage.replace(/\[Name\]/g, customerName);
          } else {
            // If no name yet, remove [Name] completely
            finalMessage = finalMessage.replace(/\[Name\]\s*/g, "");
          }

          // ==========================================
          // CHECK FOR IMAGE URL IN TOOL OUTPUTS
          // ==========================================
          let imageUrl: string | null = null;
          
          // Get the run data to check for tool calls
          const runDataResponse = await fetch(
            `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
            {
              headers: {
                "Authorization": `Bearer ${openaiApiKey}`,
                "OpenAI-Beta": "assistants=v2"
              }
            }
          );
          
          if (runDataResponse.ok) {
            const runData = await runDataResponse.json();
            
            // Check if there were tool calls with outputs
            const toolCalls = runData.required_action?.submit_tool_outputs?.tool_calls || [];
            
            for (const toolCall of toolCalls) {
              if (toolCall.function.name === "get_product_details") {
                try {
                  // Parse the output that was submitted
                  const args = JSON.parse(toolCall.function.arguments);
                  
                  // Re-fetch product to get image
                  const { data: product } = await supabase
                    .from("shopify_products")
                    .select("images")
                    .eq("product_id", args.product_id)
                    .single();
                  
                  if (product) {
                    const images = JSON.parse(product.images || "[]");
                    if (images.length > 0) {
                      imageUrl = images[0];
                      console.log("📸 Found image URL:", imageUrl);
                      break;
                    }
                  }
                } catch (e) {
                  console.error("Error parsing tool output:", e);
                }
              }
            }
          }

          // ==========================================
          // SEND IMAGE WITH CAPTION OR TEXT ONLY
          // ==========================================
          if (imageUrl) {
            console.log("📸 Sending product image with caption");
            
            try {
              // Send image with caption
              await sendWhatsAppImage(supabase, phone_number, imageUrl, finalMessage);
              
              console.log("✅ WhatsApp image sent successfully");

              return new Response(
                JSON.stringify({ success: true, response: finalMessage, image_sent: true }), 
                {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
              );
            } catch (imageError) {
              console.error("❌ Failed to send image, falling back to text:", imageError);
              // Fall through to send text only
            }
          }

          // Send text only (no image or image failed)
          const { data: sendData, error: sendError } = await supabase.functions.invoke(
            "send-whatsapp-message", 
            {
              body: { phone_number, message: finalMessage },
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
            JSON.stringify({ success: true, response: finalMessage }), 
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