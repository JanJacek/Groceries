drop policy if exists "shopping_lists_select_member" on public.shopping_lists;

create policy "shopping_lists_select_member"
  on public.shopping_lists
  for select
  using (
    public.is_list_member(id)
    or auth.uid() = created_by
  );
