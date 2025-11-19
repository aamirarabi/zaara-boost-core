import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== LEOPARDS API TEST STARTED ===');
    
    const leopardsApiKey = Deno.env.get('LEOPARDS_API_KEY')!;
    const leopardsApiPassword = Deno.env.get('LEOPARDS_API_PASSWORD')!;
    const trackingNumber = 'KI7509378691';

    console.log('🔍 Testing tracking number:', trackingNumber);
    
    // Build URL with query parameters (GET method)
    const leopardsUrl = `https://merchantapi.leopardscourier.com/api/trackBookedPacket/format/json/?api_key=${encodeURIComponent(leopardsApiKey)}&api_password=${encodeURIComponent(leopardsApiPassword)}&track_numbers=${encodeURIComponent(trackingNumber)}`;
    
    console.log('📡 Calling Leopards API...');
    
    const leopardsResponse = await fetch(leopardsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`📊 Response Status: ${leopardsResponse.status}`);

    if (leopardsResponse.ok) {
      const leopardsData = await leopardsResponse.json();
      
      console.log('\n=== COMPLETE RAW RESPONSE ===');
      console.log(JSON.stringify(leopardsData, null, 2));
      
      // Log specific fields
      if (leopardsData.packet_list && leopardsData.packet_list[0]) {
        const packet = leopardsData.packet_list[0];
        
        console.log('\n=== DATE-RELATED FIELDS ===');
        Object.keys(packet).forEach(key => {
          const lowerKey = key.toLowerCase();
          if (lowerKey.includes('deliver') || lowerKey.includes('date') || lowerKey.includes('time')) {
            console.log(`${key}: ${JSON.stringify(packet[key])}`);
          }
        });

        console.log('\n=== TRACKING DETAIL ===');
        if (packet['Tracking Detail']) {
          console.log(JSON.stringify(packet['Tracking Detail'], null, 2));
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: leopardsData,
          trackingNumber,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      const errorText = await leopardsResponse.text();
      console.error('❌ API Error:', errorText);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `API returned ${leopardsResponse.status}`,
          details: errorText,
        }),
        {
          status: leopardsResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('=== ERROR ===');
    console.error(error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
