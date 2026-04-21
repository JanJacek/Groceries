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

  if exists (
    select 1
    from public.shopping_list_invitations invitation
    where invitation.list_id = p_list_id
      and invitation.invitee_user_id = p_user_id
      and invitation.status = 'pending'
  ) then
    return;
  end if;

  insert into public.shopping_list_invitations (list_id, inviter_user_id, invitee_user_id, role)
  values (p_list_id, auth.uid(), p_user_id, 'editor');
end;
$$;

grant execute on function public.add_shopping_list_member(uuid, uuid) to authenticated;
