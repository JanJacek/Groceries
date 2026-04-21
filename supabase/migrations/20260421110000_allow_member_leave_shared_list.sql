create or replace function public.remove_shopping_list_member(p_list_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Brak zalogowanego użytkownika.';
  end if;

  if auth.uid() = p_user_id then
    delete from public.shopping_list_members member
    where member.list_id = p_list_id
      and member.user_id = auth.uid()
      and member.role <> 'owner';

    if not found then
      raise exception 'Właściciel nie może opuścić własnej listy.';
    end if;

    return;
  end if;

  if not public.is_list_owner(p_list_id) then
    raise exception 'Tylko właściciel listy może usuwać innych członków.';
  end if;

  delete from public.shopping_list_members member
  where member.list_id = p_list_id
    and member.user_id = p_user_id
    and member.role <> 'owner';
end;
$$;

grant execute on function public.remove_shopping_list_member(uuid, uuid) to authenticated;
