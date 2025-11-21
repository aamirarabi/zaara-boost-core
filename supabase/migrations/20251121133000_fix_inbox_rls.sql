-- Fix RLS policies to allow dashboard users to view chat history and conversations
-- This fixes the "Inbox not showing chats" issue

-- ============================================
-- FIX: chat_history - Allow authenticated users to read/write
-- ============================================
DROP POLICY IF EXISTS "auth_all_chat_history" ON public.chat_history;

-- Allow authenticated users (dashboard admins) to view and manage all chats
CREATE POLICY "allow_authenticated_chat_history"
ON public.chat_history
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- FIX: conversation_context - Allow authenticated users to read/write
-- ============================================
DROP POLICY IF EXISTS "auth_all_conversation_context" ON public.conversation_context;

-- Allow authenticated users to view and manage conversation context
CREATE POLICY "allow_authenticated_conversation_context"
ON public.conversation_context
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_context ENABLE ROW LEVEL SECURITY;
