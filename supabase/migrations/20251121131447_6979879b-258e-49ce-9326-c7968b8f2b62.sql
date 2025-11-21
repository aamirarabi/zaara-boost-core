-- Fix RLS policies to allow authenticated users to access data

-- ============================================
-- FIX: shopify_products - Allow authenticated users to read
-- ============================================
DROP POLICY IF EXISTS "Allow authenticated users to read products" ON public.shopify_products;

CREATE POLICY "Allow authenticated users to read products"
ON public.shopify_products
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- FIX: customers - Allow authenticated users to read
-- ============================================
DROP POLICY IF EXISTS "Allow authenticated users to read customers" ON public.customers;

CREATE POLICY "Allow authenticated users to read customers"
ON public.customers
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- FIX: product_reviews - Allow authenticated users to read
-- ============================================
DROP POLICY IF EXISTS "Allow authenticated users to read reviews" ON public.product_reviews;

CREATE POLICY "Allow authenticated users to read reviews"
ON public.product_reviews
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- FIX: chat_history - Allow staff to read
-- ============================================
DROP POLICY IF EXISTS "Staff can view chat_history" ON public.chat_history;

CREATE POLICY "Staff can view chat_history"
ON public.chat_history
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- FIX: conversation_context - Allow staff to read
-- ============================================
DROP POLICY IF EXISTS "Staff can view conversation_context" ON public.conversation_context;

CREATE POLICY "Staff can view conversation_context"
ON public.conversation_context
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));