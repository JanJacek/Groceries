create table if not exists public.shopping_list_invitations (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists(id) on delete cascade,
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  invitee_user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor',
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  responded_at timestamptz,
  constraint shopping_list_invitations_role_check check (role in ('owner', 'editor')),
  constraint shopping_list_invitations_status_check check (status in ('pending', 'accepted', 'rejected')),
  constraint shopping_list_invitations_distinct_users_check check (inviter_user_id <> invitee_user_id)
);

create unique index if not exists shopping_list_invitations_pending_unique_idx
  on public.shopping_list_invitations (list_id, invitee_user_id)
  where status = 'pending';

create index if not exists shopping_list_invitations_invitee_idx
  on public.shopping_list_invitations (invitee_user_id, status, created_at desc);

create table if not exists public.user_contact_invitations (
  id uuid primary key default gen_random_uuid(),
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  responded_at timestamptz,
  constraint user_contact_invitations_status_check check (status in ('pending', 'accepted', 'rejected')),
  constraint user_contact_invitations_distinct_users_check check (sender_user_id <> recipient_user_id)
);

create unique index if not exists user_contact_invitations_pending_unique_idx
  on public.user_contact_invitations (sender_user_id, recipient_user_id)
  where status = 'pending';

create index if not exists user_contact_invitations_recipient_idx
  on public.user_contact_invitations (recipient_user_id, status, created_at desc);

alter table public.shopping_list_invitations enable row level security;
alter table public.user_contact_invitations enable row level security;

create policy "shopping_list_invitations_select_related"
  on public.shopping_list_invitations
  for select
  to authenticated
  using (invitee_user_id = auth.uid() or inviter_user_id = auth.uid());

create policy "user_contact_invitations_select_related"
  on public.user_contact_invitations
  for select
  to authenticated
  using (recipient_user_id = auth.uid() or sender_user_id = auth.uid());

create or replace function public.list_available_shopping_lists()
returns table (
  id uuid,
  name text,
  note text,
  archived boolean,
  created_at timestamptz,
  updated_at timestamptz,
  current_user_role text,
  access_status text,
  invited_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  with active_lists as (
    select
      list.id,
      list.name,
      coalesce(list.note, '') as note,
      list.archived,
      list.created_at,
      list.updated_at,
      member.role::text as current_user_role,
      'active'::text as access_status,
      null::timestamptz as invited_at
    from public.shopping_lists list
    join public.shopping_list_members member
      on member.list_id = list.id
    where member.user_id = auth.uid()
  ),
  pending_lists as (
    select
      list.id,
      list.name,
      coalesce(list.note, '') as note,
      list.archived,
      list.created_at,
      list.updated_at,
      invitation.role::text as current_user_role,
      'pending'::text as access_status,
      invitation.created_at as invited_at
    from public.shopping_list_invitations invitation
    join public.shopping_lists list
      on list.id = invitation.list_id
    where invitation.invitee_user_id = auth.uid()
      and invitation.status = 'pending'
      and not exists (
        select 1
        from public.shopping_list_members member
        where member.list_id = list.id
          and member.user_id = auth.uid()
      )
  )
  select *
  from (
    select *
    from active_lists
    union all
    select *
    from pending_lists
  ) lists
  order by
    case lists.access_status when 'pending' then 0 else 1 end,
    coalesce(lists.invited_at, lists.updated_at) desc;
$$;

create or replace function public.add_shopping_list_member(p_list_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_role text;
begin
  select member.role
  into current_role
  from public.shopping_list_members member
  where member.list_id = p_list_id
    and member.user_id = auth.uid();

  if current_role is distinct from 'owner' then
    raise exception 'Tylko właściciel listy może zapraszać użytkowników.';
  end if;

  if not exists (
    select 1
    from public.user_contacts contact
    where contact.owner_id = auth.uid()
      and contact.contact_user_id = p_user_id
  ) then
    raise exception 'Możesz zapraszać do listy tylko osoby ze swojej listy kontaktów.';
  end if;

  if exists (
    select 1
    from public.shopping_list_members member
    where member.list_id = p_list_id
      and member.user_id = p_user_id
  ) then
    raise exception 'Ten użytkownik jest już członkiem listy.';
  end if;

  insert into public.shopping_list_invitations (list_id, inviter_user_id, invitee_user_id, role)
  values (p_list_id, auth.uid(), p_user_id, 'editor')
  on conflict (list_id, invitee_user_id) where status = 'pending'
  do nothing;
end;
$$;

create or replace function public.accept_shopping_list_invitation(p_list_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  pending_invitation public.shopping_list_invitations%rowtype;
begin
  select invitation.*
  into pending_invitation
  from public.shopping_list_invitations invitation
  where invitation.list_id = p_list_id
    and invitation.invitee_user_id = auth.uid()
    and invitation.status = 'pending'
  order by invitation.created_at desc
  limit 1;

  if pending_invitation.id is null then
    raise exception 'Nie znaleziono oczekującego zaproszenia do tej listy.';
  end if;

  insert into public.shopping_list_members (list_id, user_id, role)
  values (pending_invitation.list_id, pending_invitation.invitee_user_id, pending_invitation.role)
  on conflict (list_id, user_id) do nothing;

  update public.shopping_list_invitations invitation
  set status = 'accepted',
      responded_at = timezone('utc', now())
  where invitation.id = pending_invitation.id;
end;
$$;

create or replace function public.reject_shopping_list_invitation(p_list_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update public.shopping_list_invitations invitation
  set status = 'rejected',
      responded_at = timezone('utc', now())
  where invitation.list_id = p_list_id
    and invitation.invitee_user_id = auth.uid()
    and invitation.status = 'pending';

  if not found then
    raise exception 'Nie znaleziono oczekującego zaproszenia do tej listy.';
  end if;
end;
$$;

create or replace function public.list_user_contact_invitations()
returns table (
  invitation_id uuid,
  user_id uuid,
  email text,
  avatar_initials text,
  created_at timestamptz,
  direction text
)
language sql
security definer
set search_path = public, auth
as $$
  select
    invitation.id as invitation_id,
    invitation.sender_user_id as user_id,
    users.email::text as email,
    coalesce(profile.avatar_initials, '')::text as avatar_initials,
    invitation.created_at,
    'received'::text as direction
  from public.user_contact_invitations invitation
  join auth.users users on users.id = invitation.sender_user_id
  left join public.user_profiles profile on profile.owner_id = invitation.sender_user_id
  where invitation.recipient_user_id = auth.uid()
    and invitation.status = 'pending'

  union all

  select
    invitation.id as invitation_id,
    invitation.recipient_user_id as user_id,
    users.email::text as email,
    coalesce(profile.avatar_initials, '')::text as avatar_initials,
    invitation.created_at,
    'sent'::text as direction
  from public.user_contact_invitations invitation
  join auth.users users on users.id = invitation.recipient_user_id
  left join public.user_profiles profile on profile.owner_id = invitation.recipient_user_id
  where invitation.sender_user_id = auth.uid()
    and invitation.status = 'pending'

  order by created_at desc;
$$;

create or replace function public.add_user_contact(p_email text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invited_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Musisz być zalogowany, aby dodać kontakt.';
  end if;

  select users.id
  into invited_user_id
  from auth.users users
  where lower(users.email::text) = lower(trim(p_email))
  limit 1;

  if invited_user_id is null then
    raise exception 'Nie znaleziono użytkownika o takim adresie e-mail.';
  end if;

  if invited_user_id = auth.uid() then
    raise exception 'Nie możesz dodać siebie do kontaktów.';
  end if;

  if exists (
    select 1
    from public.user_contacts contact
    where contact.owner_id = auth.uid()
      and contact.contact_user_id = invited_user_id
  ) then
    return;
  end if;

  if exists (
    select 1
    from public.user_contact_invitations invitation
    where invitation.sender_user_id = auth.uid()
      and invitation.recipient_user_id = invited_user_id
      and invitation.status = 'pending'
  ) then
    return;
  end if;

  insert into public.user_contact_invitations (sender_user_id, recipient_user_id)
  values (auth.uid(), invited_user_id);
end;
$$;

create or replace function public.accept_user_contact_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  pending_invitation public.user_contact_invitations%rowtype;
begin
  select invitation.*
  into pending_invitation
  from public.user_contact_invitations invitation
  where invitation.id = p_invitation_id
    and invitation.recipient_user_id = auth.uid()
    and invitation.status = 'pending'
  limit 1;

  if pending_invitation.id is null then
    raise exception 'Nie znaleziono oczekującego zaproszenia do kontaktów.';
  end if;

  insert into public.user_contacts (owner_id, contact_user_id)
  values
    (pending_invitation.sender_user_id, pending_invitation.recipient_user_id),
    (pending_invitation.recipient_user_id, pending_invitation.sender_user_id)
  on conflict (owner_id, contact_user_id) do nothing;

  update public.user_contact_invitations invitation
  set status = 'accepted',
      responded_at = timezone('utc', now())
  where invitation.id = pending_invitation.id;
end;
$$;

create or replace function public.reject_user_contact_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update public.user_contact_invitations invitation
  set status = 'rejected',
      responded_at = timezone('utc', now())
  where invitation.id = p_invitation_id
    and invitation.recipient_user_id = auth.uid()
    and invitation.status = 'pending';

  if not found then
    raise exception 'Nie znaleziono oczekującego zaproszenia do kontaktów.';
  end if;
end;
$$;

grant execute on function public.list_available_shopping_lists() to authenticated;
grant execute on function public.add_shopping_list_member(uuid, uuid) to authenticated;
grant execute on function public.accept_shopping_list_invitation(uuid) to authenticated;
grant execute on function public.reject_shopping_list_invitation(uuid) to authenticated;
grant execute on function public.list_user_contact_invitations() to authenticated;
grant execute on function public.add_user_contact(text) to authenticated;
grant execute on function public.accept_user_contact_invitation(uuid) to authenticated;
grant execute on function public.reject_user_contact_invitation(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.shopping_list_invitations;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.user_contact_invitations;
exception
  when duplicate_object then null;
end $$;
