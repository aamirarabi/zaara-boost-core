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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Handle webhook verification
    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      console.log("Webhook verification:", { mode, token, challenge });

      if (mode === "subscribe" && token === "boost_webhook_verify_2025_secure") {
        console.log("Webhook verified successfully");
        return new Response(challenge, { status: 200 });
      }
      
      return new Response("Forbidden", { status: 403 });
    }

    // Handle incoming WhatsApp messages
    const body = await req.json();
    console.log("Received webhook:", JSON.stringify(body, null, 2));

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message) {
      return new Response(JSON.stringify({ status: "no_message" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const phoneNumber = message.from;
    const messageText = message.text?.body || "";
    const messageType = message.type || "text";
    const messageId = message.id;

    console.log("Processing message:", { phoneNumber, messageText, messageType, messageId });

    // Check if message already exists to prevent duplicates
    const { data: existingMsg } = await supabase
      .from("chat_history")
      .select("id")
      .eq("whatsapp_message_id", messageId)
      .maybeSingle();

    if (!existingMsg) {
      // Save message to chat_history only if it doesn't exist
      const { error: insertError } = await supabase.from("chat_history").insert({
        phone_number: phoneNumber,
        content: messageText,
        direction: "inbound",
        sent_by: "customer",
        message_type: messageType,
        whatsapp_message_id: messageId,
        status: "received",
      });

      if (insertError) {
        console.error("Error saving message:", insertError);
      } else {
        console.log("✅ Message saved to chat_history");
      }
    } else {
      console.log("⏭️ Message already exists, skipping duplicate save");
    }

    // Invoke process-zaara-message edge function
    console.log("Calling process-zaara-message for:", phoneNumber);
    const { data: processData, error: invokeError } = await supabase.functions.invoke("process-zaara-message", {
      body: { phone_number: phoneNumber, message: messageText, message_id: messageId },
    });

    if (invokeError) {
      console.error("❌ Error invoking process-zaara-message:", invokeError);
    } else {
      console.log("✅ Successfully invoked process-zaara-message:", processData);
    }

    return new Response(JSON.stringify({ status: "success" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});