create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  note text,
  color_token text not null default 'sage',
  archived boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint shopping_lists_id_owner_unique unique (id, owner_id),
  constraint shopping_lists_name_check check (char_length(trim(name)) >= 1),
  constraint shopping_lists_color_token_check
    check (color_token in ('sage', 'tomato', 'berry', 'ocean', 'charcoal'))
);

create index if not exists shopping_lists_owner_id_idx
  on public.shopping_lists (owner_id, archived, updated_at desc);

alter table public.shopping_lists enable row level security;

create policy "shopping_lists_select_own"
  on public.shopping_lists
  for select
  using (auth.uid() = owner_id);

create policy "shopping_lists_insert_own"
  on public.shopping_lists
  for insert
  with check (auth.uid() = owner_id);

create policy "shopping_lists_update_own"
  on public.shopping_lists
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "shopping_lists_delete_own"
  on public.shopping_lists
  for delete
  using (auth.uid() = owner_id);

create trigger set_shopping_lists_updated_at
before update on public.shopping_lists
for each row
execute function public.set_updated_at();
