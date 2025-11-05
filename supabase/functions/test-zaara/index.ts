import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestCase {
  name: string;
  phone_number: string;
  message: string;
  expected_behavior: {
    should_contain?: string[];
    should_not_contain?: string[];
    should_find_products?: boolean;
    product_count_min?: number;
    products_sorted_by_price?: boolean;
    should_send_image?: boolean;
    stock_format_correct?: boolean;
  };
  cleanup?: boolean;
}

const TEST_CASES: TestCase[] = [
  {
    name: "TEST 1: Product Search - Headphones with Keyword Mapping",
    phone_number: "923000000001",
    message: "Tell me about headphones",
    expected_behavior: {
      should_contain: ["headset", "PKR", "In Stock"],
      should_not_contain: ["couldn't find", "Stock: 297", "Stock: "],
      should_find_products: true,
      product_count_min: 1,
      products_sorted_by_price: true,
      stock_format_correct: true
    },
    cleanup: true
  },
  {
    name: "TEST 2: Product Search - Chairs",
    phone_number: "923000000002",
    message: "Show me chairs",
    expected_behavior: {
      should_contain: ["chair", "PKR", "In Stock"],
      should_not_contain: ["couldn't find", "Stock: "],
      should_find_products: true,
      product_count_min: 1,
      products_sorted_by_price: true,
      stock_format_correct: true
    },
    cleanup: true
  },
  {
    name: "TEST 3: Number Selection - Step 1: Get Product List",
    phone_number: "923000000003",
    message: "Tell me about headphones",
    expected_behavior: {
      should_contain: ["1.", "2.", "PKR"],
      should_find_products: true
    },
    cleanup: false
  },
  {
    name: "TEST 4: Number Selection - Step 2: Select Product #1",
    phone_number: "923000000003",
    message: "1",
    expected_behavior: {
      should_contain: ["PKR", "Price"],
      stock_format_correct: true
    },
    cleanup: true
  },
  {
    name: "TEST 5: FAQ Search - Product Videos",
    phone_number: "923000000005",
    message: "How can I watch product videos?",
    expected_behavior: {
      should_contain: ["video", "YouTube"],
    },
    cleanup: true
  },
  {
    name: "TEST 6: Greeting - Salam",
    phone_number: "923000000006",
    message: "Salam",
    expected_behavior: {
      should_contain: ["Wa Alaikum Salam", "Zaara", "name"],
      should_not_contain: ["product", "order"]
    },
    cleanup: true
  },
  {
    name: "TEST 7: B2B Redirect - Wholesale Inquiry",
    phone_number: "923000000007",
    message: "I want wholesale prices",
    expected_behavior: {
      should_contain: ["B2B", "Aman", "Irfan"],
      should_not_contain: ["PKR"]
    },
    cleanup: true
  }
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("🧪 Starting Zaara automated tests...\n");
    
    const results = [];
    let passedTests = 0;
    let failedTests = 0;

    for (const testCase of TEST_CASES) {
      console.log(`\n🔍 Running: ${testCase.name}`);
      
      const testResult = {
        name: testCase.name,
        passed: false,
        errors: [] as string[],
        response: "",
        metadata: {} as any
      };

      try {
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));

        // Call process-zaara-message
        const { data: processData, error: processError } = await supabase.functions.invoke(
          "process-zaara-message",
          {
            body: {
              phone_number: testCase.phone_number,
              message: testCase.message
            }
          }
        );

        if (processError) {
          testResult.errors.push(`Process error: ${processError.message}`);
          throw new Error(`Process failed: ${processError.message}`);
        }

        const response = processData?.response || "";
        testResult.response = response;

        // Validate response against expected behavior
        const expected = testCase.expected_behavior;
        let allChecksPassed = true;

        // Check: should_contain
        if (expected.should_contain) {
          for (const text of expected.should_contain) {
            if (!response.toLowerCase().includes(text.toLowerCase())) {
              testResult.errors.push(`Missing expected text: "${text}"`);
              allChecksPassed = false;
            }
          }
        }

        // Check: should_not_contain
        if (expected.should_not_contain) {
          for (const text of expected.should_not_contain) {
            if (response.toLowerCase().includes(text.toLowerCase())) {
              testResult.errors.push(`Contains forbidden text: "${text}"`);
              allChecksPassed = false;
            }
          }
        }

        // Check: products_sorted_by_price
        if (expected.products_sorted_by_price) {
          const priceMatches = response.match(/PKR\s*([\d,]+)/g);
          if (priceMatches && priceMatches.length > 1) {
            const prices = priceMatches.map((m: string) => {
              const num = m.replace(/PKR\s*/, '').replace(/,/g, '');
              return parseInt(num);
            });
            
            for (let i = 1; i < prices.length; i++) {
              if (prices[i] < prices[i-1]) {
                testResult.errors.push(`Prices not sorted: ${prices[i-1]} before ${prices[i]}`);
                allChecksPassed = false;
                break;
              }
            }
            
            testResult.metadata.prices = prices;
          }
        }

        // Check: stock_format_correct
        if (expected.stock_format_correct) {
          if (response.match(/Stock:\s*\d+/)) {
            testResult.errors.push('Stock showing quantities instead of "In Stock"');
            allChecksPassed = false;
          }
        }

        // Check: should_find_products
        if (expected.should_find_products) {
          const hasProducts = response.match(/\d+\.\s+/g);
          if (!hasProducts || hasProducts.length < (expected.product_count_min || 1)) {
            testResult.errors.push(`Expected min ${expected.product_count_min || 1} products, found ${hasProducts?.length || 0}`);
            allChecksPassed = false;
          }
        }

        testResult.passed = allChecksPassed;
        if (allChecksPassed) {
          passedTests++;
          console.log(`✅ PASSED`);
        } else {
          failedTests++;
          console.log(`❌ FAILED: ${testResult.errors.join(", ")}`);
        }

      } catch (error) {
        testResult.passed = false;
        const errorMessage = error instanceof Error ? error.message : String(error);
        testResult.errors.push(errorMessage);
        failedTests++;
        console.log(`❌ FAILED: ${errorMessage}`);
      }

      // Cleanup
      if (testCase.cleanup) {
        await supabase.from("conversation_context").delete().eq("phone_number", testCase.phone_number);
        await supabase.from("chat_history").delete().eq("phone_number", testCase.phone_number);
      }

      results.push(testResult);
    }

    console.log(`\n📊 TEST SUMMARY:`);
    console.log(`   Total: ${TEST_CASES.length}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);

    const allPassed = failedTests === 0;
    
    return new Response(
      JSON.stringify({
        success: allPassed,
        summary: {
          total: TEST_CASES.length,
          passed: passedTests,
          failed: failedTests,
          pass_rate: `${Math.round((passedTests / TEST_CASES.length) * 100)}%`
        },
        results,
        message: allPassed 
          ? "🎉 All tests passed! Zaara is fully ready!"
          : "⚠️ Some tests failed. Review errors and fix code."
      }),
      { 
        status: allPassed ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Test suite error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});