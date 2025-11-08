import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { instructions, assistant_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get OpenAI API key from settings
    const { data: settings } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "openai_api_key")
      .single();

    if (!settings?.setting_value) {
      throw new Error("OpenAI API key not configured in system settings");
    }

    const openaiApiKey = settings.setting_value;

    // Use the assistant ID from request, or get from settings
    let assistantId = assistant_id;
    if (!assistantId) {
      const { data: assistantSetting } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "openai_assistant_id")
        .single();
      
      assistantId = assistantSetting?.setting_value || "asst_XD1YQeyvtzWlBK1Fa0HNX9fZ";
    }

    console.log("🤖 Updating OpenAI Assistant:", assistantId);
    console.log("📝 New instructions length:", instructions?.length || 0, "characters");

    // Update the assistant via OpenAI API
    const response = await fetch(`https://api.openai.com/v1/assistants/${assistantId}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        instructions: instructions
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ OpenAI API Error:", errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    console.log("✅ Assistant updated successfully");
    console.log("📋 Assistant model:", data.model);
    console.log("🔧 Tools:", data.tools?.length || 0);

    // Store the updated instructions in system settings for reference
    await supabase
      .from("system_settings")
      .upsert({
        setting_key: "zaara_system_prompt",
        setting_value: instructions,
        description: "Zaara AI Assistant System Prompt (synced to OpenAI)"
      }, { onConflict: "setting_key" });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Assistant instructions updated successfully",
        assistant_id: data.id,
        model: data.model,
        instructions_length: instructions.length
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error updating assistant:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
