create policy "receipts_delete_creator"
  on public.receipts
  for delete
  to authenticated
  using (created_by = auth.uid());
