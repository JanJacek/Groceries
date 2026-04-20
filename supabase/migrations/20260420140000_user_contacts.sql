create table if not exists public.user_contacts (
  owner_id uuid not null references auth.users(id) on delete cascade,
  contact_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (owner_id, contact_user_id),
  constraint user_contacts_distinct_users_check check (owner_id <> contact_user_id)
);

create index if not exists user_contacts_owner_id_idx
  on public.user_contacts (owner_id, created_at desc);

alter table public.user_contacts enable row level security;

create policy "user_contacts_select_own"
  on public.user_contacts
  for select
  using (auth.uid() = owner_id);

create policy "user_contacts_insert_own"
  on public.user_contacts
  for insert
  with check (auth.uid() = owner_id);

create policy "user_contacts_delete_own"
  on public.user_contacts
  for delete
  using (auth.uid() = owner_id);

create or replace function public.list_user_contacts()
returns table (
  user_id uuid,
  email text,
  avatar_initials text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    contact.contact_user_id,
    users.email::text,
    profile.avatar_initials,
    contact.created_at
  from public.user_contacts contact
  join auth.users users on users.id = contact.contact_user_id
  left join public.user_profiles profile on profile.owner_id = contact.contact_user_id
  where contact.owner_id = auth.uid()
  order by users.email asc;
$$;

create or replace function public.add_user_contact(p_email text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_email text := lower(trim(p_email));
  target_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Brak zalogowanego użytkownika.';
  end if;

  if normalized_email = '' then
    raise exception 'Podaj adres e-mail kontaktu.';
  end if;

  select users.id
  into target_user_id
  from auth.users users
  where lower(users.email::text) = normalized_email
  limit 1;

  if target_user_id is null then
    raise exception 'Nie znaleziono użytkownika o takim adresie e-mail.';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Nie możesz dodać samego siebie do kontaktów.';
  end if;

  insert into public.user_contacts (owner_id, contact_user_id)
  values (auth.uid(), target_user_id)
  on conflict (owner_id, contact_user_id) do nothing;
end;
$$;

create or replace function public.remove_user_contact(p_contact_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Brak zalogowanego użytkownika.';
  end if;

  delete from public.user_contacts contact
  where contact.owner_id = auth.uid()
    and contact.contact_user_id = p_contact_user_id;
end;
$$;

create or replace function public.add_shopping_list_member(p_list_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Brak zalogowanego użytkownika.';
  end if;

  if not public.is_list_owner(p_list_id) then
    raise exception 'Tylko właściciel listy może dodawać współpracowników.';
  end if;

  if not exists (
    select 1
    from public.user_contacts contact
    where contact.owner_id = auth.uid()
      and contact.contact_user_id = p_user_id
  ) then
    raise exception 'Najpierw dodaj tego użytkownika do kontaktów.';
  end if;

  insert into public.shopping_list_members (list_id, user_id, role)
  values (p_list_id, p_user_id, 'editor')
  on conflict (list_id, user_id) do nothing;
end;
$$;

grant execute on function public.list_user_contacts() to authenticated;
grant execute on function public.add_user_contact(text) to authenticated;
grant execute on function public.remove_user_contact(uuid) to authenticated;
grant execute on function public.add_shopping_list_member(uuid, uuid) to authenticated;
