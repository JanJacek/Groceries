create or replace function public.remove_user_contact(p_contact_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Brak zalogowanego użytkownika.';
  end if;

  delete from public.user_contacts contact
  where (contact.owner_id = auth.uid() and contact.contact_user_id = p_contact_user_id)
     or (contact.owner_id = p_contact_user_id and contact.contact_user_id = auth.uid());

  delete from public.user_contact_invitations invitation
  where (invitation.sender_user_id = auth.uid() and invitation.recipient_user_id = p_contact_user_id)
     or (invitation.sender_user_id = p_contact_user_id and invitation.recipient_user_id = auth.uid());

  delete from public.shopping_list_invitations invitation
  where (invitation.inviter_user_id = auth.uid() and invitation.invitee_user_id = p_contact_user_id)
     or (invitation.inviter_user_id = p_contact_user_id and invitation.invitee_user_id = auth.uid());

  delete from public.shopping_list_members member
  using public.shopping_lists list
  where list.id = member.list_id
    and member.role <> 'owner'
    and (
      (list.created_by = auth.uid() and member.user_id = p_contact_user_id)
      or
      (list.created_by = p_contact_user_id and member.user_id = auth.uid())
    );
end;
$$;

grant execute on function public.remove_user_contact(uuid) to authenticated;
