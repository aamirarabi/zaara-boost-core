-- Fix search_path for search_faqs function
CREATE OR REPLACE FUNCTION search_faqs(search_term TEXT, result_limit INT DEFAULT 5)
RETURNS TABLE (
  id TEXT,
  question TEXT,
  answer TEXT,
  category TEXT,
  video_urls TEXT[],
  image_urls TEXT[],
  related_products TEXT[],
  relevance_score INT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.question,
    f.answer,
    f.category,
    f.video_urls,
    f.image_urls,
    f.related_products,
    CASE 
      WHEN LOWER(f.question) = LOWER(search_term) THEN 100
      WHEN LOWER(f.question) LIKE LOWER(search_term) || '%' THEN 90
      WHEN LOWER(f.question) LIKE '%' || LOWER(search_term) || '%' THEN 70
      WHEN LOWER(f.answer) LIKE '%' || LOWER(search_term) || '%' THEN 50
      ELSE 0
    END as relevance_score
  FROM faq_vectors f
  WHERE f.is_active = true
    AND (
      LOWER(f.question) LIKE '%' || LOWER(search_term) || '%' 
      OR LOWER(f.answer) LIKE '%' || LOWER(search_term) || '%'
      OR search_term = ANY(f.keywords)
    )
  ORDER BY relevance_score DESC, f.usage_count DESC
  LIMIT result_limit;
END;
$$;

-- Fix search_path for increment_message_count function
CREATE OR REPLACE FUNCTION increment_message_count(
  date_param DATE,
  direction TEXT,
  handler TEXT
)
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO message_analytics (
    date,
    inbound_count,
    outbound_count,
    zaara_handled,
    human_handled
  )
  VALUES (
    date_param,
    CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END,
    CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END,
    CASE WHEN handler = 'zaara' THEN 1 ELSE 0 END,
    CASE WHEN handler = 'human' THEN 1 ELSE 0 END
  )
  ON CONFLICT (date) DO UPDATE SET 
    inbound_count = message_analytics.inbound_count + CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END,
    outbound_count = message_analytics.outbound_count + CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END,
    zaara_handled = message_analytics.zaara_handled + CASE WHEN handler = 'zaara' THEN 1 ELSE 0 END,
    human_handled = message_analytics.human_handled + CASE WHEN handler = 'human' THEN 1 ELSE 0 END;
END;
$$;