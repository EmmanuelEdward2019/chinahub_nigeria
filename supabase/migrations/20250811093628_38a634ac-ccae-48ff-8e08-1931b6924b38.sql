-- Add policy to allow edge functions to update wallets for transaction processing
CREATE POLICY "edge_functions_can_update_wallets" ON public.wallets
  FOR UPDATE
  USING (true)
  WITH CHECK (true);