create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint products_name_check check (char_length(trim(name)) >= 1)
);

create index if not exists products_updated_at_idx
  on public.products (updated_at desc, created_at desc);

alter table public.products enable row level security;

create policy "products_select_authenticated"
  on public.products
  for select
  to authenticated
  using (true);

create policy "products_insert_authenticated"
  on public.products
  for insert
  to authenticated
  with check (true);

create policy "products_update_authenticated"
  on public.products
  for update
  to authenticated
  using (true)
  with check (true);

drop trigger if exists set_products_updated_at on public.products;

create trigger set_products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

alter table public.shopping_items
  add column if not exists product_id uuid references public.products(id) on delete restrict;

insert into public.products (name, normalized_name)
select distinct
  trim(item.name) as name,
  lower(trim(item.name)) as normalized_name
from public.shopping_items item
where trim(item.name) <> ''
on conflict (normalized_name) do nothing;

update public.shopping_items item
set product_id = product.id
from public.products product
where item.product_id is null
  and product.normalized_name = lower(trim(item.name));

alter table public.shopping_items
  alter column product_id set not null;

create index if not exists shopping_items_product_id_idx
  on public.shopping_items (product_id, list_id, sort_order, created_at);
