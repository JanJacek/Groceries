drop policy if exists "receipts_select_member" on public.receipts;

create policy "receipts_select_reader"
  on public.receipts
  for select
  to authenticated
  using (
    created_by = auth.uid()
    or (
      list_id is not null
      and public.is_list_member(list_id)
    )
  );

drop policy if exists "receipt_items_select_member" on public.receipt_items;

create policy "receipt_items_select_reader"
  on public.receipt_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.receipts receipt
      where receipt.id = receipt_items.receipt_id
        and (
          receipt.created_by = auth.uid()
          or (
            receipt.list_id is not null
            and public.is_list_member(receipt.list_id)
          )
        )
    )
  );
