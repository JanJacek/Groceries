alter table public.shopping_items
  drop constraint if exists shopping_items_list_owner_fkey;

alter table public.shopping_lists
  drop constraint if exists shopping_lists_id_owner_unique;

alter table public.shopping_lists
  drop constraint if exists shopping_lists_owner_id_fkey;

alter table public.shopping_items
  drop constraint if exists shopping_items_owner_id_fkey;

alter table public.shopping_lists
  rename column owner_id to created_by;

alter table public.shopping_items
  rename column owner_id to created_by;

alter table public.shopping_lists
  alter column created_by drop not null;

alter table public.shopping_items
  alter column created_by drop not null;

alter table public.shopping_lists
  add constraint shopping_lists_created_by_fkey
    foreign key (created_by)
    references auth.users(id)
    on delete set null;

alter table public.shopping_items
  add constraint shopping_items_created_by_fkey
    foreign key (created_by)
    references auth.users(id)
    on delete set null;

alter table public.shopping_items
  add constraint shopping_items_list_id_fkey
    foreign key (list_id)
    references public.shopping_lists(id)
    on delete cascade;

alter table public.shopping_items
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

drop index if exists shopping_lists_owner_id_idx;
create index if not exists shopping_lists_updated_at_idx
  on public.shopping_lists (archived, updated_at desc);

drop index if exists shopping_items_owner_id_idx;
create index if not exists shopping_items_created_by_idx
  on public.shopping_items (created_by);

create table if not exists public.shopping_list_members (
  list_id uuid not null references public.shopping_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor',
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (list_id, user_id),
  constraint shopping_list_members_role_check
    check (role in ('owner', 'editor'))
);

insert into public.shopping_list_members (list_id, user_id, role)
select id, created_by, 'owner'
from public.shopping_lists
where created_by is not null
on conflict (list_id, user_id) do nothing;

create unique index if not exists shopping_list_members_owner_unique_idx
  on public.shopping_list_members (list_id)
  where role = 'owner';

create index if not exists shopping_list_members_user_id_idx
  on public.shopping_list_members (user_id, joined_at desc);

create or replace function public.is_list_member(target_list_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shopping_list_members member
    where member.list_id = target_list_id
      and member.user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_list(target_list_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shopping_list_members member
    where member.list_id = target_list_id
      and member.user_id = auth.uid()
      and member.role in ('owner', 'editor')
  );
$$;

create or replace function public.is_list_owner(target_list_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shopping_list_members member
    where member.list_id = target_list_id
      and member.user_id = auth.uid()
      and member.role = 'owner'
  );
$$;

create or replace function public.handle_new_shopping_list_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.shopping_list_members (list_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict (list_id, user_id) do update
    set role = 'owner';
  end if;

  return new;
end;
$$;

drop trigger if exists create_owner_membership_for_list on public.shopping_lists;

create trigger create_owner_membership_for_list
after insert on public.shopping_lists
for each row
execute function public.handle_new_shopping_list_member();

create or replace function public.list_shopping_list_members(p_list_id uuid)
returns table (
  user_id uuid,
  email text,
  role text,
  avatar_initials text,
  joined_at timestamptz,
  is_current_user boolean
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    member.user_id,
    users.email::text,
    member.role,
    profile.avatar_initials,
    member.joined_at,
    member.user_id = auth.uid() as is_current_user
  from public.shopping_list_members member
  join auth.users users on users.id = member.user_id
  left join public.user_profiles profile on profile.owner_id = member.user_id
  where member.list_id = p_list_id
    and public.is_list_member(p_list_id)
  order by
    case when member.role = 'owner' then 0 else 1 end,
    member.joined_at asc,
    users.email asc;
$$;

create or replace function public.invite_shopping_list_member(p_list_id uuid, p_email text)
returns table (
  user_id uuid,
  email text,
  role text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_email text := lower(trim(p_email));
  existing_user_id uuid;
  existing_email text;
  existing_role text;
begin
  if auth.uid() is null then
    raise exception 'Brak zalogowanego użytkownika.';
  end if;

  if not public.is_list_owner(p_list_id) then
    raise exception 'Tylko właściciel listy może zapraszać innych użytkowników.';
  end if;

  if normalized_email = '' then
    raise exception 'Podaj adres e-mail użytkownika.';
  end if;

  select users.id, users.email::text
  into existing_user_id, existing_email
  from auth.users users
  where lower(users.email::text) = normalized_email
  limit 1;

  if existing_user_id is null then
    raise exception 'Nie znaleziono użytkownika o takim adresie e-mail.';
  end if;

  insert into public.shopping_list_members (list_id, user_id, role)
  values (p_list_id, existing_user_id, 'editor')
  on conflict (list_id, user_id) do nothing;

  select member.role
  into existing_role
  from public.shopping_list_members member
  where member.list_id = p_list_id
    and member.user_id = existing_user_id;

  return query
  select existing_user_id, existing_email, existing_role;
end;
$$;

create or replace function public.remove_shopping_list_member(p_list_id uuid, p_user_id uuid)
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
    raise exception 'Tylko właściciel listy może usuwać członków.';
  end if;

  if auth.uid() = p_user_id then
    raise exception 'Właściciel nie może usunąć samego siebie z listy.';
  end if;

  delete from public.shopping_list_members member
  where member.list_id = p_list_id
    and member.user_id = p_user_id
    and member.role <> 'owner';
end;
$$;

grant execute on function public.is_list_member(uuid) to authenticated;
grant execute on function public.can_edit_list(uuid) to authenticated;
grant execute on function public.is_list_owner(uuid) to authenticated;
grant execute on function public.list_shopping_list_members(uuid) to authenticated;
grant execute on function public.invite_shopping_list_member(uuid, text) to authenticated;
grant execute on function public.remove_shopping_list_member(uuid, uuid) to authenticated;

alter table public.shopping_list_members enable row level security;

drop policy if exists "shopping_lists_select_own" on public.shopping_lists;
drop policy if exists "shopping_lists_insert_own" on public.shopping_lists;
drop policy if exists "shopping_lists_update_own" on public.shopping_lists;
drop policy if exists "shopping_lists_delete_own" on public.shopping_lists;

create policy "shopping_lists_select_member"
  on public.shopping_lists
  for select
  using (public.is_list_member(id));

create policy "shopping_lists_insert_creator"
  on public.shopping_lists
  for insert
  with check (auth.uid() = created_by);

create policy "shopping_lists_update_editor"
  on public.shopping_lists
  for update
  using (public.can_edit_list(id))
  with check (public.can_edit_list(id));

create policy "shopping_lists_delete_owner"
  on public.shopping_lists
  for delete
  using (public.is_list_owner(id));

drop policy if exists "shopping_items_select_own" on public.shopping_items;
drop policy if exists "shopping_items_insert_own" on public.shopping_items;
drop policy if exists "shopping_items_update_own" on public.shopping_items;
drop policy if exists "shopping_items_delete_own" on public.shopping_items;

create policy "shopping_items_select_member"
  on public.shopping_items
  for select
  using (public.is_list_member(list_id));

create policy "shopping_items_insert_editor"
  on public.shopping_items
  for insert
  with check (public.can_edit_list(list_id));

create policy "shopping_items_update_editor"
  on public.shopping_items
  for update
  using (public.can_edit_list(list_id))
  with check (public.can_edit_list(list_id));

create policy "shopping_items_delete_editor"
  on public.shopping_items
  for delete
  using (public.can_edit_list(list_id));

create policy "shopping_list_members_select_member"
  on public.shopping_list_members
  for select
  using (public.is_list_member(list_id));

create policy "shopping_list_members_insert_owner_or_self"
  on public.shopping_list_members
  for insert
  with check (
    (auth.uid() = user_id and exists (
      select 1
      from public.shopping_lists list
      where list.id = list_id
        and list.created_by = auth.uid()
    ))
    or public.is_list_owner(list_id)
  );

create policy "shopping_list_members_delete_owner"
  on public.shopping_list_members
  for delete
  using (
    (public.is_list_owner(list_id) and user_id <> auth.uid())
    or (auth.uid() = user_id and role <> 'owner')
  );

do $$
begin
  alter publication supabase_realtime add table public.shopping_lists;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.shopping_items;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.shopping_list_members;
exception
  when duplicate_object then null;
end $$;
