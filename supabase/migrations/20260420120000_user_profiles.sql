create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.user_profiles (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  avatar_initials text,
  preferred_currency text not null default 'PLN',
  default_unit text not null default 'pcs',
  compact_view boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_profiles_avatar_initials_check
    check (avatar_initials is null or avatar_initials ~ '^[A-Z]{1,2}$'),
  constraint user_profiles_preferred_currency_check
    check (preferred_currency in ('PLN', 'EUR', 'USD', 'GBP')),
  constraint user_profiles_default_unit_check
    check (default_unit in ('pcs', 'kg', 'g', 'l', 'ml', 'pack'))
);

alter table public.user_profiles enable row level security;

create policy "user_profiles_select_own"
  on public.user_profiles
  for select
  using (auth.uid() = owner_id);

create policy "user_profiles_insert_own"
  on public.user_profiles
  for insert
  with check (auth.uid() = owner_id);

create policy "user_profiles_update_own"
  on public.user_profiles
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at();
