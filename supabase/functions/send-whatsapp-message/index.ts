import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number, message } = await req.json();

    console.log("📥 Received send request for:", phone_number);
    console.log("📝 Message:", message);

    if (!phone_number || !message) {
      console.error("❌ Missing required fields:", { phone_number, message });
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get WhatsApp credentials
    const { data: settings } = await supabase.from("system_settings").select("*");
    
    const phoneId = settings?.find((s) => s.setting_key === "whatsapp_phone_id")?.setting_value;
    const accessToken = settings?.find((s) => s.setting_key === "whatsapp_access_token")?.setting_value;

    console.log("🔑 WhatsApp Phone ID found:", phoneId ? "✅" : "❌");
    console.log("🔑 WhatsApp Access Token found:", accessToken ? "✅" : "❌");

    if (!phoneId || !accessToken) {
      console.error("❌ WhatsApp credentials not configured");
      return new Response(JSON.stringify({ error: "WhatsApp credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send WhatsApp message
    const whatsappUrl = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
    console.log("📞 Calling WhatsApp API:", whatsappUrl);
    
    const response = await fetch(whatsappUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone_number,
        type: "text",
        text: { body: message },
      }),
    });

    const result = await response.json();
    console.log("📡 WhatsApp API response:", JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error("❌ WhatsApp API error:", result);
      return new Response(JSON.stringify({ error: "Failed to send message", details: result }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save sent message to chat_history
    console.log("💾 Saving message to chat_history");
    const { error: dbError } = await supabase.from("chat_history").insert({
      phone_number,
      content: message,
      direction: "outbound",
      sent_by: "zaara",
      message_type: "text",
      whatsapp_message_id: result.messages?.[0]?.id,
      status: "sent",
    });

    if (dbError) {
      console.error("❌ Failed to save to chat_history:", dbError);
    } else {
      console.log("✅ Message saved to chat_history");
    }

    console.log("✅ Message sent successfully!");
    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});