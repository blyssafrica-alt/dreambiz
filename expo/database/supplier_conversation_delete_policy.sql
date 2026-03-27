-- Allow suppliers to delete their own conversations (and buyers to delete theirs)
-- CASCADE on supplier_messages means messages are deleted automatically

DROP POLICY IF EXISTS "Supplier delete own conversations" ON public.supplier_conversations;
CREATE POLICY "Supplier delete own conversations" ON public.supplier_conversations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles p WHERE p.id = supplier_profile_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Buyer delete own conversations" ON public.supplier_conversations;
CREATE POLICY "Buyer delete own conversations" ON public.supplier_conversations
  FOR DELETE USING (auth.uid() = user_id);
