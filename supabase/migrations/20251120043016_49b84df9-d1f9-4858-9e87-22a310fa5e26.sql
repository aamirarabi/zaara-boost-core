
-- Temporarily allow authenticated users to view orders
-- You should assign proper admin roles after this

DROP POLICY IF EXISTS "Admin full access to shopify_orders" ON shopify_orders;

-- Allow any authenticated user to view orders (temporary)
CREATE POLICY "Authenticated users can view shopify_orders"
ON shopify_orders
FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify orders
CREATE POLICY "Admin can modify shopify_orders"
ON shopify_orders
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
