-- =============================================
-- SECURITY FIX: Implement Role-Based Access Control
-- =============================================

-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'viewer');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- 5. Policy for user_roles table itself
CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- =============================================
-- UPDATE RLS POLICIES - Replace overly permissive policies
-- =============================================

-- DROP all existing overly permissive policies
DROP POLICY IF EXISTS "auth_all_chat_history" ON public.chat_history;
DROP POLICY IF EXISTS "auth_all_customers" ON public.customers;
DROP POLICY IF EXISTS "auth_all_shopify_orders" ON public.shopify_orders;
DROP POLICY IF EXISTS "auth_all_conversation_context" ON public.conversation_context;
DROP POLICY IF EXISTS "auth_all_system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "auth_all_faq_vectors" ON public.faq_vectors;
DROP POLICY IF EXISTS "auth_all_product_reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "auth_all_conversation_analytics" ON public.conversation_analytics;
DROP POLICY IF EXISTS "auth_all_customer_notes" ON public.customer_notes;
DROP POLICY IF EXISTS "auth_all_customer_tags" ON public.customer_tags;
DROP POLICY IF EXISTS "auth_all_quick_replies" ON public.quick_replies;
DROP POLICY IF EXISTS "auth_all_quick_templates" ON public.quick_templates;
DROP POLICY IF EXISTS "auth_all_shopify_products" ON public.shopify_products;
DROP POLICY IF EXISTS "auth_all_judgeme_settings" ON public.judgeme_settings;
DROP POLICY IF EXISTS "auth_all_message_analytics" ON public.message_analytics;
DROP POLICY IF EXISTS "auth_all_product_waitlist" ON public.product_waitlist;
DROP POLICY IF EXISTS "Allow authenticated users to manage waitlist" ON public.product_waitlist;
DROP POLICY IF EXISTS "Allow authenticated users to view waitlist" ON public.product_waitlist;
DROP POLICY IF EXISTS "Allow authenticated access to courier_performance" ON public.courier_performance;
DROP POLICY IF EXISTS "Allow authenticated access to agent_performance" ON public.agent_performance;
DROP POLICY IF EXISTS "Allow authenticated access to api_usage_logs" ON public.api_usage_logs;
DROP POLICY IF EXISTS "Allow authenticated access to dashboard_preferences" ON public.dashboard_preferences;
DROP POLICY IF EXISTS "Allow authenticated access to faq_gaps" ON public.faq_gaps;
DROP POLICY IF EXISTS "auth_all_warranty_claims" ON public.warranty_claims;
DROP POLICY IF EXISTS "Allow authenticated users to manage courier settings" ON public.courier_settings;

-- SENSITIVE DATA: Admin-only access
CREATE POLICY "Admin full access to chat_history"
ON public.chat_history FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin full access to customers"
ON public.customers FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin full access to shopify_orders"
ON public.shopify_orders FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin full access to conversation_context"
ON public.conversation_context FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin full access to system_settings"
ON public.system_settings FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin full access to courier_settings"
ON public.courier_settings FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- FAQ AND CONTENT: Admin can edit, staff can view
CREATE POLICY "Admin can manage faq_vectors"
ON public.faq_vectors FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Staff can view faq_vectors"
ON public.faq_vectors FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can manage quick_replies"
ON public.quick_replies FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Staff can view quick_replies"
ON public.quick_replies FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can manage quick_templates"
ON public.quick_templates FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Staff can view quick_templates"
ON public.quick_templates FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- REVIEWS AND PRODUCTS: Staff can view, admin can manage
CREATE POLICY "Staff can view product_reviews"
ON public.product_reviews FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can manage product_reviews"
ON public.product_reviews FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Staff can view shopify_products"
ON public.shopify_products FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can manage shopify_products"
ON public.shopify_products FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ANALYTICS: Staff can view
CREATE POLICY "Staff can view conversation_analytics"
ON public.conversation_analytics FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view message_analytics"
ON public.message_analytics FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view courier_performance"
ON public.courier_performance FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view agent_performance"
ON public.agent_performance FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view api_usage_logs"
ON public.api_usage_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- NOTES AND TAGS: Staff can manage
CREATE POLICY "Staff can manage customer_notes"
ON public.customer_notes FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can manage customer_tags"
ON public.customer_tags FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- SETTINGS AND CONFIG
CREATE POLICY "Staff can view judgeme_settings"
ON public.judgeme_settings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can manage judgeme_settings"
ON public.judgeme_settings FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Staff can view dashboard_preferences"
ON public.dashboard_preferences FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can manage dashboard_preferences"
ON public.dashboard_preferences FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Staff can view faq_gaps"
ON public.faq_gaps FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can manage faq_gaps"
ON public.faq_gaps FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Staff can view product_waitlist"
ON public.product_waitlist FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can manage product_waitlist"
ON public.product_waitlist FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Staff can view warranty_claims"
ON public.warranty_claims FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can manage warranty_claims"
ON public.warranty_claims FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- =============================================
-- ENABLE RLS ON system_logs
-- =============================================
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view system_logs"
ON public.system_logs FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert logs"
ON public.system_logs FOR INSERT
TO authenticated
WITH CHECK (true);