import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VECTOR_STORE_ID = "vs_6915e27d11708191a04c7e28419ede13";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get OpenAI API key
    const { data: settings } = await supabase
      .from("system_settings")
      .select("*");
    
    const openaiApiKey = settings?.find(
      (s: any) => s.setting_key === "openai_api_key"
    )?.setting_value;

    if (!openaiApiKey) {
      throw new Error("OpenAI API key not found");
    }

    console.log("📚 Fetching all active FAQs from database...");

    // Get all active FAQs
    const { data: faqs, error: faqError } = await supabase
      .from("faq_vectors")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (faqError) {
      throw new Error(`Failed to fetch FAQs: ${faqError.message}`);
    }

    console.log(`✅ Found ${faqs?.length || 0} active FAQs`);

    // Format FAQs as JSON
    const faqData = faqs?.map(faq => ({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      tags: faq.tags,
      video_urls: faq.video_urls,
      is_active: faq.is_active
    }));

    const jsonContent = JSON.stringify(faqData, null, 2);
    
    console.log("📤 Uploading FAQ file to OpenAI...");

    // Upload file to OpenAI
    const formData = new FormData();
    const blob = new Blob([jsonContent], { type: "application/json" });
    formData.append("file", blob, "faq-export.json");
    formData.append("purpose", "assistants");

    const uploadResponse = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      throw new Error(`OpenAI file upload failed: ${error}`);
    }

    const uploadResult = await uploadResponse.json();
    const fileId = uploadResult.id;
    
    console.log(`✅ File uploaded to OpenAI: ${fileId}`);
    console.log("🔄 Updating Vector Store...");

    // Get current files in Vector Store
    const vectorStoreResponse = await fetch(
      `https://api.openai.com/v1/vector_stores/${VECTOR_STORE_ID}/files`,
      {
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
          "OpenAI-Beta": "assistants=v2",
        },
      }
    );

    if (!vectorStoreResponse.ok) {
      throw new Error("Failed to get Vector Store files");
    }

    const vectorStoreData = await vectorStoreResponse.json();
    const oldFiles = vectorStoreData.data || [];

    // Add new file to Vector Store
    const addFileResponse = await fetch(
      `https://api.openai.com/v1/vector_stores/${VECTOR_STORE_ID}/files`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2",
        },
        body: JSON.stringify({ file_id: fileId }),
      }
    );

    if (!addFileResponse.ok) {
      const error = await addFileResponse.text();
      throw new Error(`Failed to add file to Vector Store: ${error}`);
    }

    console.log("✅ New FAQ file added to Vector Store");

    // Delete old FAQ files
    for (const oldFile of oldFiles) {
      if (oldFile.id !== fileId) {
        console.log(`🗑️ Deleting old file: ${oldFile.id}`);
        
        await fetch(
          `https://api.openai.com/v1/vector_stores/${VECTOR_STORE_ID}/files/${oldFile.id}`,
          {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${openaiApiKey}`,
              "OpenAI-Beta": "assistants=v2",
            },
          }
        );
      }
    }

    console.log("✅ Vector Store sync completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "FAQs synced to Vector Store successfully",
        faq_count: faqs?.length || 0,
        file_id: fileId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Error syncing FAQs:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
