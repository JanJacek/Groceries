create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references public.shopping_lists(id) on delete set null,
  list_name text not null,
  created_by uuid references auth.users(id) on delete set null,
  settled_items_count integer not null,
  settled_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint receipts_settled_items_count_check
    check (settled_items_count > 0)
);

create index if not exists receipts_list_id_settled_at_idx
  on public.receipts (list_id, settled_at desc);

create index if not exists receipts_created_by_settled_at_idx
  on public.receipts (created_by, settled_at desc);

alter table public.receipts enable row level security;

create policy "receipts_select_member"
  on public.receipts
  for select
  to authenticated
  using (
    list_id is not null
    and public.is_list_member(list_id)
  );

create table if not exists public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  list_id uuid references public.shopping_lists(id) on delete set null,
  product_id uuid references public.products(id) on delete restrict,
  name text not null,
  quantity numeric(10, 2) not null,
  condition_type text,
  source_item_id uuid,
  source_created_by uuid references auth.users(id) on delete set null,
  source_updated_by uuid references auth.users(id) on delete set null,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  source_completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint receipt_items_name_check
    check (char_length(trim(name)) >= 1),
  constraint receipt_items_quantity_check
    check (quantity > 0),
  constraint receipt_items_condition_type_check
    check (condition_type in ('promotion') or condition_type is null)
);

create index if not exists receipt_items_receipt_id_idx
  on public.receipt_items (receipt_id, created_at);

create index if not exists receipt_items_product_id_idx
  on public.receipt_items (product_id, created_at desc);

alter table public.receipt_items enable row level security;

create policy "receipt_items_select_member"
  on public.receipt_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.receipts receipt
      where receipt.id = receipt_items.receipt_id
        and receipt.list_id is not null
        and public.is_list_member(receipt.list_id)
    )
  );

create or replace function public.settle_completed_shopping_items(p_list_id uuid)
returns table (
  receipt_id uuid,
  settled_items_count integer
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  next_receipt_id uuid;
  target_list_name text;
  target_count integer;
begin
  if current_user_id is null then
    raise exception 'Brak zalogowanego użytkownika.';
  end if;

  if not public.can_edit_list(p_list_id) then
    raise exception 'Nie masz uprawnień do rozliczenia tej listy.';
  end if;

  select list.name
  into target_list_name
  from public.shopping_lists list
  where list.id = p_list_id;

  if target_list_name is null then
    raise exception 'Nie znaleziono listy do rozliczenia.';
  end if;

  select count(*)
  into target_count
  from public.shopping_items item
  where item.list_id = p_list_id
    and item.is_completed = true;

  if coalesce(target_count, 0) = 0 then
    raise exception 'Brak zaznaczonych produktów do rozliczenia.';
  end if;

  insert into public.receipts (list_id, list_name, created_by, settled_items_count)
  values (p_list_id, target_list_name, current_user_id, target_count)
  returning id into next_receipt_id;

  insert into public.receipt_items (
    receipt_id,
    list_id,
    product_id,
    name,
    quantity,
    condition_type,
    source_item_id,
    source_created_by,
    source_updated_by,
    source_created_at,
    source_updated_at,
    source_completed_at
  )
  select
    next_receipt_id,
    item.list_id,
    item.product_id,
    item.name,
    item.quantity,
    item.condition_type,
    item.id,
    item.created_by,
    item.updated_by,
    item.created_at,
    item.updated_at,
    item.completed_at
  from public.shopping_items item
  where item.list_id = p_list_id
    and item.is_completed = true
  order by item.sort_order asc, item.created_at asc;

  delete from public.shopping_items item
  where item.list_id = p_list_id
    and item.is_completed = true;

  return query
  select next_receipt_id, target_count;
end;
$$;

grant execute on function public.settle_completed_shopping_items(uuid) to authenticated;
