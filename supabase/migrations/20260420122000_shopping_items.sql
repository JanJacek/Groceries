create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  quantity numeric(10, 2) not null default 1,
  unit text not null default 'pcs',
  category text,
  note text,
  is_completed boolean not null default false,
  estimated_price numeric(10, 2),
  sort_order integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint shopping_items_list_owner_fkey
    foreign key (list_id, owner_id)
    references public.shopping_lists(id, owner_id)
    on delete cascade,
  constraint shopping_items_name_check check (char_length(trim(name)) >= 1),
  constraint shopping_items_quantity_check check (quantity > 0),
  constraint shopping_items_estimated_price_check
    check (estimated_price is null or estimated_price >= 0)
);

create index if not exists shopping_items_list_id_idx
  on public.shopping_items (list_id, is_completed, sort_order, created_at);

create index if not exists shopping_items_owner_id_idx
  on public.shopping_items (owner_id);

alter table public.shopping_items enable row level security;

create policy "shopping_items_select_own"
  on public.shopping_items
  for select
  using (auth.uid() = owner_id);

create policy "shopping_items_insert_own"
  on public.shopping_items
  for insert
  with check (auth.uid() = owner_id);

create policy "shopping_items_update_own"
  on public.shopping_items
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "shopping_items_delete_own"
  on public.shopping_items
  for delete
  using (auth.uid() = owner_id);

create trigger set_shopping_items_updated_at
before update on public.shopping_items
for each row
execute function public.set_updated_at();
