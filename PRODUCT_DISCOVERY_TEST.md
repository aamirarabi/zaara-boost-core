# Comprehensive Product Discovery Test for Zaara

## Test All Product Categories

### Audio Equipment Tests

**Test 1: Headsets/Headphones**
- ✅ "show me headphones"
- ✅ "I want headsets"
- ✅ "bluetooth headset"
- ✅ "wireless headphones"
- ✅ "anc headset"
- Expected: Beat, Boost Pulse, Reverb, Boost Sync, Boost Groove

**Test 2: Earbuds**
- ✅ "earbuds"
- ✅ "wireless earbuds"
- ✅ "true wireless"
- Expected: Boost Hawk Wireless Earbuds

**Test 3: Speakers**
- ✅ "speaker"
- ✅ "bluetooth speaker"
- Expected: Boost Boombastic BT Speaker

---

### Gaming Equipment Tests

**Test 4: Gaming Chairs**
- ✅ "chair"
- ✅ "gaming chair"
- ✅ "ergonomic chair"
- ✅ "office chair"
- Expected: Boost Surge Pro, Boost Throne, Boost Comfort

**Test 5: Gaming Tables**
- ✅ "table"
- ✅ "gaming table"
- ✅ "gaming desk"
- ✅ "desk"
- Expected: Gaming tables/desks

**Test 6: Gaming Mouse**
- ✅ "mouse"
- ✅ "gaming mouse"
- ✅ "office mouse"
- Expected: Gaming and office mice

**Test 7: Monitors**
- ✅ "monitor"
- ✅ "gaming monitor"
- ✅ "screen"
- ✅ "display"
- Expected: Gaming monitors

**Test 8: Monitor Arms**
- ✅ "monitor arm"
- ✅ "monitor stand"
- Expected: Monitor mounting solutions

---

### PC Components Tests

**Test 9: PC Cases**
- ✅ "pc case"
- ✅ "case"
- ✅ "enclosure"
- Expected: Boost Enclave cases

**Test 10: CPU Coolers**
- ✅ "cpu cooler"
- ✅ "cooler"
- ✅ "cooling"
- Expected: Boost Arctic RGB CPU Cooler, Boost Hydra Pro

**Test 11: Case Fans**
- ✅ "fan"
- ✅ "fans"
- ✅ "case fan"
- Expected: Boost Enclave F100/F200 ARGB Fans

**Test 12: Power Supplies**
- ✅ "power supply"
- ✅ "psu"
- Expected: Power supply units

**Test 13: Core/Motherboards**
- ✅ "core"
- ✅ "motherboard"
- Expected: Boost Core A520M, B450M, B760M, H610M

---

### Accessories Tests

**Test 14: Smart Watches**
- ✅ "watch"
- ✅ "smart watch"
- ✅ "smartwatch"
- Expected: Boost Astro, Boost Cosmic (multiple colors)

**Test 15: Power Banks**
- ✅ "power bank"
- ✅ "portable charger"
- Expected: Power bank products

**Test 16: Computer Accessories**
- ✅ "accessories"
- ✅ "computer accessories"
- ✅ "pc accessories"
- Expected: Various accessories

---

### Special Offers Tests

**Test 17: Combos/Bundles**
- ✅ "combo"
- ✅ "bundle"
- ✅ "package"
- ✅ "deal"
- Expected: Boost Bundle 2: Cosmic and Hawk, etc.

---

## Search Quality Tests

### Test Variations
- Natural language: "I'm looking for headphones"
- Casual: "headphones?"
- Plural/Singular: "chair" vs "chairs"
- Formal: "I would like to purchase a gaming monitor"
- Typos tolerance: "headphon" (should still find)

### Edge Cases
- Empty category: Products that don't exist should show suggestions
- Multiple matches: Should show all relevant products sorted by price
- New products: Any product added to Shopify should be automatically discoverable

---

## Success Criteria

### ✅ PASS if:
1. All 17 product category tests return relevant products
2. Keyword variations find the same products
3. Results are sorted by price (cheapest first)
4. Only in-stock products are shown
5. Prices displayed as "PKR X,XXX"
6. Stock status shown as "In Stock"
7. Products numbered for easy selection (1, 2, 3...)

### ❌ FAIL if:
1. Any category returns "No products found" when products exist
2. Keyword mapping doesn't work
3. Out-of-stock products shown
4. Price format incorrect
5. No stock status displayed

---

## Future-Proofing

### New Products Auto-Discovery
When you add new products to Shopify, Zaara will automatically find them because:

1. **Tag-based search**: Searches across product tags, titles, descriptions
2. **Comprehensive mapping**: 90+ keyword variations mapped to product categories
3. **Flexible matching**: Partial matches work (e.g., "head" finds "headset")
4. **Auto-sync**: Products sync from Shopify regularly

### Adding New Product Categories
If you add completely new product types:

1. **No code needed** if the product title/description contains common words
2. **Add keyword mapping** only if customers use unique slang/terms
3. **Update once** in `KEYWORD_MAPPING` constant

Example: Adding "RGB Lighting"
```typescript
"rgb": "RGB Lighting",
"lighting": "RGB Lighting", 
"led": "RGB Lighting",
```

---

## Testing Instructions

### Manual WhatsApp Testing
1. Send each test query to Zaara via WhatsApp
2. Verify products are returned
3. Verify formatting is correct
4. Try number selection on results

### Automated Testing
Run the test suite:
```
POST /test-zaara
```

Check logs for:
- Product search success rate
- Keyword mapping triggers
- Response formatting
- Tool execution

---

## Maintenance

### Monthly Review
- Check for new product categories in Shopify
- Review keyword mapping effectiveness
- Add new variations based on customer queries
- Update this test document

### When Products Don't Show
1. Check product has inventory > 0
2. Verify product has title/description/tags
3. Check if keyword needs to be added to mapping
4. Test search query directly in database

---

## Contact for Support

If you notice products not being found:
1. Note the exact customer query
2. Check what product should be found
3. Update KEYWORD_MAPPING in process-zaara-message/index.ts
4. Deploy and test

Current mapping covers 90+ variations across all categories. This should handle 99% of customer queries.
